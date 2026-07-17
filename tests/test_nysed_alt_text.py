from __future__ import annotations

import json
import subprocess
import tempfile
import unittest
import unicodedata
from pathlib import Path
from unittest import mock

from scripts.import_nysed_math_mc import (
    extract_alt_texts,
    has_unsafe_accessibility_characters,
    normalize_known_accessibility_font_glyphs,
)


class _FakeCrop:
    def __init__(self, text: str) -> None:
        self.text = text

    def extract_text(self, **_: object) -> str:
        return self.text


class _FakePage:
    def __init__(self, text: str) -> None:
        self.text = text

    def crop(self, _: object) -> _FakeCrop:
        return _FakeCrop(self.text)


class _FakePdf:
    def __init__(self, text: str) -> None:
        self.pages = [_FakePage(text)]

    def __enter__(self) -> _FakePdf:
        return self

    def __exit__(self, *_: object) -> None:
        return None


class AccessibilityTextTests(unittest.TestCase):
    def test_known_normalization_covers_every_private_use_glyph_in_catalog(self) -> None:
        catalog_path = (
            Path(__file__).resolve().parents[1]
            / "content"
            / "math-exams"
            / "generated"
            / "catalog.json"
        )
        catalog = json.loads(catalog_path.read_text(encoding="utf-8"))
        for exam in catalog["exams"]:
            for question in exam["questions"]:
                for language, text in question["alt"].items():
                    normalized = normalize_known_accessibility_font_glyphs(text)
                    self.assertFalse(
                        any(
                            unicodedata.category(character) == "Co"
                            for character in normalized
                        ),
                        f"unreviewed PUA glyph in {question['id']} {language}",
                    )

    def test_mathematical_pi_delimiters_preserve_selectable_text_without_ocr(self) -> None:
        pdf_text = (
            "6 ¿Qué número es equivalente a la forma expandida que se muestra a continuación? "
            "(2 × 100) + (3 × 1) + \uf8eb\uf8ec\uf8ed 4 × 1/10 \uf8f6\uf8f7\uf8f8 "
            "A 203.043 B 203.403 C 230.430 D 230.403"
        )
        expected_text = (
            "Pregunta 6. ¿Qué número es equivalente a la forma expandida que se muestra a continuación? "
            "(2 × 100) + (3 × 1) + ⎛⎜⎝ 4 × 1/10 ⎞⎟⎠ "
            "A 203.043 B 203.403 C 230.430 D 230.403"
        )

        with tempfile.TemporaryDirectory() as temporary_directory:
            root = Path(temporary_directory)
            image_directory = root / "images"
            image_directory.mkdir()
            with (
                mock.patch(
                    "scripts.import_nysed_math_mc.pdfplumber.open",
                    return_value=_FakePdf(pdf_text),
                ),
                mock.patch(
                    "scripts.import_nysed_math_mc.subprocess.run",
                    side_effect=AssertionError("known delimiters must preserve selectable text"),
                ) as run_ocr,
            ):
                generated = extract_alt_texts(
                    root / "source.pdf",
                    {6: (1, (0.0, 0.0, 200.0, 200.0))},
                    image_directory,
                    "es",
                    "tesseract",
                )

        self.assertEqual(run_ocr.call_count, 0)
        self.assertEqual(generated[6], expected_text)
        self.assertEqual(
            normalize_known_accessibility_font_glyphs("\uf8eb\uf8ec\uf8ed\uf8f6\uf8f7\uf8f8"),
            "⎛⎜⎝⎞⎟⎠",
        )
        self.assertFalse(has_unsafe_accessibility_characters(generated[6]))
        self.assertFalse(
            any(unicodedata.category(character) == "Co" for character in generated[6])
        )

    def test_known_triangle_glyphs_become_unicode_without_ocr(self) -> None:
        pdf_text = (
            "44 Acute \uf032ABC, \uf056DEF, and \uf0f5GHI are compared by their corresponding "
            "angles and side lengths. A first B second C third D fourth"
        )
        with tempfile.TemporaryDirectory() as temporary_directory:
            root = Path(temporary_directory)
            image_directory = root / "images"
            image_directory.mkdir()
            with (
                mock.patch(
                    "scripts.import_nysed_math_mc.pdfplumber.open",
                    return_value=_FakePdf(pdf_text),
                ),
                mock.patch(
                    "scripts.import_nysed_math_mc.subprocess.run",
                    side_effect=AssertionError("known triangles must preserve selectable text"),
                ) as run_ocr,
            ):
                generated = extract_alt_texts(
                    root / "source.pdf",
                    {44: (1, (0.0, 0.0, 200.0, 200.0))},
                    image_directory,
                    "en",
                    "tesseract",
                )

        self.assertEqual(run_ocr.call_count, 0)
        self.assertIn("△ABC, △DEF, and △GHI", generated[44])
        self.assertFalse(has_unsafe_accessibility_characters(generated[44]))

    def test_equation_editor_lines_are_stripped_without_ocr(self) -> None:
        pdf_text = (
            "7 Function A has a greater rate of change because "
            "\ue0f5\ue0f6\ue0f6\ue0f7 1.25 > 0.3. "
            "A first B second C third D fourth"
        )
        with tempfile.TemporaryDirectory() as temporary_directory:
            root = Path(temporary_directory)
            image_directory = root / "images"
            image_directory.mkdir()
            with (
                mock.patch(
                    "scripts.import_nysed_math_mc.pdfplumber.open",
                    return_value=_FakePdf(pdf_text),
                ),
                mock.patch(
                    "scripts.import_nysed_math_mc.subprocess.run",
                    side_effect=AssertionError("decorative lines must not force OCR"),
                ) as run_ocr,
            ):
                generated = extract_alt_texts(
                    root / "source.pdf",
                    {7: (1, (0.0, 0.0, 200.0, 200.0))},
                    image_directory,
                    "en",
                    "tesseract",
                )

        self.assertEqual(run_ocr.call_count, 0)
        self.assertIn("because 1.25 > 0.3", generated[7])
        self.assertFalse(has_unsafe_accessibility_characters(generated[7]))

    def test_private_use_pdf_text_falls_back_to_ocr_then_replays_clean_cache(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            root = Path(temporary_directory)
            image_directory = root / "images"
            image_directory.mkdir()
            manifest_path = image_directory / ".nysed-import.json"
            unsafe_alt = (
                "Question 31. \ue062e diagram supports the information in the article "
                "A first B second C third D fourth"
            )
            manifest_path.write_text(
                json.dumps({"altText": {"31": unsafe_alt}}),
                encoding="utf-8",
            )
            pdf_text = (
                "31 \ue062e diagram supports the information in the article by showing that "
                "A first choice B second choice C third choice D fourth choice"
            )
            ocr_text = (
                "31 The diagram supports the information in the article by showing that "
                "A first choice B second choice C third choice D fourth choice"
            )
            boxes = {31: (1, (0.0, 0.0, 200.0, 200.0))}

            with (
                mock.patch(
                    "scripts.import_nysed_math_mc.pdfplumber.open",
                    return_value=_FakePdf(pdf_text),
                ),
                mock.patch(
                    "scripts.import_nysed_math_mc.subprocess.run",
                    return_value=subprocess.CompletedProcess(
                        ["tesseract"],
                        0,
                        ocr_text,
                        "",
                    ),
                ) as run_ocr,
            ):
                generated = extract_alt_texts(
                    root / "source.pdf",
                    boxes,
                    image_directory,
                    "en",
                    "tesseract",
                    cache=True,
                )

            self.assertEqual(run_ocr.call_count, 1)
            self.assertEqual(
                generated[31],
                "Question 31. The diagram supports the information in the article by showing that "
                "A first choice B second choice C third choice D fourth choice",
            )
            self.assertNotIn("\ue062", generated[31])
            cached_manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
            self.assertEqual(cached_manifest["altText"]["31"], generated[31])

            with (
                mock.patch(
                    "scripts.import_nysed_math_mc.pdfplumber.open",
                    side_effect=AssertionError("clean cached alt must skip the PDF"),
                ),
                mock.patch(
                    "scripts.import_nysed_math_mc.subprocess.run",
                    side_effect=AssertionError("clean cached alt must skip OCR"),
                ),
            ):
                replayed = extract_alt_texts(
                    root / "source.pdf",
                    boxes,
                    image_directory,
                    "en",
                    "tesseract",
                    cache=True,
                )

            self.assertEqual(replayed, generated)


if __name__ == "__main__":
    unittest.main()

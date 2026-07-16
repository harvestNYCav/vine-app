from __future__ import annotations

import json
import subprocess
import tempfile
import unittest
from pathlib import Path
from unittest import mock

from scripts.import_nysed_math_mc import extract_alt_texts


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

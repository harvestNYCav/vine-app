from __future__ import annotations

import hashlib
import io
import json
import subprocess
import tempfile
import unittest
from pathlib import Path
from unittest import mock

from PIL import Image, ImageDraw

from scripts import nysed_ela_image_validation as image_validation

from scripts.nysed_ela_image_validation import (
    ElaImageValidationError,
    VALIDATION_VERSION,
    normalize_ocr_text,
    normalized_ocr_for_alt,
    validate_ela_question_image,
    validate_normalized_ela_ocr,
)


VALID_OCR = """
  6   Why do the girls call themselves the Private I's?\r\n

  A   because they want to keep a secret
  B_  because they write in a notebook
  (C) because their ideas are important
  D. because they are solving a mystery
"""


def write_minimal_webp(path: Path) -> None:
    Image.new("RGB", (100, 100), "white").save(path, format="WEBP", lossless=True)


def write_legacy_webp(path: Path) -> None:
    image = Image.new("RGB", (100, 100), "white")
    ImageDraw.Draw(image).line((13, 0, 13, 89), fill="black", width=1)
    image.save(path, format="WEBP", lossless=True)


class NormalizedOcrValidationTests(unittest.TestCase):
    def test_normalizes_and_accepts_four_distinct_choices_and_number(self) -> None:
        normalized = validate_normalized_ela_ocr(VALID_OCR, expected_question_number=6)

        self.assertTrue(normalized.startswith("6 Why"))
        self.assertNotIn("\r", normalized)
        self.assertEqual(normalized, normalize_ocr_text(normalized))
        self.assertIn("B_ because", normalized)

    def test_requires_each_choice_label(self) -> None:
        with self.assertRaisesRegex(ElaImageValidationError, "missing distinct choice labels: D"):
            validate_normalized_ela_ocr(VALID_OCR.replace("D. because", "because"), expected_question_number=6)

    def test_accepts_ordered_line_leading_labels_joined_by_ocr(self) -> None:
        joined = """
        4 Which statement best supports the answer?
        A ungrateful
        Bs childish
        Csunfair
        D cruel
        """

        normalized = validate_normalized_ela_ocr(joined, expected_question_number=4)

        self.assertIn("Bs childish", normalized)
        self.assertIn("Csunfair", normalized)

    def test_rejects_out_of_order_choice_lines(self) -> None:
        scrambled = VALID_OCR.replace(
            "B_  because they write in a notebook\n  (C) because their ideas are important",
            "(C) because their ideas are important\n  B_  because they write in a notebook",
        )

        with self.assertRaisesRegex(ElaImageValidationError, "missing distinct choice labels: C, D"):
            validate_normalized_ela_ocr(scrambled, expected_question_number=6)

    def test_requires_expected_number_at_start(self) -> None:
        with self.assertRaisesRegex(ElaImageValidationError, "expected printed question number 7"):
            validate_normalized_ela_ocr(VALID_OCR, expected_question_number=7)

    def test_rejects_answer_annotation_and_passage_direction_leaks(self) -> None:
        leaks = (
            "\nKey: C",
            "\nAnswer C",
            "\nRATIONALE",
            "\nWHY CHOICE C IS CORRECT",
            "\nQuestion Annotation: this item measures reading",
            "\nRead this story and then answer questions 6 through 9.",
            "\nGO ON",
            "\nBook 1",
            "\nPage 5",
        )
        for leak in leaks:
            with self.subTest(leak=leak):
                with self.assertRaises(ElaImageValidationError):
                    validate_normalized_ela_ocr(VALID_OCR + leak, expected_question_number=6)

    def test_alt_fallback_is_deterministic_and_single_line(self) -> None:
        first = normalized_ocr_for_alt(VALID_OCR)
        second = normalized_ocr_for_alt(normalize_ocr_text(VALID_OCR))

        self.assertEqual(first, second)
        self.assertNotIn("\n", first)


class FinalImageCacheTests(unittest.TestCase):
    def setUp(self) -> None:
        image_validation._probe_tesseract_version.cache_clear()
        image_validation._select_number_ocr_language.cache_clear()

    def test_isolated_number_box_must_match_exactly(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            root = Path(temporary_directory)
            image = root / "q06.webp"
            write_minimal_webp(image)

            def fake_run(command: list[str] | tuple[str, ...], **_: object) -> subprocess.CompletedProcess[str]:
                if command[1] == "--version":
                    return subprocess.CompletedProcess(command, 0, "tesseract 5.5.0\n", "")
                if command[1] == "--list-langs":
                    return subprocess.CompletedProcess(command, 0, "List of available languages (2):\neng\nsnum\n", "")
                if command[1] == "stdin":
                    return subprocess.CompletedProcess(command, 0, "8\n", "")
                return subprocess.CompletedProcess(command, 0, VALID_OCR, "")

            with mock.patch("scripts.nysed_ela_image_validation.subprocess.run", side_effect=fake_run):
                with self.assertRaisesRegex(ElaImageValidationError, "number 8; expected 6"):
                    validate_ela_question_image(
                        image,
                        root / "cache",
                        tesseract_binary="/test/tesseract",
                        expected_question_number=6,
                    )

    def test_modern_number_profile_rejects_conflicting_exact_ocr(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            root = Path(temporary_directory)
            image = root / "q06.webp"
            write_minimal_webp(image)
            number_outputs = iter(("6\n", "8\n"))
            number_languages: list[str] = []

            def fake_run(command: list[str] | tuple[str, ...], **_: object) -> subprocess.CompletedProcess[str]:
                if command[1] == "--version":
                    return subprocess.CompletedProcess(command, 0, "tesseract 5.5.0\n", "")
                if command[1] == "--list-langs":
                    return subprocess.CompletedProcess(command, 0, "List of available languages (2):\neng\nsnum\n", "")
                if command[1] == "stdin":
                    number_languages.append(command[command.index("-l") + 1])
                    return subprocess.CompletedProcess(command, 0, next(number_outputs), "")
                return subprocess.CompletedProcess(command, 0, VALID_OCR, "")

            with mock.patch("scripts.nysed_ela_image_validation.subprocess.run", side_effect=fake_run):
                with self.assertRaisesRegex(ElaImageValidationError, r"preprocessing disagreed: \[6, 8\]"):
                    validate_ela_question_image(
                        image,
                        root / "cache",
                        tesseract_binary="/test/tesseract",
                        expected_question_number=6,
                    )
            self.assertEqual(number_languages, ["snum+eng", "snum+eng"])

    def test_modern_number_profile_uses_snum_only_after_empty_combined_profile(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            root = Path(temporary_directory)
            image = root / "q05.webp"
            write_minimal_webp(image)
            number_languages: list[str] = []

            def fake_run(command: list[str] | tuple[str, ...], **_: object) -> subprocess.CompletedProcess[str]:
                if command[1] == "--version":
                    return subprocess.CompletedProcess(command, 0, "tesseract 5.5.0\n", "")
                if command[1] == "--list-langs":
                    return subprocess.CompletedProcess(command, 0, "List of available languages (2):\neng\nsnum\n", "")
                if command[1] == "stdin":
                    language = command[command.index("-l") + 1]
                    number_languages.append(language)
                    output = "" if language == "snum+eng" else "5\n"
                    return subprocess.CompletedProcess(command, 0, output, "")
                return subprocess.CompletedProcess(command, 0, VALID_OCR, "")

            with mock.patch("scripts.nysed_ela_image_validation.subprocess.run", side_effect=fake_run):
                result = validate_ela_question_image(
                    image,
                    root / "cache",
                    tesseract_binary="/test/tesseract",
                    expected_question_number=5,
                )

            self.assertEqual(number_languages, ["snum+eng"] * 7 + ["snum"] * 2)
            record = json.loads(result.cache_path.read_text(encoding="utf-8"))
            self.assertEqual(record["printedQuestionNumber"], 5)
            self.assertEqual(record["numberOcrLanguage"], "snum+eng")

    def test_outer_rule_selects_only_shifted_legacy_number_profile(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            root = Path(temporary_directory)
            image = root / "q02.webp"
            write_legacy_webp(image)
            calls: list[tuple[str, ...]] = []

            def fake_run(command: list[str] | tuple[str, ...], **_: object) -> subprocess.CompletedProcess[str]:
                calls.append(tuple(command))
                if command[1] == "--version":
                    return subprocess.CompletedProcess(command, 0, "tesseract 5.5.0\n", "")
                if command[1] == "--list-langs":
                    return subprocess.CompletedProcess(command, 0, "List of available languages (2):\neng\nsnum\n", "")
                if command[1] == "stdin":
                    return subprocess.CompletedProcess(command, 0, "2\n", "")
                return subprocess.CompletedProcess(command, 0, VALID_OCR, "")

            with mock.patch("scripts.nysed_ela_image_validation.subprocess.run", side_effect=fake_run):
                validate_ela_question_image(
                    image,
                    root / "cache",
                    tesseract_binary="/test/tesseract",
                    expected_question_number=2,
                )

            self.assertEqual(len(calls), 4)
            self.assertEqual(sum(command[1] == "stdin" for command in calls), 1)

    def test_ocr_cache_replays_offline_without_tesseract(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            root = Path(temporary_directory)
            image = root / "q06.webp"
            cache_root = root / "cache"
            write_minimal_webp(image)
            calls: list[tuple[str, ...]] = []

            def fake_run(command: list[str] | tuple[str, ...], **_: object) -> subprocess.CompletedProcess[str]:
                calls.append(tuple(command))
                if command[1] == "--version":
                    return subprocess.CompletedProcess(command, 0, "tesseract 5.5.0\n", "")
                if command[1] == "--list-langs":
                    return subprocess.CompletedProcess(command, 0, "List of available languages (2):\neng\nsnum\n", "")
                if command[1] == "stdin":
                    return subprocess.CompletedProcess(command, 0, "6\n", "")
                return subprocess.CompletedProcess(command, 0, VALID_OCR, "")

            with mock.patch("scripts.nysed_ela_image_validation.subprocess.run", side_effect=fake_run):
                generated = validate_ela_question_image(
                    image,
                    cache_root,
                    tesseract_binary="/test/tesseract",
                    expected_question_number=6,
                )

            self.assertFalse(generated.used_cache)
            self.assertEqual(len(calls), 5)
            self.assertTrue(generated.cache_path.exists())
            image_sha = hashlib.sha256(image.read_bytes()).hexdigest()
            self.assertIn(image_sha, generated.cache_path.name)
            record = json.loads(generated.cache_path.read_text(encoding="utf-8"))
            self.assertEqual(record["validationVersion"], VALIDATION_VERSION)
            self.assertEqual(record["imageSha256"], image_sha)
            self.assertEqual(record["tesseractVersion"], "tesseract 5.5.0")
            self.assertEqual(record["normalizedOcr"], generated.normalized_ocr)
            self.assertEqual(record["printedQuestionNumber"], 6)
            self.assertEqual(record["numberOcrLanguage"], "snum+eng")
            self.assertEqual(record["choiceLabels"], ["A", "B", "C", "D"])

            with mock.patch(
                "scripts.nysed_ela_image_validation.subprocess.run",
                side_effect=AssertionError("offline replay must not invoke Tesseract"),
            ):
                replayed = validate_ela_question_image(
                    image,
                    cache_root,
                    tesseract_binary=None,
                    expected_question_number=6,
                    offline=True,
                )

            self.assertTrue(replayed.used_cache)
            self.assertEqual(replayed.normalized_ocr, generated.normalized_ocr)
            self.assertEqual(replayed.fallback_alt, generated.fallback_alt)
            self.assertEqual(replayed.choice_labels, ("A", "B", "C", "D"))

    def test_isolated_choice_column_recovers_label_missed_by_full_ocr(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            root = Path(temporary_directory)
            image = root / "q24.webp"
            cache_root = root / "cache"
            Image.new("RGB", (200, 200), "white").save(image, format="WEBP", lossless=True)
            full_ocr_missing_a = """
            24 Which sentence best supports the inference?
            because the speaker changes her mind after listening
            B because the speaker remembers an earlier promise
            C because the speaker wants to help her friend
            D because the speaker finally understands the problem
            """
            number_calls = 0

            def fake_run(command: list[str] | tuple[str, ...], **_: object) -> subprocess.CompletedProcess[str]:
                nonlocal number_calls
                if command[1] == "--version":
                    return subprocess.CompletedProcess(command, 0, "tesseract 5.5.0\n", "")
                if command[1] == "--list-langs":
                    return subprocess.CompletedProcess(command, 0, "List of available languages (2):\neng\nsnum\n", "")
                if command[1] != "stdin":
                    return subprocess.CompletedProcess(command, 0, full_ocr_missing_a, "")
                psm = command[command.index("--psm") + 1]
                if psm == "6":
                    return subprocess.CompletedProcess(command, 0, "A\nB\nC\nD\n", "")
                self.assertEqual(psm, "13")
                number_calls += 1
                return subprocess.CompletedProcess(command, 0, "24\n", "")

            with mock.patch("scripts.nysed_ela_image_validation.subprocess.run", side_effect=fake_run):
                result = validate_ela_question_image(
                    image,
                    cache_root,
                    tesseract_binary="/test/tesseract",
                    expected_question_number=24,
                )

            self.assertEqual(number_calls, 2)
            self.assertNotIn("\nA ", result.normalized_ocr)
            self.assertEqual(result.choice_labels, ("A", "B", "C", "D"))
            record = json.loads(result.cache_path.read_text(encoding="utf-8"))
            self.assertEqual(record["choiceLabels"], ["A", "B", "C", "D"])

            with mock.patch(
                "scripts.nysed_ela_image_validation.subprocess.run",
                side_effect=AssertionError("cached fallback must not invoke Tesseract"),
            ):
                replayed = validate_ela_question_image(
                    image,
                    cache_root,
                    tesseract_binary=None,
                    expected_question_number=24,
                    offline=True,
                )
            self.assertEqual(replayed.choice_labels, ("A", "B", "C", "D"))

    def test_isolated_choice_column_excludes_modern_question_number_box(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            root = Path(temporary_directory)
            image = root / "q14.webp"
            cache_root = root / "cache"
            rendered = Image.new("RGB", (220, 240), "white")
            draw = ImageDraw.Draw(rendered)
            draw.rectangle((8, 0, 67, 54), fill="lightgray")
            draw.line((67, 0, 67, 54), fill="black", width=1)
            draw.rectangle((98, 55, 110, 63), fill="black")
            for top in (80, 115, 150, 185):
                draw.rectangle((98, top, 110, top + 18), fill="black")
            rendered.save(image, format="WEBP", lossless=True)
            full_ocr_extra_label = """
            14 Which sentence best shows how this idea is shown in the story?
            D
            A first choice
            B second choice
            C third choice
            D fourth choice
            """

            def fake_run(command: list[str] | tuple[str, ...], **kwargs: object) -> subprocess.CompletedProcess[str]:
                if command[1] == "--version":
                    return subprocess.CompletedProcess(command, 0, "tesseract 5.5.0\n", "")
                if command[1] == "--list-langs":
                    return subprocess.CompletedProcess(command, 0, "List of available languages (2):\neng\nsnum\n", "")
                if command[1] != "stdin":
                    return subprocess.CompletedProcess(command, 0, full_ocr_extra_label, "")
                psm = command[command.index("--psm") + 1]
                if psm == "6":
                    payload = kwargs["input"]
                    self.assertIsInstance(payload, bytes)
                    with Image.open(io.BytesIO(payload)) as isolated:
                        isolated.load()
                        # The prepared crop has a 40px white border.  Its first
                        # ten content rows must exclude the low stem artifact.
                        self.assertEqual(
                            isolated.crop((40, 40, 115, 50)).getextrema(),
                            (255, 255),
                        )
                    return subprocess.CompletedProcess(command, 0, "A\nB\nC\nD\n", "")
                return subprocess.CompletedProcess(command, 0, "14\n", "")

            with mock.patch("scripts.nysed_ela_image_validation.subprocess.run", side_effect=fake_run):
                result = validate_ela_question_image(
                    image,
                    cache_root,
                    tesseract_binary="/test/tesseract",
                    expected_question_number=14,
                )

            self.assertEqual(result.choice_labels, ("A", "B", "C", "D"))

    def test_isolated_choice_column_rejects_missing_d(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            root = Path(temporary_directory)
            image = root / "q07.webp"
            Image.new("RGB", (200, 200), "white").save(image, format="WEBP", lossless=True)
            full_ocr_missing_d = VALID_OCR.replace("D. because", "because")

            def fake_run(command: list[str] | tuple[str, ...], **_: object) -> subprocess.CompletedProcess[str]:
                if command[1] == "--version":
                    return subprocess.CompletedProcess(command, 0, "tesseract 5.5.0\n", "")
                if command[1] == "--list-langs":
                    return subprocess.CompletedProcess(command, 0, "List of available languages (2):\neng\nsnum\n", "")
                if command[1] == "stdin":
                    return subprocess.CompletedProcess(command, 0, "A\nB\nC\n", "")
                return subprocess.CompletedProcess(command, 0, full_ocr_missing_d, "")

            with mock.patch("scripts.nysed_ela_image_validation.subprocess.run", side_effect=fake_run):
                with self.assertRaisesRegex(ElaImageValidationError, "missing exact ordered A-D"):
                    validate_ela_question_image(
                        image,
                        root / "cache",
                        tesseract_binary="/test/tesseract",
                        expected_question_number=7,
                        offline=True,
                    )

    def test_changed_image_hash_cannot_reuse_cached_ocr(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            root = Path(temporary_directory)
            image = root / "q06.webp"
            cache_root = root / "cache"
            write_minimal_webp(image)

            def fake_run(command: list[str] | tuple[str, ...], **_: object) -> subprocess.CompletedProcess[str]:
                if command[1] == "--version":
                    return subprocess.CompletedProcess(command, 0, "tesseract 5.5.0\n", "")
                if command[1] == "--list-langs":
                    return subprocess.CompletedProcess(command, 0, "List of available languages (2):\neng\nsnum\n", "")
                if command[1] == "stdin":
                    return subprocess.CompletedProcess(command, 0, "6\n", "")
                return subprocess.CompletedProcess(command, 0, VALID_OCR, "")

            with mock.patch("scripts.nysed_ela_image_validation.subprocess.run", side_effect=fake_run):
                validate_ela_question_image(
                    image,
                    cache_root,
                    tesseract_binary="/test/tesseract",
                    expected_question_number=6,
                )

            image.write_bytes(image.read_bytes() + b"changed")
            with self.assertRaisesRegex(ElaImageValidationError, "requires a valid cached"):
                validate_ela_question_image(
                    image,
                    cache_root,
                    tesseract_binary=None,
                    expected_question_number=6,
                    offline=True,
                )


if __name__ == "__main__":
    unittest.main()

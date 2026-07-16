from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest import mock

import numpy as np
from PIL import Image, ImageDraw

from scripts.import_nysed_math_mc import (
    ImportFailure,
    Marker,
    mask_selectable_footer_words,
)
from scripts.nysed_ela_modern import (
    _ela_gray_strip_runs,
    ela_crop_boxes_from_markers,
    validate_final_question_images,
)


class GrayBoxGeometryTests(unittest.TestCase):
    def test_shifted_probe_recovers_left_shifted_exact_box_geometry(self) -> None:
        scale = 2.0
        pixels = np.full((220, 220), 255, dtype=np.uint8)
        pixels[120:170, 48:96] = 200  # 24×25 points at x=24..48, y=60..85.

        self.assertEqual(_ela_gray_strip_runs(pixels, scale, 36.0), [])
        self.assertEqual(_ela_gray_strip_runs(pixels, scale, 24.0), [(120, 169)])

    def test_shifted_probe_recovers_right_shifted_exact_box_geometry(self) -> None:
        scale = 2.0
        pixels = np.full((220, 220), 255, dtype=np.uint8)
        pixels[120:170, 106:154] = 200  # 24×25 points at x=53..77, y=60..85.

        self.assertEqual(_ela_gray_strip_runs(pixels, scale, 36.0), [])
        self.assertEqual(_ela_gray_strip_runs(pixels, scale, 48.0), [(120, 169)])


class _FooterPage:
    height = 791.118

    def extract_words(self, **_: object) -> list[dict[str, object]]:
        return [
            {"text": "D", "top": 614.6, "bottom": 626.6, "x0": 74.0, "x1": 82.0},
            {"text": "last", "top": 612.7, "bottom": 625.7, "x0": 102.0, "x1": 128.0},
            {"text": "answer", "top": 612.7, "bottom": 625.7, "x0": 132.0, "x1": 168.0},
            {"text": "stop", "top": 612.7, "bottom": 625.7, "x0": 172.0, "x1": 198.0},
            {"text": "GOON", "top": 708.75, "bottom": 726.75, "x0": 500.0, "x1": 558.0},
            {"text": "Page", "top": 730.66, "bottom": 742.66, "x0": 520.0, "x1": 550.0},
        ]


class _FooterPdf:
    def __init__(self) -> None:
        self.pages = [SimpleNamespace()] * 11 + [_FooterPage()]

    def __enter__(self) -> _FooterPdf:
        return self

    def __exit__(self, *_: object) -> None:
        return None


class _OverlappingFooterPage:
    height = 791.118

    def extract_words(self, **_: object) -> list[dict[str, object]]:
        return [
            {"text": "D", "top": 699.2, "bottom": 713.2, "x0": 73.8, "x1": 82.0},
            {"text": "part", "top": 702.1, "bottom": 715.1, "x0": 105.0, "x1": 128.0},
            {"text": "of", "top": 702.1, "bottom": 715.1, "x0": 132.0, "x1": 143.0},
            {"text": "a", "top": 702.1, "bottom": 715.1, "x0": 147.0, "x1": 154.0},
            {"text": "book", "top": 702.1, "bottom": 715.1, "x0": 158.0, "x1": 184.0},
            {"text": "GO", "top": 710.4, "bottom": 728.4, "x0": 504.0, "x1": 532.0},
            {"text": "ON", "top": 710.4, "bottom": 728.4, "x0": 537.0, "x1": 566.0},
            {"text": "Page", "top": 735.0, "bottom": 747.0, "x0": 520.0, "x1": 550.0},
        ]


class _OverlappingFooterPdf:
    def __init__(self) -> None:
        self.page = _OverlappingFooterPage()
        self.pages = [SimpleNamespace()] * 11 + [self.page]

    def __enter__(self) -> _OverlappingFooterPdf:
        return self

    def __exit__(self, *_: object) -> None:
        return None


class CropBoundaryTests(unittest.TestCase):
    def test_selectable_footer_row_overrides_false_early_raster_boundary(self) -> None:
        marker = Marker(3, 11, 485.55, 28.0, 1.0, "gray-box-verified")
        with (
            mock.patch(
                "scripts.nysed_ela_modern.crop_boxes_from_markers",
                return_value={3: (12, (28.0, 485.55, 583.265, 604.694))},
            ),
            mock.patch(
                "scripts.nysed_ela_modern.pdfplumber.open",
                return_value=_FooterPdf(),
            ),
        ):
            boxes = ela_crop_boxes_from_markers(Path("release.pdf"), [marker])

        self.assertEqual(boxes[3][0], 12)
        self.assertAlmostEqual(boxes[3][1][3], 700.75)

    def test_overlapping_answer_row_is_preserved_and_exact_footer_is_masked(self) -> None:
        marker = Marker(3, 11, 570.243, 28.0, 1.0, "gray-box-verified")
        fake_pdf = _OverlappingFooterPdf()
        with (
            mock.patch(
                "scripts.nysed_ela_modern.crop_boxes_from_markers",
                return_value={3: (12, (28.0, 570.243, 584.0, 702.372))},
            ),
            mock.patch(
                "scripts.nysed_ela_modern.pdfplumber.open",
                return_value=fake_pdf,
            ),
        ):
            boxes = ela_crop_boxes_from_markers(Path("release.pdf"), [marker])

        box = boxes[3][1]
        self.assertAlmostEqual(box[3], 717.1)

        raw = Image.new("RGB", (round(box[2] - box[0]), round(box[3] - box[1])), "white")
        draw = ImageDraw.Draw(raw)
        draw.rectangle((40, 130, 160, 145), fill="black")  # complete D answer row
        # Simulate italic footer glyphs overshooting both the selectable word
        # box and its measured top, including marks to the right of ON.
        draw.rectangle((472, 136, raw.width - 1, raw.height - 1), fill="black")
        masked = mask_selectable_footer_words(raw, fake_pdf.page, box, 1.0, 1.0)

        self.assertEqual(masked.getpixel((100, 140)), (0, 0, 0))
        self.assertFalse((np.asarray(masked)[136:, 472:] < 245).any())


class FinalStemAlignmentTests(unittest.TestCase):
    def test_focused_head_proves_short_word_dropped_by_full_ocr_and_replays(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            image_directory = Path(temporary_directory)
            manifest_path = image_directory / ".nysed-import.json"
            manifest_path.write_text(json.dumps({"renderBasis": "test"}), encoding="utf-8")
            source_alt = (
                "Question 22. In paragraph 29, what does the phrase suggest? "
                "A first choice B second choice C third choice D fourth choice"
            )
            source_alts = {22: source_alt}
            validated = SimpleNamespace(
                normalized_ocr=(
                    "22 Paragraph 29, what does the phrase suggest?\n"
                    "A first choice\nB second choice\nC third choice\nD fourth choice"
                ),
                fallback_alt="full OCR omitted the short first word",
            )
            focused = "In paragraph 29, what does the phrase suggest?"

            with (
                mock.patch(
                    "scripts.nysed_ela_modern.validate_ela_question_image",
                    return_value=validated,
                ),
                mock.patch(
                    "scripts.nysed_ela_modern._run_stem_head_ocr",
                    return_value=focused,
                ) as run_focused,
            ):
                validate_final_question_images(
                    image_directory,
                    [22],
                    source_alts,
                    image_directory / "cache",
                    "tesseract",
                    offline=True,
                )

            self.assertEqual(run_focused.call_count, 1)
            self.assertEqual(source_alts[22], source_alt)
            cached = json.loads(manifest_path.read_text(encoding="utf-8"))
            self.assertEqual(cached["altText"]["22"], source_alt)
            self.assertEqual(cached["elaStemHeadText"]["22"], focused)

            replay_alts = {22: source_alt}
            with (
                mock.patch(
                    "scripts.nysed_ela_modern.validate_ela_question_image",
                    return_value=validated,
                ),
                mock.patch(
                    "scripts.nysed_ela_modern._run_stem_head_ocr",
                    side_effect=AssertionError("offline replay must use focused-head cache"),
                ),
            ):
                validate_final_question_images(
                    image_directory,
                    [22],
                    replay_alts,
                    image_directory / "cache",
                    None,
                    offline=True,
                )

            self.assertEqual(replay_alts[22], source_alt)

    def test_leading_symbol_uses_focused_stem_ocr_repairs_alt_and_replays_offline(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            image_directory = Path(temporary_directory)
            manifest_path = image_directory / ".nysed-import.json"
            manifest_path.write_text(json.dumps({"renderBasis": "test"}), encoding="utf-8")
            source_alts = {
                22: (
                    "Question 22. ™ paragraph 2, what does the phrase suggest? "
                    "A first choice B second choice C third choice D fourth choice"
                )
            }
            validated = SimpleNamespace(
                normalized_ocr=(
                    "22 TM paragraph 2, what does the phrase suggest?\n"
                    "A first choice\nB second choice\nC third choice\nD fourth choice"
                ),
                fallback_alt="noisy full OCR must not replace the accurate stem head",
            )
            focused = "In paragraph 2, what does the phrase suggest?"

            with (
                mock.patch(
                    "scripts.nysed_ela_modern.validate_ela_question_image",
                    return_value=validated,
                ),
                mock.patch(
                    "scripts.nysed_ela_modern._run_stem_head_ocr",
                    return_value=focused,
                ) as run_focused,
            ):
                validate_final_question_images(
                    image_directory,
                    [22],
                    source_alts,
                    image_directory / "cache",
                    "tesseract",
                    offline=True,
                )

            self.assertEqual(run_focused.call_count, 1)
            self.assertTrue(source_alts[22].startswith("Question 22. In paragraph 2"))
            self.assertNotIn("™", source_alts[22])
            cached = json.loads(manifest_path.read_text(encoding="utf-8"))
            self.assertEqual(cached["altText"]["22"], source_alts[22])
            self.assertEqual(cached["elaStemHeadText"]["22"], focused)

            replay_alts = {22: cached["altText"]["22"]}
            with (
                mock.patch(
                    "scripts.nysed_ela_modern.validate_ela_question_image",
                    return_value=validated,
                ),
                mock.patch(
                    "scripts.nysed_ela_modern._run_stem_head_ocr",
                    side_effect=AssertionError("offline replay must use stem-head evidence"),
                ),
            ):
                validate_final_question_images(
                    image_directory,
                    [22],
                    replay_alts,
                    image_directory / "cache",
                    None,
                    offline=True,
                )
            self.assertEqual(replay_alts[22], source_alts[22])

    def test_leading_symbol_focused_ocr_requires_following_word_alignment(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            image_directory = Path(temporary_directory)
            source_alts = {
                22: (
                    "Question 22. ™ paragraph 2, what does the phrase suggest? "
                    "A first choice B second choice C third choice D fourth choice"
                )
            }
            validated = SimpleNamespace(
                normalized_ocr=(
                    "22 TM paragraph 2, what does the phrase suggest?\n"
                    "A first choice\nB second choice\nC third choice\nD fourth choice"
                ),
                fallback_alt="unused OCR fallback",
            )

            with (
                mock.patch(
                    "scripts.nysed_ela_modern.validate_ela_question_image",
                    return_value=validated,
                ),
                mock.patch(
                    "scripts.nysed_ela_modern._run_stem_head_ocr",
                    return_value="In section 2, what does the phrase suggest?",
                ),
            ):
                with self.assertRaisesRegex(ImportFailure, "left-truncated stem"):
                    validate_final_question_images(
                        image_directory,
                        [22],
                        source_alts,
                        image_directory / "cache",
                        "tesseract",
                        offline=True,
                    )

            self.assertIn("™", source_alts[22])

    def test_rendered_join_of_first_two_source_words_keeps_pdf_alt(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            image_directory = Path(temporary_directory)
            source_alt = (
                "Question 21. In which section would the reader find the answer? "
                "A first choice B second choice C third choice D fourth choice"
            )
            source_alts = {21: source_alt}
            validated = SimpleNamespace(
                normalized_ocr=(
                    "21 Inwhich section would the reader find the answer?\n"
                    "A first choice\nB second choice\nC third choice\nD fourth choice"
                ),
                fallback_alt="joined OCR must not replace the accurate PDF alt",
            )

            with mock.patch(
                "scripts.nysed_ela_modern.validate_ela_question_image",
                return_value=validated,
            ):
                validate_final_question_images(
                    image_directory,
                    [21],
                    source_alts,
                    image_directory / "cache",
                    "tesseract",
                    offline=True,
                )

            self.assertEqual(source_alts[21], source_alt)

    def test_rendered_join_rule_rejects_missing_first_source_word(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            image_directory = Path(temporary_directory)
            source_alts = {
                21: (
                    "Question 21. In which section would the reader find the answer? "
                    "A first choice B second choice C third choice D fourth choice"
                )
            }
            validated = SimpleNamespace(
                normalized_ocr=(
                    "21 Which section would the reader find the answer?\n"
                    "A first choice\nB second choice\nC third choice\nD fourth choice"
                ),
                fallback_alt="unused OCR fallback",
            )

            with (
                mock.patch(
                    "scripts.nysed_ela_modern.validate_ela_question_image",
                    return_value=validated,
                ),
                mock.patch(
                    "scripts.nysed_ela_modern._run_stem_head_ocr",
                    return_value="Which section would the reader find the answer?",
                ),
            ):
                with self.assertRaisesRegex(ImportFailure, "left-truncated stem"):
                    validate_final_question_images(
                        image_directory,
                        [21],
                        source_alts,
                        image_directory / "cache",
                        "tesseract",
                        offline=True,
                    )

    def test_rendered_join_rule_rejects_wrong_join(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            image_directory = Path(temporary_directory)
            source_alts = {
                21: (
                    "Question 21. In which section would the reader find the answer? "
                    "A first choice B second choice C third choice D fourth choice"
                )
            }
            validated = SimpleNamespace(
                normalized_ocr=(
                    "21 Inwhere section would the reader find the answer?\n"
                    "A first choice\nB second choice\nC third choice\nD fourth choice"
                ),
                fallback_alt="unused OCR fallback",
            )

            with mock.patch(
                "scripts.nysed_ela_modern.validate_ela_question_image",
                return_value=validated,
            ):
                with self.assertRaisesRegex(ImportFailure, "left-truncated stem"):
                    validate_final_question_images(
                        image_directory,
                        [21],
                        source_alts,
                        image_directory / "cache",
                        "tesseract",
                        offline=True,
                    )

    def test_short_first_word_allows_one_ocr_glyph_when_second_word_matches(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            image_directory = Path(temporary_directory)
            source_alt = (
                "Question 1. In paragraph 7, what does Sylvie mean? "
                "A first choice B second choice C third choice D fourth choice"
            )
            source_alts = {1: source_alt}
            validated = SimpleNamespace(
                normalized_ocr=(
                    "1 Im paragraph 7, what does Sylvie mean?\n"
                    "A first choice\nB second choice\nC third choice\nD fourth choice"
                ),
                fallback_alt="noisy OCR must not replace the accurate PDF alt",
            )

            with mock.patch(
                "scripts.nysed_ela_modern.validate_ela_question_image",
                return_value=validated,
            ):
                validate_final_question_images(
                    image_directory,
                    [1],
                    source_alts,
                    image_directory / "cache",
                    "tesseract",
                    offline=True,
                )

            self.assertEqual(source_alts[1], source_alt)

    def test_short_first_word_cannot_mask_true_left_truncation(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            image_directory = Path(temporary_directory)
            source_alts = {
                1: (
                    "Question 1. In paragraph 7, what does Sylvie mean? "
                    "A first choice B second choice C third choice D fourth choice"
                )
            }
            validated = SimpleNamespace(
                normalized_ocr=(
                    "1 Paragraph 7, what does Sylvie mean?\n"
                    "A first choice\nB second choice\nC third choice\nD fourth choice"
                ),
                fallback_alt="unused OCR fallback",
            )

            with (
                mock.patch(
                    "scripts.nysed_ela_modern.validate_ela_question_image",
                    return_value=validated,
                ),
                mock.patch(
                    "scripts.nysed_ela_modern._run_stem_head_ocr",
                    return_value="Paragraph 7, what does Sylvie mean?",
                ),
            ):
                with self.assertRaisesRegex(ImportFailure, "left-truncated stem"):
                    validate_final_question_images(
                        image_directory,
                        [1],
                        source_alts,
                        image_directory / "cache",
                        "tesseract",
                        offline=True,
                    )

    def test_joined_one_letter_source_stem_repairs_and_caches_validated_ocr_alt(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            image_directory = Path(temporary_directory)
            manifest_path = image_directory / ".nysed-import.json"
            manifest_path.write_text(json.dumps({"renderBasis": "test"}), encoding="utf-8")
            source_alts = {
                1: (
                    "Question 1. A ccording to the article, why does the fish make a cocoon? "
                    "A first choice B second choice C third choice D fourth choice"
                )
            }
            validated = SimpleNamespace(
                normalized_ocr=(
                    "1 According to the article, why does the fish make a cocoon?\n"
                    "A first choice\nB second choice\nC third choice\nD fourth choice"
                ),
                fallback_alt=(
                    "1 According to the article, why does the fish make a cocoon? "
                    "A first choice B second choice C third choice D fourth choice"
                ),
            )

            with mock.patch(
                "scripts.nysed_ela_modern.validate_ela_question_image",
                return_value=validated,
            ):
                validate_final_question_images(
                    image_directory,
                    [1],
                    source_alts,
                    image_directory / "cache",
                    "tesseract",
                    offline=True,
                )

            self.assertTrue(source_alts[1].startswith("Question 1. According to the article"))
            cached = json.loads(manifest_path.read_text(encoding="utf-8"))
            self.assertEqual(cached["altText"]["1"], source_alts[1])

    def test_legitimate_one_letter_stem_keeps_pdf_alt(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            image_directory = Path(temporary_directory)
            source_alt = (
                "Question 1. A student reads the article and selects the best evidence. "
                "A first choice B second choice C third choice D fourth choice"
            )
            source_alts = {1: source_alt}
            validated = SimpleNamespace(
                normalized_ocr=(
                    "1 A student reads the article and selects the best evidence.\n"
                    "A first choice\nB second choice\nC third choice\nD fourth choice"
                ),
                fallback_alt="unused OCR fallback",
            )

            with mock.patch(
                "scripts.nysed_ela_modern.validate_ela_question_image",
                return_value=validated,
            ):
                validate_final_question_images(
                    image_directory,
                    [1],
                    source_alts,
                    image_directory / "cache",
                    "tesseract",
                    offline=True,
                )

            self.assertEqual(source_alts[1], source_alt)

    def test_joined_candidate_cannot_mask_a_different_rendered_stem(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            image_directory = Path(temporary_directory)
            source_alts = {
                1: (
                    "Question 1. A ccording to the article, choose the best evidence. "
                    "A first choice B second choice C third choice D fourth choice"
                )
            }
            validated = SimpleNamespace(
                normalized_ocr=(
                    "1 Which detail best supports the answer?\n"
                    "A first choice\nB second choice\nC third choice\nD fourth choice"
                ),
                fallback_alt="unused OCR fallback",
            )

            with mock.patch(
                "scripts.nysed_ela_modern.validate_ela_question_image",
                return_value=validated,
            ):
                with self.assertRaisesRegex(ImportFailure, "left-truncated stem"):
                    validate_final_question_images(
                        image_directory,
                        [1],
                        source_alts,
                        image_directory / "cache",
                        "tesseract",
                        offline=True,
                    )


if __name__ == "__main__":
    unittest.main()

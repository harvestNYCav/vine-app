from __future__ import annotations

import unittest

from PIL import Image

from scripts.import_nysed_math_mc import (
    ImportFailure,
    Marker,
    clean_alt_text,
    remap_markers_to_gray_box_positions,
    verified_choice_labels_for_question,
)


class MarkerDpiRetryTests(unittest.TestCase):
    def test_high_dpi_identities_reuse_original_crop_coordinates(self) -> None:
        box = Image.new("L", (40, 40), 255)
        original_positions = [
            (8, 45.9, box),
            (9, 222.3, box),
        ]
        retry_markers = [
            Marker(4, 8, 46.2, 40.0, 0.0, "gray-box-verified"),
            Marker(41, 9, 222.6, 40.0, 0.0, "gray-box-verified"),
        ]

        remapped = remap_markers_to_gray_box_positions(
            retry_markers,
            original_positions,
        )

        self.assertIsNotNone(remapped)
        self.assertEqual([marker.number for marker in remapped or []], [4, 41])
        self.assertEqual([marker.top for marker in remapped or []], [45.9, 222.3])
        self.assertTrue(
            all(marker.method.endswith("-render-dpi-remap") for marker in remapped or [])
        )

    def test_retry_cannot_reuse_or_guess_a_different_gray_box(self) -> None:
        box = Image.new("L", (40, 40), 255)
        positions = [(8, 45.9, box)]

        self.assertIsNone(
            remap_markers_to_gray_box_positions(
                [
                    Marker(4, 8, 46.2, 40.0, 0.0, "gray-box-verified"),
                    Marker(5, 8, 46.3, 40.0, 0.0, "gray-box-verified"),
                ],
                positions,
            )
        )
        self.assertIsNone(
            remap_markers_to_gray_box_positions(
                [Marker(4, 8, 60.0, 40.0, 0.0, "gray-box-verified")],
                positions,
            )
        )


class VerifiedChoiceLabelTests(unittest.TestCase):
    def test_three_choice_variant_requires_exact_source_and_crop_hashes(self) -> None:
        labels = verified_choice_labels_for_question(
            question_id="nysed-2016-g4-mc-q24",
            source_pdf_sha256="3d7f1449506b430ef2c8fdacddc2db38fd03a568bbab4cac1c5d5b22affd3455",
            question_image_sha256="185985912b8e9d3bf333598892d6efe3e6392d7202e683745534d4f551ade225",
        )
        self.assertEqual(labels, ["A", "B", "C"])

        with self.assertRaisesRegex(ImportFailure, "choice-label source changed"):
            verified_choice_labels_for_question(
                question_id="nysed-2016-g4-mc-q24",
                source_pdf_sha256="0" * 64,
                question_image_sha256="185985912b8e9d3bf333598892d6efe3e6392d7202e683745534d4f551ade225",
            )
        with self.assertRaisesRegex(ImportFailure, "choice-label crop changed"):
            verified_choice_labels_for_question(
                question_id="nysed-2016-g4-mc-q24",
                source_pdf_sha256="3d7f1449506b430ef2c8fdacddc2db38fd03a568bbab4cac1c5d5b22affd3455",
                question_image_sha256="0" * 64,
            )

    def test_ordinary_question_has_no_raw_choice_label_override(self) -> None:
        self.assertIsNone(
            verified_choice_labels_for_question(
                question_id="nysed-2016-g4-mc-q25",
                source_pdf_sha256="0" * 64,
                question_image_sha256="0" * 64,
            )
        )


class AccessibilityChromeCleanupTests(unittest.TestCase):
    def test_preserves_go_on_inside_question_content(self) -> None:
        value = clean_alt_text(
            "6 The class used five identical buses to go on a field trip.\n"
            "A 20\nB 24\nC 25\nD 32",
            6,
            "en",
        )

        self.assertIn("to go on a field trip", value)

    def test_preserves_stop_inside_question_content(self) -> None:
        value = clean_alt_text(
            "14 The bus should arrive at her stop before 8:20, and the spinner will stop on blue.\n"
            "A 3/10\nB 1/3\nC 7/20\nD 13/20",
            14,
            "en",
        )

        self.assertIn("her stop before 8:20", value)
        self.assertIn("will stop on blue", value)

    def test_removes_only_standalone_booklet_chrome(self) -> None:
        value = clean_alt_text(
            "3 Which detail supports the claim?\n"
            "A The weather changes.\nGO ON\nPage 4\nSession 1",
            3,
            "en",
        )

        self.assertNotIn("GO ON", value)
        self.assertNotIn("Page 4", value)
        self.assertNotIn("Session 1", value)

    def test_preserves_chrome_words_when_they_are_not_standalone(self) -> None:
        value = clean_alt_text(
            "3 Read page 4 and stop when the signal changes.",
            3,
            "en",
        )

        self.assertIn("page 4 and stop", value.lower())


if __name__ == "__main__":
    unittest.main()

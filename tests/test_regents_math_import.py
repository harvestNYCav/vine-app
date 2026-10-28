"""Regression checks for Math Regents question cropping."""

import unittest
from types import SimpleNamespace

from scripts.regents_math_import import ImportFailure, QuestionMarker, image_crop_box, validate_image_alt


class CropBoxTests(unittest.TestCase):
    def test_descriptions_reject_answer_judgments_but_allow_neutral_choices(self):
        for text in (
            "Choice four introduces an unjustified negative sign.",
            "The first choice incorrectly names y equals zero as its asymptote.",
            "Only choice four has a negative time exponent.",
            "The correct answer is choice two.",
        ):
            with self.subTest(text=text), self.assertRaises(ImportFailure):
                validate_image_alt(text)
        validate_image_alt("Choice 1 is a square; choice 2 is a triangle. Both are drawn without measurements.")
        validate_image_alt("The image-only choices show four different solid shapes.")

    def test_roman_numeral_statement_does_not_end_question(self):
        page = SimpleNamespace(
            height=800,
            width=600,
            extract_words=lambda: [
                {"text": "Algebra", "top": 320, "x0": 50, "x1": 90},
                {"text": "II", "top": 320, "x0": 95, "x1": 108},
            ],
        )
        marker = QuestionMarker(number=11, page_index=0, top=200, x0=50)
        self.assertEqual(image_crop_box(page, marker, None)[3], 740)

    def test_actual_part_ii_heading_ends_question(self):
        page = SimpleNamespace(
            height=800,
            width=600,
            extract_words=lambda: [
                {"text": "Part", "top": 650, "x0": 70, "x1": 100},
                {"text": "II", "top": 650, "x0": 106, "x1": 119},
            ],
        )
        marker = QuestionMarker(number=24, page_index=0, top=200, x0=50)
        self.assertEqual(image_crop_box(page, marker, None)[3], 632)


if __name__ == "__main__":
    unittest.main()

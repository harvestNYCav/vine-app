"""Regression checks for Math Regents question cropping."""

import unittest
from types import SimpleNamespace

from scripts.regents_math_import import QuestionMarker, image_crop_box


class CropBoxTests(unittest.TestCase):
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

from __future__ import annotations

import unittest

from scripts.import_nysed_ela_mc import ImportFailure, corrected_official_rationale


class CorrectedOfficialElaRationaleTests(unittest.TestCase):
    def test_applies_correction_only_to_exact_reviewed_source(self) -> None:
        cases = (
            (
                2013,
                4,
                2,
                (
                    "Students who choose “B” show an understanding of the key elements of the story. "
                    "This choice begins by focusing on the Sun, bringing in the Wampanoag people as "
                    "the antagonist and describing Maushop’s role in helping the Wampanoag people. "
                    "The degree of emphasis on the various characters, events, and problems in this "
                    "summary mirrors that of the story as well."
                ),
                "seek Maushop's help",
            ),
            (
                2014,
                3,
                12,
                (
                    "Students who choose “A” demonstrate the ability to understand what a word means "
                    "given its use in the text. In this case, they may use a clue in the sentence "
                    "(“around the school”) or recognize that the “short hike” takes place after learning "
                    "the correct way to walk in snowshoes (paragraph 14) and before they hit the trails "
                    "and mountains (paragraph 15)."
                ),
                "slopes and trails nearby",
            ),
        )
        for year, grade, number, original, expected in cases:
            with self.subTest(year=year, grade=grade, number=number):
                corrected = corrected_official_rationale(year, grade, number, original)
                self.assertIsNotNone(corrected)
                self.assertIn(expected, corrected or "")

    def test_fails_closed_when_reviewed_source_changes(self) -> None:
        with self.assertRaisesRegex(ImportFailure, "official ELA rationale changed"):
            corrected_official_rationale(2013, 4, 2, "A changed upstream rationale.")

    def test_unreviewed_rationale_is_unchanged(self) -> None:
        self.assertIsNone(corrected_official_rationale(2013, 3, 1, "Official text"))


if __name__ == "__main__":
    unittest.main()

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
            (
                2013,
                6,
                5,
                (
                    "Students who choose \u201cC\u201d recognize that this section describes how the "
                    "project is unlike most others: Conditions are extreme and the window of time "
                    "for working is only a few months. In answering correctly, they demonstrate an "
                    "understanding that the author establishes the unique nature of the "
                    "\u201cthoroughfare\u201d to set the stage for ideas discussed throughout the text."
                ),
                "path of groomed snow and ice",
            ),
            (
                2014,
                7,
                15,
                (
                    "Students selecting \u201cA\u201d show an understanding of the meaning of \u201cleftovers\u201d "
                    "in the context of the article. Lines 28 through 30 explain that there are two "
                    "main sources of comets. One source is an area called the Kuiper Belt. The "
                    "Kuiper Belt is described as being made up of \u201cplanetary leftovers\u201d or pieces "
                    "of what were once the \u201cpreviously used\u201d parts of planets."
                ),
                "remaining after the planets formed",
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

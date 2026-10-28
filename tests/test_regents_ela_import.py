"""Integrity checks for the released Regents ELA Part 1 inventory and review gate."""

from __future__ import annotations

import copy
import importlib.util
import json
import unittest
import tempfile
from unittest.mock import patch
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
CATALOG = ROOT / "content/regents/ela/generated/catalog.json"
SOURCES = ROOT / "content/regents/ela/sources.json"
IMPORTER = ROOT / "scripts/regents_ela_import.py"

spec = importlib.util.spec_from_file_location("regents_ela_import", IMPORTER)
assert spec and spec.loader
regents_ela_import = importlib.util.module_from_spec(spec)
spec.loader.exec_module(regents_ela_import)


class RegentsElaImportTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.catalog = json.loads(CATALOG.read_text(encoding="utf-8"))
        cls.sources = json.loads(SOURCES.read_text(encoding="utf-8"))["administrations"]

    def test_released_administrations_and_official_sources_are_complete(self) -> None:
        self.assertEqual(len(self.sources), 33)
        self.assertEqual(len(self.catalog), 33)
        self.assertEqual(
            {(source["year"], source["administration"]) for source in self.sources},
            regents_ela_import.EXPECTED_ADMINISTRATIONS,
        )
        self.assertEqual(
            {(exam["year"], exam["administration"]) for exam in self.catalog},
            regents_ela_import.EXPECTED_ADMINISTRATIONS,
        )
        for source in self.sources:
            with self.subTest(slug=source["slug"]):
                self.assertTrue(source["sourceUrl"].startswith("https://www.nysedregents.org/hsela/"))
                self.assertTrue(source["answerKeyUrl"].startswith("https://www.nysedregents.org/hsela/"))
        era = {(exam["year"], exam["administration"]): exam["standardsEra"] for exam in self.catalog}
        self.assertEqual(era[2026, "january"], "CCLS")
        self.assertEqual(era[2026, "june"], "NGLS")
        self.assertEqual(era[2026, "august"], "NGLS")

    def test_all_keys_are_present_but_only_reviewed_content_is_publishable(self) -> None:
        self.assertEqual(sum(len(exam["questions"]) for exam in self.catalog), 792)
        for exam in self.catalog:
            with self.subTest(exam=exam["id"]):
                self.assertEqual([question["number"] for question in exam["questions"]], list(range(1, 25)))
                self.assertEqual(len({question["id"] for question in exam["questions"]}), 24)
                by_id = {question["id"]: question for question in exam["questions"]}
                for section in exam["sections"]:
                    for question_id in section["questionIds"]:
                        question = by_id[question_id]
                        self.assertEqual(question["sectionSlug"], section["slug"])
                        if question["readiness"] == "reviewed":
                            passage = section.get("passage")
                            self.assertIsNotNone(passage)
                            self.assertEqual(passage["transcriptReviewStatus"], "reviewed")
                            numbered = [line["number"] for line in passage["lines"] if line["number"] is not None]
                            self.assertEqual(numbered, list(range(1, len(numbered) + 1)))
                            self.assertTrue(question["prompt"].strip())
                            self.assertGreaterEqual(question["sourcePage"], 1)
                            self.assertEqual([choice["label"] for choice in question["choices"]], ["1", "2", "3", "4"])
                            self.assertTrue(all(choice["text"].strip() for choice in question["choices"]))
                            self.assertGreaterEqual(len(question["explanation"].strip()), 20)
                            self.assertNotEqual(question["explanationSource"], "pending-review")
                        else:
                            self.assertEqual(question["readiness"], "needs-review")
                            self.assertEqual(question["explanationSource"], "pending-review")

    def test_catalog_keys_match_cached_official_scoring_pdfs(self) -> None:
        key_paths = [
            regents_ela_import._cache_path(source["slug"], "key", source["answerKeyUrl"])
            for source in self.sources
        ]
        if not all(path.is_file() for path in key_paths):
            self.skipTest("Official ELA scoring PDF cache is not available")
        catalog_by_date = {(exam["year"], exam["administration"]): exam for exam in self.catalog}
        for source, key_path in zip(self.sources, key_paths):
            with self.subTest(slug=source["slug"]):
                answers = regents_ela_import.parse_answer_key(
                    key_path, year=source["year"], administration=source["administration"]
                )
                exam = catalog_by_date[source["year"], source["administration"]]
                self.assertEqual(
                    {question["number"]: question["correct"] for question in exam["questions"]},
                    answers,
                )

    def test_latest_exam_is_fully_reviewed_in_original_question_order(self) -> None:
        exam = next(exam for exam in self.catalog if exam["id"] == "english-2026-august")
        self.assertEqual([section["slug"] for section in exam["sections"]], ["passage-a", "passage-b", "passage-c"])
        self.assertEqual([len(section["questionIds"]) for section in exam["sections"]], [9, 5, 10])
        self.assertTrue(all(question["readiness"] == "reviewed" for question in exam["questions"]))
        self.assertEqual(
            [question["correct"] for question in exam["questions"]],
            ["3", "1", "2", "4", "4", "3", "2", "2", "1", "1", "2", "1", "3", "4", "4", "2", "4", "1", "1", "2", "3", "2", "3", "1"],
        )
        line_28 = next(line["text"] for line in exam["sections"][0]["passage"]["lines"] if line["number"] == 28)
        self.assertIn("*invention*", line_28)

    def test_june_2026_passages_and_keys_are_fully_reviewed(self) -> None:
        exam = next(exam for exam in self.catalog if exam["id"] == "english-2026-june")
        self.assertEqual([section["slug"] for section in exam["sections"]], ["passage-a", "passage-b", "passage-c"])
        self.assertEqual([len(section["questionIds"]) for section in exam["sections"]], [10, 4, 10])
        self.assertEqual(
            [len([line for line in section["passage"]["lines"] if line["number"] is not None]) for section in exam["sections"]],
            [92, 29, 88],
        )
        self.assertTrue(all(question["readiness"] == "reviewed" for question in exam["questions"]))
        self.assertEqual(
            [question["correct"] for question in exam["questions"]],
            ["1", "4", "3", "3", "4", "2", "3", "1", "4", "2", "4", "1", "2", "3", "2", "3", "2", "4", "1", "3", "4", "2", "1", "3"],
        )
        c_lines = exam["sections"][2]["passage"]["lines"]
        self.assertTrue(any(line["number"] is None and "Photograph:" in line["text"] for line in c_lines))
        self.assertTrue(any(line["number"] is None and "indefatigable" in line["text"] for line in c_lines))

    def test_reviewed_administrations_have_complete_passages_and_questions(self) -> None:
        expected = {
            "english-2026-august": ([9, 5, 10], [88, 30, 85]),
            "english-2026-june": ([10, 4, 10], [92, 29, 88]),
            "english-2026-january": ([9, 5, 10], [94, 22, 83]),
            "english-2025-august": ([9, 5, 10], [85, 24, 81]),
            "english-2025-june": ([10, 4, 10], [107, 25, 87]),
            "english-2025-january": ([9, 5, 10], [99, 20, 90]),
            "english-2024-august": ([9, 5, 10], [81, 40, 90]),
            "english-2024-june": ([10, 4, 10], [80, 42, 68]),
            "english-2024-january": ([10, 4, 10], [106, 28, 88]),
            "english-2023-august": ([10, 4, 10], [131, 72, 79]),
            "english-2023-june": ([10, 4, 10], [94, 52, 75]),
            "english-2023-january": ([10, 4, 10], [108, 23, 97]),
            "english-2022-august": ([9, 5, 10], [89, 46, 95]),
            "english-2022-june": ([10, 4, 10], [95, 16, 90]),
            "english-2021-june": ([10, 4, 10], [82, 35, 99]),
            "english-2020-january": ([10, 4, 10], [81, 37, 93]),
            "english-2019-august": ([9, 5, 10], [99, 40, 85]),
            "english-2019-june": ([9, 5, 10], [86, 36, 89]),
            "english-2019-january": ([9, 5, 10], [90, 46, 81]),
            "english-2018-august": ([10, 4, 10], [77, 44, 70]),
            "english-2018-june": ([9, 5, 10], [73, 15, 102]),
            "english-2018-january": ([9, 5, 10], [85, 28, 80]),
            "english-2017-august": ([10, 4, 10], [81, 21, 85]),
            "english-2017-june": ([10, 4, 10], [78, 34, 94]),
            "english-2017-january": ([10, 4, 10], [91, 36, 83]),
            "english-2016-august": ([10, 4, 10], [98, 45, 78]),
            "english-2016-june": ([10, 4, 10], [87, 23, 65]),
            "english-2016-january": ([9, 5, 10], [91, 37, 64]),
            "english-2015-august": ([9, 5, 10], [54, 30, 76]),
            "english-2015-june": ([10, 4, 10], [80, 28, 64]),
            "english-2015-january": ([9, 5, 10], [82, 60, 77]),
            "english-2014-august": ([9, 5, 10], [79, 41, 58]),
            "english-2014-june": ([10, 4, 10], [92, 26, 73]),
        }
        self.assertEqual(set(expected), {exam["id"] for exam in self.catalog})
        self.assertEqual(sum(len(exam["questions"]) for exam in self.catalog), 792)
        self.assertTrue(all(question["readiness"] == "reviewed" for exam in self.catalog for question in exam["questions"]))
        for exam_id, (question_counts, line_counts) in expected.items():
            with self.subTest(exam=exam_id):
                exam = next(exam for exam in self.catalog if exam["id"] == exam_id)
                self.assertEqual([section["slug"] for section in exam["sections"]], ["passage-a", "passage-b", "passage-c"])
                self.assertEqual([len(section["questionIds"]) for section in exam["sections"]], question_counts)
                self.assertEqual(
                    [sum(line["number"] is not None for line in section["passage"]["lines"]) for section in exam["sections"]],
                    line_counts,
                )
                self.assertTrue(all(question["readiness"] == "reviewed" for question in exam["questions"]))

    def test_review_cannot_override_official_key(self) -> None:
        exam = copy.deepcopy(next(exam for exam in self.catalog if exam["id"] == "english-2026-august"))
        answers = {question["number"]: question["correct"] for question in exam["questions"]}
        answers[10] = "2"
        with self.assertRaisesRegex(regents_ela_import.ImportErrorWithContext, "official key"):
            regents_ela_import._apply_review(exam, answers)

    def test_catalog_matches_reviewed_overlays_including_paragraph_breaks(self) -> None:
        for source in self.sources:
            exam = next(exam for exam in self.catalog if exam["id"] == "english-" + source["slug"])
            answers = {q["number"]: q["correct"] for q in exam["questions"]}
            rebuilt = regents_ela_import._apply_review(regents_ela_import._pending_exam(source, answers), answers)
            self.assertEqual(rebuilt, exam, source["slug"])

    def test_paragraph_questions_cannot_publish_a_flattened_passage(self) -> None:
        source = next(source for source in self.sources if source["slug"] == "2025-june")
        exam = next(exam for exam in self.catalog if exam["id"] == "english-2025-june")
        answers = {q["number"]: q["correct"] for q in exam["questions"]}
        review = json.loads((regents_ela_import.REVIEWS_DIR / "fragments/2025-june-a.json").read_text())
        passage = review["sections"][0]["passage"]
        passage["lines"] = [line for line in passage["lines"] if line["text"].strip()]
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "2025-june.json").write_text(json.dumps(review))
            with patch.object(regents_ela_import, "REVIEWS_DIR", root):
                with self.assertRaisesRegex(regents_ela_import.ImportErrorWithContext, "paragraph boundaries"):
                    regents_ela_import._apply_review(regents_ela_import._pending_exam(source, answers), answers)


if __name__ == "__main__":
    unittest.main()

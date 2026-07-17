from __future__ import annotations

import hashlib
import json
import re
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from scripts.nysed_ela_question_accessibility import (
    ELA_QUESTION_ACCESSIBILITY_POLICY_VERSION,
    ElaQuestionAccessibilityError,
    _asset_path as runtime_asset_path,
    ela_question_accessibility_input_hash,
    load_exam_question_accessibility,
    normalize_ela_question_accessibility_text,
    validate_ela_question_accessibility_text,
)
from scripts.seed_nysed_ela_question_accessibility_sidecars import (
    Word,
    _apply_reviewed_question_repairs,
    _asset_path as seeder_asset_path,
    _catalog_first_structured_alt,
    _choice_label_words,
    _choose_source_compared_candidate,
)
from scripts.review_nysed_ela_question_accessibility_sidecars import (
    DEFAULT_APPROVED_ROOT,
    DEFAULT_CATALOG,
    DEFAULT_MANIFEST,
    DEFAULT_PUBLIC_ROOT,
    validate_approved,
)


REPO_ROOT = Path(__file__).resolve().parents[1]
APPROVED_ROOT = REPO_ROOT / "content" / "ela-exams" / "accessibility"


def valid_alt(number: int = 1) -> str:
    return (
        f"Question {number}. Which detail best supports the central idea in the passage? "
        "Choices: A: A robotic helper records the observations. "
        "B: D’Arlandes studies the evidence carefully. "
        "C: The students compare their results. "
        "D: The class explains its conclusion."
    )


class ElaQuestionAccessibilityTextTests(unittest.TestCase):
    def test_reviewed_duplicate_labels_are_collapsed_before_segmentation(self) -> None:
        repaired = _apply_reviewed_question_repairs(
            question_id="nysed-ela-2021-g6-mc-q5",
            number=5,
            value=(
                "Question 5. How does the author develop Grandpa’s point of view? "
                "Choices: A: by describing Grandpa B: B: by sharing his thoughts "
                "C: by including dialogue D: D: by showing how Grandpa acts"
            ),
        )

        self.assertEqual(repaired.count("B:"), 1)
        self.assertEqual(repaired.count("D:"), 1)
        self.assertNotIn("B: B:", repaired)
        self.assertNotIn("D: D:", repaired)

    def test_reviewed_feedback_repairs_match_the_exact_question_artifacts(self) -> None:
        choices = (
            " Choices: A: the first complete response B: the second complete response "
            "C: the third complete response D: the fourth complete response"
        )
        cases = (
            (
                "nysed-ela-2021-g4-mc-q14",
                14,
                "Question 14. What does the phrase suggest? Choices: A: comfort "
                "B: disappointment C: sa feeling of anger D: clear thinking",
                "C: a feeling of anger",
            ),
            (
                "nysed-ela-2017-g4-mc-q19",
                19,
                "Question 19. yg What does paragraph 3 reveal?" + choices,
                "Question 19. What",
            ),
            (
                "nysed-ela-2016-g4-mc-q26",
                26,
                "Question 26. paragraph 7, what does the word show?" + choices,
                "Question 26. In paragraph 7",
            ),
            (
                "nysed-ela-2017-g5-mc-q38",
                38,
                "Question 38. 3g Which evidence best supports the claim?" + choices,
                "Question 38. Which",
            ),
            (
                "nysed-ela-2016-g5-mc-q21",
                21,
                "Question 21. oN Which statement best summarizes the event?" + choices,
                "Question 21. Which",
            ),
            (
                "nysed-ela-2016-g5-mc-q38",
                38,
                "Question 38. 3g How does the author organize the passage?" + choices,
                "Question 38. How",
            ),
            (
                "nysed-ela-2016-g7-mc-q38",
                38,
                "Question 38. 3g Read this sentence from the article." + choices,
                "Question 38. Read",
            ),
            (
                "nysed-ela-2016-g8-mc-q38",
                38,
                "Question 38. 3g The phrase suggests that the speaker" + choices,
                "Question 38. The",
            ),
        )

        for question_id, number, raw, expected in cases:
            with self.subTest(question_id=question_id):
                repaired = _apply_reviewed_question_repairs(
                    question_id=question_id,
                    number=number,
                    value=raw,
                )
                self.assertIn(expected, repaired)
                validate_ela_question_accessibility_text(
                    repaired,
                    question_id=question_id,
                    number=number,
                )

    def test_catalog_projection_does_not_duplicate_choices_separator(self) -> None:
        source = valid_alt()

        projected = _catalog_first_structured_alt(
            number=1,
            catalog_alt=source,
            geometry_alt=source,
        )

        self.assertEqual(projected, source)

    def test_catalog_projection_preserves_reviewed_choice_boundaries(self) -> None:
        source = valid_alt()
        geometry = source.replace(
            "A: A robotic helper records the observations. B:",
            "A: A robotic helper records B: the observations.",
        )

        projected = _catalog_first_structured_alt(
            number=1,
            catalog_alt=source,
            geometry_alt=geometry,
        )

        self.assertEqual(projected, source)

    def test_candidate_selection_prefers_strict_reviewed_catalog_text(self) -> None:
        source = valid_alt()
        geometry = source.replace("A: A robotic", "A: Robotic")

        selected = _choose_source_compared_candidate(
            question_id="nysed-test-q1",
            number=1,
            geometry_alt=geometry,
            catalog_alt=source,
        )

        self.assertEqual(selected, source)

    def test_normalization_preserves_literary_typography_and_symbols(self) -> None:
        source = "Question 1. It’s ½ ≤ ¾—‘exactly.’ Choices: A: 12² B: ÷ C: ≥ D: “done”"

        self.assertEqual(normalize_ela_question_accessibility_text(source), source)

    def test_allows_legitimate_choice_openings_that_resemble_labels(self) -> None:
        text = validate_ela_question_accessibility_text(
            valid_alt(), question_id="nysed-test-q1", number=1
        )

        self.assertIn("A: A robotic", text)
        self.assertIn("B: D’Arlandes", text)

    def test_rejects_answer_key_leak_variants(self) -> None:
        leaks = (
            "Answer: Choice B",
            "Answer choice B",
            "The answer choice is B",
            "Answer = B",
            "Correct: B",
            "B is correct",
            "B (correct)",
            "Choice B (correct)",
            "Choice B is the answer",
            "Option B (correct)",
            "Option B is the answer",
            "The answer was B",
            "Key B",
            "Key = B",
            "Response = B",
            "Solution: B",
        )
        for leak in leaks:
            with self.subTest(leak=leak), self.assertRaisesRegex(
                ElaQuestionAccessibilityError, "answer/scoring metadata"
            ):
                validate_ela_question_accessibility_text(
                    valid_alt().replace(
                        "Which detail best supports the central idea in the passage?",
                        f"Which detail best supports the central idea? {leak}.",
                    ),
                    question_id="nysed-test-q1",
                    number=1,
                )

    def test_rejects_known_extraction_artifacts(self) -> None:
        artifacts = (
            "Aa",
            "Bb",
            "Cc",
            "Dd",
            "Tt",
            "Pp",
            "c",
            "3g",
            "oN",
            "yg",
            "sa feeling",
            "GO ON",
            "H ow",
            "Th e",
            "ﬁ rst",
            "Itis",
            "byraising",
            "be s t",
            "b e st",
            "m o st",
            "couldn’ t",
            "d lown",
            "astory",
            "tobe",
            ",..",
            "records..",
            "EExxcceerrpptt",
            "/Users/reviewer/project/source.pdf",
        )
        for artifact in artifacts:
            with self.subTest(artifact=artifact), self.assertRaises(
                ElaQuestionAccessibilityError
            ):
                validate_ela_question_accessibility_text(
                    valid_alt().replace(
                        "Which detail best supports the central idea in the passage?",
                        f"Which {artifact} detail best supports the central idea in the passage?",
                    ),
                    question_id="nysed-test-q1",
                    number=1,
                )

    def test_rejects_unbalanced_curly_double_quotation_marks(self) -> None:
        broken = valid_alt().replace(
            "Which detail best supports the central idea in the passage?",
            "Which quotation says, “The evidence is clear?",
        )

        with self.assertRaisesRegex(
            ElaQuestionAccessibilityError, "unbalanced quotation marks"
        ):
            validate_ela_question_accessibility_text(
                broken,
                question_id="nysed-test-q1",
                number=1,
            )

    def test_rejects_choice_local_quote_imbalance_even_when_whole_text_balances(self) -> None:
        broken = (
            "Question 1. Which detail best supports the central idea in the passage? "
            "Choices: A: “The first detail has no closing mark. "
            "B: The second detail has no opening mark.” "
            "C: The third detail is complete. D: The fourth detail is complete."
        )

        with self.assertRaisesRegex(
            ElaQuestionAccessibilityError, "unbalanced quotation marks in A"
        ):
            validate_ela_question_accessibility_text(
                broken,
                question_id="nysed-test-q1",
                number=1,
            )

        straight = valid_alt().replace(
            "A robotic helper records the observations.",
            'A robotic helper says "record the observations.',
        )
        with self.assertRaisesRegex(
            ElaQuestionAccessibilityError, "unbalanced quotation marks in A"
        ):
            validate_ela_question_accessibility_text(
                straight,
                question_id="nysed-test-q1",
                number=1,
            )

    def test_rejects_a_spaced_two_digit_crop_number_only_at_stem_tail(self) -> None:
        broken = valid_alt(23).replace(
            "in the passage?",
            "in the passage? 2 3",
        )

        with self.assertRaisesRegex(ElaQuestionAccessibilityError, "spaced crop number"):
            validate_ela_question_accessibility_text(
                broken,
                question_id="nysed-test-q23",
                number=23,
            )

        allowed = valid_alt(23).replace(
            "records the observations",
            "records observations 2 3 times",
        )
        self.assertEqual(
            validate_ela_question_accessibility_text(
                allowed,
                question_id="nysed-test-q23",
                number=23,
            ),
            allowed,
        )


class ElaQuestionAccessibilityPathTests(unittest.TestCase):
    def test_runtime_and_authoring_paths_cannot_escape_asset_root(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            escaped = "/vine-app/nysed/ela/../../outside.webp"
            for resolver in (runtime_asset_path, seeder_asset_path):
                with self.subTest(resolver=resolver.__module__), self.assertRaisesRegex(
                    (ElaQuestionAccessibilityError, ValueError), "escapes"
                ):
                    resolver(root, escaped)

    def test_runtime_and_authoring_paths_reject_terminal_symlinks(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            target = root / "question.webp"
            target.write_bytes(b"reviewed question image")
            link = root / "2025" / "grade-3" / "en" / "q01.webp"
            link.parent.mkdir(parents=True)
            link.symlink_to(target)
            src = "/vine-app/nysed/ela/2025/grade-3/en/q01.webp"

            for resolver in (runtime_asset_path, seeder_asset_path):
                with self.subTest(resolver=resolver.__module__), self.assertRaisesRegex(
                    (ElaQuestionAccessibilityError, ValueError), "symlink"
                ):
                    resolver(root, src)


class ElaQuestionAccessibilityGeometryTests(unittest.TestCase):
    @staticmethod
    def word(label: str, x: float, y: float) -> Word:
        return Word(label, x, y, x + 8, y + 10)

    def test_internal_capital_a_does_not_displace_the_real_label_lane(self) -> None:
        words = [
            self.word("A", 172, 20),
            self.word("A", 96, 100),
            self.word("B", 97, 140),
            self.word("C", 96, 180),
            self.word("D", 98, 220),
        ]

        labels = _choice_label_words(words, left=90, label_lane=105)

        self.assertIsNotNone(labels)
        assert labels is not None
        self.assertEqual([word.text for word in labels], list("ABCD"))
        self.assertEqual(labels[0].x0, 96)

    def test_exactly_one_missing_label_may_be_inferred_but_two_may_not(self) -> None:
        three = [
            self.word("B", 96, 140),
            self.word("C", 96, 180),
            self.word("D", 96, 220),
        ]
        two = three[1:]

        inferred = _choice_label_words(three, left=90, label_lane=105)

        self.assertIsNotNone(inferred)
        assert inferred is not None
        self.assertEqual([word.text for word in inferred], list("ABCD"))
        self.assertIsNone(_choice_label_words(two, left=90, label_lane=105))


class ElaQuestionAccessibilityLoaderTests(unittest.TestCase):
    def test_loader_pins_the_approved_sidecar_bytes_to_review_manifest(self) -> None:
        question_id = "nysed-ela-2025-g3-mc-q1"
        source_sha = "a" * 64
        image_sha = "b" * 64
        input_hash = ela_question_accessibility_input_hash(
            question_id=question_id,
            number=1,
            source_pdf_sha256=source_sha,
            question_image_sha256=image_sha,
        )
        record = {
            "schemaVersion": 1,
            "policyVersion": ELA_QUESTION_ACCESSIBILITY_POLICY_VERSION,
            "examId": "nysed-ela-2025-grade-3-mc-v1",
            "sourcePdfSha256": source_sha,
            "questions": {
                question_id: {"inputHash": input_hash, "alt": valid_alt()}
            },
        }
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            sidecar = root / "2025-grade-3.json"
            sidecar.write_text(json.dumps(record), encoding="utf-8")
            review = {
                "examId": record["examId"],
                "year": 2025,
                "grade": 3,
                "sourcePdfSha256": source_sha,
                "sidecarSha256": hashlib.sha256(sidecar.read_bytes()).hexdigest(),
                "questionCount": 1,
            }
            with patch(
                "scripts.review_nysed_ela_question_accessibility_sidecars.load_review_manifest",
                return_value={record["examId"]: review},
            ):
                loaded = load_exam_question_accessibility(
                    year=2025,
                    grade=3,
                    exam_id=record["examId"],
                    source_pdf_sha256=source_sha,
                    expected_input_hashes={question_id: input_hash},
                    expected_numbers={question_id: 1},
                    root=root,
                    manifest_path=root / "review.json",
                )
                self.assertEqual(loaded[question_id], valid_alt())

                record["questions"][question_id]["alt"] = valid_alt().replace(
                    "central idea", "main idea"
                )
                sidecar.write_text(json.dumps(record), encoding="utf-8")
                with self.assertRaisesRegex(
                    ElaQuestionAccessibilityError, "approved bytes changed"
                ):
                    load_exam_question_accessibility(
                        year=2025,
                        grade=3,
                        exam_id=record["examId"],
                        source_pdf_sha256=source_sha,
                        expected_input_hashes={question_id: input_hash},
                        expected_numbers={question_id: 1},
                        root=root,
                        manifest_path=root / "review.json",
                    )

    def test_explicit_draft_review_can_bypass_only_the_activation_manifest(self) -> None:
        question_id = "nysed-ela-2025-g3-mc-q1"
        source_sha = "a" * 64
        input_hash = "b" * 64
        record = {
            "schemaVersion": 1,
            "policyVersion": ELA_QUESTION_ACCESSIBILITY_POLICY_VERSION,
            "examId": "nysed-ela-2025-grade-3-mc-v1",
            "sourcePdfSha256": source_sha,
            "questions": {
                question_id: {"inputHash": input_hash, "alt": valid_alt()}
            },
        }
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "2025-grade-3.json").write_text(json.dumps(record), encoding="utf-8")

            loaded = load_exam_question_accessibility(
                year=2025,
                grade=3,
                exam_id=record["examId"],
                source_pdf_sha256=source_sha,
                expected_input_hashes={question_id: input_hash},
                expected_numbers={question_id: 1},
                root=root,
                manifest_path=None,
            )

        self.assertEqual(loaded[question_id], valid_alt())


class ElaQuestionAccessibilityCorpusTests(unittest.TestCase):
    def test_committed_approved_corpus_is_fully_source_pinned_and_catalog_current(self) -> None:
        validate_approved(
            approved_root=DEFAULT_APPROVED_ROOT,
            manifest_path=DEFAULT_MANIFEST,
            catalog_path=DEFAULT_CATALOG,
            public_root=DEFAULT_PUBLIC_ROOT,
        )

    def test_modern_approved_text_is_strict_and_catalog_current(self) -> None:
        catalog = json.loads(
            (REPO_ROOT / "content" / "ela-exams" / "generated" / "catalog.json").read_text(
                encoding="utf-8"
            )
        )
        catalog_alts = {
            question["id"]: question["alt"]
            for exam in catalog["exams"]
            if int(exam["year"]) >= 2021
            for question in exam["questions"]
        }
        question_count = 0
        for path in sorted(APPROVED_ROOT.glob("202[1-6]-grade-*.json")):
            record = json.loads(path.read_text(encoding="utf-8"))
            for question_id, item in record["questions"].items():
                self.assertEqual(item["alt"], catalog_alts[question_id])
                validate_ela_question_accessibility_text(
                    item["alt"],
                    question_id=question_id,
                    number=int(re.search(r"-q(\d+)$", question_id).group(1)),
                )
                question_count += 1

        self.assertEqual(question_count, 798)

    def test_accessibility_attachment_precedes_authored_explanation_hashing(self) -> None:
        legacy_source = (REPO_ROOT / "scripts" / "import_nysed_ela_mc.py").read_text(
            encoding="utf-8"
        )
        modern_source = (REPO_ROOT / "scripts" / "nysed_ela_modern.py").read_text(
            encoding="utf-8"
        )
        legacy_function = legacy_source.split("def import_legacy_release(", 1)[1].split(
            "\ndef validate_exam(", 1
        )[0]
        process_key = legacy_source.split("def process_key(", 1)[1].split(
            "\n    exams:", 1
        )[0]
        modern_function = modern_source.split("def _import_modern_pdf(", 1)[1].split(
            "\ndef import_modern_release(", 1
        )[0]

        self.assertLess(
            legacy_function.index("load_and_attach_exam_question_accessibility("),
            legacy_function.index("attach_vine_authored_explanations("),
        )
        self.assertLess(
            modern_function.index("load_and_attach_exam_question_accessibility("),
            modern_function.index("return exam"),
        )
        self.assertLess(
            process_key.index("exam = import_modern_release("),
            process_key.index("attach_vine_authored_explanations(exam"),
        )


if __name__ == "__main__":
    unittest.main()

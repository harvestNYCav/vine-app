from __future__ import annotations

import copy
import dataclasses
import json
import tempfile
import unittest
from pathlib import Path

from scripts.nysed_ela_explanations import (
    EXPLANATION_POLICY_VERSION,
    ElaExplanationError,
    QuestionExplanationInput,
    extract_official_rationale,
    load_exam_explanations,
    question_explanation_input_hash,
    validate_exam_explanation_sidecar,
    validate_question_explanation,
)


VALID_EXPLANATION = (
    "Choice B is supported because paragraph 4 states that the cub follows its mother "
    "into the den, which shows that it depends on her for safety."
)


def valid_sidecar() -> dict[str, object]:
    return {
        "schemaVersion": 1,
        "policyVersion": EXPLANATION_POLICY_VERSION,
        "examId": "nysed-ela-2026-grade-3-mc-v1",
        "questions": {
            "nysed-ela-2026-g3-mc-q1": {
                "inputHash": "a" * 64,
                "explanation": {
                    "text": VALID_EXPLANATION,
                    "source": "vine-authored",
                },
            },
            "nysed-ela-2026-g3-mc-q2": {
                "inputHash": "b" * 64,
                "explanation": {
                    "text": (
                        "The food remains untouched because Little Shaq is too nervous to eat; "
                        "this detail reveals his worry through his behavior."
                    ),
                    "source": "official-nysed",
                },
            },
        },
    }


EXPECTED_HASHES = {
    "nysed-ela-2026-g3-mc-q1": "a" * 64,
    "nysed-ela-2026-g3-mc-q2": "b" * 64,
}


class OfficialRationaleExtractionTests(unittest.TestCase):
    def test_extracts_curly_quoted_choice_and_stops_before_distractors(self) -> None:
        block = """
        Key: C
        HOW THIS QUESTION MEASURES RI.3.1:
        This section describes the standard.

        WHY CHOICE “C” IS CORRECT:
        Students who choose C connect the highway to the truck noise.
        The nearby highway explains the strange sounds because Mlaika copies what she hears.

        WHY THE OTHER CHOICES ARE INCORRECT:
        Choice A is true but irrelevant.
        """

        rationale = extract_official_rationale(block, "C")

        self.assertEqual(
            rationale,
            "Students who choose C connect the highway to the truck noise. "
            "The nearby highway explains the strange sounds because Mlaika copies what she hears.",
        )
        self.assertNotIn("Choice A", rationale)

    def test_accepts_ascii_quoted_answer_heading_and_answers_terminator(self) -> None:
        block = """
        WHY ANSWER "B" IS THE CORRECT ANSWER:
          The quoted sentence supports B because it directly identifies the cause.
          It also rules out the sequence described by the remaining options.
        WHY OTHER ANSWERS ARE INCORRECT:
          They do not match the stated cause.
        """

        rationale = extract_official_rationale(block, "b")

        self.assertEqual(
            rationale,
            "The quoted sentence supports B because it directly identifies the cause. "
            "It also rules out the sequence described by the remaining options.",
        )

    def test_removes_isolated_annotation_page_footer(self) -> None:
        block = """
        WHY CHOICE C IS CORRECT:
        The sequence is supported by the events described in paragraph 4.
        14
        WHY THE OTHER CHOICES ARE INCORRECT:
        They reverse the sequence.
        """

        self.assertEqual(
            extract_official_rationale(block, "C"),
            "The sequence is supported by the events described in paragraph 4.",
        )

    def test_rejects_heading_that_disagrees_with_printed_key(self) -> None:
        block = """
        WHY CHOICE D IS CORRECT:
        This is a substantive rationale because it cites the final paragraph in the passage.
        WHY THE OTHER CHOICES ARE INCORRECT:
        More text.
        """

        with self.assertRaisesRegex(ElaExplanationError, "choice D.*answer key is C"):
            extract_official_rationale(block, "C")

    def test_requires_exactly_one_correct_choice_heading(self) -> None:
        with self.assertRaisesRegex(ElaExplanationError, "exactly one"):
            extract_official_rationale("Key: A\nNo rationale is printed here.", "A")


class ExplanationInputHashTests(unittest.TestCase):
    def setUp(self) -> None:
        self.value = QuestionExplanationInput.create(
            question_id="nysed-ela-2026-g3-mc-q1",
            alt="Question 1. Which detail best supports the central idea? A One B Two C Three D Four",
            correct="C",
            primary_standard="NGLS.ELA.Content.NY-3R9",
            secondary_standards=("NGLS.ELA.Content.NY-3R1",),
            question_image_sha256="1" * 64,
            passage_image_sha256="2" * 64,
        )

    def test_hash_is_deterministic_and_canonical(self) -> None:
        first = question_explanation_input_hash(self.value)
        second = question_explanation_input_hash(copy.deepcopy(self.value))

        self.assertEqual(first, second)
        self.assertRegex(first, r"^[0-9a-f]{64}$")
        self.assertEqual(
            first,
            "7f81cd223f2c2c9b54f2d2b297e7212776d17def347233e250fe6356a3eea8ac",
        )

    def test_every_semantic_input_participates_in_hash(self) -> None:
        baseline = question_explanation_input_hash(self.value)
        variants = (
            dataclasses.replace(self.value, question_id=self.value.question_id + "-changed"),
            dataclasses.replace(self.value, alt=self.value.alt + " Changed."),
            dataclasses.replace(self.value, correct="D"),
            dataclasses.replace(self.value, primary_standard="NGLS.ELA.Content.NY-3R8"),
            dataclasses.replace(
                self.value,
                secondary_standards=("NGLS.ELA.Content.NY-3R2",),
            ),
            dataclasses.replace(self.value, question_image_sha256="3" * 64),
            dataclasses.replace(self.value, passage_image_sha256="4" * 64),
            dataclasses.replace(self.value, policy_version="ela-explanation-2"),
        )

        for variant in variants:
            with self.subTest(variant=variant):
                self.assertNotEqual(question_explanation_input_hash(variant), baseline)

    def test_rejects_invalid_asset_digest(self) -> None:
        value = dataclasses.replace(self.value, passage_image_sha256="not-a-sha")
        with self.assertRaisesRegex(ElaExplanationError, "Passage image SHA-256"):
            question_explanation_input_hash(value)


class ExplanationSidecarValidationTests(unittest.TestCase):
    def validate(self, sidecar: object) -> None:
        validate_exam_explanation_sidecar(
            sidecar,
            exam_id="nysed-ela-2026-grade-3-mc-v1",
            expected_input_hashes=EXPECTED_HASHES,
        )

    def test_validates_exact_coverage_and_returns_app_schema(self) -> None:
        result = validate_exam_explanation_sidecar(
            valid_sidecar(),
            exam_id="nysed-ela-2026-grade-3-mc-v1",
            expected_input_hashes=EXPECTED_HASHES,
        )

        self.assertEqual(set(result), set(EXPECTED_HASHES))
        self.assertEqual(result["nysed-ela-2026-g3-mc-q1"].text, VALID_EXPLANATION)
        self.assertEqual(result["nysed-ela-2026-g3-mc-q1"].source, "vine-authored")

    def test_public_question_validator_applies_the_same_policy(self) -> None:
        result = validate_question_explanation(
            {"text": VALID_EXPLANATION, "source": "vine-authored"},
            question_id="nysed-ela-2026-g3-mc-q1",
        )
        self.assertEqual(result.text, VALID_EXPLANATION)

        official = validate_question_explanation(
            {
                "text": (
                    "Students who choose B show an understanding of the context clues pointing to "
                    "a place. The character's location is significant in determining the sound."
                ),
                "source": "official-nysed",
            },
            question_id="nysed-ela-2013-g3-mc-q4",
        )
        self.assertEqual(official.source, "official-nysed")

        corrected_official = validate_question_explanation(
            {
                "text": (
                    "Students who choose B show an understanding of the story. The Wampanoag "
                    "people seek Maushop's help, and his response resolves the central problem."
                ),
                "source": "official-nysed-corrected",
            },
            question_id="nysed-ela-2013-g4-mc-q2",
        )
        self.assertEqual(corrected_official.source, "official-nysed-corrected")

        official_without_causal_conjunction = validate_question_explanation(
            {
                "text": (
                    "Students who choose C use the text to identify the sap-making steps in the "
                    "correct order. The response places the omitted step between the two printed events."
                ),
                "source": "official-nysed",
            },
            question_id="nysed-ela-2014-g3-mc-q2",
        )
        self.assertEqual(official_without_causal_conjunction.source, "official-nysed")

        official_without_validator_connective = validate_question_explanation(
            {
                "text": (
                    "Students selecting C accurately track the objects from the attic scene. "
                    "The objects serve as reminders of Grandma Talley's ancestors and youth."
                ),
                "source": "official-nysed",
            },
            question_id="nysed-ela-2014-g5-mc-q2",
        )
        self.assertEqual(official_without_validator_connective.source, "official-nysed")

        with self.assertRaisesRegex(ElaExplanationError, "reasoning connective"):
            validate_question_explanation(
                {
                    "text": (
                        "Choice B quotes paragraph four and accurately describes the cub following "
                        "its mother into the den for protection from the storm."
                    ),
                    "source": "vine-authored",
                },
                question_id="nysed-ela-2026-g3-mc-q1",
            )

    def test_rejects_missing_and_orphan_question_ids(self) -> None:
        sidecar = valid_sidecar()
        questions = sidecar["questions"]
        assert isinstance(questions, dict)
        del questions["nysed-ela-2026-g3-mc-q2"]
        questions["nysed-ela-2026-g3-mc-q999"] = questions["nysed-ela-2026-g3-mc-q1"]

        with self.assertRaisesRegex(
            ElaExplanationError,
            r"missing=\['nysed-ela-2026-g3-mc-q2'\].*orphaned=\['nysed-ela-2026-g3-mc-q999'\]",
        ):
            self.validate(sidecar)

    def test_rejects_stale_input_hash(self) -> None:
        sidecar = valid_sidecar()
        questions = sidecar["questions"]
        assert isinstance(questions, dict)
        record = questions["nysed-ela-2026-g3-mc-q1"]
        assert isinstance(record, dict)
        record["inputHash"] = "c" * 64

        with self.assertRaisesRegex(ElaExplanationError, "input hash mismatch"):
            self.validate(sidecar)

    def test_rejects_bad_length_non_substantive_and_missing_reasoning(self) -> None:
        invalid_texts = (
            "Too short because it is.",
            "Because because because because because because because because because because because.",
            "Because this passage detail explains the selected answer with evidence. " * 25,
            (
                "Choice B quotes paragraph four and accurately describes the cub following its mother "
                "into the den for protection from the storm."
            ),
        )
        for invalid_text in invalid_texts:
            sidecar = valid_sidecar()
            questions = sidecar["questions"]
            assert isinstance(questions, dict)
            record = questions["nysed-ela-2026-g3-mc-q1"]
            assert isinstance(record, dict)
            explanation = record["explanation"]
            assert isinstance(explanation, dict)
            explanation["text"] = invalid_text
            with self.subTest(invalid_text=invalid_text):
                with self.assertRaises(ElaExplanationError):
                    self.validate(sidecar)

    def test_rejects_generic_answer_key_claim_even_with_because(self) -> None:
        sidecar = valid_sidecar()
        questions = sidecar["questions"]
        assert isinstance(questions, dict)
        record = questions["nysed-ela-2026-g3-mc-q1"]
        assert isinstance(record, dict)
        explanation = record["explanation"]
        assert isinstance(explanation, dict)
        explanation["text"] = (
            "The official NYSED answer key identifies choice B as correct because that answer key "
            "identifies B as the correct response for this released question."
        )

        with self.assertRaisesRegex(ElaExplanationError, "answer-key correctness"):
            self.validate(sidecar)

        explanation["text"] = (
            "Choice B fits because it is the right answer, and this response repeats that the "
            "selected option is right without providing evidence from the passage."
        )
        with self.assertRaisesRegex(ElaExplanationError, "answer-key correctness"):
            self.validate(sidecar)

    def test_rejects_annotation_and_page_footer_artifacts(self) -> None:
        artifacts = (
            VALID_EXPLANATION + " 14",
            VALID_EXPLANATION + " WHY THE OTHER CHOICES ARE INCORRECT:",
        )
        for artifact in artifacts:
            sidecar = valid_sidecar()
            questions = sidecar["questions"]
            assert isinstance(questions, dict)
            record = questions["nysed-ela-2026-g3-mc-q1"]
            assert isinstance(record, dict)
            explanation = record["explanation"]
            assert isinstance(explanation, dict)
            explanation["text"] = artifact
            with self.subTest(artifact=artifact):
                with self.assertRaisesRegex(ElaExplanationError, "page-footer artifact"):
                    self.validate(sidecar)

    def test_rejects_local_filesystem_paths(self) -> None:
        sidecar = valid_sidecar()
        questions = sidecar["questions"]
        assert isinstance(questions, dict)
        record = questions["nysed-ela-2026-g3-mc-q1"]
        assert isinstance(record, dict)
        explanation = record["explanation"]
        assert isinstance(explanation, dict)
        explanation["text"] = VALID_EXPLANATION + " Draft source: /home/author/vine-app/notes.txt"

        with self.assertRaisesRegex(ElaExplanationError, "local filesystem path"):
            self.validate(sidecar)

    def test_rejects_unknown_source(self) -> None:
        sidecar = valid_sidecar()
        questions = sidecar["questions"]
        assert isinstance(questions, dict)
        record = questions["nysed-ela-2026-g3-mc-q1"]
        assert isinstance(record, dict)
        explanation = record["explanation"]
        assert isinstance(explanation, dict)
        explanation["source"] = "generated"

        with self.assertRaisesRegex(ElaExplanationError, "official-nysed-corrected"):
            self.validate(sidecar)

    def test_loader_uses_fixed_year_grade_filename_and_rejects_duplicate_keys(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            root = Path(temporary_directory)
            path = root / "2026-grade-3.json"
            path.write_text(json.dumps(valid_sidecar()), encoding="utf-8")

            result = load_exam_explanations(
                year=2026,
                grade=3,
                exam_id="nysed-ela-2026-grade-3-mc-v1",
                expected_input_hashes=EXPECTED_HASHES,
                root=root,
            )

            self.assertEqual(set(result), set(EXPECTED_HASHES))
            path.write_text(
                '{"schemaVersion":1,"schemaVersion":1,"policyVersion":"ela-explanation-1",'
                '"examId":"nysed-ela-2026-grade-3-mc-v1","questions":{}}',
                encoding="utf-8",
            )
            with self.assertRaisesRegex(ElaExplanationError, "Duplicate JSON key"):
                load_exam_explanations(
                    year=2026,
                    grade=3,
                    exam_id="nysed-ela-2026-grade-3-mc-v1",
                    expected_input_hashes=EXPECTED_HASHES,
                    root=root,
                )


if __name__ == "__main__":
    unittest.main()

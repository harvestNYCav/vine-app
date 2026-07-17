from __future__ import annotations

import copy
import json
import tempfile
import unittest
from pathlib import Path

from scripts.nysed_math_explanations import (
    MATH_EXPLANATION_POLICY_VERSION,
    MathExplanationError,
    MathQuestionExplanationInput,
    extract_official_math_rationale,
    load_math_exam_explanations,
    math_question_explanation_input_hash,
    validate_math_exam_explanation_sidecar,
    validate_math_question_explanation,
)


QUESTION_ID = "nysed-2025-g6-mc-q1"
INPUT = MathQuestionExplanationInput.create(
    question_id=QUESTION_ID,
    alt_en="Question 1. What is 24 divided by 6? A 2 B 4 C 18 D 30",
    alt_es="Pregunta 1. ¿Cuánto es 24 dividido entre 6? A 2 B 4 C 18 D 30",
    correct="B",
    primary_standard="NGLS.Math.Content.NY-6.NS.2",
    secondary_standards=("NGLS.Math.Content.NY-5.NBT.6",),
    question_image_en_sha256="a" * 64,
    question_image_es_sha256="b" * 64,
)
INPUT_HASH = math_question_explanation_input_hash(INPUT)
VALID_EXPLANATION = {
    "text": {
        "en": "Divide 24 into 6 equal groups: 24 ÷ 6 = 4, so each group contains 4.",
        "es": "Divide 24 en 6 grupos iguales: 24 ÷ 6 = 4, así que cada grupo contiene 4.",
    },
    "source": "vine-authored",
}


def valid_sidecar() -> dict[str, object]:
    return {
        "schemaVersion": 1,
        "policyVersion": MATH_EXPLANATION_POLICY_VERSION,
        "examId": "nysed-2025-grade-6-mc-v1",
        "questions": {
            QUESTION_ID: {
                "inputHash": INPUT_HASH,
                "explanation": copy.deepcopy(VALID_EXPLANATION),
            }
        },
    }


class NysedMathExplanationTests(unittest.TestCase):
    def test_extracts_choice_and_option_official_rationales(self) -> None:
        choice = extract_official_math_rationale(
            """
            Key: B
            Extended Rationale
            Answer Choice A: This response uses addition rather than equal groups.
            Answer Choice B: “4”; This is correct because 24 divided into 6 equal groups gives 4.
            Answer Choice C: This response subtracts 6 from 24.
            Answer choices A and C are plausible but incorrect.
            """,
            "B",
        )
        self.assertIn("24 divided into 6 equal groups gives 4", choice)
        self.assertNotIn("Answer Choice C", choice)

        option = extract_official_math_rationale(
            """
            Key: C
            Extended Rationale
            Answer Option B: This response uses the wrong denominator.
            Answer Option C: This response correctly identifies three of four equal parts as 3/4.
            Answer Option D: This response counts the unshaded part.
            """,
            "C",
        )
        self.assertIn("three of four equal parts", option)

    def test_official_extractor_fails_on_missing_or_mismatched_choice(self) -> None:
        block = "Key: B\nExtended Rationale\nAnswer Choice A: A substantive explanation here."
        with self.assertRaisesRegex(MathExplanationError, "Answer Choice B"):
            extract_official_math_rationale(block, "B")

    def test_input_hash_is_deterministic_and_sensitive_to_every_source(self) -> None:
        self.assertEqual(math_question_explanation_input_hash(INPUT), INPUT_HASH)
        variants = [
            MathQuestionExplanationInput.create(**{
                **INPUT.__dict__,
                "alt_en": INPUT.alt_en + " changed",
            }),
            MathQuestionExplanationInput.create(**{
                **INPUT.__dict__,
                "correct": "C",
            }),
            MathQuestionExplanationInput.create(**{
                **INPUT.__dict__,
                "question_image_es_sha256": "c" * 64,
            }),
        ]
        for variant in variants:
            self.assertNotEqual(math_question_explanation_input_hash(variant), INPUT_HASH)

    def test_validates_localized_reasoning_and_rejects_generic_feedback(self) -> None:
        result = validate_math_question_explanation(VALID_EXPLANATION, question_id=QUESTION_ID)
        self.assertEqual(result.source, "vine-authored")

        below_runtime_substance_threshold = copy.deepcopy(VALID_EXPLANATION)
        below_runtime_substance_threshold["text"]["en"] = (
            "Add one two three four six seven because eight................."
        )
        with self.assertRaisesRegex(MathExplanationError, "not substantive"):
            validate_math_question_explanation(
                below_runtime_substance_threshold,
                question_id=QUESTION_ID,
            )

        generic = copy.deepcopy(VALID_EXPLANATION)
        generic["text"]["en"] = (
            "The official NYSED answer key identifies choice B as the correct answer for this item."
        )
        with self.assertRaisesRegex(MathExplanationError, "answer key"):
            validate_math_question_explanation(generic, question_id=QUESTION_ID)

    def test_sidecar_requires_exact_coverage_hash_and_source(self) -> None:
        result = validate_math_exam_explanation_sidecar(
            valid_sidecar(),
            exam_id="nysed-2025-grade-6-mc-v1",
            expected_input_hashes={QUESTION_ID: INPUT_HASH},
        )
        self.assertEqual(result[QUESTION_ID].en, VALID_EXPLANATION["text"]["en"])

        missing = valid_sidecar()
        missing["questions"] = {}
        with self.assertRaisesRegex(MathExplanationError, "coverage"):
            validate_math_exam_explanation_sidecar(
                missing,
                exam_id="nysed-2025-grade-6-mc-v1",
                expected_input_hashes={QUESTION_ID: INPUT_HASH},
            )

        stale = valid_sidecar()
        stale["questions"][QUESTION_ID]["inputHash"] = "c" * 64
        with self.assertRaisesRegex(MathExplanationError, "hash mismatch"):
            validate_math_exam_explanation_sidecar(
                stale,
                exam_id="nysed-2025-grade-6-mc-v1",
                expected_input_hashes={QUESTION_ID: INPUT_HASH},
            )

        wrong_source = valid_sidecar()
        wrong_source["questions"][QUESTION_ID]["explanation"]["source"] = "official-nysed"
        with self.assertRaisesRegex(MathExplanationError, "Vine-authored"):
            validate_math_exam_explanation_sidecar(
                wrong_source,
                exam_id="nysed-2025-grade-6-mc-v1",
                expected_input_hashes={QUESTION_ID: INPUT_HASH},
            )

    def test_loader_rejects_duplicate_json_keys(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "2025-grade-6.json"
            serialized = json.dumps(valid_sidecar())
            serialized = serialized.replace('"schemaVersion": 1,', '"schemaVersion": 1, "schemaVersion": 1,')
            path.write_text(serialized, encoding="utf-8")
            with self.assertRaisesRegex(MathExplanationError, "Duplicate JSON key"):
                load_math_exam_explanations(
                    year=2025,
                    grade=6,
                    exam_id="nysed-2025-grade-6-mc-v1",
                    expected_input_hashes={QUESTION_ID: INPUT_HASH},
                    root=Path(directory),
                )


if __name__ == "__main__":
    unittest.main()

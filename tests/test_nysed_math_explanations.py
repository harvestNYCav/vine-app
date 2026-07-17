from __future__ import annotations

import copy
import hashlib
import json
import tempfile
import unittest
from pathlib import Path

from scripts.nysed_math_explanations import (
    OFFICIAL_RATIONALE_OVERRIDE_QUESTION_IDS,
    OFFICIAL_RATIONALE_SEMANTIC_CORRECTION_IDS,
    MATH_EXPLANATION_POLICY_VERSION,
    MathExplanationError,
    MathQuestionExplanationInput,
    extract_official_math_rationale,
    load_official_math_rationale_overrides,
    load_math_exam_explanations,
    math_question_explanation_input_hash,
    normalize_math_explanation_text,
    resolve_official_math_rationale,
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
    def test_normalization_preserves_superscripts_and_math_operators(self) -> None:
        notation = "12²⁰ ÷ 12⁴ = 12¹⁶; 7⁻⁸ × 7³ = 7⁻⁵"
        self.assertEqual(normalize_math_explanation_text(notation), notation)
        self.assertEqual(
            normalize_math_explanation_text("cafe\u0301   uses  x²"),
            "café uses x²",
        )
        superscript_input = MathQuestionExplanationInput.create(
            **{**INPUT.__dict__, "alt_en": "Which expression equals x²?"}
        )
        compatibility_equivalent_input = MathQuestionExplanationInput.create(
            **{**INPUT.__dict__, "alt_en": "Which expression equals x2?"}
        )
        self.assertEqual(
            math_question_explanation_input_hash(superscript_input),
            math_question_explanation_input_hash(compatibility_equivalent_input),
        )

    def test_repaired_2021_grade_4_q3_crop_repins_only_its_source_ocr_input(self) -> None:
        root = Path(__file__).resolve().parents[1]
        image_hashes = {
            "en": "68e03f1b0afe3b8de6237b5d0b527f95a59a3ff57c2e9e248d7664c3875ec09b",
            "es": "c50c939d71ae68d60dbced2a34462219a7cc64835aef0f84475804f51637966d",
        }
        for language, expected_hash in image_hashes.items():
            path = (
                root
                / "public"
                / "nysed"
                / "math"
                / "2021"
                / "grade-4"
                / language
                / "q03.webp"
            )
            self.assertEqual(hashlib.sha256(path.read_bytes()).hexdigest(), expected_hash)

        source_ocr_input = MathQuestionExplanationInput.create(
            question_id="nysed-2021-g4-mc-q3",
            alt_en=(
                "Question 3. Which comparison is true? 2 8 A == 3 12 Bp 4_8 9 9 3 9 "
                "Cc fy 4° 10 2 2 DB “34 4°3"
            ),
            alt_es=(
                "Pregunta 3. éQué comparacion es verdadera? A 2-8 3° 12 Bp 4_8 9° "
                "9 3 9 Cc F524 4° 10 2_2 DB 4232 4°73"
            ),
            correct="A",
            primary_standard="CCSS.Math.Content.4.NF.A.2",
            question_image_en_sha256=image_hashes["en"],
            question_image_es_sha256=image_hashes["es"],
        )
        expected_hash = "6f4d44a7b85fc24ec0a6d5d346598ae26856c351139047dfbd7fe33ca29a3e35"
        self.assertEqual(math_question_explanation_input_hash(source_ocr_input), expected_hash)

        sidecar = json.loads(
            (root / "content" / "math-exams" / "explanations" / "2021-grade-4.json").read_text(
                encoding="utf-8"
            )
        )
        self.assertEqual(
            sidecar["questions"]["nysed-2021-g4-mc-q3"]["inputHash"],
            expected_hash,
        )

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

    def test_official_extractor_does_not_truncate_at_singular_choice_prose(self) -> None:
        rationale = extract_official_math_rationale(
            """
            Extended Rationale
            Answer Choice C: This distributes 5 as shown in answer choice C.
            The two partial areas are then added together to get the whole area.
            Answer Choice D: This multiplies the two partial areas.
            Answer choices A, B, and D are plausible but incorrect.
            """,
            "C",
        )
        self.assertIn("two partial areas are then added", rationale)
        self.assertNotIn("Answer Choice D", rationale)

    def test_hash_pinned_official_rationale_repairs_and_provenance(self) -> None:
        overrides = load_official_math_rationale_overrides()
        self.assertEqual(set(overrides), set(OFFICIAL_RATIONALE_OVERRIDE_QUESTION_IDS))
        self.assertEqual(
            sum(item.source == "official-nysed" for item in overrides.values()),
            92,
        )
        self.assertEqual(
            sum(item.source == "official-nysed-corrected" for item in overrides.values()),
            5,
        )
        grade_5_8_ids = {
            question_id
            for question_id in overrides
            if any(f"-g{grade}-" in question_id for grade in range(5, 9))
        }
        grade_5_8_semantic_ids = (
            grade_5_8_ids & OFFICIAL_RATIONALE_SEMANTIC_CORRECTION_IDS
        )
        grade_5_8_extraction_repairs = grade_5_8_ids - grade_5_8_semantic_ids
        self.assertEqual(len(grade_5_8_ids), 74)
        self.assertEqual(
            grade_5_8_semantic_ids,
            {
                "nysed-2013-g6-mc-q14",
                "nysed-2014-g5-mc-q44",
                "nysed-2014-g7-mc-q1",
            },
        )
        self.assertEqual(len(grade_5_8_extraction_repairs), 71)

        expected_restored_notation = {
            "nysed-2013-g5-mc-q1": "(3/4) × (1/2) = 3/8",
            "nysed-2013-g5-mc-q3": "1 - 11/12 = 1/12",
            "nysed-2013-g5-mc-q4": "greater than 5/12 but less than 7",
            "nysed-2013-g5-mc-q10": "30/12 = 5/2 = 2 1/2",
            "nysed-2013-g5-mc-q11": "(5 × 1/10) + (4 × 1/100)",
            "nysed-2013-g6-mc-q2": "6³ + 7 × 4 = 216 + 28 = 244",
            "nysed-2013-g6-mc-q13": "(1/2) ÷ (2/3)",
            "nysed-2013-g6-mc-q27": "w = 2/12",
            "nysed-2013-g7-mc-q2": "-16/20 + 25/20 = 9/20",
            "nysed-2013-g7-mc-q5": "(2/15) ÷ (1/3)",
            "nysed-2013-g7-mc-q7": "Dividing (2/3)(y + 57) = 178 by 2/3",
            "nysed-2013-g8-mc-q6": "4⁸ ÷ 4⁻⁴",
            "nysed-2013-g8-mc-q17": "6³/6⁶ = 6⁻³ = 1/6³",
            "nysed-2013-g8-mc-q19": "(8 × 10⁴)/(4 × 10⁶)",
            "nysed-2013-g8-mc-q25": "1.08 × 10⁸",
            "nysed-2013-g8-mc-q49": "V = πr²h",
            "nysed-2013-g8-mc-q50": "y = 3x² - 2",
            "nysed-2014-g5-mc-q7": "(2/3) × (5/2) = 10/6 = 1 4/6",
            "nysed-2014-g5-mc-q9": "(1/2) × (1/3) = 1/6",
            "nysed-2014-g5-mc-q10": "1/10 of what it represents",
            "nysed-2014-g5-mc-q13": "618/30 = 20 18/30 = 20 3/5",
            "nysed-2014-g5-mc-q16": "(7/8) × (3/16) = 21/128",
            "nysed-2014-g5-mc-q23": "(5/12) × (5/6) = 25/72",
            "nysed-2014-g5-mc-q33": "10⁵",
            "nysed-2014-g5-mc-q36": "9 8/56",
            "nysed-2014-g5-mc-q40": "61/50 = 1 11/50",
            "nysed-2014-g5-mc-q41": "5 ÷ (1/4) = 5 × 4 = 20",
            "nysed-2014-g5-mc-q43": "50,000, which is 10 times",
            "nysed-2014-g5-mc-q49": "14/35 + 15/35 = 29/35",
            "nysed-2014-g6-mc-q1": "3⁴ + 9",
            "nysed-2014-g6-mc-q10": "6(5²) - 5(4) + 8",
            "nysed-2014-g6-mc-q23": "x = 32.50/5 = 6.50",
            "nysed-2014-g6-mc-q25": "(25/54) ÷ (5/9)",
            "nysed-2014-g6-mc-q26": "$10/4 lb = $15/6 lb = $20/8 lb",
            "nysed-2014-g6-mc-q27": "y-coordinates are opposites",
            "nysed-2014-g6-mc-q31": "18/n = 75/100",
            "nysed-2014-g6-mc-q37": "(1/2) × 5.95 × 5.1",
            "nysed-2014-g6-mc-q44": "(1/2) × 5.8 × 2.4",
            "nysed-2014-g6-mc-q47": "3 1/4 ÷ 3/4",
            "nysed-2014-g6-mc-q51": "x-value pattern is 1, 3, 5, 7, 9",
            "nysed-2014-g6-mc-q52": "= 1,062.76 square centimeters",
            "nysed-2014-g6-mc-q55": "V = Bh = 173.6 × 9",
            "nysed-2014-g7-mc-q2": "375 ÷ (3/2) = 375 × (2/3)",
            "nysed-2014-g7-mc-q4": "(4/16) × 100% = 25%",
            "nysed-2014-g7-mc-q5": "[3($2.50)]/2",
            "nysed-2014-g7-mc-q7": "51 × 4 = 204",
            "nysed-2014-g7-mc-q8": "27 1/2 pages per hour",
            "nysed-2014-g7-mc-q11": "54/249 is approximately 0.22",
            "nysed-2014-g7-mc-q15": "0.5x = 208.8",
            "nysed-2014-g7-mc-q17": "$2/5 = $4/10 = $6/15 = $8/20",
            "nysed-2014-g7-mc-q18": "1 3/4 + 2 1/3 + 1 5/12",
            "nysed-2014-g7-mc-q20": "(78/650) × 100% = 12%",
            "nysed-2014-g7-mc-q21": "2(2w) + 2(w) = 4w + 2w = 6w",
            "nysed-2014-g7-mc-q23": "$2.52/6 = $0.42 per orange",
            "nysed-2014-g7-mc-q24": "13.5 ft/1 in",
            "nysed-2014-g7-mc-q27": "56/508 ≈ 0.11",
            "nysed-2014-g7-mc-q29": "$18.00 × 1.07 = $19.26",
            "nysed-2014-g8-mc-q1": "3⁴/3² = 3⁽⁴⁻²⁾ = 3² = 9",
            "nysed-2014-g8-mc-q4": "1.601 × 10⁹",
            "nysed-2014-g8-mc-q6": "8.17 × 10⁸",
            "nysed-2014-g8-mc-q7": "1.5 × 10⁶",
            "nysed-2014-g8-mc-q9": "($3.00 − $1.50)/(10 − 5)",
            "nysed-2014-g8-mc-q10": "x + 6 = 2x + 2",
            "nysed-2014-g8-mc-q12": "4/2 = 2",
            "nysed-2014-g8-mc-q14": "4⁷ × 4⁻⁵",
            "nysed-2014-g8-mc-q19": "(0 - (-2))/(5 - 0) = 2/5",
            "nysed-2014-g8-mc-q20": "produces a prediction",
            "nysed-2014-g8-mc-q21": "(9 − 5)/(1 − (−1)) = 4/2 = 2",
            "nysed-2014-g8-mc-q22": "A = πr²",
            "nysed-2014-g8-mc-q23": "each vertical line intersects the graph at most once",
            "nysed-2014-g8-mc-q25": "y = -(2/3)x - 1/2",
        }
        self.assertEqual(
            set(expected_restored_notation),
            grade_5_8_extraction_repairs,
        )
        for question_id, notation in expected_restored_notation.items():
            self.assertIn(notation, overrides[question_id].text, question_id)
            self.assertEqual(overrides[question_id].source, "official-nysed")

        raw = (
            "41 - This response indicates a clear understanding of number patterns that arise "
            "from a rule; the student may have continued the pattern with precision. Or in "
            "continuing the pattern, the student may have recognized that each number in the "
            "pattern was 1 less than a factor of 7. Since 42 is a factor of 7, the correct "
            "response is 41."
        )
        repaired = resolve_official_math_rationale(
            question_id="nysed-2013-g4-mc-q8",
            raw_rationale=raw,
            overrides=overrides,
        )
        self.assertEqual(repaired.source, "official-nysed-corrected")
        self.assertIn("42 is a multiple of 7", repaired.en)
        with self.assertRaisesRegex(MathExplanationError, "must be re-audited"):
            resolve_official_math_rationale(
                question_id="nysed-2013-g4-mc-q8",
                raw_rationale=raw + " changed",
                overrides=overrides,
            )

        bowling_raw = (
            "“4”; This response represents the correct solution to the word problem. The student "
            "may have set up and solved the inequality as shown below, where x represents the "
            "number of games played: 4x + 5.25 < 25 4x < 19.75 x < 4.9375 The student who "
            "selects this response understands that the greatest number of games played has to "
            "be a whole number less than 4.9375."
        )
        bowling = resolve_official_math_rationale(
            question_id="nysed-2014-g7-mc-q1",
            raw_rationale=bowling_raw,
            overrides=overrides,
        )
        self.assertEqual(bowling.source, "official-nysed-corrected")
        self.assertIn("4x + 5.25 ≤ 25", bowling.en)
        self.assertNotIn("4x + 5.25 < 25", bowling.en)

    def test_reviewed_vine_rationales_preserve_the_released_item_math(self) -> None:
        root = Path(__file__).resolve().parents[1] / "content" / "math-exams" / "explanations"
        expected = {
            (2016, 5, 14): ("2 × 4 × 3 = 24", "2 × 4 × 3 = 24"),
            (2016, 5, 40): ("3 of the 5 rows", "3 de las 5 filas"),
            (2016, 5, 45): ("4 + 12 ÷ 2", "4 + 12 ÷ 2"),
            (2023, 6, 22): ("h = 7", "h = 7"),
            (2017, 6, 13): ("Graph B", "gráfica B"),
            (2016, 6, 14): ("G is at (−1, −0.5)", "G está en (−1, −0.5)"),
            (2023, 7, 16): ("about 85 to 96", "aproximadamente 85 a 96"),
            (2022, 7, 38): ("48y − 16", "48y − 16"),
            (2019, 7, 38): ("shipping adds $5.00", "envío suma $5.00"),
            (2023, 8, 25): ("corresponding angles", "ángulos marcados son correspondientes"),
            (2019, 8, 39): ("A(2,2)", "A(2,2)"),
        }
        for (year, grade, number), fragments in expected.items():
            document = json.loads(
                (root / f"{year}-grade-{grade}.json").read_text(encoding="utf-8")
            )
            question_id = f"nysed-{year}-g{grade}-mc-q{number}"
            explanation = document["questions"][question_id]["explanation"]
            self.assertEqual(explanation["source"], "vine-authored")
            self.assertIn(fragments[0], explanation["text"]["en"], question_id)
            self.assertIn(fragments[1], explanation["text"]["es"], question_id)
            validate_math_question_explanation(explanation, question_id=question_id)

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

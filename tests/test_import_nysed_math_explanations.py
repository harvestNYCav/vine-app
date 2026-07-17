from __future__ import annotations

import copy
import hashlib
import json
import tempfile
import unittest
from pathlib import Path
from typing import Any

from scripts.import_nysed_math_mc import (
    EXPECTED_MC_COUNTS,
    EXPECTED_OFFICIAL_CORRECTED_EXPLANATION_TOTAL,
    EXPECTED_OFFICIAL_EXPLANATION_TOTAL,
    EXPECTED_VINE_EXPLANATION_TOTAL,
    ImportFailure,
    attach_vine_authored_explanations,
    build_exam_explanation_input_hashes,
    validate_imported_question_explanation,
)
from scripts.nysed_math_explanations import (
    MATH_EXPLANATION_POLICY_VERSION,
    MathQuestionExplanationInput,
    math_question_explanation_input_hash,
)


VALID_EN = (
    "Choice B is correct because six equal groups of four contain 6 × 4 = 24 "
    "objects altogether."
)
VALID_ES = (
    "La opción B es correcta porque seis grupos iguales de cuatro contienen "
    "6 × 4 = 24 objetos en total."
)
OFFICIAL_TEXT = (
    "Choice B is correct because the diagram contains six equal groups of four, "
    "so multiplying 6 × 4 gives 24 objects altogether."
)


def _small_exam(*, spanish: bool) -> dict[str, Any]:
    image: dict[str, Any] = {
        "en": {
            "src": "/vine-app/nysed/math/2015/grade-3/en/q01.webp",
            "width": 640,
            "height": 320,
        }
    }
    alt = {
        "en": "Question 1. Six equal groups have four objects each. Which choice gives the total?",
    }
    languages = ["en"]
    if spanish:
        image["es"] = {
            "src": "/vine-app/nysed/math/2015/grade-3/es/q01.webp",
            "width": 640,
            "height": 320,
        }
        alt["es"] = (
            "Pregunta 1. Seis grupos iguales tienen cuatro objetos cada uno. "
            "¿Qué opción da el total?"
        )
        languages.append("es")
    return {
        "id": "nysed-2015-grade-3-mc-v1",
        "year": 2015,
        "grade": 3,
        "supportedLanguages": languages,
        "questions": [
            {
                "id": "nysed-2015-g3-mc-q1",
                "number": 1,
                "correct": "B",
                "primaryStandard": "CCSS.Math.Content.3.OA.A.1",
                "secondaryStandards": ["CCSS.Math.Content.3.OA.A.3"],
                "image": image,
                "alt": alt,
            }
        ],
    }


def _write_assets(asset_root: Path, *, spanish: bool) -> tuple[bytes, bytes | None]:
    english = b"exact-english-question-image"
    spanish_bytes = b"exact-spanish-question-image" if spanish else None
    english_directory = asset_root / "2015" / "grade-3" / "en"
    english_directory.mkdir(parents=True)
    (english_directory / "q01.webp").write_bytes(english)
    if spanish_bytes is not None:
        spanish_directory = asset_root / "2015" / "grade-3" / "es"
        spanish_directory.mkdir(parents=True)
        (spanish_directory / "q01.webp").write_bytes(spanish_bytes)
    return english, spanish_bytes


def _write_sidecar(
    explanations_root: Path,
    exam: dict[str, Any],
    input_hash: str,
) -> None:
    explanations_root.mkdir(parents=True)
    question_id = str(exam["questions"][0]["id"])
    sidecar = {
        "schemaVersion": 1,
        "policyVersion": MATH_EXPLANATION_POLICY_VERSION,
        "examId": exam["id"],
        "questions": {
            question_id: {
                "inputHash": input_hash,
                "explanation": {
                    "text": {"en": VALID_EN, "es": VALID_ES},
                    "source": "vine-authored",
                },
            }
        },
    }
    (explanations_root / "2015-grade-3.json").write_text(
        json.dumps(sidecar),
        encoding="utf-8",
    )


class MathExplanationInputTests(unittest.TestCase):
    def test_hashes_exact_bilingual_assets_alt_key_and_standards(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            asset_root = Path(temporary_directory) / "assets"
            english, spanish = _write_assets(asset_root, spanish=True)
            self.assertIsNotNone(spanish)
            exam = _small_exam(spanish=True)

            hashes = build_exam_explanation_input_hashes(exam, asset_root)

            expected = math_question_explanation_input_hash(
                MathQuestionExplanationInput.create(
                    question_id="nysed-2015-g3-mc-q1",
                    alt_en=exam["questions"][0]["alt"]["en"],
                    alt_es=exam["questions"][0]["alt"]["es"],
                    correct="B",
                    primary_standard="CCSS.Math.Content.3.OA.A.1",
                    secondary_standards=["CCSS.Math.Content.3.OA.A.3"],
                    question_image_en_sha256=hashlib.sha256(english).hexdigest(),
                    question_image_es_sha256=hashlib.sha256(spanish or b"").hexdigest(),
                )
            )
            self.assertEqual(hashes, {"nysed-2015-g3-mc-q1": expected})

    def test_attaches_raw_localized_sidecar_to_english_only_exam(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            root = Path(temporary_directory)
            asset_root = root / "assets"
            explanations_root = root / "explanations"
            _write_assets(asset_root, spanish=False)
            exam = _small_exam(spanish=False)
            input_hash = build_exam_explanation_input_hashes(exam, asset_root)[
                "nysed-2015-g3-mc-q1"
            ]
            _write_sidecar(explanations_root, exam, input_hash)

            attach_vine_authored_explanations(
                exam,
                asset_root,
                explanations_root=explanations_root,
            )

            self.assertEqual(
                exam["questions"][0]["explanation"],
                {
                    "text": {"en": VALID_EN, "es": VALID_ES},
                    "source": "vine-authored",
                },
            )

    def test_rejects_stale_sidecar_hash(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            root = Path(temporary_directory)
            asset_root = root / "assets"
            explanations_root = root / "explanations"
            _write_assets(asset_root, spanish=True)
            exam = _small_exam(spanish=True)
            _write_sidecar(explanations_root, exam, "0" * 64)

            with self.assertRaisesRegex(ImportFailure, "input hash mismatch"):
                attach_vine_authored_explanations(
                    exam,
                    asset_root,
                    explanations_root=explanations_root,
                )

    def test_rejects_inexact_localization_and_asset_paths(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            asset_root = Path(temporary_directory) / "assets"
            _write_assets(asset_root, spanish=True)
            missing_alt = _small_exam(spanish=True)
            del missing_alt["questions"][0]["alt"]["es"]
            with self.assertRaisesRegex(ImportFailure, "localized explanation alt"):
                build_exam_explanation_input_hashes(missing_alt, asset_root)

            wrong_path = _small_exam(spanish=True)
            wrong_path["questions"][0]["image"]["en"]["src"] = (
                "/vine-app/nysed/math/2015/grade-3/en/q02.webp"
            )
            with self.assertRaisesRegex(ImportFailure, "path changed"):
                build_exam_explanation_input_hashes(wrong_path, asset_root)


class ImportedMathExplanationValidationTests(unittest.TestCase):
    def test_generated_catalog_preserves_every_superscript_localization_exactly(self) -> None:
        root = Path(__file__).resolve().parents[1]
        superscripts = frozenset("⁰¹²³⁴⁵⁶⁷⁸⁹")
        expected: dict[tuple[str, str], str] = {}
        superscript_question_ids: set[str] = set()
        for path in sorted((root / "content" / "math-exams" / "explanations").glob("*.json")):
            sidecar = json.loads(path.read_text(encoding="utf-8"))
            for question_id, record in sidecar["questions"].items():
                localized = record["explanation"]["text"]
                for language in ("en", "es"):
                    text = localized[language]
                    if any(character in superscripts for character in text):
                        expected[(question_id, language)] = text
                        superscript_question_ids.add(question_id)

        self.assertEqual(len(superscript_question_ids), 62)
        self.assertEqual(len(expected), 123)
        self.assertEqual(
            sum(language == "en" for _, language in expected),
            61,
        )
        self.assertEqual(
            sum(language == "es" for _, language in expected),
            62,
        )
        self.assertIn("nysed-2019-g8-mc-q9", superscript_question_ids)

        catalog = json.loads(
            (root / "content" / "math-exams" / "generated" / "catalog.json").read_text(
                encoding="utf-8"
            )
        )
        generated = {
            (question["id"], language): question["explanation"]["text"][language]
            for exam in catalog["exams"]
            for question in exam["questions"]
            for language in ("en", "es")
            if (question["id"], language) in expected
        }
        self.assertEqual(set(generated), set(expected))
        for key, source_text in expected.items():
            self.assertEqual(generated[key], source_text, f"superscript changed for {key}")

    def test_accepts_official_rationale_duplicated_for_english_only_exam(self) -> None:
        question = {
            "id": "nysed-2013-g3-mc-q1",
            "explanation": {
                "text": {"en": OFFICIAL_TEXT, "es": OFFICIAL_TEXT},
                "source": "official-nysed",
            },
        }
        validate_imported_question_explanation(2013, question)

    def test_rejects_wrong_source_noncanonical_text_and_unequal_official_fields(self) -> None:
        authored = {
            "id": "nysed-2015-g3-mc-q1",
            "explanation": {
                "text": {"en": VALID_EN, "es": VALID_ES},
                "source": "official-nysed",
            },
        }
        with self.assertRaisesRegex(ImportFailure, "Wrong explanation source"):
            validate_imported_question_explanation(2015, authored)

        noncanonical = copy.deepcopy(authored)
        noncanonical["explanation"]["source"] = "vine-authored"
        noncanonical["explanation"]["text"]["en"] = VALID_EN.replace(
            "is correct",
            "is  correct",
        )
        with self.assertRaisesRegex(ImportFailure, "not canonically normalized"):
            validate_imported_question_explanation(2015, noncanonical)

        unequal_official = {
            "id": "nysed-2014-g3-mc-q1",
            "explanation": {
                "text": {"en": OFFICIAL_TEXT, "es": VALID_ES},
                "source": "official-nysed",
            },
        }
        with self.assertRaisesRegex(ImportFailure, "must match both localized fields"):
            validate_imported_question_explanation(2014, unequal_official)

    def test_pinned_provenance_counts_cover_the_inventory(self) -> None:
        legacy = sum(sum(EXPECTED_MC_COUNTS[year]) for year in (2013, 2014))
        total = sum(sum(counts) for counts in EXPECTED_MC_COUNTS.values())
        self.assertEqual(
            legacy,
            EXPECTED_OFFICIAL_EXPLANATION_TOTAL
            + EXPECTED_OFFICIAL_CORRECTED_EXPLANATION_TOTAL,
        )
        self.assertEqual(total - legacy, EXPECTED_VINE_EXPLANATION_TOTAL)


if __name__ == "__main__":
    unittest.main()

from __future__ import annotations

import copy
import json
import tempfile
import unittest
from pathlib import Path
from typing import Any

from scripts.import_nysed_ela_mc import (
    ImportFailure,
    attach_vine_authored_explanations,
    build_exam_explanation_input_hashes,
    validate_exam,
)
from scripts.nysed_ela_explanations import EXPLANATION_POLICY_VERSION


REPO_ROOT = Path(__file__).resolve().parents[1]
CATALOG_PATH = REPO_ROOT / "content" / "ela-exams" / "generated" / "catalog.json"
VALID_TEXT = (
    "Choice B is supported because paragraph 4 connects the character's decision to the "
    "problem, which shows why that action answers the question."
)


def _small_exam() -> dict[str, Any]:
    return {
        "id": "nysed-ela-2015-grade-3-mc-v1",
        "year": 2015,
        "grade": 3,
        "stimuli": [
            {
                "id": "nysed-ela-2015-g3-stimulus-1-1",
                "passage": {
                    "src": "/vine-app/nysed/ela/2015/grade-3/en/passage-1-1.webp",
                },
            }
        ],
        "questions": [
            {
                "id": "nysed-ela-2015-g3-mc-q1",
                "number": 1,
                "stimulusId": "nysed-ela-2015-g3-stimulus-1-1",
                "alt": "Question 1. Which detail best supports the central idea? A One B Two C Three D Four",
                "correct": "B",
                "primaryStandard": "CCSS.ELA-Literacy.RL.3.1",
                "secondaryStandards": [],
                "image": {
                    "src": "/vine-app/nysed/ela/2015/grade-3/en/q01.webp",
                },
            }
        ],
    }


class AuthoredExplanationAttachmentTests(unittest.TestCase):
    def test_hashes_assets_and_attaches_exactly_covering_sidecar(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            root = Path(temporary_directory)
            asset_root = root / "assets"
            explanations_root = root / "explanations"
            output = asset_root / "2015" / "grade-3" / "en"
            output.mkdir(parents=True)
            explanations_root.mkdir()
            (output / "q01.webp").write_bytes(b"question-image")
            (output / "passage-1-1.webp").write_bytes(b"passage-image")
            exam = _small_exam()
            hashes = build_exam_explanation_input_hashes(exam, asset_root)
            question_id = "nysed-ela-2015-g3-mc-q1"
            sidecar = {
                "schemaVersion": 1,
                "policyVersion": EXPLANATION_POLICY_VERSION,
                "examId": exam["id"],
                "questions": {
                    question_id: {
                        "inputHash": hashes[question_id],
                        "explanation": {
                            "text": VALID_TEXT,
                            "source": "vine-authored",
                        },
                    }
                },
            }
            (explanations_root / "2015-grade-3.json").write_text(
                json.dumps(sidecar),
                encoding="utf-8",
            )

            attach_vine_authored_explanations(
                exam,
                asset_root,
                explanations_root=explanations_root,
            )

            self.assertEqual(
                exam["questions"][0]["explanation"],
                {"text": VALID_TEXT, "source": "vine-authored"},
            )

    def test_rejects_stale_sidecar_hash(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            root = Path(temporary_directory)
            asset_root = root / "assets"
            explanations_root = root / "explanations"
            output = asset_root / "2015" / "grade-3" / "en"
            output.mkdir(parents=True)
            explanations_root.mkdir()
            (output / "q01.webp").write_bytes(b"question-image")
            (output / "passage-1-1.webp").write_bytes(b"passage-image")
            exam = _small_exam()
            question_id = "nysed-ela-2015-g3-mc-q1"
            sidecar = {
                "schemaVersion": 1,
                "policyVersion": EXPLANATION_POLICY_VERSION,
                "examId": exam["id"],
                "questions": {
                    question_id: {
                        "inputHash": "0" * 64,
                        "explanation": {
                            "text": VALID_TEXT,
                            "source": "vine-authored",
                        },
                    }
                },
            }
            (explanations_root / "2015-grade-3.json").write_text(
                json.dumps(sidecar),
                encoding="utf-8",
            )

            with self.assertRaisesRegex(ImportFailure, "input hash mismatch"):
                attach_vine_authored_explanations(
                    exam,
                    asset_root,
                    explanations_root=explanations_root,
                )


class ImportedExamExplanationValidationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        raw = json.loads(CATALOG_PATH.read_text(encoding="utf-8"))
        cls.exam = next(
            exam for exam in raw["exams"]
            if exam["year"] == 2015 and exam["grade"] == 3
        )
        for question in cls.exam["questions"]:
            question["explanation"] = {
                "text": (
                    f"Choice {question['correct']} is supported because the passage details for "
                    f"question {question['number']} connect the stated evidence to the exact idea in the prompt."
                ),
                "source": "vine-authored",
            }

    def test_accepts_complete_vine_authored_coverage(self) -> None:
        validate_exam(copy.deepcopy(self.exam))

    def test_rejects_missing_or_wrong_provenance(self) -> None:
        missing = copy.deepcopy(self.exam)
        del missing["questions"][0]["explanation"]
        with self.assertRaisesRegex(ImportFailure, "Invalid explanation"):
            validate_exam(missing)

        wrong_source = copy.deepcopy(self.exam)
        wrong_source["questions"][0]["explanation"]["source"] = "official-nysed"
        with self.assertRaisesRegex(ImportFailure, "Wrong explanation source"):
            validate_exam(wrong_source)


if __name__ == "__main__":
    unittest.main()

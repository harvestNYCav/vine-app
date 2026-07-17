from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path

from scripts.seed_nysed_ela_explanation_sidecars import (
    SidecarSeedError,
    _payload_with_refreshed_input_hashes,
    seed_sidecars,
    validate_sidecars,
)


def _catalog() -> dict[str, object]:
    return {
        "schemaVersion": 2,
        "exams": [
            {
                "id": "nysed-ela-2015-grade-3-mc-v1",
                "year": 2015,
                "grade": 3,
                "stimuli": [
                    {
                        "id": "nysed-ela-2015-g3-stimulus-1-1",
                        "passage": {
                            "src": "/vine-app/nysed/ela/2015/grade-3/en/passage-1-1.webp"
                        },
                    }
                ],
                "questions": [
                    {
                        "id": "nysed-ela-2015-g3-mc-q1",
                        "stimulusId": "nysed-ela-2015-g3-stimulus-1-1",
                        "alt": "Question 1. Which detail best supports the central idea?",
                        "correct": "B",
                        "primaryStandard": "CCSS.ELA-Literacy.RI.3.2",
                        "secondaryStandards": ["CCSS.ELA-Literacy.RI.3.1"],
                        "image": {
                            "src": "/vine-app/nysed/ela/2015/grade-3/en/q01.webp"
                        },
                    }
                ],
            }
        ],
    }


class SeedElaExplanationSidecarsTests(unittest.TestCase):
    def test_accessibility_refresh_changes_only_the_input_hash(self) -> None:
        explanation = {
            "text": (
                "The passage returns to this detail several times, which shows why it supports "
                "the central idea instead of describing only one isolated event."
            ),
            "source": "vine-authored",
        }
        existing = {
            "schemaVersion": 1,
            "policyVersion": "ela-explanation-1",
            "examId": "nysed-ela-2015-grade-3-mc-v1",
            "questions": {
                "nysed-ela-2015-g3-mc-q1": {
                    "inputHash": "a" * 64,
                    "explanation": explanation,
                }
            },
        }
        seeded = {
            **existing,
            "questions": {
                "nysed-ela-2015-g3-mc-q1": {
                    "inputHash": "b" * 64,
                    "explanation": {"text": "", "source": "vine-authored"},
                }
            },
        }

        refreshed, changed = _payload_with_refreshed_input_hashes(
            existing,
            seeded,
            label="fixture",
        )

        self.assertEqual(changed, 1)
        self.assertEqual(
            refreshed["questions"]["nysed-ela-2015-g3-mc-q1"]["inputHash"],
            "b" * 64,
        )
        self.assertEqual(
            refreshed["questions"]["nysed-ela-2015-g3-mc-q1"]["explanation"],
            explanation,
        )
        self.assertEqual(
            existing["questions"]["nysed-ela-2015-g3-mc-q1"]["inputHash"],
            "a" * 64,
        )

    def test_seed_then_validate_recomputes_asset_provenance(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            catalog_path = root / "catalog.json"
            catalog_path.write_text(json.dumps(_catalog()), encoding="utf-8")
            asset_directory = root / "assets" / "2015" / "grade-3" / "en"
            asset_directory.mkdir(parents=True)
            passage_path = asset_directory / "passage-1-1.webp"
            question_path = asset_directory / "q01.webp"
            passage_path.write_bytes(b"passage fixture")
            question_path.write_bytes(b"question fixture")
            output_directory = root / "sidecars"

            outputs = seed_sidecars(catalog_path, root / "assets", output_directory)
            self.assertEqual([path.name for path in outputs], ["2015-grade-3.json"])
            sidecar = json.loads(outputs[0].read_text(encoding="utf-8"))
            record = sidecar["questions"]["nysed-ela-2015-g3-mc-q1"]
            self.assertRegex(record["inputHash"], r"^[0-9a-f]{64}$")
            self.assertEqual(record["explanation"]["source"], "vine-authored")

            record["explanation"]["text"] = (
                "The passage returns to this detail several times, which shows why it supports "
                "the central idea instead of describing only one isolated event."
            )
            outputs[0].write_text(json.dumps(sidecar), encoding="utf-8")
            self.assertEqual(
                validate_sidecars(catalog_path, root / "assets", output_directory),
                outputs,
            )

            question_path.write_bytes(b"changed question fixture")
            with self.assertRaisesRegex(SidecarSeedError, "input hash mismatch"):
                validate_sidecars(catalog_path, root / "assets", output_directory)

    def test_seed_refuses_to_overwrite_existing_sidecar(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            catalog_path = root / "catalog.json"
            catalog_path.write_text(json.dumps(_catalog()), encoding="utf-8")
            asset_directory = root / "assets" / "2015" / "grade-3" / "en"
            asset_directory.mkdir(parents=True)
            (asset_directory / "passage-1-1.webp").write_bytes(b"passage")
            (asset_directory / "q01.webp").write_bytes(b"question")
            output_directory = root / "sidecars"

            seed_sidecars(catalog_path, root / "assets", output_directory)
            with self.assertRaisesRegex(SidecarSeedError, "Refusing to overwrite"):
                seed_sidecars(catalog_path, root / "assets", output_directory)


if __name__ == "__main__":
    unittest.main()

from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path

from scripts.export_nysed_math_explanation_inputs import export_explanation_inputs


def _catalog() -> dict[str, object]:
    return {
        "schemaVersion": 2,
        "generatedAt": "fixture timestamp that must not enter the export",
        "exams": [
            {
                "id": "nysed-2014-grade-3-mc-v1",
                "year": 2014,
                "grade": 3,
                "questions": [],
            },
            {
                "id": "nysed-2025-grade-3-mc-v1",
                "slug": "2025-grade-3-mc",
                "year": 2025,
                "grade": 3,
                "standardsFramework": "NGLS",
                "title": {"en": "Grade 3 Math", "es": "Matemáticas de grado 3"},
                "description": {"en": "Released math.", "es": "Matemáticas publicadas."},
                "sourceTitle": {"en": "Released Questions", "es": "Preguntas publicadas"},
                "sourceUrl": {"en": "https://example.test/en.pdf"},
                "supportedLanguages": ["es", "en"],
                "questions": [
                    {
                        "id": "nysed-2025-g3-mc-q2",
                        "number": 2,
                        "primaryStandard": "NGLS.Math.Content.NY-3.OA.2",
                        "domain": "OA",
                        "correct": "C",
                        "image": {
                            "en": {
                                "src": "/vine-app/nysed/math/2025/grade-3/en/q02.webp"
                            }
                        },
                        "alt": {
                            "en": "Question 2. What is 35 divided by 5? A 5 B 6 C 7 D 8"
                        },
                    },
                    {
                        "id": "nysed-2025-g3-mc-q1",
                        "number": 1,
                        "primaryStandard": "NGLS.Math.Content.NY-3.OA.1",
                        "secondaryStandards": ["NGLS.Math.Content.NY-3.OA.3"],
                        "domain": "OA",
                        "correct": "B",
                        "image": {
                            "en": {
                                "src": "/vine-app/nysed/math/2025/grade-3/en/q01.webp"
                            },
                            "es": {
                                "src": "/vine-app/nysed/math/2025/grade-3/es/q01.webp"
                            },
                        },
                        "alt": {
                            "en": "Question 1. How many dots are in 6 rows of 4? A 10 B 24 C 28 D 64",
                            "es": "Pregunta 1. ¿Cuántos puntos hay en 6 filas de 4? A 10 B 24 C 28 D 64",
                        },
                    },
                ],
            },
        ],
    }


class MathExplanationInputExporterTests(unittest.TestCase):
    def test_export_is_stable_local_and_contains_authoring_fields(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            catalog_path = root / "catalog.json"
            catalog_path.write_text(
                json.dumps(_catalog(), ensure_ascii=False, indent=2) + "\n",
                encoding="utf-8",
            )
            original_catalog = catalog_path.read_bytes()
            output_dir = root / "tmp" / "math-explanation-inputs"

            first = export_explanation_inputs(
                catalog_path,
                output_dir,
                years={2025},
                grades={3},
            )
            first_bytes = first[0].read_bytes()
            second = export_explanation_inputs(
                catalog_path,
                output_dir,
                years={2025},
                grades={3},
            )

            self.assertEqual([path.name for path in first], ["2025-grade-3.json"])
            self.assertEqual(first, second)
            self.assertEqual(second[0].read_bytes(), first_bytes)
            self.assertEqual(catalog_path.read_bytes(), original_catalog)
            payload = json.loads(first_bytes)
            self.assertEqual(payload["schemaVersion"], 1)
            self.assertEqual(
                payload["exam"],
                {
                    "id": "nysed-2025-grade-3-mc-v1",
                    "slug": "2025-grade-3-mc",
                    "year": 2025,
                    "grade": 3,
                    "standardsFramework": "NGLS",
                    "supportedLanguages": ["en", "es"],
                    "title": {"en": "Grade 3 Math", "es": "Matemáticas de grado 3"},
                    "description": {
                        "en": "Released math.",
                        "es": "Matemáticas publicadas.",
                    },
                    "sourceTitle": {
                        "en": "Released Questions",
                        "es": "Preguntas publicadas",
                    },
                    "sourceUrl": {"en": "https://example.test/en.pdf", "es": None},
                },
            )
            self.assertEqual(
                payload["questions"],
                [
                    {
                        "id": "nysed-2025-g3-mc-q1",
                        "number": 1,
                        "correct": "B",
                        "standards": [
                            "NGLS.Math.Content.NY-3.OA.1",
                            "NGLS.Math.Content.NY-3.OA.3",
                        ],
                        "primaryStandard": "NGLS.Math.Content.NY-3.OA.1",
                        "secondaryStandards": ["NGLS.Math.Content.NY-3.OA.3"],
                        "domain": "OA",
                        "alt": {
                            "en": "Question 1. How many dots are in 6 rows of 4? A 10 B 24 C 28 D 64",
                            "es": "Pregunta 1. ¿Cuántos puntos hay en 6 filas de 4? A 10 B 24 C 28 D 64",
                        },
                        "imageUrl": {
                            "en": "/vine-app/nysed/math/2025/grade-3/en/q01.webp",
                            "es": "/vine-app/nysed/math/2025/grade-3/es/q01.webp",
                        },
                    },
                    {
                        "id": "nysed-2025-g3-mc-q2",
                        "number": 2,
                        "correct": "C",
                        "standards": ["NGLS.Math.Content.NY-3.OA.2"],
                        "primaryStandard": "NGLS.Math.Content.NY-3.OA.2",
                        "secondaryStandards": [],
                        "domain": "OA",
                        "alt": {
                            "en": "Question 2. What is 35 divided by 5? A 5 B 6 C 7 D 8",
                            "es": None,
                        },
                        "imageUrl": {
                            "en": "/vine-app/nysed/math/2025/grade-3/en/q02.webp",
                            "es": None,
                        },
                    },
                ],
            )


if __name__ == "__main__":
    unittest.main()

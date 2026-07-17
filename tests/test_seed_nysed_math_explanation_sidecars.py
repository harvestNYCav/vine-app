from __future__ import annotations

import copy
import hashlib
import json
import tempfile
import unittest
from pathlib import Path

from scripts.nysed_math_explanations import (
    MathQuestionExplanationInput,
    math_question_explanation_input_hash,
)
from scripts.seed_nysed_math_explanation_sidecars import (
    SidecarSeedError,
    seed_sidecars,
    validate_sidecars,
)


QUESTION_1 = "nysed-2015-g3-mc-q1"
QUESTION_2 = "nysed-2015-g3-mc-q2"
EXPLANATIONS = {
    QUESTION_1: {
        "en": "Multiply 6 rows by 4 dots in each row: 6 × 4 = 24, so the array contains 24 dots.",
        "es": "Multiplica 6 filas por 4 puntos en cada fila: 6 × 4 = 24, así que el arreglo contiene 24 puntos.",
    },
    QUESTION_2: {
        "en": "Divide 35 counters into 5 equal groups: 35 ÷ 5 = 7, so each group contains 7 counters.",
        "es": "Se dividen 35 fichas en 5 grupos iguales: 35 ÷ 5 = 7, por lo tanto cada grupo contiene 7 fichas.",
    },
}


def _question_1() -> dict[str, object]:
    return {
        "id": QUESTION_1,
        "number": 1,
        "primaryStandard": "CCSS.Math.Content.3.OA.1",
        "secondaryStandards": ["CCSS.Math.Content.3.OA.3"],
        "domain": "OA",
        "correct": "B",
        "image": {
            "en": {"src": "/vine-app/nysed/math/2015/grade-3/en/q01.webp"},
            "es": {"src": "/vine-app/nysed/math/2015/grade-3/es/q01.webp"},
        },
        "alt": {
            "en": "Question 1. How many dots are in 6 rows of 4? A 10 B 24 C 28 D 64",
            "es": "Pregunta 1. ¿Cuántos puntos hay en 6 filas de 4? A 10 B 24 C 28 D 64",
        },
    }


def _question_2() -> dict[str, object]:
    return {
        "id": QUESTION_2,
        "number": 2,
        "primaryStandard": "CCSS.Math.Content.3.OA.2",
        "domain": "OA",
        "correct": "C",
        "image": {
            "en": {"src": "/vine-app/nysed/math/2015/grade-3/en/q02.webp"},
        },
        "alt": {
            "en": "Question 2. What is 35 divided by 5? A 5 B 6 C 7 D 8",
        },
    }


def _catalog() -> dict[str, object]:
    return {
        "schemaVersion": 2,
        "exams": [
            {
                "id": "nysed-2014-grade-3-mc-v1",
                "year": 2014,
                "grade": 3,
                "questions": [],
            },
            {
                "id": "nysed-2015-grade-3-mc-v1",
                "slug": "2015-grade-3-mc",
                "year": 2015,
                "grade": 3,
                "standardsFramework": "CCLS",
                "title": {"en": "Grade 3 Math", "es": "Matemáticas de grado 3"},
                "description": {"en": "Released math.", "es": "Matemáticas publicadas."},
                "sourceTitle": {"en": "Released Questions", "es": "Preguntas publicadas"},
                "sourceUrl": {"en": "https://example.test/en.pdf"},
                "supportedLanguages": ["en", "es"],
                "questions": [_question_1(), _question_2()],
            },
        ],
    }


def _write_fixture(root: Path) -> tuple[Path, Path, Path]:
    catalog_path = root / "catalog.json"
    catalog_path.write_text(json.dumps(_catalog()), encoding="utf-8")
    asset_root = root / "assets"
    for relative, content in (
        ("2015/grade-3/en/q01.webp", b"english question one"),
        ("2015/grade-3/es/q01.webp", b"spanish question one"),
        ("2015/grade-3/en/q02.webp", b"english question two"),
    ):
        path = asset_root / relative
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(content)
    return catalog_path, asset_root, root / "sidecars"


def _author_sidecar(path: Path) -> dict[str, object]:
    sidecar = json.loads(path.read_text(encoding="utf-8"))
    for question_id, localized in EXPLANATIONS.items():
        sidecar["questions"][question_id]["explanation"]["text"] = copy.deepcopy(localized)
    path.write_text(json.dumps(sidecar, ensure_ascii=False), encoding="utf-8")
    return sidecar


class SeedMathExplanationSidecarsTests(unittest.TestCase):
    def test_seed_pins_localized_inputs_and_validation_accepts_authored_text(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            catalog_path, asset_root, output_dir = _write_fixture(root)

            outputs = seed_sidecars(catalog_path, asset_root, output_dir)

            self.assertEqual([path.name for path in outputs], ["2015-grade-3.json"])
            sidecar = json.loads(outputs[0].read_text(encoding="utf-8"))
            self.assertEqual(
                sidecar["questions"][QUESTION_1]["explanation"],
                {"text": {"en": "", "es": ""}, "source": "vine-authored"},
            )
            expected_hash = math_question_explanation_input_hash(
                MathQuestionExplanationInput.create(
                    question_id=QUESTION_1,
                    alt_en=_question_1()["alt"]["en"],
                    alt_es=_question_1()["alt"]["es"],
                    correct="B",
                    primary_standard="CCSS.Math.Content.3.OA.1",
                    secondary_standards=("CCSS.Math.Content.3.OA.3",),
                    question_image_en_sha256=hashlib.sha256(b"english question one").hexdigest(),
                    question_image_es_sha256=hashlib.sha256(b"spanish question one").hexdigest(),
                )
            )
            self.assertEqual(sidecar["questions"][QUESTION_1]["inputHash"], expected_hash)
            self.assertRegex(sidecar["questions"][QUESTION_2]["inputHash"], r"^[0-9a-f]{64}$")

            _author_sidecar(outputs[0])
            self.assertEqual(validate_sidecars(catalog_path, asset_root, output_dir), outputs)

    def test_validation_rejects_changed_english_or_spanish_asset_bytes(self) -> None:
        assets = (
            "2015/grade-3/en/q02.webp",
            "2015/grade-3/es/q01.webp",
        )
        for relative in assets:
            with self.subTest(relative=relative), tempfile.TemporaryDirectory() as directory:
                root = Path(directory)
                catalog_path, asset_root, output_dir = _write_fixture(root)
                output = seed_sidecars(catalog_path, asset_root, output_dir)[0]
                _author_sidecar(output)
                (asset_root / relative).write_bytes(b"changed asset bytes")

                with self.assertRaisesRegex(SidecarSeedError, "input hash mismatch"):
                    validate_sidecars(catalog_path, asset_root, output_dir)

    def test_seed_refuses_to_overwrite_any_existing_sidecar(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            catalog_path, asset_root, output_dir = _write_fixture(root)
            output = seed_sidecars(catalog_path, asset_root, output_dir)[0]
            original = output.read_bytes()

            with self.assertRaisesRegex(SidecarSeedError, "Refusing to overwrite"):
                seed_sidecars(catalog_path, asset_root, output_dir)

            self.assertEqual(output.read_bytes(), original)

    def test_validation_rejects_duplicate_normalized_explanations_per_language(self) -> None:
        for language in ("en", "es"):
            with self.subTest(language=language), tempfile.TemporaryDirectory() as directory:
                root = Path(directory)
                catalog_path, asset_root, output_dir = _write_fixture(root)
                output = seed_sidecars(catalog_path, asset_root, output_dir)[0]
                sidecar = _author_sidecar(output)
                duplicate = EXPLANATIONS[QUESTION_1][language].swapcase().replace(" ", "  ")
                sidecar["questions"][QUESTION_2]["explanation"]["text"][language] = duplicate
                output.write_text(json.dumps(sidecar, ensure_ascii=False), encoding="utf-8")

                expected_language = "English" if language == "en" else "Spanish"
                with self.assertRaisesRegex(
                    SidecarSeedError,
                    f"Duplicate normalized {expected_language} explanation",
                ):
                    validate_sidecars(catalog_path, asset_root, output_dir)


if __name__ == "__main__":
    unittest.main()

from __future__ import annotations

import hashlib
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from PIL import Image

from scripts.nysed_math_accessibility import (
    MATH_ACCESSIBILITY_POLICY_VERSION,
    MathAccessibilityError,
    load_math_exam_accessibility,
    math_accessibility_input_hash,
    normalize_math_accessibility_text,
    validate_math_accessibility_description,
)


QUESTION_ID = "nysed-2022-g3-mc-q1"
INPUT_HASH = math_accessibility_input_hash(
    question_id=QUESTION_ID,
    number=1,
    image_sha256={"en": "a" * 64, "es": "b" * 64},
    languages=["en", "es"],
)
EN = (
    "Question 1. I've divided 24 counters into equal groups, and we've recorded the model. "
    "Which expression matches the model? Choices: A: 24 ÷ 2; B: 24 ÷ 3; "
    "C: 24 ÷ 4; D: 24 ÷ 6."
)
ES = (
    "Pregunta 1. Ana ve 24 fichas divididas en grupos iguales y registra el modelo. "
    "¿Qué expresión corresponde al modelo? Opciones: A: 24 ÷ 2; B: 24 ÷ 3; "
    "C: 24 ÷ 4; D: 24 ÷ 6."
)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def sidecar() -> dict[str, object]:
    return {
        "schemaVersion": 1,
        "policyVersion": MATH_ACCESSIBILITY_POLICY_VERSION,
        "examId": "nysed-2022-grade-3-mc-v1",
        "languages": ["en", "es"],
        "questions": {
            QUESTION_ID: {
                "inputHash": INPUT_HASH,
                "description": {"en": EN, "es": ES},
            }
        },
    }


class NysedMathAccessibilityTests(unittest.TestCase):
    def test_reviewed_content_attaches_explanations_before_presentation_alt(self) -> None:
        from scripts import import_nysed_math_mc as importer

        calls: list[str] = []
        exam = {"year": 2021, "grade": 4}
        with patch.object(
            importer,
            "attach_vine_authored_explanations",
            side_effect=lambda *_args, **_kwargs: calls.append("explanations"),
        ), patch.object(
            importer,
            "attach_reviewed_accessibility",
            side_effect=lambda *_args, **_kwargs: calls.append("accessibility"),
        ):
            importer.attach_reviewed_exam_content(exam, Path("public"))
        self.assertEqual(calls, ["explanations", "accessibility"])

    def test_2021_grade_4_q3_crop_preserves_full_choice_d_without_footer(self) -> None:
        root = Path(__file__).resolve().parents[1]
        expected_sizes = {"en": (433, 412), "es": (518, 412)}
        for language, expected_size in expected_sizes.items():
            directory = root / "public" / "nysed" / "math" / "2021" / "grade-4" / language
            manifest = json.loads((directory / ".nysed-import.json").read_text(encoding="utf-8"))
            self.assertEqual(manifest["crops"]["3"]["box"][3], 722.0)
            self.assertEqual(manifest["verifiedFooterMasks"]["3"], [490.0, 698.6])
            self.assertEqual(
                (manifest["outputs"]["3"]["width"], manifest["outputs"]["3"]["height"]),
                expected_size,
            )
            with Image.open(directory / "q03.webp") as image:
                self.assertEqual(image.size, expected_size)

        accessibility = json.loads(
            (
                root
                / "content"
                / "math-exams"
                / "accessibility"
                / "2021-grade-4.json"
            ).read_text(encoding="utf-8")
        )
        descriptions = accessibility["questions"]["nysed-2021-g4-mc-q3"]["description"]
        self.assertIn("D: 2/4 > 2/3", descriptions["en"])
        self.assertIn("D: 2/4 > 2/3", descriptions["es"])

    def test_2016_grade_5_q29_crop_stops_before_unrelated_question_30(self) -> None:
        root = Path(__file__).resolve().parents[1]
        directory = root / "public" / "nysed" / "math" / "2016" / "grade-5" / "en"
        asset = directory / "q29.webp"
        manifest = json.loads((directory / ".nysed-import.json").read_text(encoding="utf-8"))
        self.assertEqual(
            manifest["crops"]["29"],
            {"sourcePage": 22, "box": [28.0, 198.45, 584.0, 354.0]},
        )
        self.assertEqual(manifest["outputs"]["29"], {"width": 684, "height": 342})
        self.assertNotIn("29", manifest.get("verifiedFooterMasks", {}))
        self.assertEqual(
            sha256(asset),
            "4475c96764bf9ee7a39a0272173129e0296c1b1946b93ec7e0c492a9a9250874",
        )
        with Image.open(asset) as image:
            self.assertEqual(image.size, (684, 342))

        item = json.loads(
            (
                root
                / "content"
                / "math-exams"
                / "accessibility"
                / "2016-grade-5.json"
            ).read_text(encoding="utf-8")
        )["questions"]["nysed-2016-g5-mc-q29"]
        self.assertIn("D: 300 centimeters", item["description"]["en"])
        self.assertNotIn("Question 30", item["description"]["en"])

    def test_2023_grade_6_q3_crops_include_choice_d_in_both_languages(self) -> None:
        root = Path(__file__).resolve().parents[1]
        expected = {
            "en": (
                [28.0, 560.7, 584.0, 723.0],
                (1137, 342),
                "7762aef98a35fc809962aad362874d96aeaa10b3128a28c16859301bd25f6650",
            ),
            "es": (
                [28.0, 555.152, 584.0, 723.0],
                (1125, 371),
                "d54a9167d2cf6e18fbebad19c9ff8063ebf39637119042f926e3138fb8dbd358",
            ),
        }
        for language, (box, size, expected_hash) in expected.items():
            with self.subTest(language=language):
                directory = (
                    root
                    / "public"
                    / "nysed"
                    / "math"
                    / "2023"
                    / "grade-6"
                    / language
                )
                manifest = json.loads(
                    (directory / ".nysed-import.json").read_text(encoding="utf-8")
                )
                self.assertEqual(manifest["crops"]["3"], {"sourcePage": 7, "box": box})
                self.assertEqual(manifest["verifiedFooterMasks"]["3"], [490.0, 702.372])
                self.assertEqual(
                    manifest["outputs"]["3"], {"width": size[0], "height": size[1]}
                )
                asset = directory / "q03.webp"
                self.assertEqual(sha256(asset), expected_hash)
                with Image.open(asset) as image:
                    self.assertEqual(image.size, size)

        item = json.loads(
            (
                root
                / "content"
                / "math-exams"
                / "accessibility"
                / "2023-grade-6.json"
            ).read_text(encoding="utf-8")
        )["questions"]["nysed-2023-g6-mc-q3"]
        for language in ("en", "es"):
            self.assertIn("D: 450c = d", item["description"][language])
            self.assertIn("D: 450c = d", item["requiredSourceTokens"][language])

    def test_2025_grade_5_q14_spanish_crop_restores_choice_d_denominator(self) -> None:
        root = Path(__file__).resolve().parents[1]
        directory = root / "public" / "nysed" / "math" / "2025" / "grade-5" / "es"
        manifest = json.loads((directory / ".nysed-import.json").read_text(encoding="utf-8"))
        self.assertEqual(
            manifest["crops"]["14"],
            {"sourcePage": 10, "box": [28.0, 527.876, 584.0, 718.0]},
        )
        self.assertEqual(manifest["verifiedFooterMasks"]["14"], [490.0, 702.372])
        self.assertEqual(manifest["outputs"]["14"], {"width": 458, "height": 418})
        asset = directory / "q14.webp"
        self.assertEqual(
            sha256(asset),
            "57a53a853d2bbdbf9d1e4cc0e4aa31e8e4c21f286b23ccdef2d3b89e3177386f",
        )
        with Image.open(asset) as image:
            self.assertEqual(image.size, (458, 418))

        item = json.loads(
            (
                root
                / "content"
                / "math-exams"
                / "accessibility"
                / "2025-grade-5.json"
            ).read_text(encoding="utf-8")
        )["questions"]["nysed-2025-g5-mc-q14"]
        self.assertIn("D: 36/10", item["description"]["es"])
        self.assertIn("D: 36/10", item["requiredSourceTokens"]["es"])
        self.assertNotIn("fuera del recorte", item["description"]["es"])

    def test_all_additional_source_pinned_crop_repairs_preserve_complete_choices(self) -> None:
        root = Path(__file__).resolve().parents[1]
        cases = (
            (2015, 7, "en", 25, 21, [30.0, 352.553, 573.0, 616.0], (1108, 586),
             "281bb927253fb5ce5e554c076b25e8f101069bd1c77c64556c73823b551b2bad", None,
             ("s = 4 + P",)),
            (2015, 7, "en", 27, 22, [30.0, 535.453, 573.0, 687.0], (1108, 337),
             "0b5acbe06561975e45f75bbecdc7ecbdc813230f4891f404e840f8d66909c5c4", None,
             ("$80.00",)),
            (2016, 6, "en", 11, 7, [28.0, 280.8, 584.0, 640.0], (1171, 791),
             "6ff5bf2d01bf99cada7a5526e87c4f4038280ec4e095206c5528de6e93ebf347", None,
             ("d = 7.50, 10.00, 12.50, 15.00",)),
            (2016, 8, "en", 2, 7, [28.0, 227.7, 584.0, 692.0], (1121, 1027),
             "1e1dbe3a232eb60975055906fc400addcdee930a9d090639efbba680a341ce53", None,
             ("zero degrees Celsius", "zero degrees Fahrenheit")),
            (2021, 8, "es", 13, 18, [28.0, 50.4, 584.0, 685.0], (1125, 1383),
             "0801d05aca5c78fdd08967929a6d932ad3c20559ee10472826a7e3e6f771299b", None,
             ("90°", "1/2", "alrededor del origen")),
            (2021, 8, "es", 18, 20, [28.0, 530.1, 584.0, 700.0], (1126, 356),
             "8cf5ac343444674068a7219408e3b9788befd91363ad9da6f21e67b4b2ac278f", None,
             ("recta horizontal", "pendiente positiva", "pendiente negativa")),
            (2022, 6, "es", 17, 12, [28.0, 474.3, 584.0, 723.0], (1126, 539),
             "df8ad4eed941c7c72599db25eece5e514746e6364f1d94cc21bd5793282083a5",
             [516.0, 699.0], ("$26,400.00",)),
            (2023, 8, "es", 20, 12, [28.0, 527.85, 584.0, 723.0], (1069, 425),
             "a1c205807d6db1401f5f87a4e4306a8a65cca1049bdd42ea33e4ec2af7b725ba",
             [516.0, 699.0], ("y = (5/9)x − 5",)),
            (2024, 7, "es", 29, 15, [28.0, 546.677, 584.0, 725.0], (1118, 396),
             "2f404bd4a99ea30acd460514b4cd78387a7ca70be57458e8f9acc74e1d928d7c",
             [516.0, 699.0], ("$4,875.00",)),
        )
        for year, grade, language, number, page, box, size, expected_hash, footer, tokens in cases:
            question_id = f"nysed-{year}-g{grade}-mc-q{number}"
            with self.subTest(question_id=question_id, language=language):
                directory = root / "public" / "nysed" / "math" / str(year) / f"grade-{grade}" / language
                manifest = json.loads((directory / ".nysed-import.json").read_text(encoding="utf-8"))
                self.assertEqual(manifest["crops"][str(number)], {"sourcePage": page, "box": box})
                self.assertEqual(manifest["outputs"][str(number)], {"width": size[0], "height": size[1]})
                self.assertEqual(manifest.get("verifiedFooterMasks", {}).get(str(number)), footer)
                asset = directory / f"q{number:02d}.webp"
                self.assertEqual(sha256(asset), expected_hash)
                with Image.open(asset) as image:
                    self.assertEqual(image.size, size)

                item = json.loads(
                    (root / "content" / "math-exams" / "accessibility" / f"{year}-grade-{grade}.json").read_text(encoding="utf-8")
                )["questions"][question_id]
                for token in tokens:
                    self.assertIn(token, item["description"][language])
                    self.assertTrue(
                        any(
                            token in pinned
                            for pinned in item["requiredSourceTokens"][language]
                        )
                    )

    def test_source_pinned_text_overlays_repair_malformed_official_glyphs(self) -> None:
        root = Path(__file__).resolve().parents[1]
        cases = (
            (2017, 5, "es", 3, "2017-g5-es-q3-choice-values-v1", (1142, 632),
             "7f63282081faa4868d5ee16a32fcf3346b8bc14de56f61208cab644cd407f461",
             ("A: 20", "B: 44", "C: 45", "D: 60")),
            (2017, 5, "es", 4, "2017-g5-es-q4-choice-values-v1", (536, 292),
             "4b7ff89070af5a8bf97e1cdec2979762d6b655b65b56e15383fa13e0ac68ed9d",
             ("A: 41.0", "B: 4.10", "C: 0.41", "D: 0.041")),
            (2017, 5, "es", 42, "2017-g5-es-q42-choice-values-v1", (1145, 365),
             "841c02e341b55bf6cc7d326b32484915efa6677185e73016e6ee899b5819a9b3",
             ("A: 70", "B: 180", "C: 290", "D: 780")),
            (2017, 6, "es", 34, "2017-g6-es-q34-table-values-v1", (1133, 796),
             "9bad18ddadc9e6d8e2e977c8bf6d5d452ac9acd4df5cfbce81204b4c1b8b2b08",
             ("$17.50", "$70.00", "$8.75", "$35.00")),
            (2017, 7, "en", 21, "2017-g7-en-q21-expression-v1", (869, 494),
             "d341325a0a85ba300eec346c82d7bb6fae275917ef6789b46e5791ebf51ba068",
             ("−1/2(−3/2x + 6x + 1) − 3x",)),
            (2019, 5, "es", 32, "2019-g5-es-q32-denominator-v1", (569, 416),
             "3c4ee4fbdc5b5b5c025e1e6e77afbd382e6db12733cb2abc87ccd23127c72218",
             ("2/5 + 3/7",)),
        )
        for year, grade, language, number, policy, size, expected_hash, tokens in cases:
            question_id = f"nysed-{year}-g{grade}-mc-q{number}"
            with self.subTest(question_id=question_id, language=language):
                directory = root / "public" / "nysed" / "math" / str(year) / f"grade-{grade}" / language
                manifest = json.loads((directory / ".nysed-import.json").read_text(encoding="utf-8"))
                self.assertEqual(manifest["verifiedTextOverlays"][str(number)], policy)
                self.assertEqual(manifest["outputs"][str(number)], {"width": size[0], "height": size[1]})
                asset = directory / f"q{number:02d}.webp"
                self.assertEqual(sha256(asset), expected_hash)
                with Image.open(asset) as image:
                    self.assertEqual(image.size, size)

                item = json.loads(
                    (root / "content" / "math-exams" / "accessibility" / f"{year}-grade-{grade}.json").read_text(encoding="utf-8")
                )["questions"][question_id]
                for token in tokens:
                    self.assertIn(token, item["description"][language])
                    self.assertIn(token, item["requiredSourceTokens"][language])

    def test_reviewed_transcription_repairs_remain_source_token_pinned(self) -> None:
        root = Path(__file__).resolve().parents[1] / "content" / "math-exams" / "accessibility"
        cases = (
            (2021, 5, "en", 3, ("D: 4 5/16",)),
            (2023, 7, "es", 8, ("D: 6 2/3",)),
            (2024, 8, "en", 20, ("D: y = 1/5x³",)),
            (2017, 7, "en", 33, ("D: 13",)),
            (2017, 7, "es", 14, ("B: 3.583̅", "C: 3.58̅3̅", "D: 3.5̅8̅3̅")),
            (2019, 7, "es", 2, ("A: 0.583", "B: 0.583̅")),
            (2018, 5, "en", 3, ("3 unit cubes by 2 unit cubes by 2 unit cubes", "8 unit cubes by 6 unit cubes by 7 unit cubes", "8 unit cubes by 8 unit cubes by 7 unit cubes")),
            (2019, 7, "es", 5, ("1/2 de un vaso",)),
            (2023, 5, "es", 18, ("Prisma A", "1 cubo", "3 cubos")),
            (2023, 5, "en", 31, ("4 unit cubes wide", "3 unit cubes high", "6 unit cubes deep")),
            (2017, 5, "es", 15, ("23 celdas sombreadas",)),
            (2018, 5, "es", 2, ("42 de 100", "2 cuadrados inferiores", "3/10")),
            (2018, 7, "en", 1, ("B: 0.53̅", "C: 0.5̅3̅")),
            (2023, 8, "es", 7, ("1.25 > 0.3", "1.25 < 0.3")),
        )
        for year, grade, language, number, tokens in cases:
            question_id = f"nysed-{year}-g{grade}-mc-q{number}"
            item = json.loads((root / f"{year}-grade-{grade}.json").read_text(encoding="utf-8"))["questions"][question_id]
            with self.subTest(question_id=question_id, language=language):
                for token in tokens:
                    self.assertIn(token, item["description"][language])
                    self.assertTrue(
                        any(
                            token in pinned
                            for pinned in item["requiredSourceTokens"][language]
                        )
                    )

    def test_reported_grade_3_ocr_artifacts_are_removed_from_reviewed_descriptions(self) -> None:
        root = Path(__file__).resolve().parents[1]
        catalog = json.loads(
            (root / "content" / "math-exams" / "generated" / "catalog.json").read_text(
                encoding="utf-8"
            )
        )
        cases = (
            (
                2019,
                2,
                "09901750f1c47789dd9a5159b286544069cfa40ff41184666a5f7885e5e17d89",
                {"sourcePage": 7, "box": [28.0, 354.652, 584.0, 555.528]},
                (1101, 349),
                "e035326a63fa46251fc079771f516b909e4ed5edcd8113d3269fc6bd57961c9b",
                "stops at the number 50. Which number would Lucy not count?",
                ("number 50. 2 Which",),
            ),
            (
                2016,
                27,
                "a3a5e69e8f5baee262924d36c53f59c9d5d1278bdcebca633845b21fbca493ab",
                {"sourcePage": 19, "box": [28.0, 352.8, 584.0, 699.2]},
                (1174, 315),
                "2083cafc6bdbe33840f58370bad30ec14366c84e688ddf306ba2c10a1f0e33e7",
                "Which situation could be represented by the expression 6 × 2?",
                ("Question 27. a7", "6 x 2"),
            ),
        )
        for year, number, pdf_hash, crop, size, asset_hash, expected, forbidden in cases:
            question_id = f"nysed-{year}-g3-mc-q{number}"
            with self.subTest(question_id=question_id):
                directory = root / "public" / "nysed" / "math" / str(year) / "grade-3" / "en"
                manifest = json.loads(
                    (directory / ".nysed-import.json").read_text(encoding="utf-8")
                )
                self.assertEqual(manifest["sourcePdfSha256"], pdf_hash)
                self.assertEqual(manifest["crops"][str(number)], crop)
                self.assertEqual(
                    manifest["outputs"][str(number)],
                    {"width": size[0], "height": size[1]},
                )
                asset = directory / f"q{number:02d}.webp"
                self.assertEqual(sha256(asset), asset_hash)
                with Image.open(asset) as image:
                    self.assertEqual(image.size, size)

                item = json.loads(
                    (
                        root
                        / "content"
                        / "math-exams"
                        / "accessibility"
                        / f"{year}-grade-3.json"
                    ).read_text(encoding="utf-8")
                )["questions"][question_id]
                description = item["description"]["en"]
                self.assertIn(expected, description)
                self.assertIn(expected, item["requiredSourceTokens"]["en"])
                for artifact in forbidden:
                    self.assertNotIn(artifact, description)

                exam = next(
                    exam
                    for exam in catalog["exams"]
                    if exam["year"] == year and exam["grade"] == 3
                )
                question = next(
                    question for question in exam["questions"] if question["id"] == question_id
                )
                self.assertEqual(question["alt"], item["description"])

    def test_reported_visual_contradictions_are_corrected_and_source_pinned(self) -> None:
        root = Path(__file__).resolve().parents[1] / "content" / "math-exams" / "accessibility"
        cases = (
            (
                2026,
                3,
                8,
                {
                    "en": (
                        "7 rows and 9 columns",
                        "D: multiply 9 and 7; add 7 rows of 9",
                    ),
                    "es": (
                        "7 filas y 9 columnas",
                        "D: multiplicar 9 por 7; sumar 7 filas de 9",
                    ),
                },
                {
                    "en": ("arranged in 6 rows and 9 columns",),
                    "es": ("dispuestos en 6 filas y 9 columnas",),
                },
            ),
            (
                2015,
                3,
                16,
                {"en": ("hour hand is between 8 and 9", "showing 8:35")},
                {"en": ("hour hand is between 7 and 8", "showing 7:35")},
            ),
            (
                2015,
                3,
                20,
                {
                    "en": (
                        "divided into 3 equal intervals",
                        "point R is at the second tick mark after 0",
                        "C: 2/3",
                    )
                },
                {
                    "en": (
                        "divided into 4 equal intervals",
                        "point R is at the third tick mark after 0",
                    )
                },
            ),
            (
                2015,
                4,
                2,
                {"en": ("the line measures 3 1/2 inches", "B: 3 1/2 inches")},
                {"en": ("the line measures 4 1/2 inches",)},
            ),
            (
                2023,
                5,
                31,
                {
                    "en": ("6 unit cubes deep", "D: 72"),
                    "es": ("una profundidad de 6 cubos", "D: 72"),
                },
                {
                    "en": ("5 unit cubes deep",),
                    "es": ("una profundidad de 5 cubos",),
                },
            ),
            (
                2021,
                6,
                17,
                {
                    "en": (
                        "A: The bold region extends from the left arrow through the closed point at −52 and ends at the closed point at 108",
                        "B: Two exterior bold rays extend from the left arrow to the closed point at −52 and from the closed point at 108 to the right arrow; the region between −52 and 108 is not bold",
                        "C: The bold region begins at the closed point at −52, passes through the closed point at 108, and extends to the right arrow",
                        "D: Only the segment between the closed points at −52 and 108 is bold; the exterior regions are not bold",
                    ),
                    "es": (
                        "A: La parte resaltada se extiende desde la flecha izquierda hasta el punto cerrado en 108; el punto cerrado en −52 queda dentro de esa región",
                        "D: Está resaltado únicamente el segmento comprendido entre los puntos cerrados en −52 y 108; las regiones exteriores no están resaltadas",
                    ),
                },
                {
                    "en": (
                        "A: A thick segment from −52 to 108 with closed endpoints",
                        "C: A thick segment from −52 to 108 with open endpoints",
                    ),
                    "es": (),
                },
            ),
            (
                2024,
                7,
                30,
                {
                    "en": (
                        "A: An open circle at −3 with the bold ray extending to the left",
                        "B: An open circle at −3 with the bold ray extending to the right",
                        "C: An open circle at −5 with the bold ray extending to the left",
                        "D: An open circle at −5 with the bold ray extending to the right",
                    ),
                    "es": (
                        "A: Recta numérica con marcas etiquetadas −6, −5, −4, −3, −2, −1 y 0; hay un círculo abierto en −3 y el tramo resaltado se extiende desde −3 hacia la izquierda, con flecha hacia valores menores",
                        "D: Recta numérica con marcas etiquetadas −6, −5, −4, −3, −2, −1 y 0; hay un círculo abierto en −5 y el tramo resaltado se extiende desde −5 hacia la derecha, con flecha hacia valores mayores",
                    ),
                },
                {
                    "en": ("A: An open circle at −3 with the bold ray extending to the right",),
                    "es": (
                        "A: Recta numérica con marcas etiquetadas −6, −5, −4, −3, −2, −1 y 0; hay un círculo abierto en −3 y el tramo resaltado se extiende desde −3 hacia la derecha, con flecha hacia valores mayores",
                    ),
                },
            ),
            (
                2016,
                7,
                41,
                {
                    "en": (
                        "through the grid intersection (0.7, 0.3)",
                        "No individual data points are marked on the ray",
                        "C: 3/7",
                    )
                },
                {
                    "en": (
                        "(0.2, 0.1)",
                        "(0.4, 0.2)",
                        "(0.6, 0.3)",
                        "(0.8, 0.4)",
                    )
                },
            ),
            (
                2026,
                8,
                22,
                {
                    "en": ("The corresponding vertices are A and D, B and E, and C and F",),
                    "es": ("Los vértices correspondientes son A y D, B y E, y C y F",),
                },
                {
                    "en": ("A and E, B and D, and C and F",),
                    "es": ("A y E, B y D, y C y F",),
                },
            ),
            (
                2015,
                8,
                45,
                {
                    "en": (
                        "crosses the y-axis at (0, −3)",
                        "crosses the x-axis between 4 and 6, at approximately (5.1, 0)",
                    )
                },
                {"en": ("the x-axis at (4, 0)",)},
            ),
        )
        for year, grade, number, localized_expected, localized_forbidden in cases:
            question_id = f"nysed-{year}-g{grade}-mc-q{number}"
            item = json.loads(
                (root / f"{year}-grade-{grade}.json").read_text(encoding="utf-8")
            )["questions"][question_id]
            self.assertEqual(set(item["description"]), set(localized_expected))
            self.assertEqual(set(item["requiredSourceTokens"]), set(localized_expected))
            for language, expected_phrases in localized_expected.items():
                description = item["description"][language]
                required_tokens = item["requiredSourceTokens"][language]
                with self.subTest(question_id=question_id, language=language):
                    for phrase in expected_phrases:
                        self.assertIn(phrase, description)
                        self.assertIn(phrase, required_tokens)
                    for phrase in localized_forbidden[language]:
                        self.assertNotIn(phrase, description)
                    self.assertEqual(
                        validate_math_accessibility_description(
                            description,
                            question_id=question_id,
                            number=number,
                            language=language,
                            required_source_tokens=required_tokens,
                        ),
                        description,
                    )
                    pinned_phrase = expected_phrases[0]
                    damaged_phrase = (
                        "A: [damaged visual fact]"
                        if pinned_phrase.startswith("A: ")
                        else "[damaged visual fact]"
                    )
                    with self.assertRaisesRegex(MathAccessibilityError, "source-pinned"):
                        validate_math_accessibility_description(
                            description.replace(pinned_phrase, damaged_phrase, 1),
                            question_id=question_id,
                            number=number,
                            language=language,
                            required_source_tokens=required_tokens,
                        )

    def test_input_hash_is_deterministic_and_sensitive_to_every_crop(self) -> None:
        self.assertEqual(
            math_accessibility_input_hash(
                question_id=QUESTION_ID,
                number=1,
                image_sha256={"en": "a" * 64, "es": "b" * 64},
                languages=["en", "es"],
            ),
            INPUT_HASH,
        )

    def test_canonical_normalization_preserves_superscripts_and_math_operators(self) -> None:
        expression = "12²⁰ ÷ 12⁴ = 12¹⁶; x ≥ −3; 5.6 + 0.4c ≤ 6c"
        self.assertEqual(normalize_math_accessibility_text(expression), expression)
        self.assertNotEqual(
            math_accessibility_input_hash(
                question_id=QUESTION_ID,
                number=1,
                image_sha256={"en": "a" * 64, "es": "c" * 64},
                languages=["en", "es"],
            ),
            INPUT_HASH,
        )

    def test_valid_descriptions_allow_real_contractions_and_spanish_ve(self) -> None:
        self.assertEqual(
            validate_math_accessibility_description(
                EN,
                question_id=QUESTION_ID,
                number=1,
                language="en",
            ),
            EN,
        )
        self.assertEqual(
            validate_math_accessibility_description(
                ES,
                question_id=QUESTION_ID,
                number=1,
                language="es",
            ),
            ES,
        )

    def test_rejects_unreviewed_ocr_artifacts_answer_leaks_and_wrong_locale(self) -> None:
        invalid = (
            EN.replace("24 ÷ 2", "[VISUAL REVIEW REQUIRED]"),
            EN.replace("24 ÷ 2", "A B C D"),
            EN.replace("24 ÷ 2", "the correct answer"),
            EN.replace("24 ÷ 2", "/Users/reviewer/vine/notes.txt"),
            EN.replace("24 ÷ 2", "/var/folders/75/reviewer/notes.txt"),
            EN.replace("Question 1.", "Question 00."),
            EN.replace("I've", "I rst"),
            EN.replace("I've", "I \ufffd"),
            EN.replace("Choices:", "Opciones:"),
        )
        for description in invalid:
            with self.subTest(description=description):
                with self.assertRaises(MathAccessibilityError):
                    validate_math_accessibility_description(
                        description,
                        question_id=QUESTION_ID,
                        number=1,
                        language="en",
                    )

    def test_rejects_descriptions_that_admit_missing_or_damaged_visual_content(self) -> None:
        english_admissions = (
            "The value is cropped out.",
            "Choice D is cut off.",
            "Choice D is outside the crop.",
            "Choice D is beyond the lower boundary.",
            "Choice D is not legible.",
            "Choice D appears garbled.",
            "Choice D is missing.",
            "Choice D does not appear within the crop.",
        )
        spanish_admissions = (
            "La opción D queda fuera del recorte.",
            "La opción D está recortada.",
            "El valor está superpuesto.",
            "La opción D falta.",
            "La opción D no aparece dentro del recorte.",
        )
        for language, base, admissions in (
            ("en", EN, english_admissions),
            ("es", ES, spanish_admissions),
        ):
            for admission in admissions:
                damaged = base.replace(
                    "I've divided 24 counters into equal groups, and we've recorded the model."
                    if language == "en"
                    else "Ana ve 24 fichas divididas en grupos iguales y registra el modelo.",
                    admission,
                )
                with self.subTest(language=language, admission=admission):
                    with self.assertRaisesRegex(
                        MathAccessibilityError, "generic visual fallback"
                    ):
                        validate_math_accessibility_description(
                            damaged,
                            question_id=QUESTION_ID,
                            number=1,
                            language=language,
                        )

        legitimate_cortadoras = ES.replace(
            "Ana ve 24 fichas divididas en grupos iguales y registra el modelo.",
            "Una empresa usa cortadoras para dividir 24 piezas en grupos iguales.",
        )
        self.assertEqual(
            validate_math_accessibility_description(
                legitimate_cortadoras,
                question_id=QUESTION_ID,
                number=1,
                language="es",
            ),
            legitimate_cortadoras,
        )

    def test_ocr_artifact_check_is_case_sensitive_for_legitimate_algebra(self) -> None:
        algebra = (
            "Question 1. A plan charges a fixed amount plus a fee p for each visit. "
            "Which equation represents the total cost c? Choices: A: c = 15 + 5p; "
            "B: c = 15p + 5; C: p = 15 + 5c; D: p = 15c + 5."
        )
        self.assertEqual(
            validate_math_accessibility_description(
                algebra,
                question_id=QUESTION_ID,
                number=1,
                language="en",
            ),
            algebra,
        )
        for artifact in ("Cc", "gp", "A B C D"):
            damaged = algebra.replace("A plan", f"The scan contains {artifact}. A plan")
            with self.subTest(artifact=artifact):
                with self.assertRaisesRegex(MathAccessibilityError, "OCR artifact"):
                    validate_math_accessibility_description(
                        damaged,
                        question_id=QUESTION_ID,
                        number=1,
                        language="en",
                    )

    def test_rejects_bare_or_generic_choice_bodies(self) -> None:
        generic = EN.replace(
            "A: 24 ÷ 2; B: 24 ÷ 3; C: 24 ÷ 4; D: 24 ÷ 6",
            "A: A; B: figure B; C: C; D: diagram D",
        )
        with self.assertRaisesRegex(MathAccessibilityError, "bare or generic choice"):
            validate_math_accessibility_description(
                generic,
                question_id=QUESTION_ID,
                number=1,
                language="en",
            )

    def test_grade_6_source_tokens_pin_coordinates_and_inequality_operators(self) -> None:
        root = Path(__file__).resolve().parents[1] / "content" / "math-exams" / "accessibility"
        cases = (
            (2017, 10, "(5, 1)", "(6, 1)"),
            (2017, 39, "5.6 + 0.4c ≤ 6c", "5.6 + 0.4c < 6c"),
            (2024, 11, "x ≥ −3", "x > −3"),
        )
        for year, number, pinned, damaged in cases:
            question_id = f"nysed-{year}-g6-mc-q{number}"
            item = json.loads(
                (root / f"{year}-grade-6.json").read_text(encoding="utf-8")
            )["questions"][question_id]
            description = item["description"]["en"]
            required_tokens = item["requiredSourceTokens"]["en"]
            with self.subTest(question_id=question_id):
                self.assertIn(pinned, description)
                self.assertIn(pinned, required_tokens)
                self.assertNotIn(damaged, description)
                self.assertEqual(
                    validate_math_accessibility_description(
                        description,
                        question_id=question_id,
                        number=number,
                        language="en",
                        required_source_tokens=required_tokens,
                    ),
                    description,
                )
                with self.assertRaisesRegex(MathAccessibilityError, "source-pinned"):
                    validate_math_accessibility_description(
                        description.replace(pinned, damaged),
                        question_id=question_id,
                        number=number,
                        language="en",
                        required_source_tokens=required_tokens,
                    )

    def test_2025_grade_5_q29_cube_description_pins_the_audited_geometry(self) -> None:
        root = Path(__file__).resolve().parents[1]
        item = json.loads(
            (
                root
                / "content"
                / "math-exams"
                / "accessibility"
                / "2025-grade-5.json"
            ).read_text(encoding="utf-8")
        )["questions"]["nysed-2025-g5-mc-q29"]
        expected = {
            "en": (
                "two identical horizontal layers",
                "5 cubes form one horizontal row",
                "first, third, and fifth positions",
                "each layer contains 8 cubes",
            ),
            "es": (
                "dos capas horizontales idénticas",
                "5 cubos forman una fila horizontal",
                "posiciones primera, tercera y quinta",
                "cada capa contiene 8 cubos",
            ),
        }
        for language, phrases in expected.items():
            description = item["description"][language]
            tokens = item["requiredSourceTokens"][language]
            with self.subTest(language=language):
                for phrase in phrases:
                    self.assertIn(phrase, description)
                    self.assertIn(phrase, tokens)
                self.assertNotIn("9 cubes", description)
                self.assertNotIn("9 cubos", description)

    def test_evaluative_and_three_choice_exceptions_must_be_explicit(self) -> None:
        evaluative = EN.replace("24 ÷ 2", "a figure labeled incorrect")
        with self.assertRaisesRegex(MathAccessibilityError, "evaluates a choice"):
            validate_math_accessibility_description(
                evaluative,
                question_id=QUESTION_ID,
                number=1,
                language="en",
            )
        self.assertEqual(
            validate_math_accessibility_description(
                evaluative,
                question_id=QUESTION_ID,
                number=1,
                language="en",
                allow_verbatim_choice_evaluation=True,
            ),
            evaluative,
        )

        positive_evaluative = EN.replace("24 ÷ 2", "Choice A is correct because it matches")
        with self.assertRaisesRegex(MathAccessibilityError, "evaluates a choice"):
            validate_math_accessibility_description(
                positive_evaluative,
                question_id=QUESTION_ID,
                number=1,
                language="en",
            )
        self.assertEqual(
            validate_math_accessibility_description(
                positive_evaluative,
                question_id=QUESTION_ID,
                number=1,
                language="en",
                allow_verbatim_choice_evaluation=True,
            ),
            positive_evaluative,
        )

        best_choice = EN.replace("24 ÷ 2", "Option B is best because it matches")
        with self.assertRaisesRegex(MathAccessibilityError, "evaluates a choice"):
            validate_math_accessibility_description(
                best_choice,
                question_id=QUESTION_ID,
                number=1,
                language="en",
            )

        three = EN.rsplit("; D:", 1)[0] + "."
        with self.assertRaisesRegex(MathAccessibilityError, "A:, B:, C:, D:"):
            validate_math_accessibility_description(
                three,
                question_id=QUESTION_ID,
                number=1,
                language="en",
            )
        self.assertEqual(
            validate_math_accessibility_description(
                three,
                question_id=QUESTION_ID,
                number=1,
                language="en",
                expected_choice_labels=("A", "B", "C"),
            ),
            three,
        )

    def test_answer_language_in_stem_exception_never_applies_to_choices(self) -> None:
        verbatim_stem = EN.replace(
            "I've divided 24 counters into equal groups, and we've recorded the model. "
            "Which expression matches the model?",
            "A division result is written in the prompt: the answer is 160 with a remainder of 2. "
            "Which expression records that printed result?",
        )
        with self.assertRaisesRegex(MathAccessibilityError, "leaks grading information"):
            validate_math_accessibility_description(
                verbatim_stem,
                question_id=QUESTION_ID,
                number=1,
                language="en",
            )
        self.assertEqual(
            validate_math_accessibility_description(
                verbatim_stem,
                question_id=QUESTION_ID,
                number=1,
                language="en",
                allow_verbatim_stem_answer_language=True,
            ),
            verbatim_stem,
        )

        leaked_choice = verbatim_stem.replace("A: 24 ÷ 2", "A: the correct answer")
        with self.assertRaisesRegex(MathAccessibilityError, "leaks grading information"):
            validate_math_accessibility_description(
                leaked_choice,
                question_id=QUESTION_ID,
                number=1,
                language="en",
                allow_verbatim_stem_answer_language=True,
            )

    def test_short_official_questions_require_an_explicit_exception(self) -> None:
        short_stem = (
            "Question 44. What is 123 ÷ 8? Choices: A: 15 remainder 7; B: 15 remainder 3; "
            "C: 16 remainder 5; D: 16 remainder 1."
        )
        short_total = (
            "Question 35. What is 8 3/5 + 8 1/5? Choices: A: 8 4/10; B: 8 4/5; "
            "C: 16 4/10; D: 16 4/5."
        )
        for number, description in ((44, short_stem), (35, short_total)):
            with self.subTest(number=number):
                with self.assertRaises(MathAccessibilityError):
                    validate_math_accessibility_description(
                        description,
                        question_id=f"nysed-short-q{number}",
                        number=number,
                        language="en",
                    )
                self.assertEqual(
                    validate_math_accessibility_description(
                        description,
                        question_id=f"nysed-short-q{number}",
                        number=number,
                        language="en",
                        allow_verbatim_short_question=True,
                    ),
                    description,
                )

    def test_loader_requires_exact_coverage_hash_and_explicit_flags(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            path = root / "2022-grade-3.json"
            path.write_text(json.dumps(sidecar()), encoding="utf-8")
            loaded = load_math_exam_accessibility(
                year=2022,
                grade=3,
                exam_id="nysed-2022-grade-3-mc-v1",
                languages=["en", "es"],
                expected_input_hashes={QUESTION_ID: INPUT_HASH},
                expected_numbers={QUESTION_ID: 1},
                root=root,
            )
            self.assertEqual(loaded[QUESTION_ID]["en"], EN)

            stale = sidecar()
            stale["questions"][QUESTION_ID]["inputHash"] = "c" * 64
            path.write_text(json.dumps(stale), encoding="utf-8")
            with self.assertRaisesRegex(MathAccessibilityError, "hash mismatch"):
                load_math_exam_accessibility(
                    year=2022,
                    grade=3,
                    exam_id="nysed-2022-grade-3-mc-v1",
                    languages=["en", "es"],
                    expected_input_hashes={QUESTION_ID: INPUT_HASH},
                    expected_numbers={QUESTION_ID: 1},
                    root=root,
                )

            unexpected_three_choice_flag = sidecar()
            unexpected_three_choice_flag["questions"][QUESTION_ID][
                "verbatimThreeChoices"
            ] = True
            path.write_text(
                json.dumps(unexpected_three_choice_flag),
                encoding="utf-8",
            )
            with self.assertRaisesRegex(MathAccessibilityError, "only permitted"):
                load_math_exam_accessibility(
                    year=2022,
                    grade=3,
                    exam_id="nysed-2022-grade-3-mc-v1",
                    languages=["en", "es"],
                    expected_input_hashes={QUESTION_ID: INPUT_HASH},
                    expected_numbers={QUESTION_ID: 1},
                    root=root,
                )

            bad_short_flag = sidecar()
            bad_short_flag["questions"][QUESTION_ID]["verbatimShortQuestion"] = False
            path.write_text(json.dumps(bad_short_flag), encoding="utf-8")
            with self.assertRaisesRegex(MathAccessibilityError, "must be true"):
                load_math_exam_accessibility(
                    year=2022,
                    grade=3,
                    exam_id="nysed-2022-grade-3-mc-v1",
                    languages=["en", "es"],
                    expected_input_hashes={QUESTION_ID: INPUT_HASH},
                    expected_numbers={QUESTION_ID: 1},
                    root=root,
                )

            missing = sidecar()
            missing["questions"] = {}
            path.write_text(json.dumps(missing), encoding="utf-8")
            with self.assertRaisesRegex(MathAccessibilityError, "coverage changed"):
                load_math_exam_accessibility(
                    year=2022,
                    grade=3,
                    exam_id="nysed-2022-grade-3-mc-v1",
                    languages=["en", "es"],
                    expected_input_hashes={QUESTION_ID: INPUT_HASH},
                    expected_numbers={QUESTION_ID: 1},
                    root=root,
                )

    def test_loader_requires_the_verified_three_choice_flag(self) -> None:
        question_id = "nysed-2016-g4-mc-q24"
        input_hash = "d" * 64
        english = (
            "Question 24. Which figure appears to show a pair of perpendicular lines? "
            "Choices: A: two separate slanted lines; B: one horizontal and one vertical "
            "line meeting at a right angle; C: two parallel horizontal lines."
        )
        spanish = (
            "Pregunta 24. ¿Qué figura parece mostrar un par de rectas perpendiculares? "
            "Opciones: A: dos rectas inclinadas separadas; B: una recta horizontal y una "
            "vertical que forman un ángulo recto; C: dos rectas horizontales paralelas."
        )
        record = {
            "schemaVersion": 1,
            "policyVersion": MATH_ACCESSIBILITY_POLICY_VERSION,
            "examId": "nysed-2016-grade-4-mc-v1",
            "languages": ["en", "es"],
            "questions": {
                question_id: {
                    "inputHash": input_hash,
                    "description": {"en": english, "es": spanish},
                }
            },
        }

        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            path = root / "2016-grade-4.json"
            path.write_text(json.dumps(record), encoding="utf-8")
            with self.assertRaisesRegex(MathAccessibilityError, "must be true"):
                load_math_exam_accessibility(
                    year=2016,
                    grade=4,
                    exam_id="nysed-2016-grade-4-mc-v1",
                    languages=["en", "es"],
                    expected_input_hashes={question_id: input_hash},
                    expected_numbers={question_id: 24},
                    root=root,
                )

            record["questions"][question_id]["verbatimThreeChoices"] = True
            path.write_text(json.dumps(record), encoding="utf-8")
            loaded = load_math_exam_accessibility(
                year=2016,
                grade=4,
                exam_id="nysed-2016-grade-4-mc-v1",
                languages=["en", "es"],
                expected_input_hashes={question_id: input_hash},
                expected_numbers={question_id: 24},
                root=root,
            )
            self.assertEqual(loaded[question_id]["en"], english)

    def test_loader_limits_single_letter_choice_flags_to_two_audited_questions(self) -> None:
        root = Path(__file__).resolve().parents[1]
        audited = (
            (2017, "nysed-2017-g4-mc-q27", 27),
            (2018, "nysed-2018-g4-mc-q31", 31),
        )
        for year, question_id, number in audited:
            source = json.loads(
                (
                    root
                    / "content"
                    / "math-exams"
                    / "accessibility"
                    / f"{year}-grade-4.json"
                ).read_text(encoding="utf-8")
            )
            item = source["questions"][question_id]
            isolated = {
                **source,
                "questions": {question_id: item},
            }
            with self.subTest(question_id=question_id), tempfile.TemporaryDirectory() as directory:
                sidecar_root = Path(directory)
                path = sidecar_root / f"{year}-grade-4.json"
                path.write_text(json.dumps(isolated), encoding="utf-8")
                loaded = load_math_exam_accessibility(
                    year=year,
                    grade=4,
                    exam_id=source["examId"],
                    languages=source["languages"],
                    expected_input_hashes={question_id: item["inputHash"]},
                    expected_numbers={question_id: number},
                    root=sidecar_root,
                )
                self.assertEqual(loaded[question_id], item["description"])

                del isolated["questions"][question_id]["verbatimSingleLetterChoices"]
                path.write_text(json.dumps(isolated), encoding="utf-8")
                with self.assertRaisesRegex(
                    MathAccessibilityError, "verbatimSingleLetterChoices.*must be true"
                ):
                    load_math_exam_accessibility(
                        year=year,
                        grade=4,
                        exam_id=source["examId"],
                        languages=source["languages"],
                        expected_input_hashes={question_id: item["inputHash"]},
                        expected_numbers={question_id: number},
                        root=sidecar_root,
                    )

        with tempfile.TemporaryDirectory() as directory:
            sidecar_root = Path(directory)
            record = sidecar()
            record["questions"][QUESTION_ID]["verbatimSingleLetterChoices"] = True
            (sidecar_root / "2022-grade-3.json").write_text(
                json.dumps(record), encoding="utf-8"
            )
            with self.assertRaisesRegex(MathAccessibilityError, "only permitted"):
                load_math_exam_accessibility(
                    year=2022,
                    grade=3,
                    exam_id="nysed-2022-grade-3-mc-v1",
                    languages=["en", "es"],
                    expected_input_hashes={QUESTION_ID: INPUT_HASH},
                    expected_numbers={QUESTION_ID: 1},
                    root=sidecar_root,
                )

    def test_all_checked_in_grade_3_through_8_sidecars_strict_load(self) -> None:
        from scripts.seed_nysed_math_accessibility_sidecars import _exam_inputs

        root = Path(__file__).resolve().parents[1]
        catalog = json.loads(
            (root / "content" / "math-exams" / "generated" / "catalog.json").read_text(
                encoding="utf-8"
            )
        )
        exams = [exam for exam in catalog["exams"] if exam["grade"] in range(3, 9)]
        question_count = 0
        localization_count = 0
        grade_5_8_exam_count = 0
        grade_5_8_question_count = 0
        grade_5_8_localization_count = 0
        for exam in exams:
            input_hashes, numbers, _descriptions = _exam_inputs(exam, root / "public")
            loaded = load_math_exam_accessibility(
                year=exam["year"],
                grade=exam["grade"],
                exam_id=exam["id"],
                languages=exam["supportedLanguages"],
                expected_input_hashes=input_hashes,
                expected_numbers=numbers,
            )
            question_count += len(loaded)
            exam_localizations = sum(len(localized) for localized in loaded.values())
            localization_count += exam_localizations
            if exam["grade"] in range(5, 9):
                grade_5_8_exam_count += 1
                grade_5_8_question_count += len(loaded)
                grade_5_8_localization_count += exam_localizations

        self.assertEqual(len(exams), 78)
        self.assertEqual(question_count, 1_839)
        self.assertEqual(localization_count, 3_131)
        self.assertEqual(grade_5_8_exam_count, 52)
        self.assertEqual(grade_5_8_question_count, 1_277)
        self.assertEqual(grade_5_8_localization_count, 2_174)


if __name__ == "__main__":
    unittest.main()

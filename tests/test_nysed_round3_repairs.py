"""Round-three regressions: accessible solvability, evidence, and source fidelity."""

import copy
import hashlib
import json
from pathlib import Path
import unittest
from collections import Counter

from scripts.nysed_content_checks import validate_explanation_choice, validate_math_minus_signs
from scripts.import_nysed_ela_mc import validate_exam as validate_ela_exam
from scripts.import_nysed_math_mc import ImportFailure, validate_imported_question_explanation
from scripts.nysed_math_accessibility import validate_math_accessibility_description
from scripts import import_nysed_math_mc as math_importer

ROOT = Path(__file__).resolve().parents[1]


def read(path):
    return json.loads((ROOT / path).read_text())


class RoundThreeTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.catalogs = {s: read(f"content/{s}-exams/generated/catalog.json") for s in ("math", "ela")}
        cls.questions = {q["id"]: q for c in cls.catalogs.values() for e in c["exams"] for q in e["questions"]}
        cls.passages = {s["id"]: s["passage"] for e in cls.catalogs["ela"]["exams"] for s in e["stimuli"]}

    def alt(self, id, language="en"):
        return self.questions["nysed-" + id]["alt"][language]

    def test_every_finding_has_a_disposition_and_keys_are_unchanged(self):
        report = read("content/nysed-round3-resolutions.json")
        self.assertEqual([r["index"] for r in report["findings"]], list(range(105)))
        self.assertEqual(sum(r["status"] == "fixed" for r in report["findings"]), 104)
        retained = [r for r in report["findings"] if r["status"] != "fixed"]
        self.assertEqual([r["index"] for r in retained], [40])
        self.assertTrue(all(r["resolution"] for r in report["findings"]))
        keys = sorted((id, q["correct"]) for id, q in self.questions.items())
        self.assertEqual(len(keys), 3422)
        self.assertEqual(hashlib.sha256(json.dumps(keys, separators=(",", ":")).encode()).hexdigest(),
                         "72b3a898a61089d993531d49757cc6ca6ca660175192fea889ec3d1e167d023c")

    def test_descriptions_retain_enough_geometry_to_solve(self):
        for lang, tokens in {"en": ("all three sides", "taller than it is wide", "halfway between"),
                             "es": ("los tres lados", "más alta que ancha", "a media altura")}.items():
            for id, token in zip(("2023-g4-mc-q31", "2025-g4-mc-q31", "2026-g3-mc-q30"), tokens):
                self.assertIn(token, self.alt(id, lang))
        self.assertIn("in inches", self.alt("2023-g4-mc-q9"))
        self.assertIn("en pulgadas", self.alt("2023-g4-mc-q9", "es"))
        self.assertIn("grid lines every 2 units", self.alt("2016-g8-mc-q41"))

    def test_descriptions_leave_the_tested_inference_to_the_student(self):
        self.assertNotIn("same-size", self.alt("2026-g3-mc-q30"))
        self.assertNotIn("del mismo tamaño", self.alt("2026-g3-mc-q30", "es"))
        choices = self.alt("2016-g6-mc-q18").split("Choices:")[1]
        self.assertNotIn("/2", choices)
        self.assertIn("halfway between −3 and −2", choices)
        self.assertNotRegex(self.alt("2015-g6-mc-q25").split("Choices:")[1], "prism|pyramid")
        self.assertNotIn("units wide", self.alt("2015-g8-mc-q47"))
        for lang, heading in (("en", "Choices:"), ("es", "Opciones:")):
            for id in ("2024-g7-mc-q14", "2018-g7-mc-q28"):
                text = self.alt(id, lang).split(heading)[0]
                self.assertNotRegex(text, r"first quartile|third quartile|primer cuartil|tercer cuartil|mediana")
            self.assertNotRegex(self.alt("2026-g8-mc-q18", lang).split(heading)[0],
                                r"increasing|decreasing|creciente|decreciente")
            self.assertNotRegex(self.alt("2026-g8-mc-q23", lang), r"vertical angle|opuesto por el vértice")
            self.assertNotRegex(self.alt("2024-g8-mc-q35", lang), r"radius|diameter|radio|diámetro")
        self.assertNotIn("Thus, the graph rises", self.alt("2018-g8-mc-q40"))
        self.assertNotIn("Por lo tanto, la función sube", self.alt("2018-g8-mc-q40", "es"))

    def test_equations_and_fractions_are_unambiguous(self):
        self.assertIn("6. Second equation: x", self.alt("2017-g8-mc-q35"))
        self.assertIn("6. Segunda ecuación: x", self.alt("2017-g8-mc-q35", "es"))
        for id in ("2014-g8-mc-q19", "2015-g8-mc-q35", "2015-g8-mc-q38", "2018-g8-mc-q19"):
            for text in self.questions["nysed-" + id]["alt"].values():
                self.assertNotRegex(text, r"\d/\d+\s*x")
        self.assertIn("(1/2)(14 + 4x)", self.alt("2026-g8-mc-q32"))
        self.assertIn("2 and 1/7", self.alt("2026-g8-mc-q32"))

    def test_bat_explanation_uses_passage_evidence_not_new_facts(self):
        q = self.questions["nysed-ela-2022-g6-mc-q11"]
        text = q["explanation"]["text"]
        passage = self.passages["nysed-ela-2022-g6-stimulus-8-14"]["transcript"]["text"]
        self.assertEqual(q["correct"], "B")
        for quote in ("just out of ignorance", "Many people are afraid of bats"):
            self.assertIn(quote, text)
            self.assertIn(quote, passage)
        self.assertIn("mistaken beliefs", text)
        self.assertIn("Choice D", text)
        self.assertNotRegex(text, r"bats help humans|people stay away|calls killing bats")

    def test_footnotes_and_sidebars_do_not_interrupt_sentences(self):
        text = self.passages["nysed-ela-2017-g7-stimulus-1-7"]["transcript"]["text"]
        for token in ("crepuscular³ hunters", "ingenious⁴ ways", "³ crepuscular:", "⁴ ingenious:"):
            self.assertIn(token, text)
        text = self.passages["nysed-ela-2015-g3-stimulus-1-6"]["transcript"]["text"]
        self.assertLess(text.index("[Sidebar: injera"), text.index("8 Niel sat"))
        text = self.passages["nysed-ela-2014-g8-stimulus-1-7"]["transcript"]["text"]
        self.assertIn("something Rowdy and I\nhad been working on", text)
        self.assertLess(text.index("25 in my voice"), text.index("¹ cinch:"))
        self.assertNotIn("The\n\nlight", self.passages["nysed-ela-2021-g5-stimulus-1-7"]["transcript"]["text"])
        for id in ("2019-g8-stimulus-22-28", "2021-g8-stimulus-15-21"):
            self.assertIn("patron saint.¹", self.passages["nysed-ela-" + id]["transcript"]["text"])

    def test_all_reviewed_math_text_has_arithmetic_minus_signs(self):
        for exam in self.catalogs["math"]["exams"]:
            for q in exam["questions"]:
                for text in list(q["alt"].values()) + list(q["explanation"]["text"].values()):
                    validate_math_minus_signs(text, question_id=q["id"])

    def test_importer_accepts_every_current_explanation_and_provenance_total(self):
        counts = Counter()
        for exam in self.catalogs["math"]["exams"]:
            for q in exam["questions"]:
                validate_imported_question_explanation(exam["year"], q)
                counts[q["explanation"]["source"]] += 1
        self.assertEqual(counts["official-nysed"], math_importer.EXPECTED_OFFICIAL_EXPLANATION_TOTAL)
        self.assertEqual(counts["official-nysed-corrected"], math_importer.EXPECTED_OFFICIAL_CORRECTED_EXPLANATION_TOTAL)
        self.assertEqual(counts["vine-authored"], math_importer.EXPECTED_VINE_EXPLANATION_TOTAL)
        for exam in self.catalogs["ela"]["exams"]:
            validate_ela_exam(exam)

    def test_minus_guard_rejects_arithmetic_but_not_prose_hyphens(self):
        for text in ("-(−2 1/2)", "|-8 − 23|", "(-x, -y)", "$110 - $80", "2c - 10", "10⁻⁴ - 0.3"):
            with self.subTest(text=text), self.assertRaisesRegex(ValueError, "mathematical minus"):
                validate_math_minus_signs(text, question_id="test")
        for text in ("65-year-old", "1/3-pound portions", "x-axis", "28-by-28 square", "3/4 = 6/8", "−(−2)"):
            validate_math_minus_signs(text, question_id="test")

    def test_choice_guard_ignores_distractor_mentions_and_names(self):
        validate_explanation_choice('Students who choose “B” understand why choice A is incorrect.', correct="B", question_id="test")
        validate_explanation_choice('Students who chose Cook explain choice A.', correct="B", question_id="test")
        with self.assertRaisesRegex(ValueError, "does not match key"):
            validate_explanation_choice('Students who choose “C” understand the passage.', correct="B", question_id="test")

    def test_importers_fail_closed_on_reintroduced_errors(self):
        exam = copy.deepcopy(self.catalogs["ela"]["exams"][0])
        q = exam["questions"][0]
        wrong = "A" if q["correct"] != "A" else "B"
        q["explanation"]["text"] = f'Students who choose “{wrong}” understand the passage because the character learns from the problem and changes her actions.'
        with self.assertRaisesRegex(ImportFailure, "does not match key"):
            validate_ela_exam(exam)
        q = copy.deepcopy(self.questions["nysed-2024-g6-mc-q18"])
        q["explanation"]["text"]["en"] = q["explanation"]["text"]["en"].replace("−(", "-(")
        with self.assertRaisesRegex(ImportFailure, "mathematical minus"):
            validate_imported_question_explanation(2024, q)
        text = self.alt("2021-g7-mc-q21").replace("−", "-")
        with self.assertRaisesRegex(ValueError, "mathematical minus"):
            validate_math_accessibility_description(text, question_id="test", number=21, language="en")

    def test_repaired_footers_have_source_and_geometry_guards(self):
        records = read("content/nysed-image-finishing.json")["images"]
        for n in (15, 16, 17, 18, 19, 20, 22, 23, 24, 26, 28):
            asset = f"/vine-app/nysed/math/2015/grade-7/en/q{n:02d}.webp"
            r = records[asset]
            self.assertEqual(len(r["sourcePdfSha256"]), 64)
            self.assertEqual(r["crop"][:3], [0, 0, r["inputSize"][0]])
            self.assertEqual(r["inputSize"][1] - r["crop"][3], 27)


if __name__ == "__main__":
    unittest.main()

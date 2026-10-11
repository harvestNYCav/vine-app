"""Content regressions caught by the second student review, not just snapshot checks."""

import hashlib
import json
from pathlib import Path
import re
import unittest

from PIL import Image

from scripts.nysed_image_finishing import finish_reviewed_image

ROOT = Path(__file__).resolve().parents[1]


def read(path):
    return json.loads((ROOT / path).read_text())


class RoundTwoContentTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.catalogs = {s: read(f"content/{s}-exams/generated/catalog.json") for s in ("math", "ela")}
        cls.questions = {q["id"]: q for c in cls.catalogs.values() for e in c["exams"] for q in e["questions"]}
        cls.passages = {s["id"]: s["passage"] for e in cls.catalogs["ela"]["exams"] for s in e["stimuli"]}

    def test_every_round_two_entry_has_a_disposition_and_no_key_changed(self):
        report = read("content/nysed-round2-resolutions.json")
        self.assertEqual([r["index"] for r in report["findings"]], list(range(174)))
        self.assertTrue(all(r["status"] == "fixed" and r["resolution"] for r in report["findings"]))
        self.assertEqual(len(report["priorUnresolvedVerifications"]), 73)
        keys = sorted((id, q["correct"]) for id, q in self.questions.items())
        self.assertEqual(len(keys), 3422)
        digest = hashlib.sha256(json.dumps(keys, separators=(",", ":")).encode()).hexdigest()
        self.assertEqual(digest, "72b3a898a61089d993531d49757cc6ca6ca660175192fea889ec3d1e167d023c")

    def test_correct_letter_and_evidence_survive_rewrites(self):
        q = self.questions["nysed-ela-2014-g3-mc-q14"]
        self.assertEqual(q["correct"], "C")
        self.assertIn('choose “C”', q["explanation"]["text"])
        self.assertNotIn('choose “B”', q["explanation"]["text"])
        for year, number in ((2023, 4), (2024, 26), (2026, 3)):
            text = self.questions[f"nysed-ela-{year}-g3-mc-q{number}"]["explanation"]["text"]
            self.assertNotRegex(text, r"rather than conclusively|rather than intentionally|purpose rather than")
        text = self.questions["nysed-ela-2023-g4-mc-q31"]["explanation"]["text"]
        for evidence in ("Etruscans", "Romans", "English", "Thanksgiving"):
            self.assertIn(evidence, text)

    def test_alts_describe_visuals_without_doing_the_calculation(self):
        q = self.questions["nysed-2023-g4-mc-q25"]
        self.assertNotRegex(q["alt"]["en"].split("Choices:")[1], r"acute|obtuse|60 degrees|120 degrees")
        self.assertNotIn("scalene", self.questions["nysed-2023-g4-mc-q31"]["alt"]["en"])
        self.assertNotIn("total of 21", self.questions["nysed-2016-g5-mc-q40"]["alt"]["en"])
        self.assertNotIn("23 shaded", self.questions["nysed-2017-g5-mc-q15"]["alt"]["en"])
        plot = self.questions["nysed-2016-g8-mc-q41"]["alt"]["en"].split("Choices:")[1]
        self.assertNotRegex(plot, r"strong (?:positive|negative)|through their center|above most|closely around")
        self.assertIn("(8.7, 1.3)", plot)
        for choice in "ABCD":
            part = plot.split(choice + ": Points near ")[1].split(". Line k")[0]
            self.assertEqual(len(re.findall(r"\([^()]+\)", part)), 18)

    def test_glosses_read_in_order_and_tables_are_verbatim(self):
        text = self.passages["nysed-ela-2022-g4-stimulus-1-6"]["transcript"]["text"]
        self.assertIn("Jacana (a small bird)", text)
        self.assertNotIn("marsh bird", text)
        text = self.passages["nysed-ela-2025-g3-stimulus-19-23"]["transcript"]["text"]
        self.assertLess(text.index("[Sidebar: predators"), text.index("Many Different Dens"))
        text = self.passages["nysed-ela-2026-g4-stimulus-20-24"]["transcript"]["text"]
        self.assertIn("[Table: Balloon Firsts]", text)
        self.assertIn("March 2, 1784: First time humans take flight in hydrogen balloon", text)
        for id, passage in self.passages.items():
            if re.search(r"-g[345]-", id):
                self.assertNotRegex(passage["transcript"]["text"], r"(?m)^(?!\[)[^\n]+ = [^\n]+$")
        for id in ("nysed-ela-2014-g7-stimulus-1-7", "nysed-ela-2014-g8-stimulus-1-7"):
            text = self.passages[id]["transcript"]["text"]
            self.assertNotRegex(text, r"(?:takes|forward in)\n\[(?:Photograph|Illustration):")
        for id, tokens in {
            "nysed-ela-2017-g7-stimulus-1-7": ("diurnal¹ fishes", "wrasses²", "¹ diurnal:", "² wrasses:"),
            "nysed-ela-2017-g8-stimulus-1-7": ("Scallop¹", "Packard,²", "¹ Mrs. Scallop:", "² Packard:"),
            "nysed-ela-2017-g6-stimulus-36-42": ("fronds.¹", "¹ fronds:"),
            "nysed-ela-2017-g8-stimulus-22-28": ("TRPA1 receptors",),
        }.items():
            for token in tokens:
                self.assertIn(token, self.passages[id]["transcript"]["text"])

    def test_math_steps_and_language_do_not_regress(self):
        for e in self.catalogs["math"]["exams"]:
            for q in e["questions"]:
                for text in q["explanation"]["text"].values():
                    self.assertNotIn("^", text, q["id"])
                    self.assertNotIn(",.", text, q["id"])
                    self.assertNotRegex(text, r"\b(?:el cuarta|los milésimas|El fuente|del entrada|del Sra)\b")
        text = self.questions["nysed-2014-g6-mc-q29"]["explanation"]["text"]["en"]
        self.assertEqual(text.count("4 + 3 = 7"), 1)
        text = self.questions["nysed-2017-g5-mc-q28"]["explanation"]["text"]["en"]
        self.assertIn("2/4 = 4/8", text)
        self.assertIn("3/4 = 6/8", text)

    def test_image_finishing_is_source_guarded_and_does_not_clip_fraction(self):
        records = read("content/nysed-image-finishing.json")["images"]
        for asset, record in records.items():
            source = Image.new("RGB", record["inputSize"], "white")
            with self.subTest(asset=asset):
                with self.assertRaisesRegex(ValueError, "source/geometry changed"):
                    finish_reviewed_image(source, asset=asset, source_sha256="0" * 64)
                result = finish_reviewed_image(source, asset=asset, source_sha256=record["sourcePdfSha256"])
                with Image.open(ROOT / "public" / asset.removeprefix("/vine-app/")) as actual:
                    self.assertEqual(result.size, actual.size)
        asset = "/vine-app/nysed/math/2015/grade-7/en/q21.webp"
        r = records[asset]
        source = Image.new("RGB", r["inputSize"], "white")
        source.putpixel((584, 9), (0, 0, 0))  # numerator, above the question's text baseline
        source.putpixel((120, 9), (0, 0, 0))  # internal item code, not question content
        result = finish_reviewed_image(source, asset=asset, source_sha256=r["sourcePdfSha256"])
        self.assertEqual(result.getpixel((584, 9)), (0, 0, 0))
        self.assertEqual(result.getpixel((120, 9)), (255, 255, 255))


if __name__ == "__main__":
    unittest.main()

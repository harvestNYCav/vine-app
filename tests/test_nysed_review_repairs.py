"""Source-audited October 2026 content regressions, not answer-key round trips."""
import json
import hashlib
import unittest
from pathlib import Path
from unittest.mock import patch

from PIL import Image
from scripts.import_nysed_math_mc import (
    ImportFailure, _VERIFIED_MODERN_CROP_REPAIRS, apply_verified_modern_crop_repairs,
    _VERIFIED_TEXT_OVERLAY_REPAIRS, verified_text_overlay_repairs,
)

ROOT = Path(__file__).resolve().parents[1]
# Dimensions of the complete crops reviewed against full original PDF pages.
REPAIRED_CROPS = {
    (2014, 4, 'en', 49): (1100, 1336),
    (2014, 7, 'en', 19): (1066, 1450),
    (2015, 3, 'en', 5): (1108, 1376),
    (2015, 3, 'en', 10): (1108, 1205),
    (2015, 4, 'en', 11): (1108, 621),
    (2015, 6, 'en', 3): (1108, 1327),
    (2015, 6, 'en', 18): (1108, 636),
    (2015, 7, 'en', 2): (1108, 1320),
    (2015, 7, 'en', 21): (1108, 538),
    (2015, 7, 'en', 25): (1108, 586),
    (2015, 7, 'en', 27): (1108, 337),
    (2016, 4, 'en', 24): (904, 1033),
    (2016, 5, 'en', 15): (1207, 823),
    (2016, 5, 'en', 29): (684, 342),
    (2016, 6, 'en', 11): (1171, 791),
    (2016, 6, 'en', 42): (1139, 1297),
    (2016, 7, 'en', 15): (674, 440),
    (2016, 7, 'en', 16): (1157, 430),
    (2016, 8, 'en', 2): (1121, 1027),
    (2016, 8, 'en', 41): (1195, 913),
    (2017, 3, 'es', 24): (1089, 609),
    (2017, 4, 'es', 32): (1092, 448),
    (2017, 5, 'en', 33): (1137, 827),
    (2017, 6, 'en', 17): (1078, 985),
    (2017, 6, 'es', 17): (1150, 984),
    (2017, 7, 'en', 33): (1082, 429),
    (2017, 7, 'es', 33): (1098, 429),
    (2018, 4, 'es', 30): (1010, 411),
    (2018, 6, 'es', 33): (1130, 443),
    (2019, 3, 'en', 3): (1143, 348),
    (2019, 3, 'es', 3): (1146, 358),
    (2019, 4, 'en', 3): (433, 412),
    (2019, 4, 'en', 37): (979, 641),
    (2019, 4, 'es', 3): (518, 413),
    (2019, 4, 'es', 37): (999, 673),
    (2019, 5, 'en', 36): (820, 326),
    (2021, 3, 'en', 11): (1012, 442),
    (2021, 3, 'es', 11): (1084, 442),
    (2021, 4, 'en', 3): (433, 412),
    (2021, 4, 'es', 3): (518, 412),
    (2021, 6, 'en', 9): (731, 488),
    (2021, 8, 'en', 20): (1083, 386),
    (2021, 8, 'es', 13): (1125, 1383),
    (2021, 8, 'es', 18): (1126, 356),
    (2022, 6, 'es', 17): (1126, 539),
    (2022, 7, 'en', 21): (1039, 381),
    (2022, 7, 'en', 35): (1143, 847),
    (2022, 7, 'es', 21): (1116, 381),
    (2022, 7, 'es', 35): (1041, 847),
    (2022, 8, 'en', 16): (690, 471),
    (2022, 8, 'es', 16): (860, 471),
    (2023, 4, 'es', 35): (453, 320),
    (2023, 5, 'es', 21): (1088, 484),
    (2023, 6, 'en', 3): (1137, 342),
    (2023, 6, 'es', 3): (1125, 371),
    (2023, 8, 'en', 20): (1119, 390),
    (2023, 8, 'es', 20): (1069, 425),
    (2024, 3, 'es', 4): (947, 600),
    (2024, 3, 'es', 13): (1113, 415),
    (2024, 7, 'en', 5): (1125, 344),
    (2024, 7, 'es', 5): (1079, 338),
    (2024, 7, 'es', 17): (1131, 398),
    (2024, 7, 'es', 29): (1118, 396),
    (2024, 8, 'en', 20): (618, 348),
    (2024, 8, 'es', 12): (794, 304),
    (2024, 8, 'es', 20): (625, 346),
    (2025, 4, 'en', 22): (1104, 344),
    (2025, 4, 'es', 22): (1141, 344),
    (2025, 5, 'es', 14): (458, 418),
    (2026, 3, 'es', 6): (1116, 551),
    (2026, 4, 'es', 16): (1084, 485),
    (2026, 4, 'es', 20): (1144, 776),
    (2026, 5, 'en', 11): (1086, 485),
    (2026, 5, 'en', 28): (833, 555),
    (2026, 5, 'es', 11): (1124, 477),
    (2026, 8, 'es', 10): (1118, 1464),
}


class ReviewedContentTests(unittest.TestCase):
    def test_reviewed_diagram_repairs_keep_the_verified_pixels(self):
        expected = [('public/nysed/math/2017/grade-5/es/q15.webp', '4dd8163133288419859428fd52b028d8e622179417c992009eb9478afeca0a12'), ('public/nysed/math/2017/grade-5/es/q17.webp', '725dbc2ea6694c40886645a144bbe4f139b57af4e2d4001ae4f3a64d4e14b81f'), ('public/nysed/math/2017/grade-6/es/q46.webp', 'da7c405b7a9b907c053418a41df217fd3e95a0749113ce631a91ebf19220eb76'), ('public/nysed/math/2017/grade-8/en/q04.webp', 'a75f2683513935a20c95c6d4455b369cef69aace83c09eee58280b9e1215d70b')]
        for path, digest in expected:
            self.assertEqual(hashlib.sha256((ROOT/path).read_bytes()).hexdigest(), digest)

    def test_diagram_overlay_lines_cannot_escape_the_verified_crop(self):
        for (source_hash, number), record in _VERIFIED_TEXT_OVERLAY_REPAIRS.items():
            if not record.get('lines'):
                continue
            boxes = {number: (record['sourcePage'], record['box'])}
            self.assertIn(number, verified_text_overlay_repairs(source_pdf_sha256=source_hash, boxes=boxes))
            invalid = {**record, 'lines': ((-1, -1, 0, 0),)}
            with patch.dict(_VERIFIED_TEXT_OVERLAY_REPAIRS, {(source_hash, number): invalid}):
                with self.assertRaisesRegex(ImportFailure, 'diagram-overlay line is invalid'):
                    verified_text_overlay_repairs(source_pdf_sha256=source_hash, boxes=boxes)

    def test_every_review_finding_has_an_explicit_disposition(self):
        report = json.loads((ROOT/'content/nysed-review-resolutions.json').read_text())
        self.assertEqual([r['index'] for r in report['findings']], list(range(546)))
        for finding in report['findings']:
            self.assertIn(finding['status'], {'fixed', 'retained-cosmetic', 'retained-source'})
            self.assertGreater(len(finding['reason']), 30)
        for status, count in report['summary'].items():
            self.assertEqual(sum(r['status'] == status for r in report['findings']), count)

    def test_all_3422_official_answer_keys_are_unchanged(self):
        report = json.loads((ROOT/'content/nysed-review-resolutions.json').read_text())
        for subject in ['math', 'ela']:
            catalog = json.loads((ROOT/f'content/{subject}-exams/generated/catalog.json').read_text())
            pairs = sorted((q['id'], q['correct']) for e in catalog['exams'] for q in e['questions'])
            expected = report['answerKeyBaseline'][subject]
            self.assertEqual(len(pairs), expected['questionCount'])
            digest = hashlib.sha256(json.dumps(pairs, separators=(',', ':')).encode()).hexdigest()
            self.assertEqual(digest, expected['sha256'])

    def test_complete_crops_and_catalog_dimensions_stay_in_sync(self):
        catalog = json.loads((ROOT/'content/math-exams/generated/catalog.json').read_text())
        questions = {q['id']: q for e in catalog['exams'] for q in e['questions']}
        for (year, grade, lang, number), size in REPAIRED_CROPS.items():
            with self.subTest(year=year, grade=grade, lang=lang, number=number):
                asset = ROOT/f'public/nysed/math/{year}/grade-{grade}/{lang}/q{number:02d}.webp'
                with Image.open(asset) as image:
                    self.assertEqual(image.size, size)
                q = questions[f'nysed-{year}-g{grade}-mc-q{number}']
                self.assertEqual((q['image'][lang]['width'], q['image'][lang]['height']), size)

    def test_repairs_are_source_and_geometry_pinned(self):
        for key in REPAIRED_CROPS:
            year, grade, lang, number = key
            records = {k[3]: r for k, r in _VERIFIED_MODERN_CROP_REPAIRS.items() if k[:3] == key[:3]}
            record = records[number]
            boxes = {n: (r['sourcePage'], r['oldBox']) for n, r in records.items()}
            args = dict(pdf_path=Path('source.pdf'), year=year, grade=grade, language=lang, boxes=boxes)
            with self.subTest(key=key), patch('scripts.import_nysed_math_mc.sha256_file', return_value=record['sourcePdfSha256']):
                repaired, _ = apply_verified_modern_crop_repairs(**args)
                self.assertEqual(repaired[number], (record['sourcePage'], record['newBox']))
                bad_boxes = {**boxes, number: (record['sourcePage'], (0, 0, 100, 100))}
                with self.assertRaisesRegex(ImportFailure, 'geometry changed'):
                    apply_verified_modern_crop_repairs(**{**args, 'boxes': bad_boxes})
            with patch('scripts.import_nysed_math_mc.sha256_file', return_value='0'*64):
                with self.assertRaisesRegex(ImportFailure, 'source changed'):
                    apply_verified_modern_crop_repairs(**args)

    def test_fathers_table_is_available_without_seeing_the_image(self):
        catalog = json.loads((ROOT/'content/ela-exams/generated/catalog.json').read_text())
        exam = next(e for e in catalog['exams'] if e['year']==2022 and e['grade']==4)
        passage = next(s for s in exam['stimuli'] if s['id'].endswith('stimulus-1-6'))
        text = passage['passage']['transcript']['text']
        for value in ['MORE FABULOUS FATHERS', 'Father’s Unusual Actions', 'Seahorse:',
                      'Great Horned Owl:', 'Rhea (a large bird):', 'Jacana (a marsh bird):',
                      'Carries the eggs in his pouch and gives birth', 'Protects the nest']:
            self.assertIn(value, text)

    def test_explanations_do_not_reintroduce_false_rules_or_story_details(self):
        math = json.loads((ROOT/'content/math-exams/generated/catalog.json').read_text())
        mq = {q['id']: q['explanation']['text'] for e in math['exams'] for q in e['questions']}
        self.assertIn('add the numerators and keep the denominator', mq['nysed-2022-g5-mc-q22']['en'])
        self.assertNotIn('opposite vertices share', mq['nysed-2016-g6-mc-q42']['en'])
        self.assertIn('compare tenths first', mq['nysed-2024-g5-mc-q16']['en'])
        self.assertIn('thousands digits are 9 and 8', mq['nysed-2026-g4-mc-q9']['en'])
        ela = json.loads((ROOT/'content/ela-exams/generated/catalog.json').read_text())
        eq = {q['id']: q['explanation']['text'] for e in ela['exams'] for q in e['questions']}
        self.assertIn('Irene holds up an object', eq['nysed-ela-2018-g3-mc-q1'])
        self.assertIn('cannot remember its message', eq['nysed-ela-2026-g4-mc-q18'])
        self.assertNotIn('cart', eq['nysed-ela-2017-g7-mc-q10'])

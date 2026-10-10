"""Source-audited October 2026 content regressions, not answer-key round trips."""
import json
import unittest
from pathlib import Path
from unittest.mock import patch

from PIL import Image
from scripts.import_nysed_math_mc import (
    ImportFailure, _VERIFIED_MODERN_CROP_REPAIRS, apply_verified_modern_crop_repairs,
)

ROOT = Path(__file__).resolve().parents[1]
# Dimensions of the complete crops reviewed against full original PDF pages.
REPAIRED_CROPS = {
    (2019, 4, 'en', 37): (979, 641), (2019, 4, 'es', 37): (999, 673),
    (2016, 4, 'en', 24): (904, 1033),
    (2022, 7, 'en', 35): (1143, 847), (2022, 7, 'es', 35): (1041, 847),
    (2015, 6, 'en', 18): (1108, 636), (2017, 5, 'en', 33): (1137, 827),
    (2016, 8, 'en', 41): (1195, 913), (2015, 7, 'en', 2): (1108, 1320),
    (2015, 3, 'en', 5): (1108, 1376), (2014, 7, 'en', 19): (1066, 1450),
    (2016, 5, 'en', 15): (1207, 823), (2016, 7, 'en', 16): (1157, 430),
    (2016, 7, 'en', 15): (674, 440),
}


class ReviewedContentTests(unittest.TestCase):
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

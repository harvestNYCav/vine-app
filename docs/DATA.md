# Data And Fixtures

This repository contains data-like directories. Treat private runtime data differently from committed fixtures.

## Detected Paths
- `data/` - review as sample content, fixtures, generated output, or local/private runtime data.
- `content/` - review as sample content, fixtures, generated output, or local/private runtime data.
- `public/` - review as sample content, fixtures, generated output, or local/private runtime data.

## NYSED Released Math Content

- `content/math-exams/generated/catalog.json` stores schema-versioned metadata for the active 78-release, 1,839-question multiple-choice NYSED catalog; nearby server-only TypeScript adds Vine-authored lesson copy and private answer feedback.
- `public/nysed/math/` stores question-only WebP crops made from the linked English and, where officially available, Spanish released-item PDFs.
- Every page that displays these questions must render the NYSED copyright attribution, noncommercial educational-use statement, source link, access date, and independent/non-endorsement disclaimer.
- Treat official question wording and diagrams as copyrighted source material. Do not mix them into Vine-authored copy, remove attribution, or reuse them for commercial distribution.
- Do not ingest NYSED scoring-guide sample responses or rubric text. Answer keys remain server-only; explanatory feedback is original Vine content.
- Rebuild the catalog with `scripts/import_nysed_math_mc.py`; do not hand-edit generated JSON or crops.

## NYSED Released ELA Content

- `content/ela-exams/generated/catalog.json` stores metadata for 78 releases from 2013–2019 and 2021–2026, covering Grades 3–8 and exactly 1,583 released multiple-choice questions.
- `public/nysed/ela/` stores question-and-choice WebP crops. Full reading passages are not copied into Vine; each passage-based section links to its physical page range in the official NYSED booklet.
- Third-party stories, articles, poems, illustrations, and other passage materials retain the rights and credits printed in the official booklet. Do not extract or republish those passage pages.
- Every page that displays released questions must show the NYSED source, noncommercial educational-use statement, independent/non-endorsement disclaimer, and the third-party passage-rights notice.
- Answer keys remain server-only. Do not ingest answer annotations, scoring-guide rationales, sample responses, or rubric text into student assets or generated feedback.
- Rebuild with `scripts/import_nysed_ela_mc.py`; do not hand-edit generated JSON or question crops.

## Maintainer Rules
- Keep private, generated, or machine-local data ignored.
- Commit only small sample fixtures that are safe to share and useful for tests or demos.
- Add a short README near any data directory whose purpose is not obvious.

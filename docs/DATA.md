# Data And Fixtures

This repository contains data-like directories. Treat private runtime data differently from committed fixtures.

## Detected Paths
- `data/` - review as sample content, fixtures, generated output, or local/private runtime data.
- `content/` - review as sample content, fixtures, generated output, or local/private runtime data.
- `public/` - review as sample content, fixtures, generated output, or local/private runtime data.

## NYSED Released Math Content

- `content/math-exams/` stores reviewed metadata for public NYSED released questions plus Vine-authored lessons, explanations, and self-assessment criteria.
- `public/nysed/` stores question-only WebP crops made from the linked English and Spanish released-item PDFs.
- Every page that displays these questions must render the NYSED copyright attribution, noncommercial educational-use statement, source link, access date, and independent/non-endorsement disclaimer.
- Treat official question wording and diagrams as copyrighted source material. Do not mix them into Vine-authored copy, remove attribution, or reuse them for commercial distribution.
- Do not ingest NYSED scoring-guide sample responses or rubric text. Answer keys remain server-only; explanatory feedback is original Vine content.

## Maintainer Rules
- Keep private, generated, or machine-local data ignored.
- Commit only small sample fixtures that are safe to share and useful for tests or demos.
- Add a short README near any data directory whose purpose is not obvious.

# Released Math Exam Catalog

This directory contains the typed catalog for official NYSED released math questions. The active catalog is multiple-choice only and covers Grades 3–8 for 2013–2019 and 2021–2026; the archive has no 2020 release. Official question crops live in `public/nysed/math`; lesson copy and answer feedback are original Vine content.

`generated/catalog.json` and its matching WebPs are reproducible outputs of `scripts/import_nysed_math_mc.py`. The versioned generated schema discovers source URLs from NYSED's English and Spanish indexes, validates item/key/crop parity, and rejects answer-key leakage. Do not hand-edit generated records.

Install the pinned Python packages from `scripts/requirements-nysed.txt` before rebuilding. Scanned editions also require Tesseract 5 on `PATH` (or an explicit `--tesseract` path). Run the importer with `--contact-sheets` and review those sheets before committing regenerated assets.

Keep answer keys server-only by passing browser-facing records through `toPublicMathExamQuestion`. `catalog-runtime.ts` is guarded by Next's `server-only` marker; `index.ts` exposes course metadata to Server Components and `lib/math-exams.ts` owns question lookup. `tests/math-exams.test.ts` verifies the complete inventory and every referenced asset.

Spanish source editions are available for 2017–2019 and 2021–2026. Releases from 2013–2016 intentionally remain English-only; do not create unofficial translations of copyrighted questions.

Treat an exam ID as an immutable content version. If question membership or point totals change, publish a new ID so historical best-score numerators and denominators remain comparable.

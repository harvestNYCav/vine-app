# Released Math Exam Catalog

This directory contains the typed catalog for official NYSED released math questions. The active catalog is multiple-choice only and covers Grades 3–8 for 2013–2019 and 2021–2026; the archive has no 2020 release. Official question crops live in `public/nysed/math`.

`generated/catalog.json` and its matching WebPs are reproducible outputs of `scripts/import_nysed_math_mc.py`. Schema version 2 discovers source URLs from NYSED's English and Spanish indexes, validates item/key/crop parity, rejects answer-key leakage, and requires a substantive localized explanation for every question. Do not hand-edit generated records.

For the 228 multiple-choice questions from 2013–2014, the importer extracts the correct `Answer Choice` or `Answer Option` block from NYSED's own annotated extended rationale and records its source as `official-nysed`. Those exams have no official Spanish edition, so the same official English rationale is stored in both localized explanation fields; this is a data-shape requirement, not an unofficial translation.

For all 1,611 questions from 2015 onward, explanations are original Vine educational content with `vine-authored` provenance. They are checked in as per-exam sidecars under `explanations/`. Each sidecar is pinned to the exact English and optional Spanish question-image bytes, localized alt text, answer key, and standards. The importer fails closed if a sidecar is missing, incomplete, stale, non-canonical, or has the wrong provenance; regenerate and review sidecars whenever any pinned input changes.

Install the pinned Python packages from `scripts/requirements-nysed.txt` before rebuilding. Scanned editions also require Tesseract 5 on `PATH` (or an explicit `--tesseract` path). Run the importer with `--contact-sheets` and review those sheets before committing regenerated assets.

Keep answer keys server-only by passing browser-facing records through `toPublicMathExamQuestion`. `catalog-runtime.ts` is guarded by Next's `server-only` marker; `index.ts` exposes course metadata to Server Components and `lib/math-exams.ts` owns question lookup. `tests/math-exams.test.ts` verifies the complete inventory and every referenced asset.

Spanish source editions are available for 2017–2019 and 2021–2026. Releases from 2013–2016 intentionally remain English-only; do not create unofficial translations of copyrighted questions.

Treat an exam ID as an immutable content version. If question membership or point totals change, publish a new ID so historical best-score numerators and denominators remain comparable.

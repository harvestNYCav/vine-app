# Architecture

This document captures the maintainer-facing structure of the repository. It is intentionally descriptive; it does not change product behavior.

## Top-Level Map
- `.gitignore` - ignored local/generated files
- `.idea/` - JetBrains IDE metadata
- `.next/` - project file or directory
- `AGENTS.md` - project file or directory
- `app/` - application/source code
- `CLAUDE.md` - project file or directory
- `content/` - project file or directory
- `data/` - fixtures, sample data, or local runtime data
- `docs/` - project documentation
- `lib/` - project file or directory
- `next-env.d.ts` - project file or directory
- `next.config.ts` - project file or directory
- `nixpacks.toml` - project file or directory
- `node_modules/` - project file or directory
- `package-lock.json` - project file or directory
- `package.json` - Node package metadata and scripts
- `postcss.config.mjs` - project file or directory
- `public/` - static assets
- `railway.toml` - project file or directory
- `README.md` - project overview
- `scripts/` - project file or directory
- `tsconfig.json` - project file or directory
- `tsconfig.tsbuildinfo` - project file or directory
- `types/` - project file or directory

## Runtime Shape
- Node/package roots: `.`.
- `app/` contains the primary application routes or runtime entry points.

## Released Math Exam Lessons

- `content/math-exams/generated/catalog.json` is the schema-versioned generated registry for 78 year/grade releases and 1,839 multiple-choice questions. `catalog-builder.ts` validates it and adds grade-aware, Vine-authored domain lessons. The answer-bearing runtime is marked `server-only`.
- `public/nysed/math/` contains official question crops. Spanish assets exist only for years with a direct NYSED Spanish release. Asset URLs include the app's `/vine-app` base path.
- `lib/math-exams.ts` resolves catalog entries and is the boundary that removes grading data before questions reach the browser.
- `app/(student)/math/exams/` contains the course overview, original lessons, practice runner, and the NYSED attribution/disclaimer shown anywhere released questions are used.
- `app/api/math/exam-attempt/route.ts` creates expiring attempts, enforces the student's admin-assigned grade and language access, checks multiple-choice answers, and records progress. Correct answers stay on the server until an answer is submitted.
- `math_exam_attempts` stores individual practice runs; `math_exam_section_progress` stores per-student attempts and best/latest section scores.
- `student_settings.grade_level` is the admin-managed Grade 3–8 assignment used by listings, direct routes, APIs, and reporting.

To refresh or extend the public releases, run `scripts/import_nysed_math_mc.py`, review its generated contact sheets/validation output, and extend the catalog tests when the expected official inventory changes. Do not derive learner feedback from restricted scoring-guide text.

## Released ELA Exam Lessons

- `content/ela-exams/generated/catalog.json` is the schema-versioned registry for 78 English year/grade releases and 1,583 released multiple-choice questions. The server-only runtime validates the official inventory and adds Grade 3–8 Vine-authored reading lessons.
- ELA sections are organized by official passage or passage set. The catalog stores the official booklet URL and physical PDF page range; the passage itself remains in the NYSED PDF so its original third-party source and permission credits stay with it.
- `public/nysed/ela/` contains tightly bounded question-and-choice WebP crops only. It does not contain copied passage pages, answer annotations, scoring rubrics, or sample responses.
- `app/(student)/ela/exams/` contains grade-filtered release overviews, passage-linked lessons, and the multiple-choice practice runner. Every view that uses released questions includes the source, independent/non-endorsement, noncommercial educational-use, and third-party-rights notice.
- `app/api/ela/exam-attempt/route.ts` keeps answer keys server-side, rechecks the ELA track and exact admin-assigned grade at start/check/finish, and records best/latest section scores.
- `ela_exam_attempts` stores individual practice runs; `ela_exam_section_progress` stores per-student section progress independently from Math.

Rebuild the ELA catalog and crops with `scripts/import_nysed_ela_mc.py`. The importer must match the pinned official release/count matrix, reject answer metadata in student assets, verify every passage page reference, and reproduce the same output offline before generated content is committed.

## Maintenance Notes
- Keep generated output, editor metadata, virtual environments, local credentials, and machine-specific assistant settings out of Git.
- Prefer adding focused tests around stable entry points before changing application behavior.
- Update this document when directories gain or lose maintainer-facing responsibility.

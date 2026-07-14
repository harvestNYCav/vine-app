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

- `content/math-exams/` is the typed catalog for released public-exam courses, sections, question metadata, and private grading definitions.
- `public/nysed/` contains the bilingual question crops displayed by the catalog. Asset URLs include the app's `/vine-app` base path.
- `lib/math-exams.ts` resolves catalog entries and is the boundary that removes grading data before questions reach the browser.
- `app/(student)/math/exams/` contains the course overview, original lessons, practice runner, and the NYSED attribution/disclaimer shown anywhere released questions are used.
- `app/api/math/exam-attempt/route.ts` creates expiring attempts, checks one answer at a time, grades completed sections, and records progress. Correct answers and self-assessment criteria stay on the server until an answer is submitted.
- `math_exam_attempts` stores individual practice runs; `math_exam_section_progress` stores per-student attempts and best/latest section scores.

To add another exam, define its course in `content/math-exams`, add each section's question records and bilingual assets, register the exam and question arrays, then extend the catalog tests. Do not derive learner feedback from restricted scoring-guide text.

## Maintenance Notes
- Keep generated output, editor metadata, virtual environments, local credentials, and machine-specific assistant settings out of Git.
- Prefer adding focused tests around stable entry points before changing application behavior.
- Update this document when directories gain or lose maintainer-facing responsibility.

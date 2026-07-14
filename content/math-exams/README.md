# Released Math Exam Catalog

This directory contains typed course and question metadata for public released math exams. Official question crops live in `public/nysed`; lessons, explanations, and self-assessment criteria are original Vine content.

Keep grading definitions server-only by passing browser-facing records through `toPublicMathExamQuestion`. Register each new exam in `index.ts` and each question array in `lib/math-exams.ts`, then extend `tests/math-exams.test.ts` to cover its inventory and assets.

Treat an exam ID as an immutable content version. If question membership or point totals change, publish a new ID so historical best-score numerators and denominators remain comparable.

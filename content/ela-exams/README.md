# NYSED ELA Exam Catalog

This directory turns released Grades 3–8 NYSED ELA multiple-choice questions into passage-based Vine lessons.

- `generated/catalog.json` and `public/nysed/ela/` are generated together by `scripts/import_nysed_ela_mc.py`; do not edit them by hand.
- Each section represents one official passage or passage set. Vine stores only the official booklet URL and physical PDF page range for the passage, then displays a tightly cropped question-and-choice image locally.
- Full passages remain in the official PDF so their original source, copyright, and permission credits remain attached.
- Answer keys are validated at import time and remain in the server-only runtime. Browser-facing questions omit grading data.
- The runtime fails closed unless all 78 year/grade releases and exactly 1,583 released multiple-choice questions are present.
- Every student route and attempt action requires the ELA track plus an exact match to the admin-assigned Grade 3–8 level.

When the official archive changes, update the pinned inventory only after verifying the archive, release booklets, embedded maps or early annotations, passage page ranges, and deterministic offline rebuild output.

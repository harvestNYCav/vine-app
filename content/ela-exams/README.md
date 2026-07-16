# NYSED ELA Exam Catalog

This directory turns released Grades 3–8 NYSED ELA multiple-choice questions into passage-based Vine lessons.

- `generated/catalog.json` and `public/nysed/ela/` are generated together by `scripts/import_nysed_ela_mc.py`; do not edit them by hand.
- Each section represents one official passage or passage set. Vine stores the official booklet URL and physical PDF page range for provenance, plus one local stitched passage image shared by every question in that section.
- Passage images preserve the original title, byline, illustrations, source credits, and printed line or paragraph numbers. Booklet footers and physical page breaks are removed to create one continuous in-app reading view.
- Passage assets use a deterministic smallest-of-lossless-and-high-quality-WebP encoding policy. Their dedicated `.nysed-passages.json` manifests keep passage rendering independently cacheable from question crops.
- Answer keys are validated at import time and remain in the server-only runtime. Browser-facing questions omit grading data.
- The runtime fails closed unless all 78 year/grade releases, exactly 1,583 released multiple-choice questions, and all 242 passage stimuli are present with valid local assets.
- Every student route and attempt action requires the ELA track plus an exact match to the admin-assigned Grade 3–8 level.

When the official archive changes, update the pinned inventory only after verifying the archive, release booklets, embedded maps or early annotations, passage page ranges, stitched passage visuals, and deterministic offline rebuild output.

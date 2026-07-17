# NYSED ELA Exam Catalog

This directory turns released Grades 3–8 NYSED ELA multiple-choice questions into passage-based Vine lessons.

- `generated/catalog.json` and `public/nysed/ela/` are generated together by `scripts/import_nysed_ela_mc.py`; do not edit them by hand.
- Each section represents one official passage or passage set. Vine stores the official booklet URL and physical PDF page range for provenance, plus one local stitched passage image shared by every question in that section.
- Passage images preserve the original title, byline, illustrations, source credits, and printed line or paragraph numbers. Booklet footers and physical page breaks are removed to create one continuous in-app reading view.
- Passage assets use a deterministic smallest-of-lossless-and-high-quality-WebP encoding policy. Their dedicated `.nysed-passages.json` manifests keep passage rendering independently cacheable from question crops.
- Every question has a provenance-labeled explanation. For the 149 questions released in 2013–14, the importer extracts NYSED's published `WHY CHOICE … IS CORRECT` rationale. The remaining 1,434 questions use reviewed Vine-authored explanations from the checked-in per-exam files in `explanations/`.
- Vine-authored explanation files are fail-closed inputs, not runtime-generated text. Each record is pinned to a SHA-256 over its question text and image, passage image, answer key, standards, and explanation policy. Any missing, orphaned, malformed, generic, or stale record stops the import.
- Answer keys and explanations are validated at import time and remain together in the server-only grading runtime. Browser-facing questions omit all grading data; the attempt API returns the key, explanation, and provenance only after the student's answer is recorded.
- The schema-v3 runtime fails closed unless all 78 year/grade releases, exactly 1,583 released multiple-choice questions, all 242 passage stimuli, 149 official rationales, and 1,434 Vine-authored explanations are present with valid local assets and provenance.
- Every student route and attempt action requires the ELA track plus an exact match to the admin-assigned Grade 3–8 level.

When the official archive changes, update the pinned inventory and affected explanation sidecars only after verifying the archive, release booklets, embedded maps or early annotations, passage page ranges, stitched passage visuals, explanation input hashes, and deterministic offline rebuild output.

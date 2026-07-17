# NYSED ELA Exam Catalog

This directory turns released Grades 3–8 NYSED ELA multiple-choice questions into passage-based Vine lessons.

- `generated/catalog.json` and `public/nysed/ela/` are generated together by `scripts/import_nysed_ela_mc.py`; do not edit them by hand.
- Each section represents one official passage or passage set. Vine stores the official booklet URL and physical PDF page range for provenance, plus one local stitched passage image shared by every question in that section.
- Passage images preserve the original title, byline, illustrations, source credits, and printed line or paragraph numbers. Booklet footers and physical page breaks are removed to create one continuous in-app reading view.
- All 242 Grade 3–8 passage stimuli have visible, reviewed text transcripts in the app, covering all 1,583 multiple-choice questions. The original facsimile remains available in a nested disclosure.
- Transcript sidecars in `transcripts/` preserve the printed marker sequence and add bracketed descriptions for question-relevant diagrams, charts, photographs, maps, text boxes, and sidebars. Each record declares whether it came from official PDF text, OCR, or a reviewed mixture of the two.
- Transcript production fails closed. Every sidecar is pinned to the exact source PDF SHA-256, stitched passage-image SHA-256, and a canonical input hash. The separate `transcript-review-manifest.json` pins those values again along with the reviewed provenance source, normalized transcript SHA-256, exact marker sequence, and visual-description count for all 242 stimuli.
- All 1,583 question facsimiles also have reviewed screen-reader text in the 78 per-exam files under `accessibility/`. Each A–D transcription is pinned to the exact released PDF and exact WebP crop; `question-accessibility-review-manifest.json` activates the corpus only when every source hash, sidecar byte hash, release count, and question count still matches.
- Passage assets use a deterministic smallest-of-lossless-and-high-quality-WebP encoding policy. Their dedicated `.nysed-passages.json` manifests keep passage rendering independently cacheable from question crops.
- Every question has a provenance-labeled explanation. For the 149 questions released in 2013–14, the importer extracts NYSED's published `WHY CHOICE … IS CORRECT` rationale. Of those, 147 retain `official-nysed` provenance unchanged. Two published rationales contain semantic mistakes, so their narrowly corrected versions use `official-nysed-corrected` and the UI identifies them as “Official NYSED rationale, corrected by Vine.” The remaining 1,434 questions use reviewed Vine-authored explanations from the checked-in per-exam files in `explanations/`.
- Vine-authored explanation files are fail-closed inputs, not runtime-generated text. Each record is pinned to a SHA-256 over its question text and image, passage image, answer key, standards, and explanation policy. Any missing, orphaned, malformed, generic, or stale record stops the import.
- Answer keys and explanations are validated at import time and remain together in the server-only grading runtime. Browser-facing questions omit all grading data; the attempt API returns the key, explanation, and provenance only after the student's answer is recorded.
- The schema-v4 runtime fails closed unless all 78 year/grade releases, exactly 1,583 released multiple-choice questions, all 242 passage stimuli and reviewed transcripts, 147 unmodified official rationales, 2 explicitly corrected official rationales, and 1,434 Vine-authored explanations are present with valid local assets and provenance.
- Every student route and attempt action requires the ELA track plus an exact match to the admin-assigned Grade 3–8 level.

Transcript authoring and approval are intentionally separate:

1. Run `python3 scripts/seed_nysed_ela_transcript_sidecars.py` against the cached official PDFs to create unapproved draft sidecars. OCR is an offline authoring aid only; the production importer never silently re-OCRs changed material.
2. Compare every draft with the corresponding in-app facsimile, including reading order, printed markers, dialogue punctuation, sidebars, and question-relevant visuals.
3. After that human review, run `python3 scripts/review_nysed_ela_transcript_sidecars.py --record`, then `--approve`, then `--validate`. Approval succeeds only while every reviewed value still matches the fail-closed manifest.
4. Run `python3 scripts/import_nysed_ela_mc.py --offline --cache-root tmp/pdfs/nysed-ela-passage-import` to regenerate the schema-v4 catalog without network access.

Question-facsimile accessibility uses the same draft/review boundary:

1. Run `python3 scripts/seed_nysed_ela_question_accessibility_sidecars.py --author`. This writes only to the gitignored `tmp/pdfs/ela-question-accessibility-drafts/` directory.
2. Compare all 78 drafts (1,583 questions) with the exact in-app WebP facsimiles. Check the stem, ordered A–D choices, quotation punctuation, operators, and lane boundaries; no answer-key or rationale text may appear.
3. After the complete human review, run `python3 scripts/review_nysed_ela_question_accessibility_sidecars.py --approve`. Approval preflights the entire corpus before changing production and writes the activation manifest last.
4. Run `python3 scripts/seed_nysed_ela_explanation_sidecars.py --refresh-question-accessibility` to refresh only the 1,434 authored-explanation input hashes, then run the offline importer. Finally, run `python3 scripts/review_nysed_ela_question_accessibility_sidecars.py --validate` and `npm run test:ela-question-accessibility`. Validation requires exact parity between the approved sidecars, activation manifest, source assets, and generated catalog.

When the official archive changes, update the pinned inventory and affected sidecars only after verifying the archive, release booklets, embedded maps or early annotations, passage page ranges, stitched passage visuals, transcript and explanation input hashes, and deterministic offline rebuild output.

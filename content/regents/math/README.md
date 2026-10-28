# Mathematics Regents source catalog

This folder imports released New York State Mathematics Regents exams for Algebra I, Geometry, and Algebra II. The importer discovers administrations and PDF URLs from the [official NYSED indexes](https://www.nysedregents.org/), reads each official Part I scoring key, and crops each multiple-choice question from the English exam PDF. The generated catalog contains 88 administrations and 2,109 single-key questions as of October 28, 2026.

The three omissions are [June 2017 Geometry questions 14, 22, and 24](https://www.nysedregents.org/geometryre/617/in-geomcc62017.pdf): NYSED accepted multiple answers for question 14 and awarded all credit for questions 22 and 24. They cannot be fairly graded as ordinary single-answer practice items. The exception is recorded in that exam's `excludedQuestions` metadata.

Every catalog record has a source page, the official key, an exam-PDF SHA-256 hash, and a source image. **Only `readiness: "reviewed"` questions appear in student practice.** A question is reviewed only when a source-hash-pinned file in `reviews/` provides a manually checked accessible prompt, all four choices, a substantive worked explanation, and meaningful image alternative text. Other questions remain `needs-review` and carry no fabricated OCR or explanation. The app may list an administration before all its questions are ready, but it cannot serve an unreviewed item for practice.

To rebuild from NYSED, run `scripts/regents_math_import.py` with Python 3, `pdfplumber`, Pillow, `curl`, and Poppler's `pdftoppm` available:

```sh
python3 scripts/regents_math_import.py --jobs 4
python3 scripts/regents_math_import.py --offline --jobs 4
python3 scripts/regents_math_import.py --offline --reuse-images --jobs 4
python3 scripts/regents_math_import.py --offline --no-images --jobs 4
```

The first command downloads the official index pages, exams, and keys to the ignored `tmp/pdfs/nysed-regents-math/` cache. The second reproduces the generated catalog and WebP crops entirely from that cache. The third updates the catalog after review-overlay edits without rerendering images; it refuses reuse if any source PDF hash changed. The final command validates the inventory and keys without changing the catalog or images. Discovery fails closed if NYSED adds an administration; update the expected counts after checking the new source.

Run `python3 scripts/regents_math_verify.py --require-cache` after a rebuild to compare every catalog key with its cached NYSED scoring PDF and to verify reviewed-question completeness and image dimensions. The test can also run without `--require-cache` to check repository artifacts alone.

NYSED materials are attributed and linked in the student UI. The [NYSED terms of use](https://www.nysed.gov/terms-of-use) should be reviewed before any use beyond the current nonprofit educational setting.

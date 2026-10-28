#!/usr/bin/env python3
"""Make non-publishable OCR drafts for reviewing Math Regents question crops.

The official key and image metadata come from the generated catalog. OCR is
unverified: it can change operators, fractions, graph labels, or two-column
choice order. Never copy this output into a review overlay without checking the
corresponding official booklet image.

Example:
    python3 scripts/regents_math_ocr_draft.py algebra-ii-2026-august
"""

from __future__ import annotations

import argparse
import concurrent.futures
import json
import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
CATALOG = ROOT / "content/regents/math/generated/catalog.json"
OUTPUT_DIR = ROOT / "tmp/pdfs/regents-math-ocr-drafts"


def ocr_question(question: dict) -> dict:
    image = question["image"]
    source = image["src"]
    if not source.startswith("/vine-app/nysed/regents/math/"):
        raise ValueError(f"Unexpected question image: {source}")
    image_path = ROOT / "public" / source.removeprefix("/vine-app/")
    if not image_path.is_file():
        raise FileNotFoundError(image_path)
    result = subprocess.run(
        ["tesseract", str(image_path), "stdout", "--psm", "6"],
        capture_output=True,
        text=True,
        check=True,
    )
    return {
        "number": question["number"],
        "sourcePage": question["sourcePage"],
        "officialKey": question["correct"],
        "image": source,
        "unverifiedOcr": result.stdout.strip(),
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("exam_id", help="For example, algebra-ii-2026-august")
    parser.add_argument("--jobs", type=int, default=4)
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    if args.jobs < 1:
        parser.error("--jobs must be positive")

    exams = json.loads(CATALOG.read_text(encoding="utf-8"))
    exam = next((item for item in exams if item["id"] == args.exam_id), None)
    if exam is None:
        parser.error(f"Exam not found: {args.exam_id}")
    with concurrent.futures.ThreadPoolExecutor(max_workers=args.jobs) as executor:
        drafts = list(executor.map(ocr_question, exam["questions"]))
    target = args.output or OUTPUT_DIR / f"{args.exam_id}.json"
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps({
        "examId": exam["id"],
        "sourceUrl": exam["sourceUrl"],
        "sourceSha256": exam["sourceSha256"],
        "warning": "OCR is unverified; visually check every prompt, choice, operator, fraction, and diagram before review.",
        "questions": drafts,
    }, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {len(drafts)} OCR drafts to {target}")


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""Verify the generated Mathematics Regents catalog and its NYSED source keys.

The cached official scoring PDFs are optional by default and required with
``--require-cache``. No network calls or writes are made.
"""

from __future__ import annotations

import argparse
import json
import re
from collections import Counter
from pathlib import Path

from PIL import Image

from regents_math_import import (
    ASSET_ROOT,
    BASE_PATH,
    CACHE_ROOT,
    EXCLUDED_QUESTIONS,
    EXPECTED_ADMINISTRATIONS,
    OUTPUT_JSON,
    REVIEWS_ROOT,
    read_key,
)


def require(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def verify(*, catalog_path: Path, cache_root: Path, require_cache: bool) -> None:
    exams = json.loads(catalog_path.read_text(encoding="utf-8"))
    require(isinstance(exams, list) and len(exams) == 88, "Expected 88 Math administrations")
    require(Counter(exam["course"] for exam in exams) == EXPECTED_ADMINISTRATIONS, "Course inventory changed")
    require(len({exam["slug"] for exam in exams}) == 88, "Duplicate exam slug")
    all_ids: set[str] = set()
    reviewed_count = 0
    checked_key_count = 0
    for exam in exams:
        slug = exam["slug"]
        require(exam["id"] == slug, f"{slug}: id mismatch")
        require(exam["sourceUrl"].startswith("https://www.nysedregents.org/"), f"{slug}: source host")
        require(exam["answerKeyUrl"].startswith("https://www.nysedregents.org/"), f"{slug}: key host")
        require(re.fullmatch(r"[a-f0-9]{64}", exam["sourceSha256"]) is not None, f"{slug}: source hash")
        require(len(exam["sections"]) == 3, f"{slug}: expected three short Part I sections")
        expected_numbers = set(range(1, 25)) - {
            number for course, year, month, number in EXCLUDED_QUESTIONS
            if (course, year, month) == (exam["course"], exam["year"], exam["administration"])
        }
        questions = exam["questions"]
        require({question["number"] for question in questions} == expected_numbers, f"{slug}: question inventory")
        question_by_id = {question["id"]: question for question in questions}
        require(len(question_by_id) == len(questions), f"{slug}: duplicate question ID")
        for block, section in enumerate(exam["sections"]):
            expected_section_ids = [
                f"{slug}-q{number:02d}" for number in range(block * 8 + 1, block * 8 + 9)
                if number in expected_numbers
            ]
            require(section["questionIds"] == expected_section_ids, f"{slug}: section {block + 1} order")
            require(section["slug"] == f"part-i-{block + 1}", f"{slug}: section slug")
        review_path = REVIEWS_ROOT / f"{slug}.json"
        reviewed_numbers: set[int] = set()
        review_questions: dict[str, dict] = {}
        if review_path.is_file():
            overlay = json.loads(review_path.read_text(encoding="utf-8"))
            require(overlay.get("sourceSha256") == exam["sourceSha256"], f"{slug}: stale source review")
            review_questions = overlay["questions"]
            reviewed_numbers = {int(number) for number in review_questions}
        key_path = cache_root / "keys" / f"{slug}.pdf"
        if require_cache:
            require(key_path.is_file(), f"{slug}: official scoring key not cached")
        official_key = read_key(key_path, exam["course"], exam["year"], exam["administration"]) if key_path.is_file() else None
        for question in questions:
            number = question["number"]
            question_id = f"{slug}-q{number:02d}"
            require(question["id"] == question_id, f"{slug}: q{number} ID")
            require(question_id not in all_ids, f"Duplicate global question ID: {question_id}")
            all_ids.add(question_id)
            require(question["sectionSlug"] == f"part-i-{(number - 1) // 8 + 1}", f"{question_id}: section")
            require(question["correct"] in {"1", "2", "3", "4"}, f"{question_id}: key")
            if official_key is not None:
                require(question["correct"] == official_key[number], f"{question_id}: differs from NYSED key")
                checked_key_count += 1
            image = question.get("image")
            require(isinstance(image, dict), f"{question_id}: missing crop")
            expected_src = f"{BASE_PATH}/nysed/regents/math/{exam['course']}/{exam['year']}/{exam['administration']}/q{number:02d}.webp"
            require(image["src"] == expected_src, f"{question_id}: crop URL")
            image_path = ASSET_ROOT / exam["course"] / str(exam["year"]) / exam["administration"] / f"q{number:02d}.webp"
            require(image_path.is_file(), f"{question_id}: missing crop file")
            with Image.open(image_path) as bitmap:
                require(bitmap.size == (image["width"], image["height"]), f"{question_id}: crop dimensions")
                require(bitmap.width >= 120 and bitmap.height >= 40, f"{question_id}: implausibly small crop")
            if number in reviewed_numbers:
                reviewed_source = review_questions[str(number)]
                require(question["readiness"] == "reviewed", f"{question_id}: overlay not published")
                require(question["explanationSource"] in {"vine-authored", "official-nysed"}, f"{question_id}: explanation source")
                require(len(question["prompt"].strip()) >= 15, f"{question_id}: accessible prompt")
                require(len(question["choices"]) == 4, f"{question_id}: four choices")
                require([choice["label"] for choice in question["choices"]] == ["1", "2", "3", "4"], f"{question_id}: choice labels")
                require(all(choice["text"].strip() for choice in question["choices"]), f"{question_id}: accessible choices")
                require(len(question["explanation"].strip()) >= 40, f"{question_id}: worked explanation")
                require("pending" not in image["alt"].lower(), f"{question_id}: pending alt text leaked")
                require(question["prompt"] == reviewed_source["prompt"].strip(), f"{question_id}: stale reviewed prompt")
                require([choice["text"] for choice in question["choices"]] == [choice.strip() for choice in reviewed_source["choices"]], f"{question_id}: stale reviewed choices")
                require(question["explanation"] == reviewed_source["explanation"].strip(), f"{question_id}: stale reviewed explanation")
                require(image["alt"] == reviewed_source["imageAlt"].strip(), f"{question_id}: stale reviewed image alt")
                reviewed_count += 1
            else:
                require(question["readiness"] == "needs-review", f"{question_id}: unreviewed question published")
                require(question["explanationSource"] == "pending-review", f"{question_id}: false explanation source")
                require(not question["prompt"] and not question["explanation"], f"{question_id}: unverified OCR leak")
                require(all(not choice["text"] for choice in question["choices"]), f"{question_id}: unverified choice leak")
    require(len(all_ids) == 2109, "Total question inventory changed")
    require(reviewed_count == 2109, "Every practiceable Math question must have a reviewed transcript and explanation")
    print(f"Verified 88 exams, 2,109 crops, {reviewed_count} reviewed questions, and {checked_key_count} official PDF keys")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--catalog", type=Path, default=OUTPUT_JSON)
    parser.add_argument("--cache-root", type=Path, default=CACHE_ROOT)
    parser.add_argument("--require-cache", action="store_true")
    args = parser.parse_args()
    verify(catalog_path=args.catalog, cache_root=args.cache_root, require_cache=args.require_cache)

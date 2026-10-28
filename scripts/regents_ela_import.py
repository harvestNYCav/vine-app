#!/usr/bin/env python3
"""Inventory released Regents ELA exams and build a review-gated Part 1 catalog.

Only the 24 Part 1 multiple-choice answers are imported automatically. A question
becomes practiceable only after a reviewed overlay supplies its exact prompt,
four choices, evidence-based explanation, and an in-app line-numbered passage.

    python scripts/regents_ela_import.py             # refresh sources and PDFs
    python scripts/regents_ela_import.py --offline   # reproducible cached build
"""

from __future__ import annotations

import argparse
import hashlib
import html
import json
import re
import subprocess
import sys
import urllib.error
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
INDEX_URL = "https://www.nysedregents.org/hsela/"
CACHE = ROOT / "tmp" / "pdfs" / "regents-ela"
SOURCES_FILE = ROOT / "content" / "regents" / "ela" / "sources.json"
OUTPUT_FILE = ROOT / "content" / "regents" / "ela" / "generated" / "catalog.json"
REVIEWS_DIR = ROOT / "content" / "regents" / "ela" / "reviewed"
MONTHS = ("january", "june", "august")
EXPECTED_ADMINISTRATIONS = {
    (year, month)
    for year in range(2014, 2027)
    for month in MONTHS
    if (year != 2014 or month != "january")
    and (year not in (2020, 2021) or month == ("january" if year == 2020 else "june"))
    and (year != 2022 or month != "january")
}
assert len(EXPECTED_ADMINISTRATIONS) == 33


class ImportErrorWithContext(RuntimeError):
    pass


def _write_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    temporary.replace(path)


def _download(url: str, target: Path, *, offline: bool) -> Path:
    if target.exists() and target.stat().st_size > 1000:
        return target
    if offline:
        raise ImportErrorWithContext(f"Offline cache miss: {url}")
    target.parent.mkdir(parents=True, exist_ok=True)
    request = urllib.request.Request(
        url,
        headers={"User-Agent": "vine-app educational Regents source importer/1.0"},
    )
    temporary = target.with_suffix(target.suffix + ".part")
    try:
        with urllib.request.urlopen(request, timeout=90) as response, temporary.open("wb") as output:
            while chunk := response.read(1024 * 1024):
                output.write(chunk)
        if temporary.stat().st_size <= 1000:
            raise ImportErrorWithContext(f"Truncated download: {url}")
        temporary.replace(target)
    except (OSError, urllib.error.URLError):
        temporary.unlink(missing_ok=True)
        raise
    return target


def _cache_path(slug: str, kind: str, url: str) -> Path:
    fingerprint = hashlib.sha256(url.encode("utf-8")).hexdigest()[:10]
    return CACHE / f"{slug}-{kind}-{fingerprint}.pdf"


def discover_sources(index_html: str) -> list[dict[str, Any]]:
    """Read the archive's dated top-level list items, not page link positions."""
    marker = re.compile(r"<li>\s*(January|June|August)\s+(20\d{2}|2014)\b", re.I)
    matches = list(marker.finditer(index_html))
    sources: list[dict[str, Any]] = []
    for i, match in enumerate(matches):
        month, year = match.group(1).lower(), int(match.group(2))
        if (year, month) not in EXPECTED_ADMINISTRATIONS:
            continue
        chunk = index_html[match.end() : matches[i + 1].start() if i + 1 < len(matches) else len(index_html)]
        links: list[tuple[str, str, str]] = []
        for tag, label in re.findall(r"(<a\b[^>]+>)([^<]+)</a>", chunk, re.I):
            href_match = re.search(r'href="([^"]+\.pdf)"', tag, re.I)
            if not href_match:
                continue
            title_match = re.search(r'title="([^"]*)"', tag, re.I)
            links.append(
                (
                    html.unescape(href_match.group(1)),
                    html.unescape(label.strip()),
                    html.unescape(title_match.group(1) if title_match else ""),
                )
            )
        exam_links = [href for href, label, title in links if re.search(r"(?:^|/)(?:reela|hsela)[^/]*-exam\.pdf$", href, re.I)]
        key_links = [href for href, label, title in links if re.search(r"scoring key,\s*pdf version", title, re.I)]
        if len(exam_links) != 1 or len(key_links) != 1:
            raise ImportErrorWithContext(
                f"Expected one regular exam and key for {month} {year}; got {exam_links}, {key_links}"
            )
        slug = f"{year}-{month}"
        sources.append(
            {
                "slug": slug,
                "year": year,
                "administration": month,
                "standardsEra": "NGLS" if year == 2026 and month in ("june", "august") else "CCLS",
                "sourceUrl": urllib.parse.urljoin(INDEX_URL, exam_links[0]),
                "answerKeyUrl": urllib.parse.urljoin(INDEX_URL, key_links[0]),
            }
        )
    seen = {(source["year"], source["administration"]) for source in sources}
    if seen != EXPECTED_ADMINISTRATIONS or len(sources) != 33:
        missing = sorted(EXPECTED_ADMINISTRATIONS - seen)
        extras = sorted(seen - EXPECTED_ADMINISTRATIONS)
        raise ImportErrorWithContext(f"Archive inventory mismatch: missing={missing}, extras={extras}")
    return sorted(sources, key=lambda source: (source["year"], MONTHS.index(source["administration"])), reverse=True)


def _pdf_text(path: Path) -> str:
    if path.read_bytes()[:4] != b"%PDF":
        raise ImportErrorWithContext(f"Not a PDF: {path}")
    result = subprocess.run(
        ["pdftotext", "-layout", str(path), "-"],
        check=True,
        capture_output=True,
        text=True,
    )
    return result.stdout


def parse_answer_key(path: Path, *, year: int, administration: str) -> dict[int, str]:
    text = _pdf_text(path)
    is_v202 = year == 2021 and administration == "june" and "v202" in text
    if not is_v202 and (str(year) not in text or administration.lower() not in text.lower()):
        raise ImportErrorWithContext(f"Answer key identity mismatch: {path}")
    answers: dict[int, str] = {}
    # 2020 onward: the one-page tabular scoring key.
    for number, answer in re.findall(
        r"\bRE\s+ELA\s+(?:(?:January|June|August)\s+['’]?\d{2}|v202)\s+(\d{1,2})\s+([1-4])\s+MC\b",
        text,
        re.I,
    ):
        answers[int(number)] = answer
    if not answers:
        # The older teacher key prints five answer columns with dotted leaders.
        section = re.search(r"Correct Answers\s+Part 1(.*?)(?:\f|The University)", text, re.I | re.S)
        if not section:
            raise ImportErrorWithContext(f"No Part 1 answer table: {path}")
        for line in section.group(1).splitlines():
            compact = re.sub(r"(?:\s*\.\s*){2,}", "......", line)
            for number, answer in re.findall(r"\b(\d{1,2})\s*\.{2,}\s*([1-4])\s*\.{2,}", compact):
                answers[int(number)] = answer
    if set(answers) != set(range(1, 25)):
        raise ImportErrorWithContext(f"Expected key for questions 1–24 in {path}, got {sorted(answers)}")
    return dict(sorted(answers.items()))


def _pending_exam(source: dict[str, Any], answers: dict[int, str]) -> dict[str, Any]:
    slug = source["slug"]
    section_slug = "part-1-pending-review"
    questions = [
        {
            "id": f"english-{slug}-q{number}",
            "number": number,
            "sectionSlug": section_slug,
            "sourcePage": 0,
            "prompt": "",
            "choices": [],
            "correct": answer,
            "explanation": "",
            "explanationSource": "pending-review",
            "readiness": "needs-review",
        }
        for number, answer in answers.items()
    ]
    return {
        "id": f"english-{slug}",
        "slug": f"english-{slug}",
        "course": "english",
        "year": source["year"],
        "administration": source["administration"],
        "standardsEra": source["standardsEra"],
        "sourceUrl": source["sourceUrl"],
        "answerKeyUrl": source["answerKeyUrl"],
        "sections": [
            {
                "slug": section_slug,
                "title": "Part 1 · Pending passage and question review",
                "questionIds": [question["id"] for question in questions],
            }
        ],
        "questions": questions,
    }


def _apply_review(exam: dict[str, Any], answers: dict[int, str]) -> dict[str, Any]:
    stem = f"{exam['year']}-{exam['administration']}"
    paths = [REVIEWS_DIR / f"{stem}.json"]
    paths.extend(sorted((REVIEWS_DIR / "fragments").glob(f"{stem}-*.json")))
    paths = [path for path in paths if path.exists()]
    if not paths:
        return exam
    questions: list[dict[str, Any]] = []
    sections: list[dict[str, Any]] = []
    for path in paths:
        review = json.loads(path.read_text(encoding="utf-8"))
        if not isinstance(review, dict) or set(review) != {"sections", "questions"}:
            raise ImportErrorWithContext(f"Unexpected reviewed overlay structure: {path}")
        questions.extend(review["questions"])
        sections.extend(review["sections"])
    path = paths[0]
    if not isinstance(questions, list) or not questions or not isinstance(sections, list) or not sections:
        raise ImportErrorWithContext(f"Reviewed overlay must contain questions and passages: {path}")
    question_map = {question["number"]: question for question in questions}
    if len(question_map) != len(questions) or not set(question_map).issubset(answers):
        raise ImportErrorWithContext(f"Reviewed question numbers must be unique and within 1–24: {path}")
    for number, question in question_map.items():
        if question["id"] != f"{exam['id']}-q{number}":
            raise ImportErrorWithContext(f"Invalid reviewed question ID q{number}: {path}")
        if question["correct"] != answers[number]:
            raise ImportErrorWithContext(f"Reviewed answer differs from official key, q{number}: {path}")
        if (
            question["readiness"] != "reviewed"
            or len(question["choices"]) != 4
            or not question["prompt"].strip()
            or len(question["explanation"].strip()) < 20
            or question["explanationSource"] not in ("official-nysed", "vine-authored")
            or question["sourcePage"] < 1
        ):
            raise ImportErrorWithContext(f"Incomplete reviewed question q{number}: {path}")
        if {choice["label"] for choice in question["choices"]} != {"1", "2", "3", "4"}:
            raise ImportErrorWithContext(f"Invalid reviewed choices q{number}: {path}")
        if any(not choice["text"] for choice in question["choices"]):
            raise ImportErrorWithContext(f"Blank reviewed choice q{number}: {path}")
    ids = {question["id"] for question in questions}
    claimed = [question_id for section in sections for question_id in section["questionIds"]]
    if len(claimed) != len(ids) or set(claimed) != ids:
        raise ImportErrorWithContext(f"Section question assignments mismatch: {path}")
    slugs = [section["slug"] for section in sections]
    if len(slugs) != len(set(slugs)) or "part-1-pending-review" in slugs:
        raise ImportErrorWithContext(f"Duplicate or reserved section slug: {path}")
    for section in sections:
        passage = section.get("passage")
        if not section["questionIds"] or not passage or passage.get("transcriptReviewStatus") != "reviewed" or not passage.get("lines"):
            raise ImportErrorWithContext(f"Reviewed passage missing transcript: {path}")
        numbered = [line["number"] for line in passage["lines"] if line["number"] is not None]
        if numbered != list(range(1, len(numbered) + 1)):
            raise ImportErrorWithContext(f"Reviewed passage line numbers not sequential: {path}")
    section_by_id = {section["slug"]: set(section["questionIds"]) for section in sections}
    if any(question["id"] not in section_by_id.get(question["sectionSlug"], set()) for question in questions):
        raise ImportErrorWithContext(f"Question section slug disagrees with its assignment: {path}")
    pending = exam["sections"][0]
    pending["questionIds"] = [question_id for question_id in pending["questionIds"] if question_id not in ids]
    sections.sort(key=lambda section: min(int(question_id.rsplit("q", 1)[1]) for question_id in section["questionIds"]))
    exam["sections"] = sections + ([pending] if pending["questionIds"] else [])
    exam["questions"] = [question_map.get(question["number"], question) for question in exam["questions"]]
    return exam


def build(*, offline: bool, jobs: int) -> list[dict[str, Any]]:
    index = _download(INDEX_URL, CACHE / "index.html", offline=offline).read_text(encoding="utf-8", errors="replace")
    sources = discover_sources(index)
    _write_json(SOURCES_FILE, {"sourceIndexUrl": INDEX_URL, "administrations": sources})

    def one(source: dict[str, Any]) -> dict[str, Any]:
        slug = source["slug"]
        exam_path = _download(source["sourceUrl"], _cache_path(slug, "exam", source["sourceUrl"]), offline=offline)
        key_path = _download(source["answerKeyUrl"], _cache_path(slug, "key", source["answerKeyUrl"]), offline=offline)
        exam_text = _pdf_text(exam_path)
        if str(source["year"]) not in exam_text and not (source["year"] == 2021 and "v202" in exam_text):
            raise ImportErrorWithContext(f"Exam year mismatch: {exam_path}")
        if not re.search(r"(?:all|answer)\s+24\s+multiple[- ]choice questions", exam_text, re.I):
            raise ImportErrorWithContext(f"Exam does not identify 24 Part 1 MC questions: {exam_path}")
        answers = parse_answer_key(key_path, year=source["year"], administration=source["administration"])
        return _apply_review(_pending_exam(source, answers), answers)

    with ThreadPoolExecutor(max_workers=jobs) as pool:
        catalog = list(pool.map(one, sources))
    _write_json(OUTPUT_FILE, catalog)
    print(
        f"Regents ELA: {len(catalog)} administrations, "
        f"{sum(len(exam['questions']) for exam in catalog)} keyed MC questions, "
        f"{sum(question['readiness'] == 'reviewed' for exam in catalog for question in exam['questions'])} reviewed"
    )
    return catalog


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--offline", action="store_true", help="Use cached NYSED PDFs only")
    parser.add_argument("--jobs", type=int, default=4)
    args = parser.parse_args()
    if args.jobs < 1 or args.jobs > 8:
        parser.error("--jobs must be 1–8")
    try:
        build(offline=args.offline, jobs=args.jobs)
    except (ImportErrorWithContext, OSError, subprocess.CalledProcessError, urllib.error.URLError) as exc:
        print(f"Regents ELA import failed: {exc}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

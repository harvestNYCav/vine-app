#!/usr/bin/env python3
"""Build the app's NYSED released-ELA multiple-choice catalog.

The official ELA booklets contain third-party passages licensed for the test.
This importer intentionally keeps those passages in NYSED's PDFs: the app
stores only tightly cropped question-and-choice images and exact page links to
the official passage.  All release URLs are discovered from NYSED's index.

Typical full import::

    python scripts/import_nysed_ela_mc.py --jobs 4

Deterministic cache-only verification::

    python scripts/import_nysed_ela_mc.py --offline --jobs 4
"""

from __future__ import annotations

import argparse
import calendar
import dataclasses
import datetime as dt
import json
import os
import re
import shutil
import sys
import textwrap
import urllib.parse
from collections import defaultdict
from concurrent.futures import Future, ThreadPoolExecutor
from pathlib import Path
from typing import Any, Sequence

import pdfplumber
from PIL import Image

# The Math importer owns the battle-tested atomic-download, gray-box marker,
# PDF render, WebP validation, and alt-text helpers.  ELA has its own source
# discovery and metadata parser, but deliberately shares those low-level bits.
from import_nysed_math_mc import (  # type: ignore
    CHOICES,
    GRADE_RE,
    ImportFailure,
    SourceDocument,
    _ListPageParser,
    atomic_write_json,
    context_value,
    extract_alt_texts,
    get_pdf,
    group_word_rows,
    href_year_grade,
    load_index,
    render_question_crops,
    walk_list_nodes,
)
from nysed_ela_image_validation import (  # type: ignore
    ElaImageValidationError,
    validate_ela_question_image,
)


REPO_ROOT = Path(__file__).resolve().parents[1]
INDEX_URL = "https://www.nysedregents.org/ei/ei-ela.html"
DEFAULT_CACHE_ROOT = REPO_ROOT / "tmp" / "pdfs" / "nysed-ela-import"
DEFAULT_ASSET_ROOT = REPO_ROOT / "public" / "nysed" / "ela"
DEFAULT_OUTPUT_JSON = REPO_ROOT / "content" / "ela-exams" / "generated" / "catalog.json"
APP_PUBLIC_PREFIX = "/vine-app/nysed/ela"
YEARS = (2013, 2014, 2015, 2016, 2017, 2018, 2019, 2021, 2022, 2023, 2024, 2025, 2026)
LEGACY_YEARS = frozenset((2013, 2014, 2015))
GRADES = (3, 4, 5, 6, 7, 8)
IMPORT_ACCESSED_AT = "2026-07-15"
SCRIPT_VERSION = "2"

EXPECTED_MC_COUNTS: dict[int, tuple[int, int, int, int, int, int]] = {
    2013: (6, 5, 6, 5, 7, 7),
    2014: (16, 17, 21, 19, 19, 21),
    2015: (18, 19, 20, 21, 21, 21),
    2016: (19, 19, 28, 28, 28, 28),
    2017: (19, 19, 28, 28, 28, 28),
    2018: (12, 12, 21, 21, 21, 21),
    2019: (12, 12, 21, 21, 21, 21),
    2021: (18, 18, 28, 28, 28, 28),
    2022: (12, 12, 21, 21, 21, 21),
    2023: (17, 17, 19, 19, 26, 26),
    2024: (17, 17, 19, 19, 26, 26),
    2025: (17, 17, 19, 19, 26, 26),
    2026: (24, 24, 27, 27, 34, 34),
}
EXPECTED_GRAND_TOTAL = 1583
EXPECTED_LEGACY_TOTAL = 269
EXPECTED_LEGACY_GROUP_COUNTS: dict[tuple[int, int], tuple[int, ...]] = {
    (2013, 3): (6,),
    (2013, 4): (5,),
    (2013, 5): (6,),
    (2013, 6): (5,),
    (2013, 7): (7,),
    (2013, 8): (7,),
    (2014, 3): (4, 5, 7),
    (2014, 4): (5, 6, 6),
    (2014, 5): (7, 7, 7),
    (2014, 6): (6, 7, 6),
    (2014, 7): (7, 5, 7),
    (2014, 8): (7, 7, 7),
    (2015, 3): (6, 5, 7),
    (2015, 4): (6, 6, 7),
    (2015, 5): (7, 6, 7),
    (2015, 6): (7, 7, 7),
    (2015, 7): (7, 7, 7),
    (2015, 8): (7, 7, 7),
}

STANDARD_RE = re.compile(
    r"(?:(?:CCSS\.)?ELA-Literacy\.)?(RL|RI|L)\.([3-8])\.(\d+[a-z]?)",
    re.IGNORECASE,
)
STRICT_STANDARD_RE = re.compile(
    r"CCSS\.ELA-Literacy\.(?:RL|RI|L)\.[3-8]\.\d+[a-z]?|"
    r"NGLS\.ELA\.Content\.NY-[3-8](?:R|L)\d+[a-z]?"
)
ITEM_CODE_TOKEN_RE = re.compile(r"^(\d{8,12})_([1-4])$")
PASSAGE_RE = re.compile(
    r"Read\s+this\s+(?:article|story|passage|poem|excerpt).*?"
    r"Then\s+answer\s+questions\s+"
    r"(?P<start>\d{1,2}|X{2})\s+"
    r"(?:through|to|and|[-–—])\s+"
    r"(?P<end>\d{1,2}|X{2})",
    re.IGNORECASE | re.DOTALL,
)
ANY_YEAR_RE = re.compile(r"\b(20\d{2})\b")
ELA_LEAK_RE = re.compile(
    r"(?:\bKey\s*:\s*[A-D]\b|\b(?:MEASURES?|Primary|Secondary)\s+(?:CCLS|CCSS)\b|"
    r"\bWHY\s+CHOICE\b|\bHOW\s+THIS\s+QUESTION\b|\bWHY\s+THE\s+OTHER\s+CHOICES\b)",
    re.IGNORECASE,
)
SKILLS = frozenset(
    ("key-ideas-details", "craft-structure", "integration-knowledge", "language-vocabulary")
)


@dataclasses.dataclass(frozen=True)
class Release:
    year: int
    grade: int
    release_url: str


@dataclasses.dataclass(frozen=True)
class PassageStart:
    page_index: int
    printed_start: int | None
    printed_end: int | None


@dataclasses.dataclass(frozen=True)
class LegacyItem:
    item_code: str
    source_page: int
    key: str
    primary_standard: str
    secondary_standards: tuple[str, ...]
    crop_box: tuple[float, float, float, float]
    passage_index: int


def log(message: str) -> None:
    print(message, file=sys.stderr, flush=True)


def discover_releases(index_html: str) -> dict[tuple[int, int], Release]:
    """Read only release hrefs NYSED actually publishes; never guess URLs."""

    parser = _ListPageParser()
    parser.feed(index_html)
    releases: dict[tuple[int, int], Release] = {}
    for node in walk_list_nodes(parser.root):
        context_year = context_value(node, ANY_YEAR_RE)
        context_grade = context_value(node, GRADE_RE)
        for link in node.links:
            href_lower = link.href.lower()
            text_lower = link.text.lower()
            if not href_lower.endswith(".pdf"):
                continue
            href_year_match = ANY_YEAR_RE.search(link.href)
            href_year = int(href_year_match.group(1)) if href_year_match else None
            _, href_grade = href_year_grade(link.href)
            year = int(context_year) if context_year else href_year
            grade_match = GRADE_RE.search(link.text)
            grade = int(context_grade) if context_grade else (
                int(grade_match.group(1)) if grade_match else href_grade
            )
            is_release = (
                "released test question" in text_lower
                or "released question" in text_lower
                or "released-items" in href_lower
                or "release-items" in href_lower
                or "sample-annotated-items" in href_lower
            )
            if not is_release or "scoring" in href_lower:
                continue
            if year is None or grade not in GRADES:
                raise ImportFailure(f"Could not prove year/grade for official ELA release link: {link.href}")
            absolute = urllib.parse.urljoin(INDEX_URL, link.href)
            key = (int(year), int(grade))
            candidate = Release(int(year), int(grade), absolute)
            if key in releases and releases[key] != candidate:
                raise ImportFailure(f"Multiple ELA release PDFs discovered for {year} grade {grade}")
            releases[key] = candidate

    expected = {(year, grade) for year in YEARS for grade in GRADES}
    if set(releases) != expected:
        raise ImportFailure(
            "Official ELA release matrix changed; "
            f"missing={sorted(expected - set(releases))}, unexpected={sorted(set(releases) - expected)}"
        )
    return releases


def normalize_legacy_standards(text: str, grade: int) -> tuple[str, tuple[str, ...]]:
    """Return the first printed RL/RI/L anchor plus any printed companions."""

    # Standards appear immediately after Key and before the explanatory
    # rationale.  Limiting the scan prevents standards merely mentioned in a
    # later teaching note from being mistaken for alignments.
    cutoff = re.split(
        r"\b(?:HOW\s+THIS\s+QUESTION|WHY\s+CHOICE|QUESTION\s+ANNOTATION)\b",
        text,
        maxsplit=1,
        flags=re.IGNORECASE,
    )[0]
    values: list[str] = []
    for strand, found_grade, code in STANDARD_RE.findall(cutoff):
        if int(found_grade) != grade:
            continue
        value = f"CCSS.ELA-Literacy.{strand.upper()}.{grade}.{code.lower()}"
        if value not in values:
            values.append(value)
    if not values:
        raise ImportFailure(f"Annotated item lacks a grade-{grade} RL/RI/L standard: {cutoff[:240]!r}")
    return values[0], tuple(values[1:])


def standard_skill(standard: str) -> str:
    if ".L." in standard or re.search(r"NY-[3-8]L", standard):
        return "language-vocabulary"
    match = re.search(r"(?:\.(?:RL|RI)\.[3-8]\.|NY-[3-8]R)(\d+)", standard)
    if not match:
        raise ImportFailure(f"Cannot derive ELA skill from {standard}")
    anchor = int(match.group(1))
    if anchor <= 3:
        return "key-ideas-details"
    if anchor <= 6:
        return "craft-structure"
    return "integration-knowledge"


def parse_legacy_items(
    pdf_path: Path,
    year: int,
    grade: int,
) -> tuple[list[LegacyItem], list[PassageStart]]:
    """Parse 2013–15 annotated MC blocks and safe question-only crops."""

    with pdfplumber.open(pdf_path) as pdf:
        passages: list[PassageStart] = []
        starts: list[tuple[int, float, float, str, int]] = []
        for page_index, page in enumerate(pdf.pages):
            page_text = page.extract_text(x_tolerance=2, y_tolerance=3) or ""
            # Some 2015 embedded fonts expose a two-digit operational number
            # as separate glyph words (``1 9``). Collapse only digit-to-digit
            # whitespace for the directions parser; source question text and
            # OCR remain untouched.
            passage_range_text = re.sub(r"(?<=\d)\s+(?=\d)", "", page_text)
            passage_match = PASSAGE_RE.search(passage_range_text)
            if passage_match:
                start_text = passage_match.group("start").upper()
                end_text = passage_match.group("end").upper()
                if (start_text == "XX") != (end_text == "XX"):
                    raise ImportFailure(
                        f"Mixed placeholder/numeric passage range on PDF page {page_index + 1} in {pdf_path}"
                    )
                printed_start = None if start_text == "XX" else int(start_text)
                printed_end = None if end_text == "XX" else int(end_text)
                if printed_start is not None and printed_end is not None and printed_end < printed_start:
                    raise ImportFailure(
                        f"Backwards passage range {printed_start}-{printed_end} in {pdf_path}"
                    )
                passages.append(PassageStart(page_index, printed_start, printed_end))
            for word in page.extract_words(x_tolerance=2, y_tolerance=2, keep_blank_chars=False):
                match = ITEM_CODE_TOKEN_RE.fullmatch(str(word["text"]).strip())
                if match:
                    starts.append(
                        (
                            page_index,
                            float(word["top"]),
                            float(word["bottom"]),
                            match.group(1),
                            int(match.group(2)),
                        )
                    )
        starts.sort(key=lambda value: (value[0], value[1]))
        if not passages:
            raise ImportFailure(f"No passage directions found in {pdf_path}")

        items: list[LegacyItem] = []
        for start_index, (page_index, start_top, start_bottom, item_code, choice_index) in enumerate(starts):
            next_start = starts[start_index + 1] if start_index + 1 < len(starts) else None
            last_page_index = min(next_start[0] if next_start else page_index + 2, len(pdf.pages) - 1)
            block_parts: list[str] = []
            for block_page_index in range(page_index, last_page_index + 1):
                page = pdf.pages[block_page_index]
                top = start_top if block_page_index == page_index else 0.0
                bottom = float(page.height)
                if next_start and block_page_index == next_start[0]:
                    bottom = next_start[1]
                if bottom > top:
                    block_parts.append(page.crop((0.0, top, float(page.width), bottom)).extract_text() or "")
                if next_start and block_page_index == next_start[0]:
                    break
            block_text = "\n".join(block_parts)
            key_match = re.search(r"\bKey\s*:\s*([ABCD])\b", block_text, re.IGNORECASE)
            if not key_match:
                raise ImportFailure(
                    f"Annotated MC item {item_code}_{choice_index} lacks a printed key in {pdf_path}"
                )
            printed_key = key_match.group(1).upper()
            suffix_key = CHOICES[choice_index - 1]
            if printed_key != suffix_key:
                raise ImportFailure(
                    f"Answer-key mismatch for {item_code}: suffix={suffix_key}, printed={printed_key}"
                )
            primary, secondary = normalize_legacy_standards(block_text, grade)

            page = pdf.pages[page_index]
            key_tops: list[float] = []
            for row_top, row in group_word_rows(
                page.extract_words(x_tolerance=2, y_tolerance=2, keep_blank_chars=False)
            ):
                row_text = " ".join(str(word["text"]) for word in row)
                before_next = not next_start or next_start[0] != page_index or row_top < next_start[1]
                if row_top > start_bottom and before_next and re.search(r"\bKey\s*:", row_text, re.I):
                    key_tops.append(row_top)
            if not key_tops:
                raise ImportFailure(f"Could not position printed key for item {item_code} in {pdf_path}")
            crop_top = max(18.0, start_bottom + 3.0)
            crop_bottom = min(key_tops) - 8.0
            if crop_bottom - crop_top <= 55:
                raise ImportFailure(f"Unsafe question crop for item {item_code} in {pdf_path}")
            crop_box = (28.0, crop_top, float(page.width) - 28.0, crop_bottom)
            crop_text = page.crop(crop_box).extract_text() or ""
            if ELA_LEAK_RE.search(crop_text):
                raise ImportFailure(f"Answer/rationale leakage in crop for item {item_code} in {pdf_path}")

            passage_candidates = [
                index for index, passage in enumerate(passages) if passage.page_index <= page_index
            ]
            if not passage_candidates:
                raise ImportFailure(f"Item {item_code} has no preceding official passage in {pdf_path}")
            passage_index = passage_candidates[-1]
            passage = passages[passage_index]
            items.append(
                LegacyItem(
                    item_code=item_code,
                    source_page=page_index + 1,
                    key=printed_key,
                    primary_standard=primary,
                    secondary_standards=secondary,
                    crop_box=crop_box,
                    passage_index=passage_index,
                )
            )

    if len({item.item_code for item in items}) != len(items):
        raise ImportFailure(f"Duplicate legacy item codes in {pdf_path}")
    if [item.source_page for item in items] != sorted(item.source_page for item in items):
        raise ImportFailure(f"Legacy items are not in physical source order in {pdf_path}")
    passage_sequence = [item.passage_index for item in items]
    compressed_sequence = [
        passage_index
        for index, passage_index in enumerate(passage_sequence)
        if index == 0 or passage_sequence[index - 1] != passage_index
    ]
    if compressed_sequence != sorted(set(compressed_sequence)):
        raise ImportFailure(f"Legacy passage groups are not contiguous/in order in {pdf_path}")

    grouped: dict[int, list[LegacyItem]] = defaultdict(list)
    for item in items:
        grouped[item.passage_index].append(item)
    actual_group_counts = tuple(len(group) for _, group in sorted(grouped.items()))
    expected_group_counts = EXPECTED_LEGACY_GROUP_COUNTS[(year, grade)]
    if actual_group_counts != expected_group_counts:
        raise ImportFailure(
            f"Legacy passage-group inventory changed for {year} Grade {grade}: "
            f"expected {expected_group_counts}, got {actual_group_counts}"
        )
    previous_printed_end = 0
    for passage_index, group in sorted(grouped.items()):
        passage = passages[passage_index]
        if passage.page_index + 1 >= group[0].source_page:
            raise ImportFailure(
                f"Legacy passage page does not precede its first item for {year} Grade {grade}"
            )
        if passage.printed_start is None or passage.printed_end is None:
            continue
        expected_numbers = range(passage.printed_start, passage.printed_end + 1)
        if len(group) != len(expected_numbers):
            raise ImportFailure(
                f"Printed passage range/item-count mismatch for {year} Grade {grade}: "
                f"passage={passage.printed_start}-{passage.printed_end}, items={len(group)}"
            )
        if passage.printed_start <= previous_printed_end:
            raise ImportFailure(f"Printed legacy passage ranges overlap in {pdf_path}")
        previous_printed_end = passage.printed_end
    return items, passages


def exam_copy(year: int, grade: int) -> tuple[str, str, str]:
    title = f"New York Grade {grade} ELA — {year} Released Questions"
    description = (
        f"Practice the multiple-choice questions officially released from the {year} "
        f"New York State Grade {grade} English Language Arts Test."
    )
    source_title = f"{year} NYS Grade {grade} English Language Arts Test Released Questions"
    return title, description, source_title


def import_legacy_release(
    release: Release,
    cache_root: Path,
    asset_root: Path,
    public_prefix: str,
    *,
    offline: bool,
    force_download: bool,
    force_render: bool,
    dpi: int,
    tesseract_binary: str | None,
) -> dict[str, Any]:
    source = SourceDocument(release.year, release.grade, "en", release.release_url)
    pdf_path = get_pdf(source, cache_root, kind="release", offline=offline, force=force_download)
    items, passages = parse_legacy_items(pdf_path, release.year, release.grade)
    expected = EXPECTED_MC_COUNTS[release.year][release.grade - 3]
    if len(items) != expected:
        raise ImportFailure(
            f"Legacy count mismatch for {release.year} grade {release.grade}: "
            f"expected {expected}, parsed {len(items)}"
        )

    numbered = list(enumerate(items, start=1))
    boxes = {number: (item.source_page, item.crop_box) for number, item in numbered}
    output_directory = asset_root / str(release.year) / f"grade-{release.grade}" / "en"
    public_directory = f"{public_prefix}/{release.year}/grade-{release.grade}/en"
    images = render_question_crops(
        pdf_path,
        boxes,
        output_directory,
        public_directory,
        dpi=dpi,
        force=force_render,
        script_version=f"ela-{SCRIPT_VERSION}",
    )

    groups: dict[int, list[tuple[int, LegacyItem]]] = defaultdict(list)
    for number, item in numbered:
        groups[item.passage_index].append((number, item))

    # OCR the final WebP—not merely selectable PDF text—so every published
    # crop proves A/B/C/D are present and no raster key/rationale/passage has
    # leaked.  2015 prints operational numbers in gray boxes; its passage
    # directions publish the exact range, so the OCR must begin with the
    # corresponding number.  The 2013–14 annotated sources genuinely replace
    # those numbers with item codes/XX placeholders; their association is
    # instead pinned by the contiguous group inventory checked above.
    for passage_index, group in sorted(groups.items()):
        passage = passages[passage_index]
        operational_numbers: list[int | None]
        if passage.printed_start is not None and passage.printed_end is not None:
            operational_numbers = list(range(passage.printed_start, passage.printed_end + 1))
            if len(operational_numbers) != len(group):
                raise AssertionError("Printed passage range parity changed after legacy parsing")
        else:
            operational_numbers = [None] * len(group)
        for (release_number, _), operational_number in zip(group, operational_numbers, strict=True):
            image_path = output_directory / f"q{release_number:02d}.webp"
            try:
                validate_ela_question_image(
                    image_path,
                    cache_root,
                    tesseract_binary=tesseract_binary,
                    expected_question_number=operational_number,
                    offline=offline,
                )
            except ElaImageValidationError as exc:
                raise ImportFailure(
                    f"Final ELA image validation failed for {release.year} Grade "
                    f"{release.grade} released item {release_number}: {exc}"
                ) from exc

    alts = extract_alt_texts(
        pdf_path,
        boxes,
        output_directory,
        "en",
        tesseract_binary,
        cache=True,
    )
    stimuli: list[dict[str, Any]] = []
    stimulus_by_passage: dict[int, str] = {}
    for passage_index, group in sorted(groups.items(), key=lambda entry: entry[1][0][0]):
        question_start = group[0][0]
        question_end = group[-1][0]
        stimulus_id = (
            f"nysed-ela-{release.year}-g{release.grade}-stimulus-"
            f"{question_start}-{question_end}"
        )
        passage_page_start = passages[passage_index].page_index + 1
        passage_page_end = min(item.source_page for _, item in group) - 1
        passage_page_end = max(passage_page_start, passage_page_end)
        label = f"Official passage for Questions {question_start}–{question_end}"
        stimuli.append(
            {
                "id": stimulus_id,
                "label": label,
                "questionStart": question_start,
                "questionEnd": question_end,
                "references": [
                    {
                        "label": label,
                        "sourceUrl": release.release_url,
                        "pageStart": passage_page_start,
                        "pageEnd": passage_page_end,
                    }
                ],
            }
        )
        stimulus_by_passage[passage_index] = stimulus_id

    questions: list[dict[str, Any]] = []
    for number, item in numbered:
        question: dict[str, Any] = {
            "id": f"nysed-ela-{release.year}-g{release.grade}-mc-q{number}",
            "number": number,
            "sourceNumberKind": "release-ordinal",
            "session": None,
            "sourcePage": item.source_page,
            "primaryStandard": item.primary_standard,
            "stimulusId": stimulus_by_passage[item.passage_index],
            "skill": standard_skill(item.primary_standard),
            "correct": item.key,
            "image": dataclasses.asdict(images[number]),
            "alt": alts[number],
        }
        if item.secondary_standards:
            question["secondaryStandards"] = list(item.secondary_standards)
        questions.append(question)

    title, description, source_title = exam_copy(release.year, release.grade)
    exam = {
        "id": f"nysed-ela-{release.year}-grade-{release.grade}-mc-v1",
        "slug": f"{release.year}-grade-{release.grade}-mc",
        "year": release.year,
        "grade": release.grade,
        "standardsFramework": "CCLS",
        "title": title,
        "description": description,
        "sourceTitle": source_title,
        "sourceUrl": release.release_url,
        "stimuli": stimuli,
        "questions": questions,
    }
    validate_exam(exam)
    return exam


def validate_exam(exam: dict[str, Any]) -> None:
    year = int(exam["year"])
    grade = int(exam["grade"])
    questions = exam["questions"]
    expected = EXPECTED_MC_COUNTS[year][grade - 3]
    if len(questions) != expected:
        raise ImportFailure(
            f"Official count mismatch for {year} grade {grade}: expected {expected}, got {len(questions)}"
        )
    if exam["sourceUrl"].startswith("https://www.nysedregents.org/") is False:
        raise ImportFailure(f"Non-NYSED source URL in {exam['id']}")
    stimuli = exam.get("stimuli", [])
    stimulus_ids = {stimulus["id"] for stimulus in stimuli}
    if len(stimulus_ids) != len(stimuli) or not stimuli:
        raise ImportFailure(f"Missing/duplicate stimuli in {exam['id']}")
    previous_end = 0
    for stimulus in stimuli:
        start = int(stimulus["questionStart"])
        end = int(stimulus["questionEnd"])
        if start <= previous_end or end < start or not stimulus.get("references"):
            raise ImportFailure(f"Overlapping/malformed stimulus range in {exam['id']}")
        previous_end = end
        for reference in stimulus["references"]:
            if (
                not str(reference["sourceUrl"]).startswith("https://www.nysedregents.org/")
                or int(reference["pageStart"]) < 1
                or int(reference["pageEnd"]) < int(reference["pageStart"])
            ):
                raise ImportFailure(f"Invalid passage reference in {exam['id']}")

    expected_framework_prefix = "NGLS." if year >= 2023 else "CCSS."
    numbers: list[int] = []
    for question in questions:
        number = int(question["number"])
        numbers.append(number)
        if question["correct"] not in CHOICES:
            raise ImportFailure(f"Invalid key in {question['id']}")
        if question["stimulusId"] not in stimulus_ids or question["skill"] not in SKILLS:
            raise ImportFailure(f"Invalid stimulus/skill in {question['id']}")
        stimulus = next(value for value in stimuli if value["id"] == question["stimulusId"])
        if not int(stimulus["questionStart"]) <= number <= int(stimulus["questionEnd"]):
            raise ImportFailure(f"Question outside its stimulus range: {question['id']}")
        standard = str(question["primaryStandard"])
        if (
            not STRICT_STANDARD_RE.fullmatch(standard)
            or not standard.startswith(expected_framework_prefix)
            or not re.search(rf"(?:\.|NY-){grade}(?:\.|[RL])", standard)
        ):
            raise ImportFailure(f"Malformed/wrong-grade standard in {question['id']}: {standard}")
        if int(question["sourcePage"]) < 1:
            raise ImportFailure(f"Invalid source page in {question['id']}")
        if question["sourceNumberKind"] == "official":
            if question["session"] not in (1, 2):
                raise ImportFailure(f"Official item lacks session: {question['id']}")
        elif question["sourceNumberKind"] == "release-ordinal":
            if question["session"] is not None:
                raise ImportFailure(f"Release ordinal has a session: {question['id']}")
        else:
            raise ImportFailure(f"Invalid source-number kind in {question['id']}")
        image = question["image"]
        if (
            not str(image["src"]).startswith(f"{APP_PUBLIC_PREFIX}/")
            or int(image["width"]) < 240
            or int(image["height"]) < 90
        ):
            raise ImportFailure(f"Invalid question image in {question['id']}")
        alt = str(question["alt"])
        if len(re.sub(r"[^A-Za-z0-9]", "", alt)) < 24 or ELA_LEAK_RE.search(alt):
            raise ImportFailure(f"Missing/leaky alt text in {question['id']}")
    if numbers != sorted(numbers) or len(numbers) != len(set(numbers)):
        raise ImportFailure(f"Question numbers not unique/increasing in {exam['id']}")


def deterministic_timestamp(index_html: str) -> str:
    epoch = os.environ.get("SOURCE_DATE_EPOCH")
    if epoch:
        value = dt.datetime.fromtimestamp(int(epoch), tz=dt.timezone.utc)
        return value.replace(microsecond=0).isoformat().replace("+00:00", "Z")
    match = re.search(
        r"Last\s+Updated.*?"
        r"(January|February|March|April|May|June|July|August|September|October|November|December)"
        r"\s+(\d{1,2}),\s+(\d{4})",
        index_html,
        re.IGNORECASE | re.DOTALL,
    )
    if not match:
        raise ImportFailure("Could not derive deterministic timestamp from NYSED index")
    month = next(
        index for index, name in enumerate(calendar.month_name) if name.lower() == match.group(1).lower()
    )
    value = dt.datetime(int(match.group(3)), month, int(match.group(2)), tzinfo=dt.timezone.utc)
    return value.isoformat().replace("+00:00", "Z")


def validate_asset_tree(
    exams: Sequence[dict[str, Any]],
    asset_root: Path,
    *,
    require_exact: bool,
) -> None:
    """Prove catalog/image/manifest parity before any production publish."""

    unsafe_links = [path for path in asset_root.rglob("*") if path.is_symlink()]
    if unsafe_links:
        raise ImportFailure(f"ELA asset tree contains a symlink: {unsafe_links[0]}")
    expected_files: set[Path] = set()
    expected_by_directory: dict[Path, set[str]] = defaultdict(set)
    prefix = f"{APP_PUBLIC_PREFIX}/"
    for exam in exams:
        year = int(exam["year"])
        grade = int(exam["grade"])
        for question in exam["questions"]:
            src = str(question["image"]["src"])
            if not src.startswith(prefix):
                raise ImportFailure(f"Asset URL is outside the ELA prefix: {src}")
            relative = Path(src[len(prefix) :])
            expected_relative = Path(
                str(year),
                f"grade-{grade}",
                "en",
                f"q{int(question['number']):02d}.webp",
            )
            if relative != expected_relative or relative.is_absolute() or ".." in relative.parts:
                raise ImportFailure(f"Catalog/image path mismatch in {question['id']}: {src}")
            path = asset_root / relative
            if not path.is_file() or path.is_symlink():
                raise ImportFailure(f"Missing or unsafe generated ELA asset: {path}")
            try:
                with Image.open(path) as image:
                    image.load()
                    if (
                        image.format != "WEBP"
                        or image.width != int(question["image"]["width"])
                        or image.height != int(question["image"]["height"])
                    ):
                        raise ImportFailure(
                            f"Catalog/image dimension mismatch for {question['id']}: "
                            f"catalog={question['image']['width']}x{question['image']['height']}, "
                            f"file={image.width}x{image.height}"
                        )
            except ImportFailure:
                raise
            except Exception as exc:
                raise ImportFailure(f"Unreadable generated ELA asset {path}: {exc}") from exc
            expected_files.add(relative)
            expected_by_directory[relative.parent].add(relative.name)

    for directory, expected_names in expected_by_directory.items():
        manifest_path = asset_root / directory / ".nysed-import.json"
        if not manifest_path.is_file() or manifest_path.is_symlink():
            raise ImportFailure(f"Missing or unsafe ELA render manifest: {manifest_path}")
        try:
            manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as exc:
            raise ImportFailure(f"Unreadable ELA render manifest: {manifest_path}") from exc
        if manifest.get("scriptVersion") != f"ela-{SCRIPT_VERSION}":
            raise ImportFailure(f"Stale ELA render manifest version: {manifest_path}")
        crop_names = {f"q{int(number):02d}.webp" for number in manifest.get("crops", {})}
        output_names = {f"q{int(number):02d}.webp" for number in manifest.get("outputs", {})}
        if crop_names != expected_names or output_names != expected_names:
            raise ImportFailure(f"ELA render-manifest parity failed: {manifest_path}")
        encoded = json.dumps(manifest, ensure_ascii=False)
        if str(REPO_ROOT) in encoded or str(Path.home()) in encoded or "file://" in encoded:
            raise ImportFailure(f"ELA render manifest leaks a local path: {manifest_path}")

    if require_exact:
        actual_files = {
            path.relative_to(asset_root)
            for path in asset_root.rglob("q*.webp")
            if path.is_file()
        }
        if actual_files != expected_files:
            raise ImportFailure(
                "Staged ELA assets do not exactly match the catalog; "
                f"missing={sorted(map(str, expected_files - actual_files))[:8]}, "
                f"orphaned={sorted(map(str, actual_files - expected_files))[:8]}"
            )
        manifests = [path for path in asset_root.rglob(".nysed-import.json") if path.is_file()]
        if len(manifests) != len(exams):
            raise ImportFailure(
                f"Staged ELA manifest count mismatch: expected {len(exams)}, got {len(manifests)}"
            )


def _remove_publish_temporary(path: Path, parent: Path) -> None:
    """Remove only importer-owned, guarded publish temporaries."""

    resolved_parent = parent.resolve()
    resolved = path.resolve()
    if resolved.parent != resolved_parent or not resolved.name.startswith(".ela-"):
        raise ImportFailure(f"Refusing to remove an unguarded publish path: {path}")
    if resolved.exists():
        shutil.rmtree(resolved)


def seed_production_staging(staged_asset_root: Path) -> None:
    """Seed only a missing/empty cache stage from the current public tree.

    The public tree is treated as a read-only render cache.  Existing staged
    work always wins, and the normal renderer manifests plus the final exact
    catalog parity check decide which copied files can actually be reused.
    """

    if staged_asset_root.exists():
        if staged_asset_root.is_symlink() or not staged_asset_root.is_dir():
            raise ImportFailure(f"Unsafe ELA production staging path: {staged_asset_root}")
        staged_symlinks = [path for path in staged_asset_root.rglob("*") if path.is_symlink()]
        if staged_symlinks:
            raise ImportFailure(f"ELA production staging contains a symlink: {staged_symlinks[0]}")
        if any(staged_asset_root.iterdir()):
            log(f"Reusing nonempty ELA production staging tree {staged_asset_root}")
            return

    source = DEFAULT_ASSET_ROOT
    if not source.exists():
        return
    if source.is_symlink() or not source.is_dir():
        raise ImportFailure(f"Unsafe existing ELA production asset tree: {source}")
    symlinks = [path for path in source.rglob("*") if path.is_symlink()]
    if symlinks:
        raise ImportFailure(f"Refusing to seed ELA staging from symlinked asset {symlinks[0]}")

    staged_asset_root.parent.mkdir(parents=True, exist_ok=True)
    shutil.copytree(source, staged_asset_root, dirs_exist_ok=True, symlinks=False)
    log(f"Seeded ELA production staging from read-only assets in {source}")


def publish_production_catalog(
    catalog: dict[str, Any],
    staged_asset_root: Path,
    output_json: Path,
) -> None:
    """Publish validated assets + catalog with rollback on any write failure."""

    if DEFAULT_ASSET_ROOT.is_symlink():
        raise ImportFailure(f"Refusing to publish through a symlink: {DEFAULT_ASSET_ROOT}")
    destination = DEFAULT_ASSET_ROOT
    parent = destination.parent
    parent.mkdir(parents=True, exist_ok=True)
    token = f"{os.getpid()}"
    candidate = parent / f".ela-next-{token}"
    backup = parent / f".ela-backup-{token}"
    if candidate.exists() or backup.exists():
        raise ImportFailure(
            f"A guarded ELA publish temporary already exists ({candidate} or {backup}); "
            "inspect and remove it before retrying"
        )
    shutil.copytree(staged_asset_root, candidate, symlinks=False)
    try:
        validate_asset_tree(catalog["exams"], candidate, require_exact=True)
    except Exception:
        _remove_publish_temporary(candidate, parent)
        raise

    moved_existing = False
    published_assets = False
    try:
        if destination.exists():
            destination.replace(backup)
            moved_existing = True
        candidate.replace(destination)
        published_assets = True
        atomic_write_json(output_json, catalog)
    except Exception as exc:
        rollback_error: Exception | None = None
        try:
            if published_assets and destination.exists():
                destination.replace(candidate)
            if moved_existing and backup.exists():
                backup.replace(destination)
            if candidate.exists():
                _remove_publish_temporary(candidate, parent)
        except Exception as rollback_exc:  # pragma: no cover - catastrophic filesystem failure.
            rollback_error = rollback_exc
        if rollback_error is not None:
            raise ImportFailure(
                f"ELA production publish failed ({exc}) and rollback also failed ({rollback_error})"
            ) from exc
        raise ImportFailure(f"ELA production publish failed and was rolled back: {exc}") from exc

    if backup.exists():
        try:
            _remove_publish_temporary(backup, parent)
        except Exception as exc:
            # Assets and catalog are already the validated new pair.  Retain a
            # harmless backup rather than misreporting the publish as failed.
            log(f"Warning: published ELA catalog but could not remove backup {backup}: {exc}")


def select_values(values: list[int] | None, allowed: Sequence[int]) -> list[int]:
    if not values:
        return list(allowed)
    invalid = sorted(set(values) - set(allowed))
    if invalid:
        raise ImportFailure(f"Unsupported selection: {invalid}")
    return sorted(set(values))


def parse_args(argv: Sequence[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Import official NYSED Grades 3–8 released ELA multiple-choice items.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=textwrap.dedent(
            """
            Copyright boundary:
              * passage pages stay in official NYSED PDFs and are never copied;
              * local WebPs contain only a released question and choices A–D;
              * every crop is rejected if printed key/rationale text leaks.

            Publish safety:
              * subset/sample imports use cache-local assets and cannot touch production;
              * a full production import renders and validates all 78 releases in staging;
              * production assets are swapped only after exact 1,583-question parity.
            """
        ),
    )
    parser.add_argument("--year", type=int, action="append")
    parser.add_argument("--grade", type=int, action="append")
    parser.add_argument("--list", action="store_true")
    parser.add_argument("--offline", action="store_true")
    parser.add_argument("--force-download", action="store_true")
    parser.add_argument("--force-render", action="store_true")
    parser.add_argument("--allow-partial", action="store_true")
    parser.add_argument("--cache-root", type=Path, default=DEFAULT_CACHE_ROOT)
    parser.add_argument(
        "--asset-root",
        type=Path,
        default=None,
        help=(
            "Non-production asset destination. Subset runs default below --cache-root; "
            "the production tree is reserved for a complete production publish."
        ),
    )
    parser.add_argument("--output-json", type=Path, default=None)
    parser.add_argument("--dpi", type=int, default=160)
    parser.add_argument("--jobs", type=int, default=1)
    parser.add_argument("--tesseract", default=shutil.which("tesseract"))
    return parser.parse_args(argv)


def main(argv: Sequence[str] | None = None) -> int:
    args = parse_args(argv or sys.argv[1:])
    years = select_values(args.year, YEARS)
    grades = select_values(args.grade, GRADES)
    if not 96 <= args.dpi <= 300:
        raise ImportFailure("--dpi must be between 96 and 300")
    if not 1 <= args.jobs <= 8:
        raise ImportFailure("--jobs must be between 1 and 8")
    cache_root = args.cache_root.resolve()
    is_full_selection = years == list(YEARS) and grades == list(GRADES)
    if args.output_json is None:
        output_json = (
            DEFAULT_OUTPUT_JSON
            if is_full_selection and not args.allow_partial
            else cache_root / ("catalog.partial.json" if args.allow_partial else "catalog.sample.json")
        )
    else:
        output_json = args.output_json
    output_json = output_json.resolve()
    production_output = output_json == DEFAULT_OUTPUT_JSON.resolve()
    requested_asset_root = args.asset_root.resolve() if args.asset_root is not None else None
    if production_output:
        if not is_full_selection or args.allow_partial:
            raise ImportFailure("Only a complete, fail-closed import may write the production catalog")
        if requested_asset_root not in (None, DEFAULT_ASSET_ROOT.resolve()):
            raise ImportFailure("A production import may not redirect its production asset publish")
        asset_root = (cache_root / "staging-assets" / f"ela-{SCRIPT_VERSION}").resolve()
        try:
            asset_root.relative_to(cache_root)
        except ValueError as exc:
            raise ImportFailure("Production staging assets must stay below --cache-root") from exc
        if not args.list:
            seed_production_staging(asset_root)
    else:
        if requested_asset_root is not None and not args.list:
            try:
                requested_asset_root.relative_to(DEFAULT_ASSET_ROOT.resolve())
            except ValueError:
                pass
            else:
                raise ImportFailure(
                    "Subset/sample imports may not mutate public/nysed/ela or its descendants; "
                    "omit --asset-root to use isolated cache assets"
                )
        asset_root = requested_asset_root or (cache_root / "sample-assets").resolve()
    if asset_root.exists():
        if asset_root.is_symlink() or not asset_root.is_dir():
            raise ImportFailure(f"Unsafe ELA asset destination: {asset_root}")
        existing_symlinks = [path for path in asset_root.rglob("*") if path.is_symlink()]
        if existing_symlinks:
            raise ImportFailure(f"ELA asset destination contains a symlink: {existing_symlinks[0]}")

    index_html, _ = load_index(
        INDEX_URL,
        cache_root,
        offline=args.offline,
        force=args.force_download,
    )
    releases = discover_releases(index_html)
    requested = [(year, grade) for year in years for grade in grades]
    if args.list:
        for key in requested:
            release = releases[key]
            print(json.dumps(dataclasses.asdict(release), ensure_ascii=False))
        return 0

    from nysed_ela_modern import import_modern_release  # type: ignore

    def process_key(key: tuple[int, int]) -> dict[str, Any]:
        year, grade = key
        release = releases[key]
        log(f"Importing ELA {year} grade {grade}")
        if year in LEGACY_YEARS:
            exam = import_legacy_release(
                release,
                cache_root,
                asset_root,
                APP_PUBLIC_PREFIX,
                offline=args.offline,
                force_download=args.force_download,
                force_render=args.force_render,
                dpi=args.dpi,
                tesseract_binary=args.tesseract,
            )
        else:
            exam = import_modern_release(
                {"year": year, "grade": grade, "releaseUrl": release.release_url},
                cache_root,
                asset_root,
                APP_PUBLIC_PREFIX,
                offline=args.offline,
                force_download=args.force_download,
                force_render=args.force_render,
                dpi=args.dpi,
                tesseract_binary=args.tesseract,
                script_version=f"ela-{SCRIPT_VERSION}",
            )
        validate_exam(exam)
        log(f"  Generated {len(exam['questions'])} MC questions")
        return exam

    exams: list[dict[str, Any]] = []
    failures: list[str] = []
    with ThreadPoolExecutor(max_workers=args.jobs, thread_name_prefix="nysed-ela") as executor:
        futures: list[tuple[tuple[int, int], Future[dict[str, Any]]]] = [
            (key, executor.submit(process_key, key)) for key in requested
        ]
        for key, future in futures:
            try:
                exams.append(future.result())
            except Exception as exc:
                message = f"{key[0]} grade {key[1]}: {exc}"
                if not args.allow_partial:
                    for _, pending in futures:
                        pending.cancel()
                    raise ImportFailure(message) from exc
                failures.append(message)
                log(f"  FAILED: {message}")

    exams.sort(key=lambda exam: (-int(exam["year"]), int(exam["grade"])))
    exam_ids = [exam["id"] for exam in exams]
    question_ids = [question["id"] for exam in exams for question in exam["questions"]]
    if len(exam_ids) != len(set(exam_ids)) or len(question_ids) != len(set(question_ids)):
        raise ImportFailure("Catalog IDs are not globally unique")
    is_full = is_full_selection and not failures
    if is_full and (len(exams) != 78 or len(question_ids) != EXPECTED_GRAND_TOTAL):
        raise ImportFailure(
            f"Full catalog parity failed: expected 78/{EXPECTED_GRAND_TOTAL}, "
            f"got {len(exams)}/{len(question_ids)}"
        )
    if failures and not exams:
        raise ImportFailure("All requested exams failed; refusing to write an empty catalog")

    generated_at = deterministic_timestamp(index_html)
    catalog = {
        "schemaVersion": 1,
        "generatedAt": generated_at,
        "accessedAt": os.environ.get("NYSED_ACCESSED_AT", IMPORT_ACCESSED_AT),
        "sourceUpdatedAt": generated_at.split("T", 1)[0],
        "sourceIndexUrl": INDEX_URL,
        "exams": exams,
    }
    encoded = json.dumps(catalog, ensure_ascii=False)
    if str(REPO_ROOT) in encoded or str(Path.home()) in encoded:
        raise ImportFailure("Generated catalog leaks a local filesystem path")
    validate_asset_tree(exams, asset_root, require_exact=is_full)
    if production_output:
        publish_production_catalog(catalog, asset_root, output_json)
        log(
            f"Published {len(exams)} exams / {len(question_ids)} questions to "
            f"{output_json} and {DEFAULT_ASSET_ROOT}"
        )
    else:
        atomic_write_json(output_json, catalog)
        log(f"Wrote {len(exams)} exams / {len(question_ids)} questions to {output_json}")
    if failures:
        log("Partial failures:\n  " + "\n  ".join(failures))
        return 2
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except ImportFailure as exc:
        print(f"error: {exc}", file=sys.stderr)
        raise SystemExit(1)

#!/usr/bin/env python3
"""Import released NYSED Mathematics Regents Part I questions.

The archive indexes, rather than guessed filename patterns, determine the exam
and scoring-key URLs. Every answer key must have exactly 24 numbered Part I
choices. Questions remain ``needs-review`` until a person verifies a faithful
transcript, four choices, and a worked explanation against the source image.

Run from the repository root::

    python3 scripts/regents_math_import.py --jobs 4
    python3 scripts/regents_math_import.py --offline --jobs 4

The generated catalog is an array of exam records. Images are cropped from
official English exam PDFs and written to ``public/nysed/regents/math``.
"""

from __future__ import annotations

import argparse
import concurrent.futures
import hashlib
import html.parser
import io
import json
import re
import subprocess
import sys
import urllib.parse
from dataclasses import dataclass, field
from pathlib import Path
from typing import Iterable

import pdfplumber
from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
CACHE_ROOT = ROOT / "tmp" / "pdfs" / "nysed-regents-math"
OUTPUT_JSON = ROOT / "content" / "regents" / "math" / "generated" / "catalog.json"
REVIEWS_ROOT = ROOT / "content" / "regents" / "math" / "reviews"
ASSET_ROOT = ROOT / "public" / "nysed" / "regents" / "math"
BASE_PATH = "/vine-app"
ACCESSED_AT = "2026-10-28"
ARCHIVES = {
    "algebra-i": "https://www.nysedregents.org/algebraone/",
    "geometry": "https://www.nysedregents.org/geometryre/",
    "algebra-ii": "https://www.nysedregents.org/algebratwo/",
}
COURSE_LABELS = {
    "algebra-i": "Algebra I",
    "geometry": "Geometry",
    "algebra-ii": "Algebra II",
}
EXPECTED_ADMINISTRATIONS = {"algebra-i": 33, "geometry": 29, "algebra-ii": 26}
ERA_FIRST_YEAR_MONTH = {
    "algebra-i": (2024, "june"),
    "geometry": (2025, "june"),
    "algebra-ii": (2026, "june"),
}
MONTH_ORDER = {"january": 1, "june": 6, "august": 8}
DATE_RE = re.compile(r"<li>\s*(January|June|August)\s+(20\d{2})(?:\s*\([^<]*\))?", re.I)
PDF_SUFFIX_RE = re.compile(r"\.pdf(?:[?#].*)?$", re.I)
KEY_ROW_RE = re.compile(
    r"\b(?:Algebra\s+I{1,2}|Geometry)\s+"
    r"(?:(?:Jan(?:uary)?|Jun(?:e)?|Aug(?:ust)?)\.?\s*['’]?\s*\d{2}|v202)"
    r"\s+(\d{1,2})\s+([1-4])\s+MC\s+2\b",
    re.I,
)
OLD_KEY_RE = re.compile(
    r"\((\d{1,2})\)\s*(?:[.·]\s*)+([1-4])\s*(?:[.·]|$)",
)
QUESTION_COUNT = 24
IMAGE_DPI = 170
IMAGE_QUALITY = 85
# In this release, the official notices state that these questions have no
# unique correct response. Practice cannot score them as ordinary single-key MC.
EXCLUDED_QUESTIONS = {
    ("geometry", 2017, "june", 14): "The official notice accepts both 1 and 3.",
    ("geometry", 2017, "june", 22): "The official notice awards credit for every response.",
    ("geometry", 2017, "june", 24): "The official notice awards credit for every response.",
}


class ImportFailure(RuntimeError):
    """A source or validation error that must stop generation."""


@dataclass
class Link:
    href: str
    text: str


@dataclass
class ListNode:
    text: list[str] = field(default_factory=list)
    links: list[Link] = field(default_factory=list)
    children: list["ListNode"] = field(default_factory=list)

    @property
    def direct_text(self) -> str:
        return " ".join(" ".join(self.text).split())

    def descendants(self) -> Iterable["ListNode"]:
        yield self
        for child in self.children:
            yield from child.descendants()


class ListParser(html.parser.HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.root = ListNode()
        self.stack = [self.root]
        self.anchor: tuple[str, list[str]] | None = None

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag == "li":
            node = ListNode()
            self.stack[-1].children.append(node)
            self.stack.append(node)
        elif tag == "a":
            href = dict(attrs).get("href")
            if href:
                self.anchor = (href, [])

    def handle_endtag(self, tag: str) -> None:
        if tag == "a" and self.anchor is not None:
            href, text = self.anchor
            self.stack[-1].links.append(Link(href, " ".join(" ".join(text).split())))
            self.anchor = None
        elif tag == "li" and len(self.stack) > 1:
            self.stack.pop()

    def handle_data(self, data: str) -> None:
        if self.anchor is not None:
            self.anchor[1].append(data)
        elif data.strip():
            self.stack[-1].text.append(data)


@dataclass(frozen=True)
class Administration:
    course: str
    year: int
    month: str
    exam_url: str
    key_url: str
    archive_url: str

    @property
    def slug(self) -> str:
        return f"{self.course}-{self.year}-{self.month}"


@dataclass(frozen=True)
class QuestionMarker:
    number: int
    page_index: int
    top: float
    x0: float


def fetch(url: str, destination: Path, *, offline: bool) -> bytes:
    if destination.is_file():
        return destination.read_bytes()
    if offline:
        raise ImportFailure(f"Missing offline cache: {destination}")
    result = subprocess.run(
        ["curl", "--location", "--fail", "--silent", "--show-error", "--max-time", "45", url],
        capture_output=True,
        check=False,
    )
    if result.returncode:
        raise ImportFailure(f"Could not fetch {url}: {result.stderr.decode('utf-8', 'replace').strip()}")
    data = result.stdout
    if not data:
        raise ImportFailure(f"Empty source: {url}")
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_bytes(data)
    return data


def links_below(node: ListNode) -> list[Link]:
    return [link for descendant in node.descendants() for link in descendant.links]


def discover_archive(course: str, *, offline: bool, cache_root: Path) -> list[Administration]:
    archive_url = ARCHIVES[course]
    source = fetch(archive_url, cache_root / "indexes" / f"{course}.html", offline=offline)
    html_text = source.decode("utf-8", "replace")
    # NYSED omits the closing </li> for administration headings. Split at the
    # next dated heading rather than trusting the resulting nested list tree.
    dated_blocks = list(DATE_RE.finditer(html_text))
    administrations: list[Administration] = []
    for index, match in enumerate(dated_blocks):
        month, year = match.group(1).lower(), int(match.group(2))
        end = dated_blocks[index + 1].start() if index + 1 < len(dated_blocks) else len(html_text)
        parser = ListParser()
        parser.feed(html_text[match.end():end])
        all_links = links_below(parser.root)
        pdf_links = [link for link in all_links if PDF_SUFFIX_RE.search(link.href)]
        regular = [link for link in pdf_links if link.text.lower() == "regular size version"]
        exam = regular or [
            link for link in pdf_links
            if link.text.lower().startswith("regents examination in ")
        ]
        if len(exam) != 1:
            raise ImportFailure(f"{course} {month} {year}: expected one exam PDF; found {exam}")
        key = [link for link in pdf_links if "scoring key" in link.text.lower()]
        if not key:
            key = [link for link in pdf_links if re.search(r"-sk\.pdf$", link.href, re.I)]
        if len(key) != 1:
            raise ImportFailure(f"{course} {month} {year}: expected one scoring key PDF; found {key}")
        exam_url = urllib.parse.urljoin(archive_url, exam[0].href)
        key_url = urllib.parse.urljoin(archive_url, key[0].href)
        if not all(url.startswith("https://www.nysedregents.org/") for url in (exam_url, key_url)):
            raise ImportFailure(f"Non-NYSED source URL for {course} {month} {year}")
        administrations.append(Administration(course, year, month, exam_url, key_url, archive_url))
    deduplicated = {(item.year, item.month): item for item in administrations}
    if len(deduplicated) != len(administrations):
        raise ImportFailure(f"Duplicate administration in {course} archive")
    if len(administrations) != EXPECTED_ADMINISTRATIONS[course]:
        raise ImportFailure(
            f"{course}: expected {EXPECTED_ADMINISTRATIONS[course]} administrations, "
            f"found {len(administrations)}"
        )
    return sorted(administrations, key=lambda item: (-item.year, -MONTH_ORDER[item.month]))


def read_key(pdf_path: Path, course: str, year: int, month: str) -> dict[int, str]:
    excluded = {
        number for (excluded_course, excluded_year, excluded_month, number) in EXCLUDED_QUESTIONS
        if (excluded_course, excluded_year, excluded_month) == (course, year, month)
    }
    required = set(range(1, QUESTION_COUNT + 1)) - excluded
    with pdfplumber.open(pdf_path) as pdf:
        text = "\n".join((page.extract_text(layout=False) or "") for page in pdf.pages[:3])
    modern: dict[int, str] = {}
    for match in KEY_ROW_RE.finditer(text):
        number, answer = int(match.group(1)), match.group(2)
        if number in modern and modern[number] != answer:
            raise ImportFailure(f"Conflicting key for {course} {year} {month} q{number}")
        modern[number] = answer
    if set(modern) == required or set(modern) == set(range(1, QUESTION_COUNT + 1)):
        return modern
    legacy: dict[int, str] = {}
    for match in OLD_KEY_RE.finditer(text):
        number, answer = int(match.group(1)), match.group(2)
        if number <= QUESTION_COUNT:
            if number in legacy and legacy[number] != answer:
                raise ImportFailure(f"Conflicting key for {course} {year} {month} q{number}")
            legacy[number] = answer
    if set(legacy) == required or set(legacy) == set(range(1, QUESTION_COUNT + 1)):
        return legacy
    raise ImportFailure(
        f"Incomplete {course} {year} {month} scoring key: "
        f"modern={sorted(modern)} legacy={sorted(legacy)} in {pdf_path}"
    )


def standards_era(course: str, year: int, month: str) -> str:
    first_year, first_month = ERA_FIRST_YEAR_MONTH[course]
    return "NGLS" if (year, MONTH_ORDER[month]) >= (first_year, MONTH_ORDER[first_month]) else "CCLS"


def find_question_markers(pdf: pdfplumber.PDF, item: Administration) -> dict[int, QuestionMarker]:
    candidates: dict[int, list[QuestionMarker]] = {number: [] for number in range(1, QUESTION_COUNT + 1)}
    for page_index, page in enumerate(pdf.pages):
        page_text = page.extract_text() or ""
        if page_index and any(line.strip() == "Part II" for line in page_text.splitlines()):
            break
        # Regents question numerals are unparenthesized in the left question
        # gutter. Answer choices are parenthesized and farther to the right.
        for word in page.extract_words(x_tolerance=2, y_tolerance=2):
            token = str(word["text"]).strip()
            if not token.isascii() or not token.isdigit():
                continue
            number = int(token)
            x0, top = float(word["x0"]), float(word["top"])
            if number in candidates and 38 <= x0 <= 60 and 40 <= top <= float(page.height) - 55:
                candidates[number].append(QuestionMarker(number, page_index, top, x0))
    problems = {number: markers for number, markers in candidates.items() if not markers}
    if problems:
        detail = ", ".join(
            f"q{number}={[(marker.page_index + 1, round(marker.top, 1), round(marker.x0, 1)) for marker in markers]}"
            for number, markers in problems.items()
        )
        raise ImportFailure(f"Cannot identify all question starts in {item.slug}: {detail}")
    # A few graphs include bare numerals within the question gutter. Choose
    # the lowest-cost strictly increasing sequence of 1–24 markers, preferring
    # the conventional gutter position (49 pt for 1–9; 43 pt for 10–24).
    paths: list[tuple[float, list[QuestionMarker]]] = [(0.0, [])]
    for number in range(1, QUESTION_COUNT + 1):
        next_paths: list[tuple[float, list[QuestionMarker]]] = []
        expected_x = 49.0 if number < 10 else 43.0
        for marker in candidates[number]:
            position = (marker.page_index, marker.top)
            predecessors = [
                (cost, path) for cost, path in paths
                if not path or (path[-1].page_index, path[-1].top) < position
            ]
            if predecessors:
                cost, path = min(predecessors, key=lambda entry: entry[0])
                next_paths.append((cost + abs(marker.x0 - expected_x), [*path, marker]))
        if not next_paths:
            raise ImportFailure(f"Cannot establish ordered question starts in {item.slug} at q{number}")
        paths = next_paths
    return {marker.number: marker for marker in min(paths, key=lambda entry: entry[0])[1]}


def image_crop_box(
    page: pdfplumber.page.Page,
    marker: QuestionMarker,
    next_marker: QuestionMarker | None,
) -> tuple[float, float, float, float]:
    top = max(0.0, marker.top - 8.0)
    if next_marker and next_marker.page_index == marker.page_index:
        bottom = next_marker.top - 12.0
    else:
        # Printed page numbers/copyright footers begin in the bottom margin.
        bottom = float(page.height) - 60.0
        # Part II can begin on the same page as q24 in a short form.
        words = page.extract_words()
        part_ii = [
            float(word["top"]) for word in words
            if str(word["text"]).lower().strip() == "ii"
            and 50 <= float(word["x0"]) <= float(page.width) - 50
            and float(word["top"]) > marker.top + 20
            and any(
                str(previous["text"]).lower().strip() == "part"
                and abs(float(previous["top"]) - float(word["top"])) <= 3
                and 0 <= float(word["x0"]) - float(previous["x1"]) <= 18
                for previous in words
            )
        ]
        if part_ii:
            bottom = min(bottom, min(part_ii) - 18.0)
    if bottom <= top + 20:
        raise ImportFailure(f"Invalid crop boundaries for q{marker.number}")
    return (max(35.0, marker.x0 - 9.0), top, float(page.width) - 42.0, bottom)


def render_question_images(
    pdf: pdfplumber.PDF,
    item: Administration,
    markers: dict[int, QuestionMarker],
    *,
    exam_path: Path,
    asset_root: Path,
    reuse_existing: bool,
) -> dict[int, dict]:
    target_dir = asset_root / item.course / str(item.year) / item.month
    target_dir.mkdir(parents=True, exist_ok=True)
    result: dict[int, dict] = {}
    current_page_index = -1
    page_image: Image.Image | None = None
    for number in range(1, QUESTION_COUNT + 1):
        if (item.course, item.year, item.month, number) in EXCLUDED_QUESTIONS:
            continue
        path = target_dir / f"q{number:02d}.webp"
        if reuse_existing:
            if not path.is_file():
                raise ImportFailure(f"Missing existing crop for {item.slug} q{number}")
            with Image.open(path) as prior:
                width, height = prior.size
            result[number] = {
                "src": f"{BASE_PATH}/nysed/regents/math/{item.course}/{item.year}/{item.month}/q{number:02d}.webp",
                "width": width,
                "height": height,
                "alt": f"Official {COURSE_LABELS[item.course]} {item.month.title()} {item.year} question {number}; text review pending.",
            }
            continue
        marker = markers[number]
        page = pdf.pages[marker.page_index]
        if current_page_index != marker.page_index:
            current_page_index = marker.page_index
            rendered = subprocess.run(
                [
                    "pdftoppm", "-f", str(marker.page_index + 1),
                    "-l", str(marker.page_index + 1),
                    "-r", str(IMAGE_DPI), "-singlefile", "-png", str(exam_path),
                ],
                capture_output=True,
                check=False,
            )
            if rendered.returncode or not rendered.stdout:
                raise ImportFailure(
                    f"Could not render {item.slug} PDF page {marker.page_index + 1}: "
                    f"{rendered.stderr.decode('utf-8', 'replace').strip()}"
                )
            page_image = Image.open(io.BytesIO(rendered.stdout)).convert("RGB")
        assert page_image is not None
        next_marker = markers.get(number + 1)
        x0, top, x1, bottom = image_crop_box(page, marker, next_marker)
        if item.slug == "algebra-ii-2017-august":
            # Q23's displayed rational expression begins above its printed
            # question number. Keep it with Q23, not in Q22's crop.
            if number == 22 and next_marker is not None:
                bottom = min(bottom, next_marker.top - 35.0)
            elif number == 23:
                top = max(0.0, marker.top - 35.0)
        if item.slug == "algebra-ii-2017-january":
            # Q7's negative one-half exponent rises above its printed number.
            # Keep the sign and numerator with Q7, not at the foot of Q6.
            if number == 6 and next_marker is not None:
                bottom = min(bottom, next_marker.top - 35.0)
            elif number == 7:
                top = max(0.0, marker.top - 35.0)
        scale = IMAGE_DPI / 72.0
        pixels = (
            max(0, round(x0 * scale)),
            max(0, round(top * scale)),
            min(page_image.width, round(x1 * scale)),
            min(page_image.height, round(bottom * scale)),
        )
        crop = page_image.crop(pixels).convert("RGB")
        if next_marker is None or next_marker.page_index != marker.page_index:
            # The final item on a page often leaves hundreds of blank pixels.
            # Trim to the bottommost non-white content after excluding the
            # printed footer, preserving a small breathing margin below it.
            ink_box = crop.convert("L").point(lambda value: 255 if value < 245 else 0).getbbox()
            if ink_box:
                crop = crop.crop((0, 0, crop.width, min(crop.height, ink_box[3] + 24)))
        if crop.width < 120 or crop.height < 40:
            raise ImportFailure(f"Implausibly small question crop for {item.slug} q{number}")
        crop.save(path, "WEBP", quality=IMAGE_QUALITY, method=6)
        result[number] = {
            "src": f"{BASE_PATH}/nysed/regents/math/{item.course}/{item.year}/{item.month}/q{number:02d}.webp",
            "width": crop.width,
            "height": crop.height,
            "alt": f"Official {COURSE_LABELS[item.course]} {item.month.title()} {item.year} question {number}; text review pending.",
        }
    return result


def validate_image_alt(image_alt: str) -> None:
    # Catch explicit answer judgments, not ordinary diagram/choice descriptions.
    # This is a backstop, not a substitute for reviewing derived-value hints.
    if re.search(
        r"\b(?:incorrect(?:ly)?|unjustified)\b|(?<![\w-])only choices?\b|"
        r"\b(?:keyed|correct) (?:answer|choice)\b",
        image_alt, re.I,
    ):
        raise ImportFailure("Image description reveals answer reasoning")


def apply_review_overlay(exam: dict, *, reviews_root: Path) -> None:
    path = reviews_root / f"{exam['slug']}.json"
    if not path.is_file():
        return
    overlay = json.loads(path.read_text(encoding="utf-8"))
    if overlay.get("sourceSha256") != exam["sourceSha256"]:
        raise ImportFailure(f"Source PDF changed since review: {path}")
    reviewed = overlay.get("questions")
    if not isinstance(reviewed, dict):
        raise ImportFailure(f"Invalid question review overlay: {path}")
    by_number = {question["number"]: question for question in exam["questions"]}
    for raw_number, content in reviewed.items():
        if not str(raw_number).isdigit() or int(raw_number) not in by_number:
            raise ImportFailure(f"Unknown question {raw_number} in {path}")
        if not isinstance(content, dict):
            raise ImportFailure(f"Invalid question {raw_number} in {path}")
        prompt = content.get("prompt")
        choices = content.get("choices")
        explanation = content.get("explanation")
        image_alt = content.get("imageAlt")
        if (
            not isinstance(prompt, str) or len(prompt.strip()) < 15
            or not isinstance(choices, list) or len(choices) != 4
            or not all(isinstance(choice, str) and choice.strip() for choice in choices)
            or not isinstance(explanation, str) or len(explanation.strip()) < 40
            or not isinstance(image_alt, str) or len(image_alt.strip()) < 15
        ):
            raise ImportFailure(f"Incomplete review for question {raw_number} in {path}")
        question = by_number[int(raw_number)]
        validate_image_alt(image_alt)
        question["prompt"] = prompt.strip()
        question["choices"] = [
            {"label": str(index), "text": choice.strip()}
            for index, choice in enumerate(choices, start=1)
        ]
        question["explanation"] = explanation.strip()
        question["explanationSource"] = "vine-authored"
        question["readiness"] = "reviewed"
        if "image" in question:
            question["image"]["alt"] = image_alt.strip()


def process_administration(
    item: Administration,
    *,
    offline: bool,
    cache_root: Path,
    asset_root: Path,
    reviews_root: Path,
    render_images: bool,
    reuse_images: bool,
    previous_source_hashes: dict[str, str],
) -> dict:
    exam_path = cache_root / "exams" / f"{item.slug}.pdf"
    key_path = cache_root / "keys" / f"{item.slug}.pdf"
    exam_bytes = fetch(item.exam_url, exam_path, offline=offline)
    source_sha256 = hashlib.sha256(exam_bytes).hexdigest()
    if reuse_images and previous_source_hashes.get(item.slug) != source_sha256:
        raise ImportFailure(f"Cannot reuse crops after source PDF changed: {item.slug}")
    fetch(item.key_url, key_path, offline=offline)
    key = read_key(key_path, item.course, item.year, item.month)
    with pdfplumber.open(exam_path) as pdf:
        markers = find_question_markers(pdf, item)
        images = render_question_images(
            pdf, item, markers, exam_path=exam_path, asset_root=asset_root,
            reuse_existing=reuse_images,
        ) if render_images else {}
    questions = []
    for number in range(1, QUESTION_COUNT + 1):
        excluded_reason = EXCLUDED_QUESTIONS.get((item.course, item.year, item.month, number))
        if excluded_reason:
            continue
        questions.append({
            "id": f"{item.slug}-q{number:02d}",
            "number": number,
            "sectionSlug": f"part-i-{(number - 1) // 8 + 1}",
            "prompt": "",
            "choices": [{"label": str(choice), "text": ""} for choice in range(1, 5)],
            "correct": key[number],
            "explanation": "",
            "explanationSource": "pending-review",
            "sourcePage": markers[number].page_index + 1,
            "readiness": "needs-review",
            **({"image": images[number]} if render_images else {}),
        })
    title = f"{COURSE_LABELS[item.course]} — {item.month.title()} {item.year}"
    exam = {
        "id": item.slug,
        "slug": item.slug,
        "course": item.course,
        "year": item.year,
        "administration": item.month,
        "standardsEra": standards_era(item.course, item.year, item.month),
        "sourceUrl": item.exam_url,
        "answerKeyUrl": item.key_url,
        "sourceIndexUrl": item.archive_url,
        "sourceSha256": source_sha256,
        "accessedAt": ACCESSED_AT,
        "sections": [
            {
                "slug": f"part-i-{block + 1}",
                "title": f"Part I · Questions {block * 8 + 1}–{block * 8 + 8}",
                "intro": f"Practice eight released multiple-choice questions from {title}.",
                "questionIds": [
                    question["id"] for question in questions
                    if block * 8 + 1 <= question["number"] <= block * 8 + 8
                ],
            }
            for block in range(3)
        ],
        "questions": questions,
        **({
            "excludedQuestions": [
                {"number": number, "reason": reason}
                for (course, year, month, number), reason in sorted(EXCLUDED_QUESTIONS.items())
                if (course, year, month) == (item.course, item.year, item.month)
            ],
        } if (item.course, item.year, item.month) == ("geometry", 2017, "june") else {}),
    }
    apply_review_overlay(exam, reviews_root=reviews_root)
    return exam


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--offline", action="store_true", help="Use cached NYSED PDFs and index pages")
    parser.add_argument("--jobs", type=int, default=4)
    parser.add_argument("--list", action="store_true", help="Only discover and print archive administrations")
    parser.add_argument("--cache-root", type=Path, default=CACHE_ROOT)
    parser.add_argument("--output-json", type=Path, default=OUTPUT_JSON)
    parser.add_argument("--asset-root", type=Path, default=ASSET_ROOT)
    parser.add_argument("--reviews-root", type=Path, default=REVIEWS_ROOT)
    parser.add_argument("--only-exam", help="Process one administration slug, for targeted crop repair or review")
    parser.add_argument("--no-images", action="store_true", help="Validate key and marker inventory only")
    parser.add_argument("--reuse-images", action="store_true", help="Rebuild catalog using existing crops only when exam PDF hashes match")
    args = parser.parse_args()
    if args.no_images and args.reuse_images:
        parser.error("--no-images and --reuse-images cannot be combined")
    previous_source_hashes = {}
    if args.reuse_images:
        if not args.output_json.is_file():
            raise ImportFailure(f"Cannot reuse images without existing catalog: {args.output_json}")
        previous = json.loads(args.output_json.read_text(encoding="utf-8"))
        previous_source_hashes = {exam["slug"]: exam["sourceSha256"] for exam in previous}
    administrations = [
        item for course in ARCHIVES
        for item in discover_archive(course, offline=args.offline, cache_root=args.cache_root)
    ]
    if len(administrations) != 88:
        raise ImportFailure(f"Expected 88 Math Regents administrations, found {len(administrations)}")
    if args.only_exam:
        administrations = [item for item in administrations if item.slug == args.only_exam]
        if not administrations:
            raise ImportFailure(f"Unknown Math Regents administration: {args.only_exam}")
    if args.list:
        for item in administrations:
            print(item.slug, item.exam_url, item.key_url)
        return 0
    with concurrent.futures.ThreadPoolExecutor(max_workers=args.jobs) as executor:
        exams = list(executor.map(
            lambda item: process_administration(
                item,
                offline=args.offline,
                cache_root=args.cache_root,
                asset_root=args.asset_root,
                reviews_root=args.reviews_root,
                render_images=not args.no_images,
                reuse_images=args.reuse_images,
                previous_source_hashes=previous_source_hashes,
            ),
            administrations,
        ))
    exams.sort(key=lambda exam: (exam["course"], -exam["year"], -MONTH_ORDER[exam["administration"]]))
    total_questions = sum(
        QUESTION_COUNT - sum(
            (item.course, item.year, item.month, number) in EXCLUDED_QUESTIONS
            for number in range(1, QUESTION_COUNT + 1)
        )
        for item in administrations
    )
    if len(exams) != len(administrations) or sum(len(exam["questions"]) for exam in exams) != total_questions:
        raise ImportFailure("Generated catalog has unexpected exam/question count")
    if args.no_images:
        print(f"Validated {len(exams)} exams and {total_questions} source/key records; catalog unchanged")
        return 0
    args.output_json.parent.mkdir(parents=True, exist_ok=True)
    args.output_json.write_text(json.dumps(exams, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {len(exams)} exams, {total_questions} source/key records to {args.output_json}")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except ImportFailure as error:
        print(f"Import failed: {error}", file=sys.stderr)
        raise SystemExit(1)

#!/usr/bin/env python3
"""Build the app's NYSED released-math multiple-choice catalog.

The importer deliberately discovers every PDF from NYSED's two index pages. It
does not construct or guess release URLs. PDFs are cached below ``tmp/pdfs``;
question-only WebP crops and a compact JSON catalog are deterministic outputs.

Typical full run (from the repository root)::

    python scripts/import_nysed_math_mc.py --jobs 4 --contact-sheets

Useful development runs::

    python scripts/import_nysed_math_mc.py --list
    python scripts/import_nysed_math_mc.py --year 2021 --grade 3 \
      --asset-root tmp/pdfs/nysed-sample/assets \
      --output-json tmp/pdfs/nysed-sample/catalog.json

Runtime dependencies are intentionally small: pdfplumber, Pillow, and NumPy.
Tesseract is used only when a released PDF stores question numbers as images
(notably 2016 and occasional later pages).
"""

from __future__ import annotations

import argparse
import calendar
import dataclasses
import datetime as dt
import hashlib
import html.parser
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import textwrap
import threading
import unicodedata
import urllib.error
import urllib.parse
import urllib.request
from collections import defaultdict
from concurrent.futures import Future, ThreadPoolExecutor
from pathlib import Path
from typing import Any, Iterable, Iterator, Literal, Mapping, Sequence

import numpy as np
import pdfplumber
from PIL import Image, ImageDraw, ImageFont, ImageOps, ImageStat

try:
    from scripts.nysed_math_accessibility import (
        DEFAULT_MATH_ACCESSIBILITY_ROOT,
        MathAccessibilityError,
        load_math_exam_accessibility,
        math_accessibility_input_hash,
    )
except ModuleNotFoundError:  # pragma: no cover - permits direct script execution.
    from nysed_math_accessibility import (  # type: ignore[no-redef]
        DEFAULT_MATH_ACCESSIBILITY_ROOT,
        MathAccessibilityError,
        load_math_exam_accessibility,
        math_accessibility_input_hash,
    )

try:
    from scripts.nysed_math_explanations import (
        DEFAULT_MATH_OFFICIAL_RATIONALE_OVERRIDES,
        DEFAULT_MATH_EXPLANATIONS_ROOT,
        MathExplanationError,
        MathQuestionExplanationInput,
        OFFICIAL_RATIONALE_SEMANTIC_CORRECTION_IDS,
        extract_official_math_rationale,
        load_official_math_rationale_overrides,
        load_math_exam_explanations,
        math_question_explanation_input_hash,
        resolve_official_math_rationale,
        validate_math_question_explanation,
    )
except ModuleNotFoundError:  # pragma: no cover - permits direct script execution.
    from nysed_math_explanations import (  # type: ignore[no-redef]
        DEFAULT_MATH_OFFICIAL_RATIONALE_OVERRIDES,
        DEFAULT_MATH_EXPLANATIONS_ROOT,
        MathExplanationError,
        MathQuestionExplanationInput,
        OFFICIAL_RATIONALE_SEMANTIC_CORRECTION_IDS,
        extract_official_math_rationale,
        load_official_math_rationale_overrides,
        load_math_exam_explanations,
        math_question_explanation_input_hash,
        resolve_official_math_rationale,
        validate_math_question_explanation,
    )


REPO_ROOT = Path(__file__).resolve().parents[1]
MAIN_INDEX_URL = "https://www.nysedregents.org/ei/ei-math.html"
SPANISH_INDEX_URL = "https://www.nysedregents.org/ei/spanish-math-tests.html"
DEFAULT_CACHE_ROOT = REPO_ROOT / "tmp" / "pdfs" / "nysed-math-import"
DEFAULT_ASSET_ROOT = REPO_ROOT / "public" / "nysed" / "math"
DEFAULT_OUTPUT_JSON = REPO_ROOT / "content" / "math-exams" / "generated" / "catalog.json"
APP_PUBLIC_PREFIX = "/vine-app/nysed/math"
YEARS = (2013, 2014, 2015, 2016, 2017, 2018, 2019, 2021, 2022, 2023, 2024, 2025, 2026)
GRADES = (3, 4, 5, 6, 7, 8)
CHOICES = ("A", "B", "C", "D")
VERIFIED_CHOICE_LABEL_VARIANTS: dict[str, dict[str, Any]] = {
    # The official 2016 Grade 4 q24 crop genuinely contains only figures A-C.
    # Keep the exception tied to both the reviewed source PDF and exact crop so
    # a changed release or render fails closed and requires a fresh audit.
    "nysed-2016-g4-mc-q24": {
        "year": 2016,
        "grade": 4,
        "number": 24,
        "sourcePdfSha256": "3d7f1449506b430ef2c8fdacddc2db38fd03a568bbab4cac1c5d5b22affd3455",
        "questionImageSha256": "185985912b8e9d3bf333598892d6efe3e6392d7202e683745534d4f551ade225",
        "choiceLabels": ("A", "B", "C"),
    },
}
SUPPORTED_DOMAINS = frozenset(("OA", "NBT", "NF", "MD", "G", "RP", "NS", "EE", "F", "SP"))
SCRIPT_VERSION = "14"
OCR_CACHE_VERSION = "12"
IMPORT_ACCESSED_AT = "2026-07-15"
EXPECTED_MC_COUNTS: dict[int, tuple[int, int, int, int, int, int]] = {
    2013: (10, 11, 11, 12, 12, 12),
    2014: (25, 24, 24, 30, 30, 27),
    2015: (24, 21, 24, 28, 28, 23),
    2016: (26, 26, 26, 31, 31, 31),
    2017: (31, 32, 32, 37, 38, 38),
    2018: (19, 24, 22, 22, 26, 27),
    2019: (19, 24, 22, 22, 26, 26),
    2021: (19, 23, 23, 24, 26, 26),
    2022: (19, 22, 22, 22, 23, 23),
    2023: (16, 19, 19, 19, 21, 21),
    2024: (16, 19, 19, 19, 21, 21),
    2025: (16, 19, 19, 19, 21, 21),
    2026: (27, 31, 31, 31, 34, 34),
}
EXPECTED_GRAND_TOTAL = 1839
EXPECTED_OFFICIAL_EXPLANATION_TOTAL = 223
EXPECTED_OFFICIAL_CORRECTED_EXPLANATION_TOTAL = 5
EXPECTED_VINE_EXPLANATION_TOTAL = 1611
EXPECTED_REVIEWED_ACCESSIBILITY_QUESTION_TOTAL = 1_839
EXPECTED_REVIEWED_ACCESSIBILITY_LOCALIZATION_TOTAL = 3_131
EXPECTED_GRADE_5_8_ACCESSIBILITY_QUESTION_TOTAL = 1_277
EXPECTED_GRADE_5_8_ACCESSIBILITY_LOCALIZATION_TOTAL = 2_174
DEFAULT_MARKER_RETRY_DPI = 240
SPANISH_YEARS = frozenset((2017, 2018, 2019, 2021, 2022, 2023, 2024, 2025, 2026))
EXPECTED_SPANISH_TOTAL = 1292

# The current NYSED HTML accidentally points 2013 Grade 8 at the 2014 Grade 3
# map. This correction is verified against NYSED's own adjacent, grade-specific
# naming series and the live official PDF. It is the sole non-href source URL.
VERIFIED_INDEX_CORRECTIONS = {
    (2013, 8): "https://www.nysedregents.org/ei/math/2013/ccmath8imrev.pdf",
}
_TESSERACT_VERSION_CACHE: dict[str, str] = {}
_TESSERACT_LANGUAGES_CACHE: dict[str, frozenset[str]] = {}
PDF_RENDER_LOCK = threading.Lock()

# Full standards as printed in the item maps. NGLS maps use both ``3.OA.1``
# and ``NY-3.OA.1`` styles, while CCSS maps include a cluster letter.
STANDARD_RE = re.compile(
    r"(?:CCSS|NGLS)\.Math\.Content\.(?:NY-)?[3-8]\."
    r"[A-Z]{1,3}\.(?:[A-Z]\.?)?\d+[a-z]?",
)
STRICT_STANDARD_RE = re.compile(
    r"(?:CCSS\.Math\.Content\.[3-8]\.[A-Z]{1,3}\.(?:[A-Z]\.)?\d+[a-z]?|"
    r"NGLS\.Math\.Content\.(?:NY-)?[3-8]\.[A-Z]{1,3}\.(?:[A-Z]\.)?\d+[a-z]?)"
)
LOOSE_STANDARD_RE = re.compile(
    r"\b(CCSS|NGLS)\s*\.?\s*Math\s*\.?\s*Content\s*\.?\s*"
    r"((?:NY-)?[3-8])\s*\.?\s*([A-Z]{1,3})\s*\.?\s*"
    r"(?:([A-Z])\s*\.?\s*)?(\d+)(?:\s*\.?\s*([a-z]))?",
)
YEAR_RE = re.compile(r"\b(20(?:1[3-9]|2[1-6]))\b")
GRADE_RE = re.compile(r"\bGrade\s*([3-8])\b", re.IGNORECASE)
ITEM_CODE_RE = re.compile(r"(?m)^\s*(\d{8,12})_([1-4])\s*$")
LEAK_RE = re.compile(
    r"(?:\b(?:Key|Clave)\s*:\s*[A-D]\b|\bAnswer\s+Key\s*:|"
    r"\bScoring\s+Rubric\b|\bSample(?:\s+Student)?\s+Responses?\b|"
    r"\bRúbrica\s+de\s+puntuación\b|\bRespuesta\s+de\s+muestra\b|"
    r"\b(?:Primary|Aligned)\s+CCLS|"
    r"\bMeasured(?:\s+CCLS)?\s*:?\s*(?:NY-)?[3-8]\.|"
    r"\bMap\s+to\s+the\s+Standards)",
    re.IGNORECASE,
)


class ImportFailure(RuntimeError):
    """A source or assertion failure that should stop catalog generation."""


@dataclasses.dataclass(frozen=True)
class Link:
    href: str
    text: str


@dataclasses.dataclass
class ListNode:
    parent: "ListNode | None"
    text_parts: list[str] = dataclasses.field(default_factory=list)
    links: list[Link] = dataclasses.field(default_factory=list)
    children: list["ListNode"] = dataclasses.field(default_factory=list)

    @property
    def direct_text(self) -> str:
        return " ".join(" ".join(self.text_parts).split())


class _ListPageParser(html.parser.HTMLParser):
    """The NYSED pages are old, irregular HTML; only their list tree matters."""

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.root = ListNode(None)
        self.stack: list[ListNode] = [self.root]
        self.anchor_href: str | None = None
        self.anchor_parts: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        attrs_dict = dict(attrs)
        if tag.lower() == "li":
            node = ListNode(self.stack[-1])
            self.stack[-1].children.append(node)
            self.stack.append(node)
        elif tag.lower() == "a":
            self.anchor_href = attrs_dict.get("href")
            self.anchor_parts = []

    def handle_endtag(self, tag: str) -> None:
        if tag.lower() == "a" and self.anchor_href is not None:
            self.stack[-1].links.append(
                Link(self.anchor_href.strip(), " ".join(" ".join(self.anchor_parts).split()))
            )
            self.anchor_href = None
            self.anchor_parts = []
        elif tag.lower() == "li" and len(self.stack) > 1:
            self.stack.pop()

    def handle_data(self, data: str) -> None:
        if self.anchor_href is not None:
            self.anchor_parts.append(data)
        elif data.strip():
            self.stack[-1].text_parts.append(data)


@dataclasses.dataclass(frozen=True)
class SourceDocument:
    year: int
    grade: int
    language: Literal["en", "es"]
    release_url: str
    item_map_url: str | None = None
    item_map_link_mismatch: bool = False


@dataclasses.dataclass(frozen=True)
class MapItem:
    number: int
    session: int | None
    key: str | None
    primary_standard: str
    secondary_standards: tuple[str, ...]


@dataclasses.dataclass(frozen=True)
class AnnotatedItem:
    item_code: str
    source_page: int
    key: str
    raw_standard: str
    crop_box: tuple[float, float, float, float]
    official_rationale: str | None


@dataclasses.dataclass(frozen=True)
class Marker:
    number: int
    page_index: int
    top: float
    x0: float
    score: float
    method: str


@dataclasses.dataclass(frozen=True)
class CropResult:
    src: str
    width: int
    height: int


def log(message: str) -> None:
    print(message, file=sys.stderr, flush=True)


def tesseract_version(binary: str | None) -> str:
    if not binary:
        return "unavailable"
    if binary not in _TESSERACT_VERSION_CACHE:
        result = subprocess.run(
            [binary, "--version"],
            check=False,
            capture_output=True,
            text=True,
        )
        first_line = (result.stdout or result.stderr).splitlines()
        _TESSERACT_VERSION_CACHE[binary] = first_line[0] if first_line else "unknown"
    return _TESSERACT_VERSION_CACHE[binary]


def tesseract_languages(binary: str | None) -> frozenset[str]:
    if not binary:
        return frozenset()
    if binary not in _TESSERACT_LANGUAGES_CACHE:
        result = subprocess.run(
            [binary, "--list-langs"],
            check=False,
            capture_output=True,
            text=True,
        )
        _TESSERACT_LANGUAGES_CACHE[binary] = frozenset(
            line.strip() for line in result.stdout.splitlines()[1:] if line.strip()
        )
    return _TESSERACT_LANGUAGES_CACHE[binary]


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def unique_temp_path(directory: Path, prefix: str, suffix: str) -> Path:
    directory.mkdir(parents=True, exist_ok=True)
    descriptor, name = tempfile.mkstemp(dir=directory, prefix=prefix, suffix=suffix)
    os.close(descriptor)
    return Path(name)


def atomic_write_bytes(path: Path, data: bytes) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = unique_temp_path(path.parent, f".{path.name}.", ".tmp")
    try:
        temporary.write_bytes(data)
        temporary.replace(path)
    finally:
        temporary.unlink(missing_ok=True)


def atomic_write_json(path: Path, value: Any) -> None:
    encoded = (json.dumps(value, ensure_ascii=False, indent=2) + "\n").encode("utf-8")
    atomic_write_bytes(path, encoded)


def download(url: str, destination: Path, *, offline: bool, force: bool) -> Path:
    if destination.exists() and not force:
        return destination
    if offline:
        raise ImportFailure(f"Offline mode: missing cached source {destination} ({url})")
    destination.parent.mkdir(parents=True, exist_ok=True)
    request = urllib.request.Request(
        url,
        headers={
            "User-Agent": "vine-app educational NYSED released-items importer/1.0",
            "Accept": "application/pdf,text/html,*/*",
        },
    )
    temporary = unique_temp_path(destination.parent, f".{destination.name}.", ".part")
    log(f"Downloading {url}")
    try:
        with urllib.request.urlopen(request, timeout=90) as response, temporary.open("wb") as output:
            while chunk := response.read(1024 * 1024):
                output.write(chunk)
    except (OSError, urllib.error.URLError) as exc:
        temporary.unlink(missing_ok=True)
        raise ImportFailure(f"Could not download {url}: {exc}") from exc
    if temporary.stat().st_size < 1000:
        temporary.unlink(missing_ok=True)
        raise ImportFailure(f"Downloaded source is unexpectedly small: {url}")
    temporary.replace(destination)
    return destination


def load_index(
    url: str,
    cache_root: Path,
    *,
    offline: bool,
    force: bool,
) -> tuple[str, Path]:
    filename = Path(urllib.parse.urlparse(url).path).name
    cached = cache_root / "indexes" / filename
    path = download(url, cached, offline=offline, force=force)
    return path.read_text(encoding="utf-8", errors="replace"), path


def walk_list_nodes(root: ListNode) -> Iterator[ListNode]:
    for child in root.children:
        yield child
        yield from walk_list_nodes(child)


def context_value(node: ListNode, pattern: re.Pattern[str]) -> str | None:
    current: ListNode | None = node
    while current is not None:
        match = pattern.search(current.direct_text)
        if match:
            return match.group(1)
        current = current.parent
    return None


def href_year_grade(href: str) -> tuple[int | None, int | None]:
    year_match = YEAR_RE.search(href)
    grade_match = re.search(r"(?:^|[-_/])g(?:rade[-_]?)?([3-8])(?:\D|$)", href, re.I)
    if not grade_match:
        grade_match = re.search(r"grade[-_ ]?([3-8])", href, re.I)
    return (
        int(year_match.group(1)) if year_match else None,
        int(grade_match.group(1)) if grade_match else None,
    )


def parse_index_documents(html_text: str, base_url: str, language: Literal["en", "es"]) -> dict[tuple[int, int], SourceDocument]:
    parser = _ListPageParser()
    parser.feed(html_text)
    releases: dict[tuple[int, int], str] = {}
    maps: dict[tuple[int, int], tuple[str, bool]] = {}

    for node in walk_list_nodes(parser.root):
        context_year = context_value(node, YEAR_RE)
        context_grade = context_value(node, GRADE_RE)
        for link in node.links:
            href_lower = link.href.lower()
            text_lower = link.text.lower()
            if not href_lower.endswith(".pdf"):
                continue
            href_year, href_grade = href_year_grade(link.href)
            year = int(context_year) if context_year else href_year
            grade_match = GRADE_RE.search(link.text)
            grade = int(context_grade) if context_grade else (
                int(grade_match.group(1)) if grade_match else href_grade
            )
            if year not in YEARS or grade not in GRADES:
                continue
            absolute = urllib.parse.urljoin(base_url, link.href)

            is_map = "item map" in text_lower or bool(re.search(r"ccmath\d+im", href_lower))
            is_release = (
                "released test question" in text_lower
                or "released question" in text_lower
                or "released-items" in href_lower
                or "release-items" in href_lower
                or "sample-annotated-items" in href_lower
            ) and "scoring" not in href_lower

            if language == "es" and is_release:
                # The Spanish index includes guidance and scoring documents too;
                # its release hrefs still carry one of the explicit release names.
                is_release = any(
                    marker in href_lower
                    for marker in ("released-items", "release-items", "sample-annotated-items")
                )

            key = (year, grade)
            if is_map and language == "en":
                mismatch = (href_year is not None and href_year != year) or (
                    href_grade is not None and href_grade != grade
                )
                if key in maps and maps[key][0] != absolute:
                    raise ImportFailure(f"Multiple NYSED item-map links discovered for {year} grade {grade}")
                maps[key] = (absolute, mismatch)
            elif is_release:
                if href_year is not None and href_year != year:
                    raise ImportFailure(f"Release link year mismatch for {year} grade {grade}: {absolute}")
                if href_grade is not None and href_grade != grade:
                    raise ImportFailure(f"Release link grade mismatch for {year} grade {grade}: {absolute}")
                if key in releases and releases[key] != absolute:
                    raise ImportFailure(f"Multiple NYSED release links discovered for {year} grade {grade}")
                releases[key] = absolute

    documents: dict[tuple[int, int], SourceDocument] = {}
    for (year, grade), release_url in releases.items():
        map_data = maps.get((year, grade))
        correction = VERIFIED_INDEX_CORRECTIONS.get((year, grade)) if language == "en" else None
        documents[(year, grade)] = SourceDocument(
            year=year,
            grade=grade,
            language=language,
            release_url=release_url,
            item_map_url=correction or (map_data[0] if map_data else None),
            item_map_link_mismatch=False if correction else (map_data[1] if map_data else False),
        )
    return documents


def pdf_cache_path(cache_root: Path, source: SourceDocument, kind: str, url: str) -> Path:
    fingerprint = hashlib.sha256(url.encode("utf-8")).hexdigest()[:12]
    return cache_root / "pdfs" / f"{source.year}-g{source.grade}-{source.language}-{kind}-{fingerprint}.pdf"


def get_pdf(
    source: SourceDocument,
    cache_root: Path,
    *,
    kind: Literal["release", "map"],
    offline: bool,
    force: bool,
    identity_page_limit: int | None = 6,
) -> Path:
    url = source.release_url if kind == "release" else source.item_map_url
    if not url:
        raise ImportFailure(f"No {kind} URL for {source.year} grade {source.grade}")
    path = download(url, pdf_cache_path(cache_root, source, kind, url), offline=offline, force=force)
    if path.stat().st_size < 20_000 or path.read_bytes()[:4] != b"%PDF":
        raise ImportFailure(f"Invalid cached PDF for {url}: {path}")
    try:
        with pdfplumber.open(path) as pdf:
            if not pdf.pages:
                raise ImportFailure(f"PDF has no pages: {url}")
            if identity_page_limit is not None and identity_page_limit < 1:
                raise ValueError("identity_page_limit must be positive or None")
            identity_page_count = (
                len(pdf.pages)
                if identity_page_limit is None
                else min(identity_page_limit, len(pdf.pages))
            )
            identity_text = "\n".join(
                page.extract_text() or "" for page in pdf.pages[:identity_page_count]
            )
            if str(source.year) not in identity_text:
                raise ImportFailure(
                    f"Printed PDF year does not match requested {source.year}: {url}"
                )
            grade_pattern = re.compile(
                rf"\b(?:Grade|Grado)\s*{source.grade}\b",
                re.IGNORECASE,
            )
            if not grade_pattern.search(identity_text):
                raise ImportFailure(
                    f"Printed PDF grade does not match requested grade {source.grade}: {url}"
                )
    except Exception as exc:
        if isinstance(exc, ImportFailure):
            raise
        raise ImportFailure(f"Unreadable PDF {url}: {exc}") from exc
    return path


def group_word_rows(words: Sequence[dict[str, Any]], tolerance: float = 2.5) -> list[tuple[float, list[dict[str, Any]]]]:
    rows: list[tuple[float, list[dict[str, Any]]]] = []
    for word in sorted(words, key=lambda item: (float(item["top"]), float(item["x0"]))):
        top = float(word["top"])
        for index in range(len(rows) - 1, max(-1, len(rows) - 5), -1):
            row_top, row_words = rows[index]
            if abs(row_top - top) <= tolerance:
                row_words.append(word)
                break
        else:
            rows.append((top, [word]))
    return [(top, sorted(row, key=lambda item: float(item["x0"]))) for top, row in rows]


def clean_standard(value: str) -> str:
    match = STANDARD_RE.search(value.replace("–", "-").replace("—", "-"))
    if not match:
        raise ImportFailure(f"Malformed standard in official item map: {value!r}")
    standard = match.group(0)
    framework, rest = standard.split(".Math.Content.", 1)
    framework = framework.upper()
    # Domain/cluster letters are conventionally uppercase; terminal subparts
    # (for example 7a) remain lowercase.
    parts = rest.split(".")
    # A handful of 2013 maps print a cluster and standard number without the
    # intervening period (for example ``5.NBT.B7``). Preserve the published
    # meaning while emitting the same canonical shape as every other map.
    if len(parts) >= 3 and re.fullmatch(r"[A-Z]\d+[a-z]?", parts[2]):
        parts[2:3] = [parts[2][0], parts[2][1:]]
    normalized: list[str] = []
    for index, part in enumerate(parts):
        if index in (1, 2) and part.isalpha():
            normalized.append(part.upper())
        else:
            normalized.append(part)
    result = f"{framework}.Math.Content.{'.'.join(normalized)}"
    if not STRICT_STANDARD_RE.fullmatch(result):
        raise ImportFailure(f"Official standard failed strict normalization: {value!r} -> {result!r}")
    return result


def standards_in_text(value: str) -> list[str]:
    """Extract canonical standards while preserving table-column boundaries."""

    standards: list[str] = []
    normalized_value = value.replace("–", "-").replace("—", "-")
    # The 2024 Grade 8 EN/ES maps both print question 9 as
    # ``NGLS.Math.Content.NY-NY-8.EE.6``. Collapse only this duplicated New
    # York prefix; the resulting standard still has to pass the strict grammar.
    normalized_value = re.sub(
        r"(Content\s*\.?\s*)NY-\s*NY-",
        r"\1NY-",
        normalized_value,
        flags=re.IGNORECASE,
    )
    for match in LOOSE_STANDARD_RE.finditer(normalized_value):
        framework, grade, domain, cluster, number, subpart = match.groups()
        domain = domain.upper()
        # Some embedded fonts collapse a domain and cluster into one token
        # (``EE B`` extracts as ``EEB``). Split only against the closed list of
        # official domains, so ordinary three-letter domains such as NBT stay
        # intact.
        if cluster is None and domain not in SUPPORTED_DOMAINS and domain[:-1] in SUPPORTED_DOMAINS:
            domain, cluster = domain[:-1], domain[-1]
        suffix = f"{number}{subpart or ''}"
        rest = ".".join(part for part in (grade, domain, cluster, suffix) if part)
        standard = f"{framework.upper()}.Math.Content.{rest}"
        if not STRICT_STANDARD_RE.fullmatch(standard):
            raise ImportFailure(f"Official standard failed strict normalization: {match.group(0)!r}")
        standards.append(standard)
    return standards


def standard_domain(standard: str) -> str:
    match = re.search(r"(?:NY-)?[3-8]\.([A-Z]{1,3})\.", standard)
    if not match or match.group(1) not in SUPPORTED_DOMAINS:
        raise ImportFailure(f"Cannot derive a supported domain from {standard}")
    return match.group(1)


def parse_session_heading(text: str) -> int | None:
    match = re.search(r"\b(?:Book|Session)\s*([123])\b", text, re.IGNORECASE)
    return int(match.group(1)) if match else None


def looks_like_item_map_text(text: str) -> bool:
    standards_on_page = standards_in_text(text)
    return bool(
        re.search(r"\bMap\s+to\s+the\s+Standards\b", text, re.IGNORECASE)
        or (
            len(standards_on_page) >= 2
            and re.search(r"\b(?:Multiple\s+Choice|Constructed\s+Response)\b", text, re.I)
        )
    )


def detect_item_map_pages(pdf_path: Path) -> set[int]:
    result: set[int] = set()
    with pdfplumber.open(pdf_path) as pdf:
        for page_index, page in enumerate(pdf.pages):
            text = page.extract_text() or ""
            if looks_like_item_map_text(text):
                result.add(page_index)
    return result


def detect_inverted_item_map_pages(
    pdf_path: Path,
    *,
    expected_year: int,
    expected_grade: int,
) -> set[int]:
    """Detect authoritative maps whose PDF text stream is emitted backwards.

    The 2022 Spanish maps place a landscape table 90 degrees counterclockwise
    on an unrotated portrait final page. ``pdfplumber`` consequently exposes
    each rotated word and the full reading order backwards. Reversing the
    extracted text is sufficient to verify the map heading, framework rows,
    year, and grade, but not to reconstruct trustworthy table coordinates.
    Callers therefore use the English authoritative metadata and require exact
    Spanish source-marker parity instead of assigning metadata from this view.
    """

    result: set[int] = set()
    verified_text: list[str] = []
    with pdfplumber.open(pdf_path) as pdf:
        for page_index, page in enumerate(pdf.pages):
            text = page.extract_text() or ""
            if looks_like_item_map_text(text):
                continue
            reversed_text = text[::-1]
            has_heading = bool(
                re.search(r"\bMap\s+to\s+the\s+Standards\b", reversed_text, re.IGNORECASE)
            )
            has_item_rows = bool(
                len(standards_in_text(reversed_text)) >= 2
                and re.search(
                    r"\b(?:Multiple\s+Choice|Constructed\s+Response)\b",
                    reversed_text,
                    re.IGNORECASE,
                )
            )
            if has_heading and has_item_rows:
                result.add(page_index)
                verified_text.append(reversed_text)

    if result:
        map_text = "\n".join(verified_text)
        if str(expected_year) not in map_text:
            raise ImportFailure(
                f"Inverted item-map year mismatch: expected {expected_year} in {pdf_path}"
            )
        if not re.search(
            rf"\bG\s*rad(?:e|o)\s+{expected_grade}\b",
            map_text,
            re.IGNORECASE,
        ):
            raise ImportFailure(
                f"Inverted item-map grade mismatch: expected grade {expected_grade} in {pdf_path}"
            )
    return result


def parse_item_map(
    pdf_path: Path,
    *,
    require_keys: bool,
    expected_year: int | None = None,
    expected_grade: int | None = None,
) -> tuple[list[MapItem], set[int], list[int]]:
    items: list[MapItem] = []
    map_pages = detect_item_map_pages(pdf_path)
    visible_numbers: list[int] = []
    map_text_parts: list[str] = []
    current_session = 1
    with pdfplumber.open(pdf_path) as pdf:
        for page_index, page in enumerate(pdf.pages):
            if page_index not in map_pages:
                continue
            text = page.extract_text() or ""
            map_text_parts.append(text)
            words = page.extract_words(x_tolerance=2, y_tolerance=2, keep_blank_chars=False)
            for _, row in group_word_rows(words):
                row_text = " ".join(str(word["text"]) for word in row)
                standards = standards_in_text(row_text)
                heading = parse_session_heading(row_text)
                if heading is not None and not standards:
                    current_session = heading
                    continue
                # Record every released question independently of whether its
                # standard is on this physical row. Constructed-response labels
                # and standards sometimes wrap differently across editions.
                left_integers = [
                    (int(str(word["text"])), float(word["x0"]))
                    for word in row
                    if re.fullmatch(r"[0-9]+", str(word["text"]))
                ]
                row_has_item_shape = bool(
                    standards
                    or re.search(r"\b(?:Multiple|Constructed|Response)\b", row_text, re.I)
                )
                if left_integers and row_has_item_shape:
                    candidate_number, candidate_x = min(left_integers, key=lambda value: value[1])
                    # Some official maps center the whole table, placing the
                    # question column just beyond one quarter of the page.
                    # The leftmost integer on an item-shaped row is still the
                    # question number; the 45% guard only excludes point/key
                    # columns if a malformed row loses its left edge.
                    if 1 <= candidate_number <= 100 and candidate_x < float(page.width) * 0.45:
                        visible_numbers.append(candidate_number)
                # Preserve word boundaries: compacting a row can merge a
                # terminal standard number with the following P-value column
                # (for example ``...OA.B.5 0.78`` becoming ``...OA.B.50``).
                if not standards:
                    continue
                primary_word = next(
                    (
                        word
                        for word in row
                        if re.match(r"^(?:CCSS|NGLS)(?:\.Math\.Content\.)?", str(word["text"]), re.I)
                    ),
                    None,
                )
                if primary_word is None:
                    continue
                primary_x = float(primary_word["x0"])
                left_tokens = [str(word["text"]).strip(".,:;()") for word in row if float(word["x0"]) < primary_x]
                integers = [int(token) for token in left_tokens if re.fullmatch(r"[0-9]+", token)]
                if not integers:
                    continue
                number = integers[0]
                keys = [token.upper() for token in left_tokens if token.upper() in CHOICES]
                key = keys[-1] if keys else None
                is_multiple_choice = key is not None or "multiple choice" in row_text.lower()
                if not is_multiple_choice:
                    continue
                if require_keys and key is None:
                    continue
                items.append(
                    MapItem(
                        number=number,
                        session=current_session,
                        key=key,
                        primary_standard=standards[0],
                        secondary_standards=tuple(dict.fromkeys(standards[1:])),
                    )
                )

    deduped: dict[int, MapItem] = {}
    for item in items:
        if item.number in deduped and deduped[item.number] != item:
            raise ImportFailure(f"Conflicting item-map rows for question {item.number} in {pdf_path}")
        deduped[item.number] = item
    result = [deduped[number] for number in sorted(deduped)]
    if not result:
        raise ImportFailure(f"No multiple-choice item-map rows found in {pdf_path}")
    if require_keys and any(item.key not in CHOICES for item in result):
        raise ImportFailure(f"Item map has a missing or invalid answer key: {pdf_path}")
    if any(item.session not in (1, 2) for item in result):
        raise ImportFailure(f"Item map has an invalid book/session: {pdf_path}")
    visible_numbers = sorted(set(visible_numbers))
    missing_visible = sorted(set(item.number for item in result) - set(visible_numbers))
    if missing_visible:
        raise AssertionError(
            f"MC item numbers must be a subset of all visible map numbers; missing {missing_visible} in {pdf_path}"
        )
    map_text = "\n".join(map_text_parts)
    if expected_year is not None and str(expected_year) not in map_text:
        raise ImportFailure(f"Item-map year mismatch: expected {expected_year} in {pdf_path}")
    if expected_grade is not None and not re.search(
        rf"\bG\s*rad(?:e|o)\s+{expected_grade}\b", map_text, re.IGNORECASE
    ):
        raise ImportFailure(f"Item-map grade mismatch: expected grade {expected_grade} in {pdf_path}")
    return result, map_pages, visible_numbers


def word_top(page: Any, pattern: re.Pattern[str]) -> float | None:
    words = page.extract_words(x_tolerance=2, y_tolerance=2, keep_blank_chars=False)
    for _, row in group_word_rows(words):
        row_text = " ".join(str(word["text"]) for word in row)
        if pattern.search(row_text):
            return min(float(word["top"]) for word in row)
    return None


def parse_annotated_items(
    pdf_path: Path,
    *,
    require_official_rationale: bool = False,
) -> list[AnnotatedItem]:
    with pdfplumber.open(pdf_path) as pdf:
        # A page can finish one item's annotation and begin the next question.
        # Track every positioned item-code token, not merely the first per page.
        starts: list[tuple[int, float, float, str, int]] = []
        code_token_re = re.compile(r"^(\d{8,12})_([1-4])$")
        for page_index, page in enumerate(pdf.pages):
            words = page.extract_words(x_tolerance=2, y_tolerance=2, keep_blank_chars=False)
            for word in words:
                match = code_token_re.fullmatch(str(word["text"]).strip())
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

        items: list[AnnotatedItem] = []
        for start_index, (page_index, start_top, start_bottom, item_code, choice_index) in enumerate(starts):
            next_start = starts[start_index + 1] if start_index + 1 < len(starts) else None
            block_parts: list[str] = []
            last_page_index = min(
                next_start[0] if next_start else page_index + 2,
                len(pdf.pages) - 1,
            )
            for block_page_index in range(page_index, last_page_index + 1):
                page = pdf.pages[block_page_index]
                top = start_top if block_page_index == page_index else 0.0
                bottom = float(page.height)
                if next_start and block_page_index == next_start[0]:
                    bottom = next_start[1]
                if bottom > top:
                    block_parts.append(
                        page.crop((0.0, top, float(page.width), bottom)).extract_text() or ""
                    )
                if next_start and block_page_index == next_start[0]:
                    break
            block_text = "\n".join(block_parts)
            key_match = re.search(r"\bKey\s*:\s*([ABCD])\b", block_text, re.IGNORECASE)
            standard_match = re.search(
                r"^\s*(?:Measured(?:\s+CCLS)?|(?:Primary|Aligned)\s+CCLS)\s*:?\s*([^\n]+)",
                block_text,
                re.IGNORECASE | re.MULTILINE,
            )
            if not key_match or not standard_match:
                # A suffixed item code is authoritative evidence that this is
                # MC. Refuse to silently omit it if its annotation is malformed.
                raise ImportFailure(
                    f"Annotated MC item {item_code}_{choice_index} lacks a key or primary standard "
                    f"on/after PDF page {page_index + 1} in {pdf_path}"
                )
            suffix_key = CHOICES[choice_index - 1]
            printed_key = key_match.group(1).upper()
            if suffix_key != printed_key:
                raise ImportFailure(
                    f"Answer-key mismatch for item {item_code}: filename suffix says "
                    f"{suffix_key}, printed annotation says {printed_key}"
                )
            official_rationale: str | None = None
            if require_official_rationale:
                try:
                    official_rationale = extract_official_math_rationale(
                        block_text,
                        printed_key,
                    )
                except (MathExplanationError, TypeError, ValueError) as exc:
                    raise ImportFailure(
                        f"Could not extract the official correct-choice rationale for "
                        f"annotated item {item_code}_{choice_index} in {pdf_path}: {exc}"
                    ) from exc

            page = pdf.pages[page_index]
            key_tops: list[float] = []
            for top, row in group_word_rows(
                page.extract_words(x_tolerance=2, y_tolerance=2, keep_blank_chars=False)
            ):
                row_text = " ".join(str(word["text"]) for word in row)
                before_next = not next_start or next_start[0] != page_index or top < next_start[1]
                if top > start_bottom and before_next and re.search(r"\bKey\s*:", row_text, re.I):
                    key_tops.append(top)
            key_top = min(key_tops) if key_tops else None
            crop_top = max(18.0, start_bottom + 3.0)
            bottom = (key_top - 8.0) if key_top is not None else footer_boundary(page)
            if next_start and next_start[0] == page_index:
                bottom = min(bottom, next_start[1] - 8.0)
            crop_box = (30.0, crop_top, float(page.width) - 30.0, bottom)
            if bottom - crop_top <= 55:
                raise ImportFailure(f"Unsafe annotated crop for item {item_code} in {pdf_path}")
            crop_text = page.crop(crop_box).extract_text() or ""
            if LEAK_RE.search(crop_text):
                raise ImportFailure(
                    f"Answer/annotation leakage in proposed crop for item {item_code} ({pdf_path})"
                )
            items.append(
                AnnotatedItem(
                    item_code=item_code,
                    source_page=page_index + 1,
                    key=printed_key,
                    raw_standard=standard_match.group(1).strip(),
                    crop_box=crop_box,
                    official_rationale=official_rationale,
                )
            )

    if len(items) < 3:
        raise ImportFailure(f"Too few annotated multiple-choice items found in {pdf_path}: {len(items)}")
    if len({item.item_code for item in items}) != len(items):
        raise ImportFailure(f"Duplicate annotated item IDs in {pdf_path}")
    return items


def standard_signature(value: str) -> tuple[int, str, int, str]:
    value = value.upper().replace("0A", "OA").replace(",", ".")
    value = value.replace(" ", "")
    match = re.search(
        r"(?:NY-)?([3-8])\.?([A-Z]{1,3})\.(?:[A-Z]\.)?(\d+)(?:\.?([A-Z]))?",
        value,
    )
    if not match:
        raise ImportFailure(f"Cannot compare annotated standard {value!r} to item map")
    return int(match.group(1)), match.group(2), int(match.group(3)), (match.group(4) or "").lower()


def standards_compatible(annotation: str, mapped: str) -> bool:
    a_grade, a_domain, a_number, a_subpart = standard_signature(annotation)
    m_grade, m_domain, m_number, m_subpart = standard_signature(mapped)
    return (
        a_grade == m_grade
        and a_domain == m_domain
        and a_number == m_number
        and (not a_subpart or not m_subpart or a_subpart == m_subpart)
    )


def align_annotated_items(
    annotated: Sequence[AnnotatedItem],
    mapped: Sequence[MapItem],
) -> tuple[list[tuple[AnnotatedItem, MapItem]], bool]:
    """Align the published subset to the full old item map as a subsequence.

    2013–2015 release PDFs omit operational question numbers but print each
    item's key and standard. Their separate official item maps retain the
    operational order, standard, and book. A monotonic standards alignment is
    therefore the only non-invented way to restore number/session metadata.
    ``ambiguous`` is reported because repeated adjacent standards can produce
    more than one valid alignment; the deterministic earliest path is used.
    """

    memo: dict[tuple[int, int], tuple[int, tuple[int, ...] | None]] = {}

    def solve(item_index: int, map_start: int) -> tuple[int, tuple[int, ...] | None]:
        key = (item_index, map_start)
        if key in memo:
            return memo[key]
        if item_index == len(annotated):
            return 1, ()
        path_count = 0
        first_path: tuple[int, ...] | None = None
        for map_index in range(map_start, len(mapped)):
            if not standards_compatible(
                annotated[item_index].raw_standard,
                mapped[map_index].primary_standard,
            ):
                continue
            child_count, child_path = solve(item_index + 1, map_index + 1)
            if child_count and child_path is not None:
                path_count = min(2, path_count + child_count)
                candidate = (map_index,) + child_path
                if first_path is None or candidate < first_path:
                    first_path = candidate
        memo[key] = path_count, first_path
        return memo[key]

    path_count, path = solve(0, 0)
    if not path:
        raise ImportFailure("Could not align annotated released items to the official item map")
    pairs = [
        (
            annotated[index],
            dataclasses.replace(mapped[map_index], key=annotated[index].key),
        )
        for index, map_index in enumerate(path)
    ]
    for annotated_item, map_item in pairs:
        if not standards_compatible(annotated_item.raw_standard, map_item.primary_standard):
            raise AssertionError("Alignment postcondition failed")
    return pairs, path_count > 1


def annotation_standard_fallback(value: str) -> str:
    grade, domain, number, subpart = standard_signature(value)
    suffix = f"{number}{subpart}" if subpart else str(number)
    return f"CCSS.Math.Content.{grade}.{domain}.{suffix}"


def tesseract_candidates(
    pdf_path: Path,
    page: Any,
    page_index: int,
    expected_numbers: set[int],
    cache_root: Path,
    dpi: int,
    tesseract_binary: str,
) -> list[Marker]:
    cache_key = hashlib.sha256(
        (
            f"{OCR_CACHE_VERSION}:{sha256_file(pdf_path)}:{page_index}:{dpi}:"
            f"{tesseract_version(tesseract_binary)}:psm11-tsv"
        ).encode()
    ).hexdigest()[:20]
    tsv_path = cache_root / "ocr" / f"{cache_key}.tsv"
    if not tsv_path.exists():
        tsv_path.parent.mkdir(parents=True, exist_ok=True)
        with PDF_RENDER_LOCK:
            rendered = page.to_image(resolution=dpi, antialias=True).original.convert("RGB")
        strip = rendered.crop((0, 0, max(1, int(rendered.width * 0.22)), rendered.height))
        with tempfile.NamedTemporaryFile(suffix=".png", dir=cache_root, delete=False) as temporary:
            png_path = Path(temporary.name)
        try:
            strip.save(png_path, format="PNG", optimize=True)
            result = subprocess.run(
                [tesseract_binary, str(png_path), "stdout", "--psm", "11", "tsv"],
                check=False,
                capture_output=True,
                text=True,
            )
            if result.returncode != 0:
                raise ImportFailure(f"Tesseract failed on {pdf_path} page {page_index + 1}: {result.stderr}")
            atomic_write_bytes(tsv_path, result.stdout.encode("utf-8"))
        finally:
            png_path.unlink(missing_ok=True)

    candidates: list[Marker] = []
    lines = tsv_path.read_text(encoding="utf-8", errors="replace").splitlines()
    if not lines:
        return candidates
    header = lines[0].split("\t")
    for line in lines[1:]:
        values = line.split("\t")
        if len(values) != len(header):
            continue
        row = dict(zip(header, values))
        token = row.get("text", "").strip().strip(".,")
        if not re.fullmatch(r"[0-9]+", token) or int(token) not in expected_numbers:
            continue
        try:
            confidence = float(row.get("conf", "-1"))
            left = float(row["left"])
            top_px = float(row["top"])
            height_px = float(row["height"])
        except (KeyError, ValueError):
            continue
        if confidence < 20 or height_px < 10 or height_px > 55:
            continue
        scale = dpi / 72.0
        top = top_px / scale
        x0 = left / scale
        if not (35 <= top <= float(page.height) - 50):
            continue
        score = abs(x0 - 44.0) * 0.4 + abs(height_px / scale - 13.0) + (100 - confidence) * 0.02
        candidates.append(Marker(int(token), page_index, top, x0, score, "ocr"))
    return candidates


def choose_monotonic_markers(
    expected: Sequence[int],
    candidates: Sequence[Marker],
) -> list[Marker] | None:
    by_number: dict[int, list[Marker]] = defaultdict(list)
    for candidate in candidates:
        by_number[candidate.number].append(candidate)
    for number in by_number:
        by_number[number].sort(key=lambda marker: (marker.page_index, marker.top, marker.score))

    # Dynamic programming minimizes marker quality scores under strict source
    # order. This rejects matching diagram/footer numbers without hand-tuned
    # page ranges.
    states: dict[tuple[int, float], tuple[float, list[Marker]]] = {(-1, -1.0): (0.0, [])}
    for number in expected:
        next_states: dict[tuple[int, float], tuple[float, list[Marker]]] = {}
        for marker in by_number.get(number, []):
            position = (marker.page_index, marker.top)
            for previous, (cost, path) in states.items():
                if position <= previous:
                    continue
                new_cost = cost + marker.score
                current = next_states.get(position)
                if current is None or new_cost < current[0]:
                    next_states[position] = (new_cost, path + [marker])
        if not next_states:
            return None
        # Keep only the best state for each position, with a modest cap to
        # prevent pathological PDFs from expanding the state set.
        states = dict(sorted(next_states.items(), key=lambda pair: pair[1][0])[:200])
    return min(states.values(), key=lambda value: value[0])[1]


def detect_gray_box_positions(
    pdf_path: Path,
    map_pages: set[int],
    dpi: int,
) -> list[tuple[int, float, Image.Image]]:
    scale = dpi / 72.0
    positions: list[tuple[int, float, Image.Image]] = []
    with pdfplumber.open(pdf_path) as pdf:
        for page_index, page in enumerate(pdf.pages):
            if page_index in map_pages:
                continue
            with PDF_RENDER_LOCK:
                rendered = page.to_image(resolution=dpi, antialias=True).original.convert("L")
            pixels = np.asarray(rendered)
            x0 = max(0, round(36.0 * scale))
            x1 = min(rendered.width, round(67.0 * scale))
            if x1 - x0 < 10:
                continue
            strip = pixels[:, x0:x1]
            gray = (strip >= 145) & (strip <= 245)
            row_fraction = gray.mean(axis=1)
            indices = np.flatnonzero(row_fraction >= 0.54)
            if indices.size == 0:
                continue
            runs: list[tuple[int, int]] = []
            start = previous = int(indices[0])
            max_gap = max(2, round(8.0 * scale))
            for value in indices[1:]:
                y = int(value)
                if y - previous > max_gap:
                    runs.append((start, previous))
                    start = y
                previous = y
            runs.append((start, previous))
            for start_px, end_px in runs:
                top = start_px / scale
                height = (end_px - start_px + 1) / scale
                if not (17.0 <= height <= 32.0 and 35.0 <= top <= float(page.height) - 50.0):
                    continue
                box = rendered.crop(
                    (
                        max(0, round(28.0 * scale)),
                        max(0, start_px - round(4.0 * scale)),
                        min(rendered.width, round(82.0 * scale)),
                        min(rendered.height, end_px + round(4.0 * scale)),
                    )
                )
                positions.append((page_index, top, box.copy()))

    positions.sort(key=lambda value: (value[0], value[1]))
    return positions


def markers_overlap_gray_boxes(
    markers: Sequence[Marker],
    positions: Sequence[tuple[int, float, Image.Image]],
) -> bool:
    """Require each text marker to coincide with a distinct NYSED gray box."""

    by_page: dict[int, list[tuple[int, float]]] = defaultdict(list)
    for index, (page_index, top, _) in enumerate(positions):
        by_page[page_index].append((index, top))
    used: set[int] = set()
    for marker in markers:
        # The printed digit sits inside the stable x=36..67 point gray strip;
        # allow a small antialias/font-bearing tolerance around that box.
        if not 30.0 <= marker.x0 <= 74.0:
            return False
        matches = [
            (abs(marker.top - top), index)
            for index, top in by_page.get(marker.page_index, [])
            if index not in used and abs(marker.top - top) <= 16.0
        ]
        if not matches:
            return False
        _, matched_index = min(matches)
        used.add(matched_index)
    return True


def remap_markers_to_gray_box_positions(
    markers: Sequence[Marker],
    positions: Sequence[tuple[int, float, Image.Image]],
    *,
    tolerance: float = 3.0,
) -> list[Marker] | None:
    """Move retry markers onto the original render-DPI box coordinates.

    Higher-resolution OCR can recover a faint marker identity, but its box top
    can differ by a fraction of a PDF point because the rasterized gray edge
    rounds differently. Crop manifests and explanation input hashes are pinned
    to the original render DPI, so use the retry only for identity and retain
    the original gray-box coordinates for crop construction.
    """

    if not isinstance(tolerance, (int, float)) or tolerance <= 0:
        raise ValueError("Marker remap tolerance must be positive")
    by_page: dict[int, list[tuple[int, float]]] = defaultdict(list)
    for index, (page_index, top, _) in enumerate(positions):
        by_page[page_index].append((index, top))
    used: set[int] = set()
    remapped: list[Marker] = []
    for marker in markers:
        matches = [
            (abs(marker.top - top), index, top)
            for index, top in by_page.get(marker.page_index, [])
            if index not in used and abs(marker.top - top) <= tolerance
        ]
        if not matches:
            return None
        _, position_index, original_top = min(matches)
        used.add(position_index)
        remapped.append(
            Marker(
                marker.number,
                marker.page_index,
                original_top,
                marker.x0,
                marker.score,
                f"{marker.method}-render-dpi-remap",
            )
        )
    return remapped


def gray_box_markers(
    pdf_path: Path,
    expected: Sequence[int],
    map_pages: set[int],
    dpi: int,
    text_candidates: Sequence[Marker],
    cache_root: Path,
    tesseract_binary: str | None,
    positions: Sequence[tuple[int, float, Image.Image]] | None = None,
) -> list[Marker] | None:
    """Detect NYSED's gray left-margin question-number boxes.

    Some releases contain entire pages as images, so neither PDF text nor
    whole-page OCR reliably recognizes a digit printed over gray. The box
    geometry itself is stable. We detect every box and assign the official map
    numbers only after isolated-box OCR reaches a consensus. Anonymous boxes
    are never assigned numbers by order.
    """

    scale = dpi / 72.0
    if positions is None:
        positions = detect_gray_box_positions(pdf_path, map_pages, dpi)
    positions = list(positions)

    if len(positions) < len(expected):
        return None

    expected_set = set(expected)
    ocr_language = "snum" if "snum" in tesseract_languages(tesseract_binary) else "eng"
    cache_key = hashlib.sha256(
        (
            f"{OCR_CACHE_VERSION}:gray-v5:{sha256_file(pdf_path)}:{dpi}:"
            f"{tesseract_version(tesseract_binary)}:{ocr_language}:"
            "psm6-7-8-10-13-digits-consensus"
        ).encode("utf-8")
    ).hexdigest()[:24]
    identity_path = cache_root / "ocr" / f"gray-identities-{cache_key}.json"
    try:
        identity_cache: dict[str, list[int]] = json.loads(identity_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        identity_cache = {}

    markers: list[Marker] = []
    for page_index, top, box in positions:
        location = f"{page_index}:{top:.2f}"
        identities: list[int] = []
        if location in identity_cache:
            identities = [int(value) for value in identity_cache[location] if int(value) in expected_set]
        elif tesseract_binary:
            cache_root.mkdir(parents=True, exist_ok=True)
            votes: list[int] = []
            # Retain the whole gray box so narrow second digits are not lost
            # by a tight ink bounding box. Multiple thresholds compensate for
            # the uneven scans, and the official map is an identity whitelist.
            enlarged = ImageOps.autocontrast(box, cutoff=1).resize(
                (max(1, box.width * 8), max(1, box.height * 8)),
                Image.Resampling.LANCZOS,
            )
            for threshold in (100, 130, 160, 190):
                digit = enlarged.point(lambda value, cutoff=threshold: 0 if value < cutoff else 255)
                canvas = Image.new("L", (digit.width + 160, digit.height + 160), 255)
                canvas.paste(digit, (80, 80))
                with tempfile.NamedTemporaryFile(
                    suffix=".png",
                    dir=cache_root,
                    delete=False,
                ) as temporary:
                    marker_path = Path(temporary.name)
                try:
                    canvas.save(marker_path, format="PNG")
                    for psm in ("6", "7", "8", "10", "13"):
                        result = subprocess.run(
                            [
                                tesseract_binary,
                                str(marker_path),
                                "stdout",
                                "--psm",
                                psm,
                                "-l",
                                ocr_language,
                                "-c",
                                "tessedit_char_whitelist=0123456789",
                            ],
                            check=False,
                            capture_output=True,
                            text=True,
                        )
                        match = re.search(r"\d+", result.stdout)
                        if result.returncode == 0 and match:
                            candidate = int(match.group(0))
                            if candidate in expected_set:
                                votes.append(candidate)
                finally:
                    marker_path.unlink(missing_ok=True)
            # The 2016 scans vary enough that autocontrast can erase a thin
            # digit on a few otherwise crisp boxes. Add the original tight
            # ink crop as an independent OCR family; identities still need
            # repeated exact votes and membership in the official map.
            legacy_box = box.crop(
                (
                    round(6.0 * scale),
                    round(2.0 * scale),
                    min(box.width, round(42.0 * scale)),
                    max(round(2.0 * scale) + 1, box.height - round(2.0 * scale)),
                )
            )
            pixels = np.asarray(legacy_box.convert("L"))
            coordinates = np.argwhere(pixels < 120)
            if coordinates.size:
                y0, x0 = coordinates.min(axis=0)
                y1, x1 = coordinates.max(axis=0) + 1
                legacy = Image.fromarray(pixels[int(y0) : int(y1), int(x0) : int(x1)])
                legacy = legacy.point(lambda value: 0 if value < 150 else 255).resize(
                    (max(1, legacy.width * 5), max(1, legacy.height * 5)),
                    Image.Resampling.NEAREST,
                )
                canvas = Image.new("L", (legacy.width + 120, legacy.height + 120), 255)
                canvas.paste(legacy, (60, 60))
                with tempfile.NamedTemporaryFile(
                    suffix=".png",
                    dir=cache_root,
                    delete=False,
                ) as temporary:
                    marker_path = Path(temporary.name)
                try:
                    canvas.save(marker_path, format="PNG")
                    for psm in ("6", "7", "8", "10", "13"):
                        result = subprocess.run(
                            [tesseract_binary, str(marker_path), "stdout", "--psm", psm],
                            check=False,
                            capture_output=True,
                            text=True,
                        )
                        match = re.search(r"\d+", result.stdout)
                        if result.returncode == 0 and match:
                            candidate = int(match.group(0))
                            if candidate in expected_set:
                                votes.append(candidate)
                finally:
                    marker_path.unlink(missing_ok=True)
            if votes:
                identities = sorted(value for value in set(votes) if votes.count(value) >= 2)
            identity_cache[location] = identities
        for number in identities:
            markers.append(Marker(number, page_index, top, 40.0, 0.0, "gray-box-verified"))

    atomic_write_json(identity_path, identity_cache)
    chosen = choose_monotonic_markers(list(expected), markers)
    if chosen is None and tesseract_binary:
        # ``snum`` is generally strongest on these boxes, but it occasionally
        # collapses doubled narrow digits (notably ``11``) to one glyph. Only
        # after the primary exact-parity path fails, collect an independent
        # English-model consensus and merge its verified identities.
        supplement_key = hashlib.sha256(
            (
                f"{OCR_CACHE_VERSION}:gray-eng-v4:{sha256_file(pdf_path)}:{dpi}:"
                f"{tesseract_version(tesseract_binary)}:psm6-7-8-10-11-12-13"
            ).encode("utf-8")
        ).hexdigest()[:24]
        supplement_path = cache_root / "ocr" / f"gray-eng-{supplement_key}.json"
        try:
            supplement_cache: dict[str, list[int]] = json.loads(
                supplement_path.read_text(encoding="utf-8")
            )
        except (OSError, json.JSONDecodeError):
            supplement_cache = {}

        for page_index, top, box in positions:
            location = f"{page_index}:{top:.2f}"
            if location in supplement_cache:
                supplements = [
                    int(value) for value in supplement_cache[location] if int(value) in expected_set
                ]
            else:
                # Exclude the question stem beginning just right of the gray
                # number box; whitelist OCR can otherwise merge a nearby
                # letter with a narrow final digit (``41`` becoming ``4``).
                isolated_box = box.crop((0, 0, min(box.width, round(40.0 * scale)), box.height))
                # Preserve the faint right stroke of narrow final digits. A
                # percentile cutoff can discard that one-pixel stroke on the
                # 2019 scans (for example, turning ``41`` into ``4``).
                enlarged = ImageOps.autocontrast(isolated_box).resize(
                    (max(1, isolated_box.width * 8), max(1, isolated_box.height * 8)),
                    Image.Resampling.LANCZOS,
                )
                digit = enlarged.point(lambda value: 0 if value < 140 else 255)
                canvas = Image.new("L", (digit.width + 160, digit.height + 160), 255)
                canvas.paste(digit, (80, 80))
                with tempfile.NamedTemporaryFile(
                    suffix=".png",
                    dir=cache_root,
                    delete=False,
                ) as temporary:
                    marker_path = Path(temporary.name)
                votes: list[int] = []
                try:
                    canvas.save(marker_path, format="PNG")
                    # Sparse-text modes independently preserve detached,
                    # narrow final digits that the single-line modes can
                    # discard even when the rendered glyph is complete.
                    for psm in ("6", "7", "8", "10", "11", "12", "13"):
                        result = subprocess.run(
                            [
                                tesseract_binary,
                                str(marker_path),
                                "stdout",
                                "--psm",
                                psm,
                                "-l",
                                "eng",
                                "-c",
                                "tessedit_char_whitelist=0123456789",
                            ],
                            check=False,
                            capture_output=True,
                            text=True,
                        )
                        match = re.search(r"\d+", result.stdout)
                        if result.returncode == 0 and match:
                            candidate = int(match.group(0))
                            if candidate in expected_set:
                                votes.append(candidate)
                finally:
                    marker_path.unlink(missing_ok=True)
                supplements = sorted(value for value in set(votes) if votes.count(value) >= 2)
                supplement_cache[location] = supplements
            identity_cache[location] = sorted(
                set(identity_cache.get(location, [])) | set(supplements)
            )

        atomic_write_json(supplement_path, supplement_cache)
        atomic_write_json(identity_path, identity_cache)
        markers = [
            Marker(number, page_index, top, 40.0, 0.0, "gray-box-verified")
            for page_index, top, _ in positions
            for number in identity_cache.get(f"{page_index}:{top:.2f}", [])
            if number in expected_set
        ]
        chosen = choose_monotonic_markers(list(expected), markers)
    if chosen is None or len(chosen) != len(expected):
        return None
    return chosen


def find_question_markers(
    pdf_path: Path,
    expected_numbers: Sequence[int],
    map_pages: set[int],
    cache_root: Path,
    dpi: int,
    tesseract_binary: str | None,
    *,
    require_exact_gray_box_count: bool = False,
    retry_dpi: int | None = DEFAULT_MARKER_RETRY_DPI,
) -> list[Marker]:
    expected = sorted(expected_numbers)
    expected_set = set(expected)
    candidates: list[Marker] = []
    with pdfplumber.open(pdf_path) as pdf:
        for page_index, page in enumerate(pdf.pages):
            if page_index in map_pages:
                continue
            words = page.extract_words(
                x_tolerance=1,
                y_tolerance=2,
                keep_blank_chars=False,
                extra_attrs=["size"],
            )
            for word in words:
                token = str(word["text"]).strip().strip(".,")
                if not re.fullmatch(r"[0-9]+", token) or int(token) not in expected_set:
                    continue
                x0 = float(word["x0"])
                top = float(word["top"])
                size = float(word.get("size", word.get("height", 0)))
                if not (20 <= x0 <= 100 and 35 <= top <= float(page.height) - 50 and 9.5 <= size <= 20):
                    continue
                score = abs(x0 - 44.0) * 0.35 + abs(size - 13.0)
                candidates.append(Marker(int(token), page_index, top, x0, score, "pdf-text"))

        positions = detect_gray_box_positions(pdf_path, map_pages, dpi)
        if require_exact_gray_box_count and len(positions) != len(expected):
            raise ImportFailure(
                f"Full-booklet gray-box parity failed for {pdf_path}: "
                f"expected {len(expected)}, detected {len(positions)}"
            )
        unverified_chosen = choose_monotonic_markers(expected, candidates)
        candidates = [
            candidate
            for candidate in candidates
            if markers_overlap_gray_boxes([candidate], positions)
        ]
        chosen = choose_monotonic_markers(expected, candidates)
        if chosen is not None and markers_overlap_gray_boxes(chosen, positions):
            return chosen
        if unverified_chosen is not None:
            log(
                f"  Rejected a complete PDF-text marker path outside NYSED gray boxes: "
                f"{pdf_path.name}"
            )
        chosen = gray_box_markers(
            pdf_path,
            expected,
            map_pages,
            dpi,
            candidates,
            cache_root,
            tesseract_binary,
            positions,
        )
        if chosen is not None:
            log(f"  Recovered {len(chosen)} image-backed markers from NYSED gray boxes")
            return chosen
        if tesseract_binary is None:
            missing = sorted(expected_set - {candidate.number for candidate in candidates})
            raise ImportFailure(
                f"PDF text did not expose every question marker in {pdf_path}; missing {missing}. "
                "Install/pass --tesseract for scanned pages."
            )

        log(f"  Falling back to left-margin OCR for marker parity: {pdf_path.name}")
        for page_index, page in enumerate(pdf.pages):
            if page_index in map_pages:
                continue
            candidates.extend(
                candidate
                for candidate in tesseract_candidates(
                    pdf_path,
                    page,
                    page_index,
                    expected_set,
                    cache_root,
                    dpi,
                    tesseract_binary,
                )
                if markers_overlap_gray_boxes([candidate], positions)
            )
        chosen = choose_monotonic_markers(expected, candidates)
        if chosen is None or not markers_overlap_gray_boxes(chosen, positions):
            found = sorted({candidate.number for candidate in candidates})
            low_resolution_failure = ImportFailure(
                f"Could not establish exact question-marker parity for {pdf_path}; "
                f"expected {expected}, detected candidate numbers {found}"
            )
            if (
                retry_dpi is None
                or retry_dpi <= dpi
                or tesseract_binary is None
            ):
                raise low_resolution_failure
            log(
                f"  Retrying marker detection at {retry_dpi} DPI while preserving "
                f"the {dpi}-DPI crop geometry: {pdf_path.name}"
            )
            try:
                retry_markers = find_question_markers(
                    pdf_path,
                    expected,
                    map_pages,
                    cache_root,
                    retry_dpi,
                    tesseract_binary,
                    require_exact_gray_box_count=require_exact_gray_box_count,
                    retry_dpi=None,
                )
            except ImportFailure as exc:
                raise low_resolution_failure from exc
            chosen = remap_markers_to_gray_box_positions(retry_markers, positions)
            if (
                chosen is None
                or [marker.number for marker in chosen] != expected
                or not markers_overlap_gray_boxes(chosen, positions)
            ):
                raise ImportFailure(
                    f"High-resolution marker retry for {pdf_path} could not be "
                    f"mapped safely onto the {dpi}-DPI gray boxes"
                ) from low_resolution_failure
            log(
                f"  Recovered {len(chosen)} markers at {retry_dpi} DPI and remapped "
                f"them to the {dpi}-DPI crop geometry"
            )

    if [marker.number for marker in chosen] != expected:
        raise AssertionError("Question marker parity postcondition failed")
    if len({(marker.page_index, round(marker.top, 2)) for marker in chosen}) != len(chosen):
        raise ImportFailure(f"Two questions resolved to the same source location in {pdf_path}")
    return chosen


def footer_boundary(page: Any, dpi: int = 120) -> float:
    """Return a safe boundary above NYSED's GO ON / STOP footer.

    Text-backed editions expose the footer words directly. Image-backed pages
    are handled by locating the long dashed rule and reserving the 28 points
    above it where GO ON / STOP / PARE / SIGA is printed.
    """

    footer_pattern = re.compile(r"\b(?:GO\s+ON|STOP|PARE|SIGA)\b", re.IGNORECASE)
    for top, row in group_word_rows(
        page.extract_words(x_tolerance=2, y_tolerance=2, keep_blank_chars=False)
    ):
        if top > float(page.height) * 0.72:
            row_text = " ".join(str(word["text"]) for word in row)
            if footer_pattern.search(row_text):
                return max(float(page.height) * 0.70, top - 8.0)

    with PDF_RENDER_LOCK:
        rendered = page.to_image(resolution=dpi, antialias=True).original.convert("L")
    scale = dpi / 72.0
    pixels = np.asarray(rendered)
    x0 = round(28.0 * scale)
    x1 = rendered.width - round(28.0 * scale)
    start_y = round(float(page.height) * 0.78 * scale)
    if x1 > x0 and start_y < rendered.height:
        ink = pixels[start_y:, x0:x1] < 120
        row_fraction = ink.mean(axis=1)
        lines = np.flatnonzero(row_fraction >= 0.28)
        if lines.size:
            rule_top = (start_y + int(lines[0])) / scale
            return max(float(page.height) * 0.70, rule_top - 28.0)
    return float(page.height) - 100.0


def crop_boxes_from_markers(
    pdf_path: Path,
    markers: Sequence[Marker],
) -> dict[int, tuple[int, tuple[float, float, float, float]]]:
    by_page: dict[int, list[Marker]] = defaultdict(list)
    for marker in markers:
        by_page[marker.page_index].append(marker)
    result: dict[int, tuple[int, tuple[float, float, float, float]]] = {}
    with pdfplumber.open(pdf_path) as pdf:
        for page_index, page_markers in by_page.items():
            page = pdf.pages[page_index]
            footer_top = footer_boundary(page)
            page_markers.sort(key=lambda marker: marker.top)
            for index, marker in enumerate(page_markers):
                top = max(24.0, marker.top - 9.0)
                bottom = (
                    page_markers[index + 1].top - 9.0
                    if index + 1 < len(page_markers)
                    else footer_top
                )
                if bottom - top < 55:
                    raise ImportFailure(
                        f"Implausibly short crop for question {marker.number} on {pdf_path} page {page_index + 1}"
                    )
                box = (28.0, top, float(page.width) - 28.0, bottom)
                # Modern map pages are excluded wholesale. This text check also
                # catches accidental annotation/key boundaries in odd releases.
                crop_text = page.crop(box).extract_text() or ""
                if LEAK_RE.search(crop_text):
                    raise ImportFailure(
                        f"Answer metadata leaked into crop for question {marker.number} in {pdf_path}"
                    )
                result[marker.number] = (page_index + 1, box)
    if set(result) != {marker.number for marker in markers}:
        raise AssertionError("Crop box parity postcondition failed")
    return result


_VERIFIED_MODERN_CROP_REPAIRS: dict[
    tuple[int, int, str, int],
    dict[str, Any],
] = {
    # The official 2021 Grade 4 q3 fraction denominators overlap the vertical
    # lane occupied by the page's GO ON footer. The ordinary footer boundary
    # clips both denominators. These source- and geometry-pinned repairs extend
    # only q3 and mask only the far-right footer lane; answer content is left.
    (2021, 4, "en", 3): {
        "sourcePdfSha256": "d26506e972400d567a0af3029cdcfa0c43619f2f06be139488c33aaab3bfb614",
        "sourcePage": 7,
        "oldBox": (28.0, 531.9, 584.0, 698.6),
        "newBox": (28.0, 531.9, 584.0, 722.0),
        "footerMask": (490.0, 698.6),
    },
    (2021, 4, "es", 3): {
        "sourcePdfSha256": "7c35fd97ffc19e72145b1a8eb2c3ce0e4515554ee8d5489d1c5f7dc26529b42f",
        "sourcePage": 7,
        "oldBox": (28.0, 532.8, 584.0, 698.6),
        "newBox": (28.0, 532.8, 584.0, 722.0),
        "footerMask": (490.0, 698.6),
    },
    # The Spanish 2021 Grade 8 q18 marker crop stops midway through the answer
    # list. The source-pinned extension ends above the page footer.
    (2021, 8, "es", 18): {
        "sourcePdfSha256": "422c2acacb2fe516ca8e446a6fdc21c82456d0cbee65c076bf57805ea186b917",
        "sourcePage": 20,
        "oldBox": (28.0, 530.1, 584.0, 622.4),
        "newBox": (28.0, 530.1, 584.0, 700.0),
    },
    (2021, 8, "es", 13): {
        "sourcePdfSha256": "422c2acacb2fe516ca8e446a6fdc21c82456d0cbee65c076bf57805ea186b917",
        "sourcePage": 18,
        "oldBox": (28.0, 50.4, 584.0, 602.0),
        "newBox": (28.0, 50.4, 584.0, 685.0),
    },
    # The Spanish 2022 Grade 6 q17 D amount overlaps the vertical footer lane.
    # Extend through D and mask only the far-right SIGA lane.
    (2022, 6, "es", 17): {
        "sourcePdfSha256": "6a9b8dcaf0787644a325150dad282ec099e02dc71b080caf7db8c292de5bb933",
        "sourcePage": 12,
        "oldBox": (28.0, 474.3, 584.0, 702.372),
        "newBox": (28.0, 474.3, 584.0, 723.0),
        "footerMask": (516.0, 699.0),
    },
    # The Spanish 2023 Grade 8 q20 final equation overlaps SIGA. Preserve the
    # left-side fraction and mask only the audited footer lane.
    (2023, 8, "es", 20): {
        "sourcePdfSha256": "6da677c8eb967384f368a202a8974bcc9e3e2d59cb2cc6d1a0dc09549845bd12",
        "sourcePage": 12,
        "oldBox": (28.0, 527.85, 584.0, 702.372),
        "newBox": (28.0, 527.85, 584.0, 723.0),
        "footerMask": (516.0, 699.0),
    },
    # The Spanish 2024 Grade 7 q29 D amount likewise overlaps SIGA. Preserve
    # the left-side answer and mask only the source-audited footer lane.
    (2024, 7, "es", 29): {
        "sourcePdfSha256": "7d5913318ceb35bb77e90cdf5cbcf7e9c74b7eb1e5cfcb2629edf16396905976",
        "sourcePage": 15,
        "oldBox": (28.0, 546.677, 584.0, 701.654),
        "newBox": (28.0, 546.677, 584.0, 725.0),
        "footerMask": (516.0, 699.0),
    },
    # The 2015 Grade 7 annotated release places the final answer row just
    # below the generic marker/footer bounds for two released items. Extend
    # each crop only through its printed question border, before the separate
    # "calculators allowed" line.
    (2015, 7, "en", 25): {
        "sourcePdfSha256": "b0aa156031c76884c8a381ea69a0c6ff00e0bed04f67a387c1c8541e657f9a8a",
        "sourcePage": 21,
        "oldBox": (30.0, 352.553, 573.0, 590.0),
        "newBox": (30.0, 352.553, 573.0, 616.0),
    },
    (2015, 7, "en", 27): {
        "sourcePdfSha256": "b0aa156031c76884c8a381ea69a0c6ff00e0bed04f67a387c1c8541e657f9a8a",
        "sourcePage": 22,
        "oldBox": (30.0, 535.453, 573.0, 665.0),
        "newBox": (30.0, 535.453, 573.0, 687.0),
    },
    # The released 2016 Grade 5 booklet places q30 on the same page after q29,
    # but q30 is not in the released MC item-map subset. Without a source-pinned
    # lower boundary, the ordinary last-item crop runs to the footer and exposes
    # all of q30 beneath q29 even though the UI renders only q29's controls.
    (2016, 5, "en", 29): {
        "sourcePdfSha256": "3be09f6036180bf30b69b1ba61be8ffb98a95ce1d29e70bbbcdfb6225004208b",
        "sourcePage": 22,
        "oldBox": (28.0, 198.45, 584.0, 694.4),
        "newBox": (28.0, 198.45, 584.0, 354.0),
    },
    # The scanned 2016 Grade 6 q11 table extends beyond the detected footer
    # boundary. The repaired lower edge restores D's complete d-row while
    # remaining well above the page footer.
    (2016, 6, "en", 11): {
        "sourcePdfSha256": "f58e644f4ba3e7614bf40ab5f3c527f66cd9e66986be53afa14d0ad8b0ac66c8",
        "sourcePage": 7,
        "oldBox": (28.0, 280.8, 584.0, 596.6),
        "newBox": (28.0, 280.8, 584.0, 640.0),
    },
    # The 2016 Grade 8 q2 crop stops inside C and omits D. The repaired edge
    # includes both complete choices and remains above the page footer.
    (2016, 8, "en", 2): {
        "sourcePdfSha256": "c340042edf847c9a2f7c77772ccddc8ce2a5ddd61bb160ff926b71157b0229a6",
        "sourcePage": 7,
        "oldBox": (28.0, 227.7, 584.0, 636.2),
        "newBox": (28.0, 227.7, 584.0, 692.0),
    },
    # Both localized 2023 Grade 6 q3 crops stop after choice C because choice D
    # sits just below the ordinary footer boundary. Extend only to the verified
    # dotted-rule margin so all four equations remain inside the question crop.
    (2023, 6, "en", 3): {
        "sourcePdfSha256": "ef605c9fcefcfd9fcf9f4320fc72ea9921fe04e7f6303e800791f017fb5560d4",
        "sourcePage": 7,
        "oldBox": (28.0, 560.7, 584.0, 702.372),
        "newBox": (28.0, 560.7, 584.0, 723.0),
        "footerMask": (490.0, 702.372),
    },
    (2023, 6, "es", 3): {
        "sourcePdfSha256": "5becc2cd07f7306b6ed22ddf0a2e1db4d245ddebe34a557d2885416e5c2fe260",
        "sourcePage": 7,
        "oldBox": (28.0, 555.152, 584.0, 702.372),
        "newBox": (28.0, 555.152, 584.0, 723.0),
        "footerMask": (490.0, 702.372),
    },
    # The Spanish 2025 Grade 5 q14 denominator in choice D falls just below
    # the standard crop boundary. The source-pinned extension stops before the
    # page footer and restores the complete 36/10 choice.
    (2025, 5, "es", 14): {
        "sourcePdfSha256": "f92ebb165f19b082995c51a13b663405e572b13a5052ca641bb1dc59bf9967a0",
        "sourcePage": 10,
        "oldBox": (28.0, 527.876, 584.0, 702.372),
        "newBox": (28.0, 527.876, 584.0, 718.0),
        "footerMask": (490.0, 702.372),
    },
}


# The official 2017 Spanish PDFs below contain duplicated or missing glyph
# operators in otherwise valid question artwork. These exact-source overlays
# replace only the malformed value cells with the values printed in the
# matching official English release. Coordinates remain in source-page points
# and are validated against the exact crop before rendering.
_VERIFIED_TEXT_OVERLAY_REPAIRS: dict[tuple[str, int], dict[str, Any]] = {
    (
        "8c8c706ee38a63b81ba4ae0c8a3234d65c00f43e8fe68fb0d8f533caa1ecc187",
        32,
    ): {
        "policyId": "2019-g5-es-q32-denominator-v1",
        "sourcePage": 21,
        "box": (28.0, 243.45, 584.0, 483.3),
        "fontSize": 11.0,
        "clearRects": ((240.0, 266.0, 252.0, 282.0),),
        "texts": (("5", 242.95, 267.98, "lt"),),
    },
    (
        "943edf43943948bc58023351f96f57dff7a9b8575684ffa3a953fd9ce1d80be1",
        21,
    ): {
        "policyId": "2017-g7-en-q21-expression-v1",
        "sourcePage": 15,
        "box": (28.0, 49.95, 584.0, 340.65),
        "fontSize": 13.0,
        "clearRects": ((140.0, 87.0, 290.0, 124.0),),
        "texts": (("-1/2(-3/2 x + 6x + 1) - 3x", 145.0, 94.0, "lt"),),
    },
    (
        "642a84bfe71eca05c10dcfabea2f5abacd7abd041067ae136446c46fbb87ea1d",
        3,
    ): {
        "policyId": "2017-g5-es-q3-choice-values-v1",
        "sourcePage": 10,
        "box": (28.0, 50.85, 584.0, 400.95),
        "fontSize": 11.0,
        "clearRects": ((88.0, 249.0, 135.0, 340.0),),
        "texts": (
            ("20", 92.4, 253.75, "lt"),
            ("44", 92.4, 277.76, "lt"),
            ("45", 92.35, 301.76, "lt"),
            ("60", 92.39, 325.76, "lt"),
        ),
    },
    (
        "642a84bfe71eca05c10dcfabea2f5abacd7abd041067ae136446c46fbb87ea1d",
        4,
    ): {
        "policyId": "2017-g5-es-q4-choice-values-v1",
        "sourcePage": 10,
        "box": (28.0, 400.95, 584.0, 702.372),
        "fontSize": 11.0,
        "clearRects": ((88.0, 444.0, 145.0, 534.0),),
        "texts": (
            ("41.0", 92.4, 448.15, "lt"),
            ("4.10", 92.4, 472.16, "lt"),
            ("0.41", 92.4, 496.16, "lt"),
            ("0.041", 92.39, 520.16, "lt"),
        ),
    },
    (
        "642a84bfe71eca05c10dcfabea2f5abacd7abd041067ae136446c46fbb87ea1d",
        42,
    ): {
        "policyId": "2017-g5-es-q42-choice-values-v1",
        "sourcePage": 29,
        "box": (28.0, 282.6, 584.0, 702.372),
        "fontSize": 11.0,
        "clearRects": ((88.0, 361.0, 140.0, 452.0),),
        "texts": (
            ("70", 92.4, 365.25, "lt"),
            ("180", 92.4, 389.26, "lt"),
            ("290", 92.44, 413.26, "lt"),
            ("780", 92.31, 437.26, "lt"),
        ),
    },
    (
        "8c464ae6cc63b4edbae96ba3649900b09f30b6bca5481db8c1e50afa50b1b0c8",
        34,
    ): {
        "policyId": "2017-g6-es-q34-table-values-v1",
        "sourcePage": 28,
        "box": (28.0, 50.85, 584.0, 473.4),
        "fontSize": 10.0,
        "clearRects": (
            (176.0, 156.0, 256.8, 177.8),
            (176.0, 179.0, 256.8, 202.8),
            (176.0, 204.0, 256.8, 225.8),
            (176.0, 227.0, 256.8, 249.5),
            (176.0, 311.0, 256.8, 332.5),
            (176.0, 334.0, 256.8, 356.5),
            (176.0, 358.0, 256.8, 380.5),
            (176.0, 382.0, 256.8, 405.5),
            (429.0, 157.0, 510.3, 179.5),
            (429.0, 181.0, 510.3, 202.5),
            (429.0, 204.0, 510.3, 226.5),
            (429.0, 228.0, 510.3, 249.5),
            (431.3, 313.0, 512.8, 334.5),
            (431.3, 336.0, 512.8, 358.5),
            (431.3, 360.0, 512.8, 382.5),
            (431.3, 384.0, 512.8, 405.8),
        ),
        "texts": (
            ("$17.50", 216.35, 166.9, "mm"),
            ("$35.00", 216.35, 190.9, "mm"),
            ("$52.50", 216.35, 214.9, "mm"),
            ("$70.00", 216.35, 238.3, "mm"),
            ("$17.50", 216.35, 321.5, "mm"),
            ("$17.50", 216.35, 345.0, "mm"),
            ("$17.50", 216.35, 369.0, "mm"),
            ("$17.50", 216.35, 393.6, "mm"),
            ("$16.50", 469.6, 168.0, "mm"),
            ("$17.50", 469.6, 191.5, "mm"),
            ("$18.50", 469.6, 215.0, "mm"),
            ("$19.50", 469.6, 238.5, "mm"),
            ("$8.75", 472.1, 323.6, "mm"),
            ("$17.50", 472.1, 347.1, "mm"),
            ("$26.25", 472.1, 371.1, "mm"),
            ("$35.00", 472.1, 394.8, "mm"),
        ),
    },
}


def apply_verified_modern_crop_repairs(
    *,
    pdf_path: Path,
    year: int,
    grade: int,
    language: str,
    boxes: Mapping[int, tuple[int, tuple[float, float, float, float]]],
) -> tuple[
    dict[int, tuple[int, tuple[float, float, float, float]]],
    dict[int, tuple[float, float]],
]:
    """Apply exact-source crop extensions for reviewed released-booklet defects."""

    repaired = dict(boxes)
    footer_masks: dict[int, tuple[float, float]] = {}
    entries = [
        (key, value)
        for key, value in _VERIFIED_MODERN_CROP_REPAIRS.items()
        if key[:3] == (year, grade, language)
    ]
    if not entries:
        return repaired, footer_masks
    actual_source_hash = sha256_file(pdf_path)
    for (_, _, _, number), record in entries:
        if actual_source_hash != record["sourcePdfSha256"]:
            raise ImportFailure(
                f"Verified crop repair source changed for {year} grade {grade} "
                f"{language} q{number}; re-audit the official PDF"
            )
        actual = repaired.get(number)
        expected = (int(record["sourcePage"]), tuple(record["oldBox"]))
        if actual is None or (
            actual[0] != expected[0]
            or tuple(round(float(value), 3) for value in actual[1])
            != tuple(round(float(value), 3) for value in expected[1])
        ):
            raise ImportFailure(
                f"Verified crop repair geometry changed for {year} grade {grade} "
                f"{language} q{number}; re-audit marker detection"
            )
        repaired[number] = (actual[0], tuple(record["newBox"]))
        if "footerMask" in record:
            footer_masks[number] = tuple(record["footerMask"])
    return repaired, footer_masks


def verified_text_overlay_repairs(
    *,
    source_pdf_sha256: str,
    boxes: Mapping[int, tuple[int, tuple[float, float, float, float]]],
) -> dict[int, dict[str, Any]]:
    """Select and validate exact-source repairs for malformed PDF glyph layers."""

    selected: dict[int, dict[str, Any]] = {}
    for (expected_source_hash, number), record in _VERIFIED_TEXT_OVERLAY_REPAIRS.items():
        if expected_source_hash != source_pdf_sha256 or number not in boxes:
            continue
        source_page, box = boxes[number]
        expected_box = tuple(record["box"])
        if source_page != record["sourcePage"] or tuple(
            round(float(value), 3) for value in box
        ) != tuple(round(float(value), 3) for value in expected_box):
            raise ImportFailure(
                f"Verified text-overlay geometry changed for q{number}; "
                "re-audit the malformed official PDF"
            )
        if number in selected:
            raise AssertionError(f"Duplicate verified text-overlay repair for q{number}")
        for rectangle in record["clearRects"]:
            if (
                len(rectangle) != 4
                or not box[0] <= rectangle[0] < rectangle[2] <= box[2]
                or not box[1] <= rectangle[1] < rectangle[3] <= box[3]
            ):
                raise ImportFailure(f"Verified text-overlay rectangle is invalid for q{number}")
        for text, left, top, anchor in record["texts"]:
            if (
                not isinstance(text, str)
                or not text
                or not box[0] <= left <= box[2]
                or not box[1] <= top <= box[3]
                or anchor not in {"lt", "mm"}
            ):
                raise ImportFailure(f"Verified text-overlay text is invalid for q{number}")
        selected[number] = record
    return selected


def apply_verified_text_overlay(
    image: Image.Image,
    *,
    box: tuple[float, float, float, float],
    x_scale: float,
    y_scale: float,
    record: Mapping[str, Any],
) -> Image.Image:
    """Replace only source-audited malformed glyph regions with clean text."""

    result = image.copy()
    draw = ImageDraw.Draw(result)
    for left, top, right, bottom in record["clearRects"]:
        draw.rectangle(
            (
                round((left - box[0]) * x_scale),
                round((top - box[1]) * y_scale),
                round((right - box[0]) * x_scale),
                round((bottom - box[1]) * y_scale),
            ),
            fill="white",
        )
    font = ImageFont.load_default(size=max(8, round(float(record["fontSize"]) * y_scale)))
    for text, left, top, anchor in record["texts"]:
        draw.text(
            (
                round((left - box[0]) * x_scale),
                round((top - box[1]) * y_scale),
            ),
            text,
            fill=(20, 20, 20),
            font=font,
            anchor=anchor,
        )
    return result


def trim_white(image: Image.Image, padding: int = 12) -> Image.Image:
    rgb = image.convert("RGB")
    array = np.asarray(rgb)
    ink = np.any(array < 248, axis=2)
    coordinates = np.argwhere(ink)
    if coordinates.size == 0:
        raise ImportFailure("Rendered question crop is blank")
    y0, x0 = coordinates.min(axis=0)
    y1, x1 = coordinates.max(axis=0) + 1
    x0 = max(0, int(x0) - padding)
    y0 = max(0, int(y0) - padding)
    x1 = min(rgb.width, int(x1) + padding)
    y1 = min(rgb.height, int(y1) + padding)
    return rgb.crop((x0, y0, x1, y1))


def trim_trailing_whitespace(image: Image.Image, padding: int = 24) -> Image.Image:
    """Remove scanner-white space below content without changing its other edges."""

    rgb = image.convert("RGB")
    gray = np.asarray(rgb.convert("L"))
    # 2016 scans contain isolated near-white pixels as dark as 247. Requiring
    # two pixels below 245 on a row ignores that noise but retains thin rules,
    # diagrams, fraction bars, and answer-choice glyphs.
    row_ink = np.count_nonzero(gray < 245, axis=1)
    content_rows = np.flatnonzero(row_ink >= 2)
    if content_rows.size == 0:
        raise ImportFailure("Rendered question crop has no substantive trailing-edge content")
    bottom = min(rgb.height, int(content_rows[-1]) + 1 + padding)
    return rgb if bottom == rgb.height else rgb.crop((0, 0, rgb.width, bottom))


def mask_selectable_footer_words(
    image: Image.Image,
    page: Any,
    box: tuple[float, float, float, float],
    x_scale: float,
    y_scale: float,
) -> Image.Image:
    """Remove only an exact selectable NYSED footer row from a crop.

    Some answer rows overlap the vertical extent of ``GO ON`` at the far
    right of the page.  Expanding the crop far enough to preserve the answer
    therefore also captures the top of that footer.  Mask the narrow positioned
    footer lane instead of globally relaxing clearance or trimming the answer.
    """

    words = page.extract_words(
        x_tolerance=2,
        y_tolerance=2,
        keep_blank_chars=False,
    )
    footer_rows = [
        (top, row)
        for top, row in group_word_rows(words)
        if (
            top > float(page.height) * 0.72
            and re.fullmatch(
                r"\b(?:GO\s*ON|STOP|PARE|SIGA)\b",
                " ".join(str(word["text"]) for word in row).strip(),
                re.IGNORECASE,
            )
        )
    ]
    if not footer_rows:
        return image

    result = image.copy()
    draw = ImageDraw.Draw(result)
    crop_left = round(box[0] * x_scale)
    crop_top = round(box[1] * y_scale)
    for footer_top, row in footer_rows:
        footer_left = min(float(word["x0"]) for word in row)
        # Italic footer glyphs can visibly overshoot pdfplumber's selectable
        # word box.  The overlap crop is allowed only for answer content wholly
        # left of this lane, so mask the padded footer lane through crop-right.
        left = max(0, round((footer_left - 4.0) * x_scale) - crop_left)
        top = max(0, round((footer_top - 4.0) * y_scale) - crop_top)
        right = result.width
        bottom = result.height
        if right > left and bottom > top:
            draw.rectangle((left, top, right, bottom), fill="white")
    return result


def mask_verified_footer_lane(
    image: Image.Image,
    box: tuple[float, float, float, float],
    x_scale: float,
    y_scale: float,
    mask_origin: tuple[float, float],
) -> Image.Image:
    """Mask a source-pinned footer lane without touching left-side answers."""

    left, top = mask_origin
    if not (box[0] < left < box[2] and box[1] < top < box[3]):
        raise ImportFailure("Verified footer mask falls outside its repaired crop")
    result = image.copy()
    draw = ImageDraw.Draw(result)
    pixel_left = max(0, round((left - box[0]) * x_scale))
    pixel_top = max(0, round((top - box[1]) * y_scale))
    draw.rectangle((pixel_left, pixel_top, result.width, result.height), fill="white")
    return result


def validate_image(image: Image.Image, label: str) -> None:
    if image.width < 240 or image.height < 90:
        raise ImportFailure(f"Question crop is implausibly small ({image.width}x{image.height}): {label}")
    gray = image.convert("L")
    stats = ImageStat.Stat(gray)
    if stats.stddev[0] < 4.0:
        raise ImportFailure(f"Question crop has almost no visual content: {label}")
    array = np.asarray(gray)
    ink_fraction = float(np.count_nonzero(array < 245)) / float(array.size)
    if ink_fraction < 0.003:
        raise ImportFailure(f"Question crop is effectively blank ({ink_fraction:.4%} ink): {label}")


def render_question_crops(
    pdf_path: Path,
    boxes: dict[int, tuple[int, tuple[float, float, float, float]]],
    output_directory: Path,
    public_directory: str,
    *,
    dpi: int,
    force: bool,
    script_version: str = SCRIPT_VERSION,
    mask_selectable_footers: bool = False,
    verified_footer_masks: Mapping[int, tuple[float, float]] | None = None,
) -> dict[int, CropResult]:
    verified_footer_masks = dict(verified_footer_masks or {})
    if not set(verified_footer_masks).issubset(boxes):
        raise ImportFailure("Verified footer masks do not match rendered question coverage")
    output_directory.mkdir(parents=True, exist_ok=True)
    manifest_path = output_directory / ".nysed-import.json"
    source_pdf_sha256 = sha256_file(pdf_path)
    text_overlay_repairs = verified_text_overlay_repairs(
        source_pdf_sha256=source_pdf_sha256,
        boxes=boxes,
    )
    expected_manifest = {
        "scriptVersion": script_version,
        "dpi": dpi,
        "sourcePdfSha256": source_pdf_sha256,
        "crops": {
            str(number): {
                "sourcePage": source_page,
                "box": [round(float(value), 3) for value in box],
            }
            for number, (source_page, box) in sorted(boxes.items())
        },
    }
    if mask_selectable_footers:
        expected_manifest["selectableFooterMask"] = "selectable-footer-lane-v1"
    if verified_footer_masks:
        expected_manifest["verifiedFooterMasks"] = {
            str(number): [round(float(value), 3) for value in origin]
            for number, origin in sorted(verified_footer_masks.items())
        }
    if text_overlay_repairs:
        expected_manifest["verifiedTextOverlays"] = {
            str(number): record["policyId"]
            for number, record in sorted(text_overlay_repairs.items())
        }
    existing_manifest: dict[str, Any] | None = None
    if manifest_path.exists():
        try:
            existing_manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            existing_manifest = None
    existing_basis = (
        {key: existing_manifest.get(key) for key in expected_manifest}
        if existing_manifest is not None
        else None
    )
    reuse_allowed = not force and existing_basis == expected_manifest
    by_page: dict[int, list[tuple[int, tuple[float, float, float, float]]]] = defaultdict(list)
    for number, (source_page, box) in boxes.items():
        by_page[source_page - 1].append((number, box))
    results: dict[int, CropResult] = {}

    with pdfplumber.open(pdf_path) as pdf:
        for page_index, page_items in sorted(by_page.items()):
            pending = []
            for number, box in page_items:
                destination = output_directory / f"q{number:02d}.webp"
                if destination.exists() and reuse_allowed:
                    try:
                        with Image.open(destination) as existing:
                            existing.load()
                            validate_image(existing, str(destination))
                            results[number] = CropResult(
                                src=f"{public_directory}/q{number:02d}.webp",
                                width=existing.width,
                                height=existing.height,
                            )
                            continue
                    except Exception:
                        log(f"  Re-rendering invalid cached image {destination}")
                pending.append((number, box, destination))
            if not pending:
                continue
            with PDF_RENDER_LOCK:
                rendered = pdf.pages[page_index].to_image(
                    resolution=dpi,
                    antialias=True,
                ).original.convert("RGB")
            x_scale = rendered.width / float(pdf.pages[page_index].width)
            y_scale = rendered.height / float(pdf.pages[page_index].height)
            for number, box, destination in pending:
                pixel_box = (
                    max(0, round(box[0] * x_scale)),
                    max(0, round(box[1] * y_scale)),
                    min(rendered.width, round(box[2] * x_scale)),
                    min(rendered.height, round(box[3] * y_scale)),
                )
                raw_question = rendered.crop(pixel_box)
                if mask_selectable_footers:
                    raw_question = mask_selectable_footer_words(
                        raw_question,
                        pdf.pages[page_index],
                        box,
                        x_scale,
                        y_scale,
                    )
                if number in verified_footer_masks:
                    raw_question = mask_verified_footer_lane(
                        raw_question,
                        box,
                        x_scale,
                        y_scale,
                        verified_footer_masks[number],
                    )
                if number in text_overlay_repairs:
                    raw_question = apply_verified_text_overlay(
                        raw_question,
                        box=box,
                        x_scale=x_scale,
                        y_scale=y_scale,
                        record=text_overlay_repairs[number],
                    )
                question = trim_trailing_whitespace(trim_white(raw_question))
                validate_image(question, f"{pdf_path.name} question {number}")
                temporary = unique_temp_path(destination.parent, f".{destination.name}.", ".tmp")
                try:
                    question.save(temporary, format="WEBP", lossless=True, method=6)
                    temporary.replace(destination)
                finally:
                    temporary.unlink(missing_ok=True)
                results[number] = CropResult(
                    src=f"{public_directory}/q{number:02d}.webp",
                    width=question.width,
                    height=question.height,
                )

    if set(results) != set(boxes):
        raise ImportFailure(f"Rendered image parity failure for {pdf_path}")
    expected_names = {f"q{number:02d}.webp" for number in boxes}
    for stale in output_directory.glob("q*.webp"):
        if stale.is_file() and stale.name not in expected_names:
            stale.unlink()
    final_manifest = dict(expected_manifest)
    final_manifest["outputs"] = {
        str(number): {"width": result.width, "height": result.height}
        for number, result in sorted(results.items())
    }
    # ELA's deterministic offline replay stores OCR-derived accessibility
    # text beside the render basis. Preserve it only when that complete basis
    # still matches; changed source/crops/DPI/version or --force deliberately
    # invalidate the cache before extract_alt_texts runs.
    if reuse_allowed and existing_manifest is not None:
        cached_alt_text = existing_manifest.get("altText")
        if (
            isinstance(cached_alt_text, dict)
            and set(cached_alt_text) == {str(number) for number in boxes}
            and all(isinstance(value, str) for value in cached_alt_text.values())
        ):
            final_manifest["altText"] = cached_alt_text
        cached_ela_stem_heads = existing_manifest.get("elaStemHeadText")
        expected_alt_keys = {str(number) for number in boxes}
        if (
            isinstance(cached_ela_stem_heads, dict)
            and cached_ela_stem_heads
            and set(cached_ela_stem_heads).issubset(expected_alt_keys)
            and all(
                isinstance(value, str) and value.strip()
                for value in cached_ela_stem_heads.values()
            )
        ):
            final_manifest["elaStemHeadText"] = cached_ela_stem_heads
    atomic_write_json(manifest_path, final_manifest)
    return results


_KNOWN_ACCESSIBILITY_FONT_TRANSLATION = str.maketrans(
    {
        "\uf8eb": "\u239b",  # LEFT PARENTHESIS UPPER HOOK
        "\uf8ec": "\u239c",  # LEFT PARENTHESIS EXTENSION
        "\uf8ed": "\u239d",  # LEFT PARENTHESIS LOWER HOOK
        "\uf8f6": "\u239e",  # RIGHT PARENTHESIS UPPER HOOK
        "\uf8f7": "\u239f",  # RIGHT PARENTHESIS EXTENSION
        "\uf8f8": "\u23a0",  # RIGHT PARENTHESIS LOWER HOOK
        "\uf032": "\u25b3",  # TRIANGLE (legacy Mathematical Pi encoding)
        "\uf056": "\u25b3",  # TRIANGLE (modern Mathematical Pi encoding)
        "\uf0f5": "\u25b3",  # TRIANGLE (legacy Mathematical Pi encoding)
        "\ue0f5": None,  # Decorative equation-editor line start
        "\ue0f6": None,  # Decorative equation-editor line extension
        "\ue0f7": None,  # Decorative equation-editor line end
    }
)


def normalize_known_accessibility_font_glyphs(text: str) -> str:
    """Normalize only reviewed PUA glyphs whose visual meaning is known."""

    return text.translate(_KNOWN_ACCESSIBILITY_FONT_TRANSLATION)


def has_unsafe_accessibility_characters(text: str) -> bool:
    """Reject PDF font artifacts that cannot be exposed as readable alt text."""

    return any(
        unicodedata.category(character) == "Co"
        or (
            unicodedata.category(character) == "Cc"
            and character not in {"\t", "\n", "\r"}
        )
        for character in text
    )


def clean_alt_text(text: str, number: int, language: Literal["en", "es"]) -> str:
    text = normalize_known_accessibility_font_glyphs(text)
    if has_unsafe_accessibility_characters(text):
        raise ImportFailure(
            f"Accessibility text contains unreadable PDF font characters for question {number}"
        )
    # Booklet chrome appears on a line by itself. Restrict cleanup to those
    # lines so real question language such as "the ferry will stop" survives.
    text = re.sub(
        r"^[ \t]*(?:GO[ \t]+ON|STOP|PARE)[ \t]*$",
        " ",
        text,
        flags=re.IGNORECASE | re.MULTILINE,
    )
    text = re.sub(
        r"^[ \t]*(?:Session|Sesión)[ \t]+[12][ \t]*$",
        " ",
        text,
        flags=re.IGNORECASE | re.MULTILINE,
    )
    text = re.sub(
        r"^[ \t]*(?:Page|Página)[ \t]+\d+[ \t]*$",
        " ",
        text,
        flags=re.IGNORECASE | re.MULTILINE,
    )
    text = " ".join(text.replace("|", " ").split())
    prefix = f"Question {number}." if language == "en" else f"Pregunta {number}."
    if text.startswith(str(number)):
        text = text[len(str(number)) :].lstrip(" .:-")
    value = f"{prefix} {text}".strip()[:1800]
    if LEAK_RE.search(value):
        raise ImportFailure(f"Answer metadata leaked into accessibility text for question {number}")
    return value


def extract_alt_texts(
    pdf_path: Path,
    boxes: dict[int, tuple[int, tuple[float, float, float, float]]],
    image_directory: Path,
    language: Literal["en", "es"],
    tesseract_binary: str | None,
    *,
    cache: bool = False,
) -> dict[int, str]:
    manifest_path = image_directory / ".nysed-import.json"
    if cache and manifest_path.exists():
        try:
            manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
            cached = manifest.get("altText")
            if (
                isinstance(cached, dict)
                and set(cached) == {str(number) for number in boxes}
                and all(isinstance(value, str) for value in cached.values())
            ):
                results = {
                    int(number): normalize_known_accessibility_font_glyphs(value)
                    for number, value in cached.items()
                }
                if all(
                    len(re.sub(r"[^A-Za-zÀ-ÿ0-9]", "", value)) >= 24
                    and not LEAK_RE.search(value)
                    and not has_unsafe_accessibility_characters(value)
                    for value in results.values()
                ):
                    return results
        except (OSError, ValueError, json.JSONDecodeError):
            pass

    results: dict[int, str] = {}
    with pdfplumber.open(pdf_path) as pdf:
        for number, (source_page, box) in sorted(boxes.items()):
            text = pdf.pages[source_page - 1].crop(box).extract_text(
                x_tolerance=2,
                y_tolerance=3,
            ) or ""
            text = normalize_known_accessibility_font_glyphs(text)
            substantive = (
                len(re.sub(r"[^A-Za-zÀ-ÿ0-9]", "", text)) >= 32
                and not has_unsafe_accessibility_characters(text)
            )
            if not substantive:
                if not tesseract_binary:
                    raise ImportFailure(
                        f"Question {number} in {pdf_path} needs OCR-derived alt text, but Tesseract is unavailable"
                    )
                image_path = image_directory / f"q{number:02d}.webp"
                result = subprocess.run(
                    [tesseract_binary, str(image_path), "stdout", "--psm", "6"],
                    check=False,
                    capture_output=True,
                    text=True,
                )
                if result.returncode != 0:
                    raise ImportFailure(
                        f"Tesseract alt-text OCR failed for {image_path}: {result.stderr}"
                    )
                text = result.stdout
            alt = clean_alt_text(text, number, language)
            if len(re.sub(r"[^A-Za-zÀ-ÿ0-9]", "", alt)) < 24:
                raise ImportFailure(f"Accessibility text is not substantive for {pdf_path} question {number}")
            results[number] = alt
    if set(results) != set(boxes):
        raise AssertionError("Alt-text parity postcondition failed")
    if cache:
        try:
            manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as exc:
            raise ImportFailure(
                f"Cannot cache accessibility text without a valid render manifest: {manifest_path}"
            ) from exc
        manifest["altText"] = {
            str(number): value for number, value in sorted(results.items())
        }
        atomic_write_json(manifest_path, manifest)
    return results


def localized_exam_copy(year: int, grade: int) -> tuple[dict[str, str], dict[str, str], dict[str, str]]:
    title = {
        "en": f"New York Grade {grade} Math — {year} Released Questions",
        "es": f"Matemáticas de Nueva York, grado {grade} — preguntas publicadas de {year}",
    }
    description = {
        "en": (
            f"Practice the multiple-choice questions officially released from the {year} "
            f"New York State Grade {grade} Mathematics Test."
        ),
        "es": (
            f"Practica las preguntas de opción múltiple publicadas oficialmente del examen de "
            f"Matemáticas de {grade}.º grado del Estado de Nueva York de {year}."
        ),
    }
    source_title = {
        "en": f"{year} NYS Grade {grade} Mathematics Test Released Questions",
        "es": f"Preguntas publicadas del examen de Matemáticas de {grade}.º grado del Estado de Nueva York de {year}",
    }
    return title, description, source_title


def question_json(
    year: int,
    grade: int,
    map_item: MapItem,
    source_page: int,
    english_image: CropResult,
    spanish_image: CropResult | None,
    english_alt: str,
    spanish_alt: str | None,
) -> dict[str, Any]:
    image: dict[str, Any] = {
        "en": dataclasses.asdict(english_image),
    }
    if spanish_image is not None:
        image["es"] = dataclasses.asdict(spanish_image)
    alt = {"en": english_alt}
    if spanish_alt is not None:
        alt["es"] = spanish_alt
    result: dict[str, Any] = {
        "id": f"nysed-{year}-g{grade}-mc-q{map_item.number}",
        "number": map_item.number,
        "session": map_item.session,
        "sourceNumberKind": "official" if map_item.session is not None else "release-ordinal",
        "sourcePage": source_page,
        "primaryStandard": map_item.primary_standard,
        "domain": standard_domain(map_item.primary_standard),
        "correct": map_item.key,
        "image": image,
        "alt": alt,
    }
    if map_item.secondary_standards:
        result["secondaryStandards"] = list(map_item.secondary_standards)
    return result


def verified_choice_labels_for_question(
    *,
    question_id: str,
    source_pdf_sha256: str,
    question_image_sha256: str,
) -> list[str] | None:
    """Return an exact-source reviewed choice-label variant, if one exists."""

    record = VERIFIED_CHOICE_LABEL_VARIANTS.get(question_id)
    if record is None:
        return None
    if source_pdf_sha256 != record["sourcePdfSha256"]:
        raise ImportFailure(
            f"Verified choice-label source changed for {question_id}; "
            "re-audit the official PDF"
        )
    if question_image_sha256 != record["questionImageSha256"]:
        raise ImportFailure(
            f"Verified choice-label crop changed for {question_id}; "
            "re-audit the rendered question"
        )
    return list(record["choiceLabels"])


def attach_verified_choice_labels(
    questions: Sequence[dict[str, Any]],
    *,
    year: int,
    grade: int,
    source_pdf: Path,
    asset_root: Path,
) -> None:
    """Attach only reviewed non-default choice labels to generated questions."""

    expected_records = {
        question_id: record
        for question_id, record in VERIFIED_CHOICE_LABEL_VARIANTS.items()
        if (record["year"], record["grade"]) == (year, grade)
    }
    if not expected_records:
        if any("choiceLabels" in question for question in questions):
            raise ImportFailure(f"Unexpected choice-label variant in {year} grade {grade}")
        return

    questions_by_id = {str(question.get("id")): question for question in questions}
    if set(expected_records) - set(questions_by_id):
        raise ImportFailure(f"Verified choice-label question is missing in {year} grade {grade}")
    if any("choiceLabels" in question for question in questions):
        raise ImportFailure(f"Choice labels were attached before source verification in {year} grade {grade}")

    source_pdf_sha256 = sha256_file(source_pdf)
    for question_id, record in expected_records.items():
        number = int(record["number"])
        image_path = asset_root / str(year) / f"grade-{grade}" / "en" / f"q{number:02d}.webp"
        if not image_path.is_file() or image_path.is_symlink():
            raise ImportFailure(f"Missing or unsafe verified choice-label crop: {image_path}")
        labels = verified_choice_labels_for_question(
            question_id=question_id,
            source_pdf_sha256=source_pdf_sha256,
            question_image_sha256=sha256_file(image_path),
        )
        if labels is None:
            raise AssertionError("Verified choice-label record disappeared during attachment")
        question = questions_by_id[question_id]
        if question.get("number") != number or question.get("correct") not in labels:
            raise ImportFailure(f"Verified choice-label metadata changed for {question_id}")
        question["choiceLabels"] = labels


def _math_explanation_asset_path(
    asset_root: Path,
    src: Any,
    *,
    year: int,
    grade: int,
    language: Literal["en", "es"],
    number: int,
    label: str,
) -> Path:
    expected_src = (
        f"{APP_PUBLIC_PREFIX}/{year}/grade-{grade}/{language}/q{number:02d}.webp"
    )
    if src != expected_src:
        raise ImportFailure(
            f"{label} path changed: expected {expected_src!r}, got {src!r}"
        )
    relative = Path(str(src)[len(f"{APP_PUBLIC_PREFIX}/") :])
    path = Path(asset_root) / relative
    if not path.is_file() or path.is_symlink():
        raise ImportFailure(f"Missing or unsafe {label}: {path}")
    root = Path(asset_root)
    for parent in path.parents:
        if parent == root:
            break
        if parent.is_symlink():
            raise ImportFailure(f"Unsafe symlink in {label} path: {parent}")
    else:
        raise ImportFailure(f"{label} is outside the math asset root: {path}")
    return path


def build_exam_explanation_input_hashes(
    exam: dict[str, Any],
    asset_root: Path,
) -> dict[str, str]:
    """Hash the exact localized question inputs behind each authored explanation."""

    year = exam.get("year")
    grade = exam.get("grade")
    exam_id = exam.get("id")
    if (
        not isinstance(year, int)
        or isinstance(year, bool)
        or year < 2015
        or not isinstance(grade, int)
        or isinstance(grade, bool)
        or grade not in GRADES
        or not isinstance(exam_id, str)
        or not exam_id
    ):
        raise ImportFailure("Malformed 2015+ math exam while hashing explanations")
    languages = exam.get("supportedLanguages")
    if languages not in (["en"], ["en", "es"]):
        raise ImportFailure(
            f"Invalid explanation language coverage in {exam_id}: {languages!r}"
        )
    expected_language_keys = set(languages)
    questions = exam.get("questions")
    if not isinstance(questions, list) or not questions:
        raise ImportFailure(f"Cannot build explanation inputs without questions in {exam_id}")

    input_hashes: dict[str, str] = {}
    for question in questions:
        if not isinstance(question, dict) or not isinstance(question.get("id"), str):
            raise ImportFailure(f"Malformed question while hashing explanations in {exam_id}")
        question_id = str(question["id"])
        if not question_id or question_id in input_hashes:
            raise ImportFailure(f"Duplicate or empty explanation question id {question_id!r}")
        number = question.get("number")
        if not isinstance(number, int) or isinstance(number, bool) or not 1 <= number <= 100:
            raise ImportFailure(f"Question {question_id} has an invalid explanation number")
        image = question.get("image")
        alt = question.get("alt")
        if not isinstance(image, dict) or set(image) != expected_language_keys:
            raise ImportFailure(f"Question {question_id} has invalid localized explanation assets")
        if not isinstance(alt, dict) or set(alt) != expected_language_keys:
            raise ImportFailure(f"Question {question_id} has invalid localized explanation alt text")

        image_hashes: dict[str, str] = {}
        normalized_alts: dict[str, str] = {}
        for language in languages:
            localized_image = image.get(language)
            localized_alt = alt.get(language)
            if not isinstance(localized_image, dict) or set(localized_image) != {
                "src",
                "width",
                "height",
            }:
                raise ImportFailure(
                    f"Question {question_id} has a malformed {language} explanation asset"
                )
            if not isinstance(localized_alt, str) or not localized_alt.strip():
                raise ImportFailure(
                    f"Question {question_id} has empty {language} explanation alt text"
                )
            path = _math_explanation_asset_path(
                asset_root,
                localized_image.get("src"),
                year=year,
                grade=grade,
                language=language,
                number=number,
                label=f"{language} question image for {question_id}",
            )
            try:
                image_hashes[language] = sha256_file(path)
            except OSError as exc:
                raise ImportFailure(f"Could not hash {language} asset for {question_id}: {exc}") from exc
            normalized_alts[language] = localized_alt

        secondary_standards = question.get("secondaryStandards", [])
        if not isinstance(secondary_standards, list) or not all(
            isinstance(standard, str) and standard.strip()
            for standard in secondary_standards
        ):
            raise ImportFailure(f"Question {question_id} has invalid explanation standards")
        try:
            explanation_input = MathQuestionExplanationInput.create(
                question_id=question_id,
                alt_en=normalized_alts["en"],
                alt_es=normalized_alts.get("es"),
                correct=question.get("correct"),
                primary_standard=question.get("primaryStandard"),
                secondary_standards=secondary_standards,
                question_image_en_sha256=image_hashes["en"],
                question_image_es_sha256=image_hashes.get("es"),
            )
            input_hashes[question_id] = math_question_explanation_input_hash(
                explanation_input
            )
        except (MathExplanationError, TypeError, ValueError) as exc:
            raise ImportFailure(
                f"Could not hash explanation inputs for {question_id}: {exc}"
            ) from exc
    return input_hashes


def build_exam_accessibility_input_hashes(
    exam: dict[str, Any],
    asset_root: Path,
) -> tuple[dict[str, str], dict[str, int]]:
    """Hash every localized Grade 3-8 crop reviewed by an accessibility sidecar."""

    year = exam.get("year")
    grade = exam.get("grade")
    exam_id = exam.get("id")
    languages = exam.get("supportedLanguages")
    questions = exam.get("questions")
    if (
        not isinstance(year, int)
        or isinstance(year, bool)
        or year not in YEARS
        or grade not in GRADES
        or not isinstance(exam_id, str)
        or not exam_id
        or languages not in (["en"], ["en", "es"])
        or not isinstance(questions, list)
        or not questions
    ):
        raise ImportFailure("Malformed Grade 3-8 exam while hashing accessibility inputs")

    expected_language_keys = set(languages)
    input_hashes: dict[str, str] = {}
    numbers: dict[str, int] = {}
    for question in questions:
        if not isinstance(question, dict):
            raise ImportFailure(f"Malformed accessibility question in {exam_id}")
        question_id = question.get("id")
        number = question.get("number")
        images = question.get("image")
        if (
            not isinstance(question_id, str)
            or not question_id
            or question_id in input_hashes
            or not isinstance(number, int)
            or isinstance(number, bool)
            or not 1 <= number <= 100
            or not isinstance(images, dict)
            or set(images) != expected_language_keys
        ):
            raise ImportFailure(f"Malformed accessibility inputs in {exam_id}")

        image_hashes: dict[str, str] = {}
        for language in languages:
            localized_image = images.get(language)
            if not isinstance(localized_image, dict):
                raise ImportFailure(f"Malformed {language} accessibility asset for {question_id}")
            path = _math_explanation_asset_path(
                asset_root,
                localized_image.get("src"),
                year=year,
                grade=grade,
                language=language,
                number=number,
                label=f"{language} accessibility image for {question_id}",
            )
            try:
                image_hashes[language] = sha256_file(path)
            except OSError as exc:
                raise ImportFailure(
                    f"Could not hash {language} accessibility asset for {question_id}: {exc}"
                ) from exc
        try:
            input_hashes[question_id] = math_accessibility_input_hash(
                question_id=question_id,
                number=number,
                image_sha256=image_hashes,
                languages=languages,
            )
        except (MathAccessibilityError, TypeError, ValueError) as exc:
            raise ImportFailure(
                f"Could not hash accessibility inputs for {question_id}: {exc}"
            ) from exc
        numbers[question_id] = number
    return input_hashes, numbers


def attach_reviewed_accessibility(
    exam: dict[str, Any],
    asset_root: Path,
    *,
    accessibility_root: Path = DEFAULT_MATH_ACCESSIBILITY_ROOT,
) -> None:
    """Replace unsafe OCR alts with exact-crop, human-reviewed descriptions."""

    year = exam.get("year")
    grade = exam.get("grade")
    exam_id = exam.get("id")
    languages = exam.get("supportedLanguages")
    questions = exam.get("questions")
    if (
        not isinstance(year, int)
        or grade not in GRADES
        or not isinstance(exam_id, str)
        or languages not in (["en"], ["en", "es"])
        or not isinstance(questions, list)
    ):
        raise ImportFailure("Only canonical Grade 3-8 exams may use reviewed accessibility sidecars")

    input_hashes, numbers = build_exam_accessibility_input_hashes(exam, asset_root)
    try:
        descriptions = load_math_exam_accessibility(
            year=year,
            grade=grade,
            exam_id=exam_id,
            languages=languages,
            expected_input_hashes=input_hashes,
            expected_numbers=numbers,
            root=accessibility_root,
        )
    except (MathAccessibilityError, OSError, TypeError, ValueError) as exc:
        raise ImportFailure(f"Math accessibility sidecar failed for {exam_id}: {exc}") from exc

    for question in questions:
        question_id = str(question["id"])
        question["alt"] = descriptions[question_id]


def attach_vine_authored_explanations(
    exam: dict[str, Any],
    asset_root: Path,
    *,
    explanations_root: Path = DEFAULT_MATH_EXPLANATIONS_ROOT,
) -> None:
    """Attach one exactly covering, hash-pinned sidecar to a 2015+ math exam."""

    year = exam.get("year")
    grade = exam.get("grade")
    exam_id = exam.get("id")
    if (
        not isinstance(year, int)
        or isinstance(year, bool)
        or year < 2015
        or not isinstance(grade, int)
        or isinstance(grade, bool)
        or grade not in GRADES
        or not isinstance(exam_id, str)
        or not exam_id
    ):
        raise ImportFailure("Official-rationale math releases must not use authored sidecars")
    questions = exam.get("questions")
    if not isinstance(questions, list) or not all(
        isinstance(question, dict) for question in questions
    ):
        raise ImportFailure(f"Malformed question list while attaching explanations in {exam_id}")
    if any("explanation" in question for question in questions):
        raise ImportFailure(f"Authored explanations would overwrite existing data in {exam_id}")

    expected_input_hashes = build_exam_explanation_input_hashes(exam, asset_root)
    try:
        explanations = load_math_exam_explanations(
            year=year,
            grade=grade,
            exam_id=exam_id,
            expected_input_hashes=expected_input_hashes,
            root=explanations_root,
        )
    except (MathExplanationError, OSError, TypeError, ValueError) as exc:
        raise ImportFailure(f"Math explanation sidecar failed for {exam_id}: {exc}") from exc

    for question in questions:
        question_id = str(question["id"])
        explanation = explanations[question_id]
        if explanation.source != "vine-authored":
            raise ImportFailure(
                f"Authored explanation {question_id} has invalid source {explanation.source}"
            )
        question["explanation"] = {
            "text": {"en": explanation.en, "es": explanation.es},
            "source": explanation.source,
        }


def attach_reviewed_exam_content(exam: dict[str, Any], asset_root: Path) -> None:
    """Attach hash-pinned explanations before replacing source OCR presentation alts."""

    year = exam.get("year")
    grade = exam.get("grade")
    if (
        not isinstance(year, int)
        or isinstance(year, bool)
        or not isinstance(grade, int)
        or isinstance(grade, bool)
    ):
        raise ImportFailure("Malformed exam while attaching reviewed content")

    # Explanation sidecars intentionally pin the importer's source-extracted alt.
    # Accessibility sidecars independently pin the exact localized crop bytes and
    # replace that OCR only after explanation validation has succeeded.
    if year >= 2015:
        attach_vine_authored_explanations(exam, asset_root)
    attach_reviewed_accessibility(exam, asset_root)


def validate_imported_question_explanation(
    year: int,
    question: dict[str, Any],
) -> None:
    """Require canonical localized explanation text and year-specific provenance."""

    question_id = str(question.get("id", ""))
    try:
        explanation = validate_math_question_explanation(
            question.get("explanation"),
            question_id=question_id,
        )
    except (MathExplanationError, TypeError, ValueError) as exc:
        raise ImportFailure(f"Invalid explanation in {question_id}: {exc}") from exc
    if year <= 2014:
        expected_source = (
            "official-nysed-corrected"
            if question_id in OFFICIAL_RATIONALE_SEMANTIC_CORRECTION_IDS
            else "official-nysed"
        )
    else:
        expected_source = "vine-authored"
    if explanation.source != expected_source:
        raise ImportFailure(
            f"Wrong explanation source in {question_id}: "
            f"expected {expected_source}, got {explanation.source}"
        )
    canonical = {
        "text": {"en": explanation.en, "es": explanation.es},
        "source": explanation.source,
    }
    if question.get("explanation") != canonical:
        raise ImportFailure(f"Explanation is not canonically normalized in {question_id}")
    if year <= 2014 and explanation.en != explanation.es:
        raise ImportFailure(
            f"Official English-only rationale must match both localized fields in {question_id}"
        )


def process_modern_exam(
    source: SourceDocument,
    spanish_source: SourceDocument | None,
    cache_root: Path,
    asset_root: Path,
    public_prefix: str,
    *,
    offline: bool,
    force_download: bool,
    force_render: bool,
    dpi: int,
    tesseract_binary: str | None,
) -> tuple[list[dict[str, Any]], dict[str, str], list[str]]:
    english_pdf = get_pdf(source, cache_root, kind="release", offline=offline, force=force_download)
    map_items, map_pages, visible_numbers = parse_item_map(
        english_pdf,
        require_keys=True,
        expected_year=source.year,
        expected_grade=source.grade,
    )
    numbers = [item.number for item in map_items]
    markers = find_question_markers(
        english_pdf,
        visible_numbers,
        map_pages,
        cache_root,
        dpi,
        tesseract_binary,
    )
    all_english_boxes = crop_boxes_from_markers(english_pdf, markers)
    english_boxes = {number: all_english_boxes[number] for number in numbers}
    english_boxes, english_verified_footer_masks = apply_verified_modern_crop_repairs(
        pdf_path=english_pdf,
        year=source.year,
        grade=source.grade,
        language="en",
        boxes=english_boxes,
    )
    language_directory = asset_root / str(source.year) / f"grade-{source.grade}" / "en"
    public_directory = f"{public_prefix}/{source.year}/grade-{source.grade}/en"
    english_images = render_question_crops(
        english_pdf,
        english_boxes,
        language_directory,
        public_directory,
        dpi=dpi,
        force=force_render,
        verified_footer_masks=english_verified_footer_masks,
    )
    english_alts = extract_alt_texts(
        english_pdf,
        english_boxes,
        language_directory,
        "en",
        tesseract_binary,
    )

    spanish_images: dict[int, CropResult] = {}
    spanish_alts: dict[int, str] = {}
    source_urls = {"en": source.release_url}
    supported_languages = ["en"]
    if spanish_source is not None:
        spanish_pdf = get_pdf(
            spanish_source,
            cache_root,
            kind="release",
            offline=offline,
            force=force_download,
        )
        spanish_map_pages_detected = detect_item_map_pages(spanish_pdf)
        inverted_spanish_map_pages = detect_inverted_item_map_pages(
            spanish_pdf,
            expected_year=source.year,
            expected_grade=source.grade,
        )
        if spanish_map_pages_detected and inverted_spanish_map_pages:
            raise ImportFailure(
                f"Spanish release has conflicting normal/inverted item maps for "
                f"{source.year} grade {source.grade}"
            )
        if not spanish_map_pages_detected and not inverted_spanish_map_pages:
            raise ImportFailure(
                f"Spanish release lacks an authoritative item map for {source.year} grade {source.grade}"
            )
        require_english_map_marker_parity = False
        if spanish_map_pages_detected:
            spanish_map_items, spanish_map_pages, spanish_visible_numbers = parse_item_map(
                spanish_pdf,
                require_keys=True,
                expected_year=source.year,
                expected_grade=source.grade,
            )
            if spanish_map_pages != spanish_map_pages_detected:
                raise AssertionError("Spanish map-page detection changed during parsing")
            english_parity = [
                (item.number, item.key, standard_signature(item.primary_standard))
                for item in map_items
            ]
            spanish_parity = [
                (item.number, item.key, standard_signature(item.primary_standard))
                for item in spanish_map_items
            ]
            if english_parity != spanish_parity:
                # NYSED's 2024 Grade 8 Spanish map substitutes a nonexistent
                # question 28 for released question 18. Both actual booklets
                # contain question 18 and omit 28. Accept this one verified map
                # defect only when both defect rows and every unaffected map
                # tuple match exactly; source-marker parity below then proves
                # the Spanish booklet follows the authoritative English map.
                english_defect = next(
                    (item for item in map_items if item.number == 18),
                    None,
                )
                spanish_defect = next(
                    (item for item in spanish_map_items if item.number == 28),
                    None,
                )
                defect_matches = (
                    (source.year, source.grade) == (2024, 8)
                    and english_defect
                    == MapItem(18, 1, "B", "NGLS.Math.Content.NY-8.SP.3", ())
                    and spanish_defect
                    == MapItem(28, 1, "B", "NGLS.Math.Content.NY-8.F.1", ())
                    and [entry for entry in english_parity if entry[0] != 18]
                    == [entry for entry in spanish_parity if entry[0] != 28]
                )
                if not defect_matches:
                    raise ImportFailure(
                        f"English/Spanish answer-map parity failed for "
                        f"{source.year} grade {source.grade}"
                    )
                spanish_visible_numbers = visible_numbers
                require_english_map_marker_parity = True
                log(
                    "  Verified 2024 Grade 8 Spanish item-map q28/q18 defect; "
                    "using English metadata with exact full-booklet marker parity"
                )
        else:
            # The verified inverted map cannot safely supply positioned table
            # rows. Retain only the English map's key/standards and demand that
            # every released English question number (MC and CR) appears once,
            # in order, in the Spanish booklet before cropping the MC subset.
            spanish_map_pages = inverted_spanish_map_pages
            spanish_visible_numbers = visible_numbers
            require_english_map_marker_parity = True
            log(
                f"  Verified inverted Spanish item map for {source.year} grade {source.grade}; "
                "using English metadata with exact full-booklet marker parity"
            )
        spanish_markers = find_question_markers(
            spanish_pdf,
            spanish_visible_numbers,
            spanish_map_pages,
            cache_root,
            dpi,
            tesseract_binary,
            require_exact_gray_box_count=require_english_map_marker_parity,
        )
        if [marker.number for marker in spanish_markers] != spanish_visible_numbers:
            raise ImportFailure(
                f"English/Spanish question-number parity failed for {source.year} grade {source.grade}"
            )
        all_spanish_boxes = crop_boxes_from_markers(spanish_pdf, spanish_markers)
        spanish_boxes = {number: all_spanish_boxes[number] for number in numbers}
        spanish_boxes, spanish_verified_footer_masks = apply_verified_modern_crop_repairs(
            pdf_path=spanish_pdf,
            year=source.year,
            grade=source.grade,
            language="es",
            boxes=spanish_boxes,
        )
        spanish_images = render_question_crops(
            spanish_pdf,
            spanish_boxes,
            asset_root / str(source.year) / f"grade-{source.grade}" / "es",
            f"{public_prefix}/{source.year}/grade-{source.grade}/es",
            dpi=dpi,
            force=force_render,
            verified_footer_masks=spanish_verified_footer_masks,
        )
        spanish_alts = extract_alt_texts(
            spanish_pdf,
            spanish_boxes,
            asset_root / str(source.year) / f"grade-{source.grade}" / "es",
            "es",
            tesseract_binary,
        )
        if set(spanish_images) != set(english_images):
            raise ImportFailure(
                f"English/Spanish rendered-image parity failed for {source.year} grade {source.grade}"
            )
        source_urls["es"] = spanish_source.release_url
        supported_languages.append("es")

    questions = []
    for item in map_items:
        source_page = english_boxes[item.number][0]
        questions.append(
            question_json(
                source.year,
                source.grade,
                item,
                source_page,
                english_images[item.number],
                spanish_images.get(item.number),
                english_alts[item.number],
                spanish_alts.get(item.number),
            )
        )
    attach_verified_choice_labels(
        questions,
        year=source.year,
        grade=source.grade,
        source_pdf=english_pdf,
        asset_root=asset_root,
    )
    return questions, source_urls, supported_languages


def process_annotated_exam(
    source: SourceDocument,
    cache_root: Path,
    asset_root: Path,
    public_prefix: str,
    *,
    offline: bool,
    force_download: bool,
    force_render: bool,
    dpi: int,
    allow_index_defects: bool,
    tesseract_binary: str | None,
    rationale_overrides_path: Path = DEFAULT_MATH_OFFICIAL_RATIONALE_OVERRIDES,
) -> tuple[list[dict[str, Any]], dict[str, str], list[str]]:
    english_pdf = get_pdf(source, cache_root, kind="release", offline=offline, force=force_download)
    annotated = parse_annotated_items(
        english_pdf,
        require_official_rationale=source.year <= 2014,
    )
    rationale_overrides = {}
    if source.year <= 2014:
        try:
            rationale_overrides = load_official_math_rationale_overrides(
                rationale_overrides_path
            )
        except (MathExplanationError, OSError, TypeError, ValueError) as exc:
            raise ImportFailure(
                f"Official rationale repairs failed validation: {exc}"
            ) from exc

    def released_order_pairs() -> list[tuple[AnnotatedItem, MapItem]]:
        # Old annotated PDFs publish a numbered released subset, not a test
        # booklet. A null session explicitly marks that the separate item map
        # could not prove an operational alignment.
        return [
            (
                item,
                MapItem(
                    number=ordinal,
                    session=None,
                    key=item.key,
                    primary_standard=annotation_standard_fallback(item.raw_standard),
                    secondary_standards=(),
                ),
            )
            for ordinal, item in enumerate(annotated, start=1)
        ]

    pairs: list[tuple[AnnotatedItem, MapItem]]
    if source.item_map_url and not source.item_map_link_mismatch:
        map_pdf = get_pdf(source, cache_root, kind="map", offline=offline, force=force_download)
        map_items, _, _ = parse_item_map(
            map_pdf,
            require_keys=False,
            expected_year=source.year,
            expected_grade=source.grade,
        )
        try:
            pairs, ambiguous = align_annotated_items(annotated, map_items)
        except ImportFailure as exc:
            if str(exc) != "Could not align annotated released items to the official item map":
                raise
            # Some annotated releases group items pedagogically instead of in
            # operational booklet order. When their standards cannot form a
            # monotonic subsequence of the separate map, the map cannot prove
            # a question number/session. Retain the published release order.
            log(
                f"  Warning: old-map alignment cannot be proven for {source.year} grade {source.grade}; "
                "using released-item ordinals and annotation metadata (session unknown)"
            )
            pairs = released_order_pairs()
            ambiguous = False
        if ambiguous:
            log(
                f"  Warning: old-map alignment is non-unique for {source.year} grade {source.grade}; "
                "using released-item ordinals and annotation metadata (session unknown)"
            )
            pairs = released_order_pairs()
    else:
        if not allow_index_defects:
            detail = "mismatched" if source.item_map_link_mismatch else "missing"
            raise ImportFailure(
                f"NYSED's {source.year} grade {source.grade} item-map link is {detail}. "
                "Re-run with --allow-index-defects to use the annotated release's own "
                "question order/key/standard metadata."
            )
        log(
            f"  Warning: official item-map link is unusable for {source.year} grade {source.grade}; "
            "using numbered released-item order and annotation metadata"
        )
        pairs = released_order_pairs()

    boxes = {map_item.number: (item.source_page, item.crop_box) for item, map_item in pairs}
    if len(boxes) != len(pairs):
        raise ImportFailure(f"Old-map alignment produced duplicate question numbers for {source.year} grade {source.grade}")
    boxes, verified_footer_masks = apply_verified_modern_crop_repairs(
        pdf_path=english_pdf,
        year=source.year,
        grade=source.grade,
        language="en",
        boxes=boxes,
    )
    images = render_question_crops(
        english_pdf,
        boxes,
        asset_root / str(source.year) / f"grade-{source.grade}" / "en",
        f"{public_prefix}/{source.year}/grade-{source.grade}/en",
        dpi=dpi,
        force=force_render,
        verified_footer_masks=verified_footer_masks,
    )
    alts = extract_alt_texts(
        english_pdf,
        boxes,
        asset_root / str(source.year) / f"grade-{source.grade}" / "en",
        "en",
        tesseract_binary,
    )
    questions: list[dict[str, Any]] = []
    for item, map_item in pairs:
        question = question_json(
            source.year,
            source.grade,
            map_item,
            item.source_page,
            images[map_item.number],
            None,
            alts[map_item.number],
            None,
        )
        if source.year <= 2014:
            if item.official_rationale is None:
                raise ImportFailure(f"Missing official rationale for {question['id']}")
            try:
                explanation = resolve_official_math_rationale(
                    question_id=str(question["id"]),
                    raw_rationale=item.official_rationale,
                    overrides=rationale_overrides,
                )
            except (MathExplanationError, TypeError, ValueError) as exc:
                raise ImportFailure(
                    f"Official rationale repair failed for {question['id']}: {exc}"
                ) from exc
            question["explanation"] = {
                "text": {
                    "en": explanation.en,
                    "es": explanation.es,
                },
                "source": explanation.source,
            }
        questions.append(question)
    return questions, {"en": source.release_url}, ["en"]


def validate_exam_questions(year: int, grade: int, questions: Sequence[dict[str, Any]]) -> None:
    if not questions:
        raise ImportFailure(f"No questions generated for {year} grade {grade}")
    expected_count = EXPECTED_MC_COUNTS[year][grade - 3]
    if len(questions) != expected_count:
        raise ImportFailure(
            f"Official count mismatch for {year} grade {grade}: "
            f"expected {expected_count}, generated {len(questions)}"
        )
    numbers = [int(question["number"]) for question in questions]
    ids = [str(question["id"]) for question in questions]
    if numbers != sorted(numbers) or len(set(numbers)) != len(numbers):
        raise ImportFailure(f"Question numbers are not unique/increasing for {year} grade {grade}")
    if len(set(ids)) != len(ids):
        raise ImportFailure(f"Question IDs are not unique for {year} grade {grade}")
    for question in questions:
        if question["correct"] not in CHOICES:
            raise ImportFailure(f"Invalid answer key in generated question {question['id']}")
        expected_choice_labels = (
            list(VERIFIED_CHOICE_LABEL_VARIANTS[question["id"]]["choiceLabels"])
            if question["id"] in VERIFIED_CHOICE_LABEL_VARIANTS
            else None
        )
        if question.get("choiceLabels") != expected_choice_labels:
            raise ImportFailure(
                f"Invalid choice-label variant in generated question {question['id']}"
            )
        available_choices = expected_choice_labels or list(CHOICES)
        if question["correct"] not in available_choices:
            raise ImportFailure(
                f"Answer key is unavailable in generated question {question['id']}"
            )
        validate_imported_question_explanation(year, question)
        if question["domain"] not in SUPPORTED_DOMAINS:
            raise ImportFailure(f"Invalid domain in generated question {question['id']}")
        primary_standard = str(question["primaryStandard"])
        expected_prefix = "NGLS." if year >= 2023 else "CCSS."
        if (
            not STRICT_STANDARD_RE.fullmatch(primary_standard)
            or not primary_standard.startswith(expected_prefix)
            or standard_domain(primary_standard) != question["domain"]
        ):
            raise ImportFailure(
                f"Malformed/wrong-framework primary standard in {question['id']}: {primary_standard}"
            )
        for secondary in question.get("secondaryStandards", []):
            if (
                not STRICT_STANDARD_RE.fullmatch(str(secondary))
                or not str(secondary).startswith(expected_prefix)
            ):
                raise ImportFailure(f"Malformed secondary standard in {question['id']}: {secondary}")
        number_kind = question.get("sourceNumberKind")
        session = question.get("session")
        if number_kind == "official" and session not in (1, 2):
            raise ImportFailure(f"Invalid official session in generated question {question['id']}")
        if number_kind == "release-ordinal" and session is not None:
            raise ImportFailure(f"Release-ordinal item must have a null session: {question['id']}")
        if number_kind not in ("official", "release-ordinal") or int(question["sourcePage"]) < 1:
            raise ImportFailure(f"Invalid source numbering/page in generated question {question['id']}")
        english = question["image"]["en"]
        if not str(english["src"]).startswith(f"{APP_PUBLIC_PREFIX}/"):
            raise ImportFailure(f"English image path lacks app base path: {question['id']}")
        if english["width"] < 240 or english["height"] < 90:
            raise ImportFailure(f"Invalid image dimensions in generated question {question['id']}")
        english_alt = str(question.get("alt", {}).get("en", ""))
        if len(re.sub(r"[^A-Za-z0-9]", "", english_alt)) < 24:
            raise ImportFailure(f"Missing substantive English alt text: {question['id']}")
        if "es" in question["image"]:
            spanish_alt = str(question.get("alt", {}).get("es", ""))
            if len(re.sub(r"[^A-Za-zÀ-ÿ0-9]", "", spanish_alt)) < 24:
                raise ImportFailure(f"Missing substantive Spanish alt text: {question['id']}")


def generated_at(index_html: str) -> str:
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
        raise ImportFailure("Could not derive deterministic generatedAt from NYSED's Last Updated date")
    month = next(index for index, name in enumerate(calendar.month_name) if name.lower() == match.group(1).lower())
    value = dt.datetime(int(match.group(3)), month, int(match.group(2)), tzinfo=dt.timezone.utc)
    return value.isoformat().replace("+00:00", "Z")


def source_updated_at(index_html: str) -> str:
    return generated_at(index_html).split("T", 1)[0]


def build_exam_json(
    source: SourceDocument,
    questions: list[dict[str, Any]],
    source_urls: dict[str, str],
    supported_languages: list[str],
) -> dict[str, Any]:
    title, description, source_title = localized_exam_copy(source.year, source.grade)
    return {
        "id": f"nysed-{source.year}-grade-{source.grade}-mc-v1",
        "slug": f"{source.year}-grade-{source.grade}-mc",
        "year": source.year,
        "grade": source.grade,
        "standardsFramework": "NGLS" if source.year >= 2023 else "CCLS",
        "title": title,
        "description": description,
        "sourceTitle": source_title,
        "sourceUrl": source_urls,
        "supportedLanguages": supported_languages,
        "questions": questions,
    }


def write_contact_sheets(exam: dict[str, Any], asset_root: Path, qa_root: Path) -> None:
    questions = exam["questions"]
    indexes = sorted({0, len(questions) // 2, len(questions) - 1})
    selected = [questions[index] for index in indexes]
    qa_root.mkdir(parents=True, exist_ok=True)
    for language in exam["supportedLanguages"]:
        panels: list[tuple[str, Image.Image]] = []
        for question in selected:
            number = int(question["number"])
            image_path = (
                asset_root
                / str(exam["year"])
                / f"grade-{exam['grade']}"
                / language
                / f"q{number:02d}.webp"
            )
            with Image.open(image_path) as opened:
                panel = opened.convert("RGB")
                panel = ImageOps.contain(panel, (1100, 520), Image.Resampling.LANCZOS)
                panels.append((f"{exam['year']} Grade {exam['grade']} {language.upper()} — Q{number}", panel.copy()))
        width = max(720, max(panel.width for _, panel in panels) + 40)
        height = sum(panel.height + 58 for _, panel in panels) + 20
        sheet = Image.new("RGB", (width, height), "white")
        draw = ImageDraw.Draw(sheet)
        y = 20
        for label, panel in panels:
            draw.text((20, y), label, fill="black")
            y += 28
            sheet.paste(panel, (20, y))
            y += panel.height + 30
        destination = qa_root / f"{exam['year']}-g{exam['grade']}-{language}.png"
        temporary = unique_temp_path(destination.parent, f".{destination.name}.", ".tmp")
        try:
            sheet.save(temporary, format="PNG", optimize=True)
            temporary.replace(destination)
        finally:
            temporary.unlink(missing_ok=True)


def select_values(values: list[int] | None, allowed: Sequence[int]) -> list[int]:
    if not values:
        return list(allowed)
    invalid = sorted(set(values) - set(allowed))
    if invalid:
        raise ImportFailure(f"Unsupported selection: {invalid}")
    return sorted(set(values))


def parse_args(argv: Sequence[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Import official NYSED Grades 3–8 released math multiple-choice items.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=textwrap.dedent(
            """
            Safety and reproducibility:
              * PDF URLs are read verbatim from NYSED's current index HTML.
              * 2013–2015 keys are cross-checked against item-code suffixes.
              * Every map item must have one source marker and one image crop.
              * Spanish releases must exactly match English question numbers.
              * Proposed crops are rejected if answer-key/annotation text leaks.
              * Existing PDFs and valid WebPs are reused; pass --force-* to rebuild.
            """
        ),
    )
    parser.add_argument("--year", type=int, action="append", help="Import one year; repeat for more.")
    parser.add_argument("--grade", type=int, action="append", help="Import one grade; repeat for more.")
    parser.add_argument("--list", action="store_true", help="Discover and print official links without downloading PDFs.")
    parser.add_argument("--offline", action="store_true", help="Use only already-cached indexes and PDFs.")
    parser.add_argument("--force-download", action="store_true", help="Refresh indexes and PDFs from NYSED.")
    parser.add_argument("--force-render", action="store_true", help="Re-render existing question WebPs.")
    parser.add_argument(
        "--contact-sheets",
        action="store_true",
        help="Write first/middle/last visual-QA sheets below the cache root.",
    )
    parser.add_argument("--allow-partial", action="store_true", help="Write successful exams and report failures.")
    parser.add_argument(
        "--allow-index-defects",
        action="store_true",
        help="Allow annotated-release fallback when NYSED's old item-map link is missing/mismatched.",
    )
    parser.add_argument("--cache-root", type=Path, default=DEFAULT_CACHE_ROOT)
    parser.add_argument("--asset-root", type=Path, default=DEFAULT_ASSET_ROOT)
    parser.add_argument(
        "--output-json",
        type=Path,
        default=None,
        help=(
            "Catalog destination; the production path requires a full year/grade "
            "selection and the default production asset root."
        ),
    )
    parser.add_argument("--dpi", type=int, default=160, help="Question crop resolution (default: 160).")
    parser.add_argument(
        "--jobs",
        type=int,
        default=1,
        help="Process independent year/grade exams concurrently (default: 1, max: 8).",
    )
    parser.add_argument(
        "--tesseract",
        default=shutil.which("tesseract"),
        help="Tesseract binary for scanned marker fallback (auto-detected by default).",
    )
    return parser.parse_args(argv)


def main(argv: Sequence[str] | None = None) -> int:
    args = parse_args(argv or sys.argv[1:])
    years = select_values(args.year, YEARS)
    grades = select_values(args.grade, GRADES)
    if not (96 <= args.dpi <= 300):
        raise ImportFailure("--dpi must be between 96 and 300")
    if not (1 <= args.jobs <= 8):
        raise ImportFailure("--jobs must be between 1 and 8")
    cache_root = args.cache_root.resolve()
    asset_root = args.asset_root.resolve()
    is_full = years == list(YEARS) and grades == list(GRADES)
    output_json = args.output_json
    if output_json is None:
        if args.allow_partial:
            output_json = cache_root / "catalog.partial.json"
        else:
            output_json = DEFAULT_OUTPUT_JSON if is_full else cache_root / "catalog.sample.json"
    output_json = output_json.resolve()
    if not args.list and output_json == DEFAULT_OUTPUT_JSON.resolve():
        if not is_full:
            raise ImportFailure(
                "A partial year/grade selection may not write the production generated catalog"
            )
        if args.allow_partial:
            raise ImportFailure("--allow-partial may not write the production generated catalog")
        if asset_root != DEFAULT_ASSET_ROOT.resolve():
            raise ImportFailure(
                "The production generated catalog requires the default production asset root"
            )

    main_html, _ = load_index(
        MAIN_INDEX_URL,
        cache_root,
        offline=args.offline,
        force=args.force_download,
    )
    spanish_html, _ = load_index(
        SPANISH_INDEX_URL,
        cache_root,
        offline=args.offline,
        force=args.force_download,
    )
    english_documents = parse_index_documents(main_html, MAIN_INDEX_URL, "en")
    spanish_documents = parse_index_documents(spanish_html, SPANISH_INDEX_URL, "es")

    expected_spanish_keys = {(year, grade) for year in SPANISH_YEARS for grade in GRADES}
    missing_spanish = sorted(expected_spanish_keys - set(spanish_documents))
    unexpected_spanish = sorted(set(spanish_documents) - expected_spanish_keys)
    if missing_spanish or unexpected_spanish:
        raise ImportFailure(
            f"Official Spanish index parity changed; missing={missing_spanish}, unexpected={unexpected_spanish}"
        )

    requested = [(year, grade) for year in years for grade in grades]
    missing_english = [key for key in requested if key not in english_documents]
    if missing_english:
        raise ImportFailure(f"Official main index lacks requested English releases: {missing_english}")

    if args.list:
        for key in requested:
            source = english_documents[key]
            spanish = spanish_documents.get(key)
            map_note = source.item_map_url or "embedded in release"
            if source.item_map_link_mismatch:
                map_note += " [INDEX LINK MISMATCH]"
            print(
                json.dumps(
                    {
                        "year": source.year,
                        "grade": source.grade,
                        "en": source.release_url,
                        "es": spanish.release_url if spanish else None,
                        "itemMap": map_note,
                    },
                    ensure_ascii=False,
                )
            )
        return 0

    def process_key(key: tuple[int, int]) -> dict[str, Any]:
        year, grade = key
        source = english_documents[(year, grade)]
        spanish_source = spanish_documents.get((year, grade))
        log(f"Importing {year} grade {grade} ({'English + Spanish' if spanish_source else 'English'})")
        if year <= 2015:
            questions, source_urls, supported = process_annotated_exam(
                source,
                cache_root,
                asset_root,
                APP_PUBLIC_PREFIX,
                offline=args.offline,
                force_download=args.force_download,
                force_render=args.force_render,
                dpi=args.dpi,
                allow_index_defects=args.allow_index_defects,
                tesseract_binary=args.tesseract,
            )
        else:
            questions, source_urls, supported = process_modern_exam(
                source,
                spanish_source,
                cache_root,
                asset_root,
                APP_PUBLIC_PREFIX,
                offline=args.offline,
                force_download=args.force_download,
                force_render=args.force_render,
                dpi=args.dpi,
                tesseract_binary=args.tesseract,
            )
        exam_json = build_exam_json(source, questions, source_urls, supported)
        attach_reviewed_exam_content(exam_json, asset_root)
        validate_exam_questions(year, grade, questions)
        log(f"  Generated {len(questions)} multiple-choice questions for {year} grade {grade}")
        return exam_json

    exams: list[dict[str, Any]] = []
    failures: list[str] = []
    with ThreadPoolExecutor(max_workers=args.jobs, thread_name_prefix="nysed-import") as executor:
        futures: list[tuple[tuple[int, int], Future[dict[str, Any]]]] = [
            (key, executor.submit(process_key, key)) for key in requested
        ]
        for (year, grade), future in futures:
            try:
                exam_json = future.result()
                exams.append(exam_json)
                if args.contact_sheets:
                    write_contact_sheets(exam_json, asset_root, cache_root / "qa")
            except Exception as exc:
                message = f"{year} grade {grade}: {exc}"
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
        raise ImportFailure("Generated catalog IDs are not globally unique")
    is_full = years == list(YEARS) and grades == list(GRADES) and not failures
    if is_full and len(question_ids) != EXPECTED_GRAND_TOTAL:
        raise ImportFailure(
            f"Full catalog count mismatch: expected {EXPECTED_GRAND_TOTAL}, generated {len(question_ids)}"
        )
    if is_full:
        reviewed_accessibility_questions = [
            question
            for exam in exams
            for question in exam["questions"]
        ]
        reviewed_accessibility_localizations = sum(
            len(question["alt"]) for question in reviewed_accessibility_questions
        )
        if (
            len(reviewed_accessibility_questions)
            != EXPECTED_REVIEWED_ACCESSIBILITY_QUESTION_TOTAL
            or reviewed_accessibility_localizations
            != EXPECTED_REVIEWED_ACCESSIBILITY_LOCALIZATION_TOTAL
        ):
            raise ImportFailure(
                "Full reviewed accessibility parity failed: "
                f"expected questions/localizations="
                f"{EXPECTED_REVIEWED_ACCESSIBILITY_QUESTION_TOTAL}/"
                f"{EXPECTED_REVIEWED_ACCESSIBILITY_LOCALIZATION_TOTAL}, got "
                f"{len(reviewed_accessibility_questions)}/"
                f"{reviewed_accessibility_localizations}"
            )
        grade_5_8_accessibility_questions = [
            question
            for exam in exams
            if int(exam["grade"]) in (5, 6, 7, 8)
            for question in exam["questions"]
        ]
        grade_5_8_accessibility_localizations = sum(
            len(question["alt"]) for question in grade_5_8_accessibility_questions
        )
        if (
            len(grade_5_8_accessibility_questions)
            != EXPECTED_GRADE_5_8_ACCESSIBILITY_QUESTION_TOTAL
            or grade_5_8_accessibility_localizations
            != EXPECTED_GRADE_5_8_ACCESSIBILITY_LOCALIZATION_TOTAL
        ):
            raise ImportFailure(
                "Grade 5-8 reviewed accessibility parity failed: expected "
                "questions/localizations="
                f"{EXPECTED_GRADE_5_8_ACCESSIBILITY_QUESTION_TOTAL}/"
                f"{EXPECTED_GRADE_5_8_ACCESSIBILITY_LOCALIZATION_TOTAL}, got "
                f"{len(grade_5_8_accessibility_questions)}/"
                f"{grade_5_8_accessibility_localizations}"
            )
        spanish_total = sum(
            len(exam["questions"])
            for exam in exams
            if "es" in exam["supportedLanguages"]
        )
        if spanish_total != EXPECTED_SPANISH_TOTAL:
            raise ImportFailure(
                f"Spanish catalog count mismatch: expected {EXPECTED_SPANISH_TOTAL}, generated {spanish_total}"
            )
        explanation_sources = [
            str(question.get("explanation", {}).get("source", ""))
            for exam in exams
            for question in exam["questions"]
        ]
        official_total = explanation_sources.count("official-nysed")
        corrected_total = explanation_sources.count("official-nysed-corrected")
        vine_total = explanation_sources.count("vine-authored")
        if (
            official_total != EXPECTED_OFFICIAL_EXPLANATION_TOTAL
            or corrected_total != EXPECTED_OFFICIAL_CORRECTED_EXPLANATION_TOTAL
            or vine_total != EXPECTED_VINE_EXPLANATION_TOTAL
            or len(explanation_sources) != official_total + corrected_total + vine_total
        ):
            raise ImportFailure(
                "Full explanation provenance parity failed: "
                "expected official/corrected/vine="
                f"{EXPECTED_OFFICIAL_EXPLANATION_TOTAL}/"
                f"{EXPECTED_OFFICIAL_CORRECTED_EXPLANATION_TOTAL}/"
                f"{EXPECTED_VINE_EXPLANATION_TOTAL}, got "
                f"{official_total}/{corrected_total}/{vine_total}"
            )
    if failures and not exams:
        raise ImportFailure("All requested exams failed; refusing to write an empty catalog")

    catalog = {
        "schemaVersion": 2,
        "generatedAt": generated_at(main_html),
        "accessedAt": os.environ.get("NYSED_ACCESSED_AT", IMPORT_ACCESSED_AT),
        "sourceUpdatedAt": source_updated_at(main_html),
        "sourceIndexUrl": MAIN_INDEX_URL,
        "exams": exams,
    }
    atomic_write_json(output_json, catalog)
    log(f"Wrote {len(exams)} exams / {len(question_ids)} questions to {output_json}")
    if failures:
        log("Partial import failures:\n  " + "\n  ".join(failures))
        return 2
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except ImportFailure as exc:
        print(f"error: {exc}", file=sys.stderr)
        raise SystemExit(1)

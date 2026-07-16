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
from typing import Any, Iterable, Iterator, Literal, Sequence

import numpy as np
import pdfplumber
from PIL import Image, ImageDraw, ImageOps, ImageStat


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


def parse_annotated_items(pdf_path: Path) -> list[AnnotatedItem]:
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
            raise ImportFailure(
                f"Could not establish exact question-marker parity for {pdf_path}; "
                f"expected {expected}, detected candidate numbers {found}"
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

    Some ELA answer rows overlap the vertical extent of ``GO ON`` at the far
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
) -> dict[int, CropResult]:
    output_directory.mkdir(parents=True, exist_ok=True)
    manifest_path = output_directory / ".nysed-import.json"
    expected_manifest = {
        "scriptVersion": script_version,
        "dpi": dpi,
        "sourcePdfSha256": sha256_file(pdf_path),
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
    if has_unsafe_accessibility_characters(text):
        raise ImportFailure(
            f"Accessibility text contains unreadable PDF font characters for question {number}"
        )
    text = re.sub(r"\b(?:GO\s+ON|STOP|PARE)\b", " ", text, flags=re.IGNORECASE)
    text = re.sub(r"\b(?:Session|Sesión)\s+[12]\b", " ", text, flags=re.IGNORECASE)
    text = re.sub(r"\b(?:Page|Página)\s+\d+\b", " ", text, flags=re.IGNORECASE)
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
                results = {int(number): value for number, value in cached.items()}
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
    language_directory = asset_root / str(source.year) / f"grade-{source.grade}" / "en"
    public_directory = f"{public_prefix}/{source.year}/grade-{source.grade}/en"
    english_images = render_question_crops(
        english_pdf,
        english_boxes,
        language_directory,
        public_directory,
        dpi=dpi,
        force=force_render,
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
        spanish_images = render_question_crops(
            spanish_pdf,
            spanish_boxes,
            asset_root / str(source.year) / f"grade-{source.grade}" / "es",
            f"{public_prefix}/{source.year}/grade-{source.grade}/es",
            dpi=dpi,
            force=force_render,
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
) -> tuple[list[dict[str, Any]], dict[str, str], list[str]]:
    english_pdf = get_pdf(source, cache_root, kind="release", offline=offline, force=force_download)
    annotated = parse_annotated_items(english_pdf)

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
    images = render_question_crops(
        english_pdf,
        boxes,
        asset_root / str(source.year) / f"grade-{source.grade}" / "en",
        f"{public_prefix}/{source.year}/grade-{source.grade}/en",
        dpi=dpi,
        force=force_render,
    )
    alts = extract_alt_texts(
        english_pdf,
        boxes,
        asset_root / str(source.year) / f"grade-{source.grade}" / "en",
        "en",
        tesseract_binary,
    )
    questions = [
        question_json(
            source.year,
            source.grade,
            map_item,
            item.source_page,
            images[map_item.number],
            None,
            alts[map_item.number],
            None,
        )
        for item, map_item in pairs
    ]
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
        validate_exam_questions(year, grade, questions)
        exam_json = build_exam_json(source, questions, source_urls, supported)
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
        spanish_total = sum(
            len(exam["questions"])
            for exam in exams
            if "es" in exam["supportedLanguages"]
        )
        if spanish_total != EXPECTED_SPANISH_TOTAL:
            raise ImportFailure(
                f"Spanish catalog count mismatch: expected {EXPECTED_SPANISH_TOTAL}, generated {spanish_total}"
            )
    if failures and not exams:
        raise ImportFailure("All requested exams failed; refusing to write an empty catalog")

    catalog = {
        "schemaVersion": 1,
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

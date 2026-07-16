#!/usr/bin/env python3
"""Import modern NYSED ELA released multiple-choice questions.

This module owns the 2016-2019 and 2021-2026 English releases. It stores
question-and-choice crops and page-break-free passage images rendered from the
exact, one-based physical PDF page ranges.

The main importer owns archive discovery and calls :func:`import_modern_release`.
"""

from __future__ import annotations

import dataclasses
import hashlib
import io
import json
import re
import subprocess
import tempfile
from difflib import SequenceMatcher
from pathlib import Path
from typing import Any, Sequence

import numpy as np
import pdfplumber
from PIL import Image

try:
    from scripts.import_nysed_math_mc import (
        ImportFailure,
        Marker,
        PDF_RENDER_LOCK,
        SourceDocument,
        atomic_write_bytes,
        atomic_write_json,
        choose_monotonic_markers,
        clean_alt_text,
        crop_boxes_from_markers,
        extract_alt_texts,
        get_pdf,
        gray_box_markers,
        group_word_rows,
        markers_overlap_gray_boxes,
        render_question_crops,
        sha256_file,
        tesseract_candidates,
        tesseract_version,
    )
except ModuleNotFoundError:  # pragma: no cover - permits direct script imports.
    from import_nysed_math_mc import (  # type: ignore[no-redef]
        ImportFailure,
        Marker,
        PDF_RENDER_LOCK,
        SourceDocument,
        atomic_write_bytes,
        atomic_write_json,
        choose_monotonic_markers,
        clean_alt_text,
        crop_boxes_from_markers,
        extract_alt_texts,
        get_pdf,
        gray_box_markers,
        group_word_rows,
        markers_overlap_gray_boxes,
        render_question_crops,
        sha256_file,
        tesseract_candidates,
        tesseract_version,
    )

try:
    from scripts.nysed_ela_image_validation import (
        ElaImageValidationError,
        validate_ela_question_image,
    )
except ModuleNotFoundError:  # pragma: no cover - permits direct script imports.
    from nysed_ela_image_validation import (  # type: ignore[no-redef]
        ElaImageValidationError,
        validate_ela_question_image,
    )

try:
    from scripts.nysed_ela_inventory import (
        ElaInventoryError,
        load_modern_mc_inventory,
    )
except ModuleNotFoundError:  # pragma: no cover - permits direct script imports.
    from nysed_ela_inventory import (  # type: ignore[no-redef]
        ElaInventoryError,
        load_modern_mc_inventory,
    )

try:
    from scripts.nysed_ela_passages import render_passage_assets
except ModuleNotFoundError:  # pragma: no cover - permits direct script imports.
    from nysed_ela_passages import render_passage_assets  # type: ignore[no-redef]


MODERN_YEARS = (2016, 2017, 2018, 2019, 2021, 2022, 2023, 2024, 2025, 2026)
GRADES = (3, 4, 5, 6, 7, 8)
CHOICES = ("A", "B", "C", "D")

# Populated from the authoritative item maps and checked for every import.
# Tuple order is Grades 3, 4, 5, 6, 7, and 8.
EXPECTED_MC_COUNTS: dict[int, tuple[int, int, int, int, int, int]] = {
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
EXPECTED_MODERN_TOTAL = 1_314
if sum(sum(row) for row in EXPECTED_MC_COUNTS.values()) != EXPECTED_MODERN_TOTAL:
    raise AssertionError("Modern ELA count matrix total changed")

CCSS_STANDARD_RE = re.compile(
    r"CCSS\.ELA-Literacy\.(?:RL|RI|L|W|SL)\.[3-8]\.\d+[a-z]?",
    re.IGNORECASE,
)
NGLS_STANDARD_RE = re.compile(
    r"NGLS\.ELA\.Content\.(?:NY-)?[3-8]\.?[A-Z]{1,3}\.?\d+[a-z]?",
    re.IGNORECASE,
)
PASSAGE_INSTRUCTION_RE = re.compile(
    r"Read\s+(?:this|the\s+following|the)\s+"
    r"(?P<kind>story|article|passage|poem|excerpt|text|selection|passages|texts|article\s+and\s+(?:the\s+)?poem)"
    r"[\s\S]{0,160}?Then\s+answer\s+questions?\s+"
    r"(?P<start>\d{1,2})\s+(?:through|to|and|[-\u2013\u2014])\s+(?P<end>\d{1,2})",
    re.IGNORECASE,
)
PASSAGE_LEAK_RE = re.compile(
    r"\bRead\s+(?:this|the\s+following|the)\s+.{0,80}?\banswer\s+questions?\b",
    re.IGNORECASE,
)


@dataclasses.dataclass(frozen=True)
class ElaMapItem:
    number: int
    session: int
    key: str
    primary_standard: str
    secondary_standards: tuple[str, ...]


@dataclasses.dataclass(frozen=True)
class PassageInstruction:
    question_start: int
    question_end: int
    page_start: int
    kind: str


def standards_in_text(value: str) -> list[str]:
    """Return canonical ELA standards in their printed order."""

    normalized = (
        value.replace("\u2013", "-")
        .replace("\u2014", "-")
        .replace("ELA Literacy", "ELA-Literacy")
    )
    # The official 2016 Grade 6 map prints Q24 as
    # ``CCSS.ELA-Literacy L.6.4c`` (a space in place of the separator dot),
    # which the positioned word stream collapses to ``ELA-LiteracyL.6.4c``.
    # Canonicalize only that otherwise-complete standard shape; every result
    # still passes the strict framework/grade checks below.
    normalized = re.sub(
        r"CCSS\.ELA-Literacy\s*(?=(?:RL|RI|L)\.[3-8]\.\d+[a-z]?\b)",
        "CCSS.ELA-Literacy.",
        normalized,
        flags=re.IGNORECASE,
    )
    matches: list[tuple[int, str]] = []
    for pattern in (CCSS_STANDARD_RE, NGLS_STANDARD_RE):
        for match in pattern.finditer(normalized):
            standard = match.group(0)
            if standard.lower().startswith("ccss"):
                _, _, strand, grade, code = standard.split(".")
                standard = f"CCSS.ELA-Literacy.{strand.upper()}.{grade}.{code.lower()}"
            else:
                suffix = standard.split("NGLS.ELA.Content.", 1)[1]
                suffix = re.sub(r"^(NY-)?([3-8])\.?([A-Za-z]+)\.?(\d+)([a-z]?)$", lambda item: (
                    f"{item.group(1) or ''}{item.group(2)}{item.group(3).upper()}"
                    f"{item.group(4)}{item.group(5).lower()}"
                ), suffix, flags=re.IGNORECASE)
                standard = f"NGLS.ELA.Content.{suffix}"
            matches.append((match.start(), standard))
    return list(dict.fromkeys(standard for _, standard in sorted(matches)))


def _standard_grade(standard: str) -> int:
    if standard.startswith("CCSS.ELA-Literacy."):
        match = re.search(r"\.(?:RL|RI|L|W|SL)\.([3-8])\.", standard)
    else:
        match = re.search(r"Content\.(?:NY-)?([3-8])\.?[A-Z]", standard)
    if not match:
        raise ImportFailure(f"Cannot derive grade from ELA standard: {standard}")
    return int(match.group(1))


def _skill_for_standard(standard: str) -> str:
    if standard.startswith("CCSS.ELA-Literacy."):
        match = re.search(r"\.([A-Z]+)\.[3-8]\.(\d+)", standard)
        if not match:
            raise ImportFailure(f"Cannot derive ELA skill from {standard}")
        strand, number_text = match.groups()
    else:
        match = re.search(r"Content\.(?:NY-)?[3-8]\.?([A-Z]+)\.?(\d+)", standard)
        if not match:
            raise ImportFailure(f"Cannot derive ELA skill from {standard}")
        strand, number_text = match.groups()
    if strand in {"L", "SL", "W"}:
        return "language-vocabulary"
    number = int(number_text)
    if 1 <= number <= 3:
        return "key-ideas-details"
    if 4 <= number <= 6:
        return "craft-structure"
    if 7 <= number <= 9:
        return "integration-knowledge"
    raise ImportFailure(f"Unsupported ELA reading standard for learning section: {standard}")


def _looks_like_map_page(text: str) -> bool:
    return bool(
        re.search(r"Map\s+to\s+the\s+Standards", text, re.IGNORECASE)
        or (
            len(standards_in_text(text)) >= 2
            and re.search(r"(?:Multiple\s+Choice|Constructed\s+Response)", text, re.IGNORECASE)
        )
    )


def parse_ela_item_map(
    pdf_path: Path,
    *,
    expected_year: int,
    expected_grade: int,
) -> tuple[list[ElaMapItem], set[int], list[int]]:
    """Parse keyed MC rows plus every visible MC/CR number from embedded maps."""

    map_pages: set[int] = set()
    with pdfplumber.open(pdf_path) as pdf:
        for page_index, page in enumerate(pdf.pages):
            if _looks_like_map_page(page.extract_text() or ""):
                map_pages.add(page_index)
    if not map_pages:
        raise ImportFailure(f"No embedded ELA item map found in {pdf_path}")

    items: dict[int, ElaMapItem] = {}
    visible_numbers: list[int] = []
    map_text: list[str] = []
    current_session = 1
    with pdfplumber.open(pdf_path) as pdf:
        for page_index in sorted(map_pages):
            page = pdf.pages[page_index]
            text = page.extract_text() or ""
            map_text.append(text)
            words = page.extract_words(x_tolerance=2, y_tolerance=2, keep_blank_chars=False)
            for _, row in group_word_rows(words):
                row_text = " ".join(str(word["text"]) for word in row)
                heading = re.search(r"\b(?:Book|Session)\s*([123])\b", row_text, re.IGNORECASE)
                standards = standards_in_text(row_text)
                if heading and not standards:
                    current_session = int(heading.group(1))
                    continue

                left_integers = [
                    (int(str(word["text"])), float(word["x0"]))
                    for word in row
                    if re.fullmatch(r"\d+", str(word["text"]))
                ]
                item_shape = bool(
                    standards
                    or re.search(r"(?:Multiple|Constructed|Response)", row_text, re.IGNORECASE)
                )
                if left_integers and item_shape:
                    number, number_x = min(left_integers, key=lambda value: value[1])
                    is_grade_header = bool(
                        number == expected_grade
                        and re.search(rf"\bGrade\s*{expected_grade}\b", row_text, re.IGNORECASE)
                    )
                    if (
                        1 <= number <= 100
                        and number_x < float(page.width) * 0.45
                        and not is_grade_header
                    ):
                        visible_numbers.append(number)

                if not standards:
                    continue
                standard_word = next(
                    (
                        word for word in row
                        if re.match(r"^(?:CCSS|NGLS)(?:\.|$)", str(word["text"]), re.IGNORECASE)
                    ),
                    None,
                )
                if standard_word is None:
                    continue
                left_tokens = [
                    str(word["text"]).strip(".,:;()")
                    for word in row
                    if float(word["x0"]) < float(standard_word["x0"])
                ]
                integers = [int(token) for token in left_tokens if re.fullmatch(r"\d+", token)]
                keys = [token.upper() for token in left_tokens if token.upper() in CHOICES]
                if not integers or not keys:
                    continue
                has_singular_mc_type = bool(
                    re.search(
                        r"\bMultiple\s+Choice\b(?!\s+Questions?\b)",
                        row_text,
                        re.IGNORECASE,
                    )
                )
                if not has_singular_mc_type:
                    raise ImportFailure(
                        f"Keyed ELA map row lacks explicit Multiple Choice type: {row_text!r}"
                    )
                number = integers[0]
                item = ElaMapItem(
                    number=number,
                    session=current_session,
                    key=keys[-1],
                    primary_standard=standards[0],
                    secondary_standards=tuple(dict.fromkeys(standards[1:])),
                )
                if number in items and items[number] != item:
                    raise ImportFailure(f"Conflicting item-map rows for ELA question {number}")
                items[number] = item

    joined_map_text = "\n".join(map_text)
    if str(expected_year) not in joined_map_text:
        raise ImportFailure(f"ELA item-map year mismatch: expected {expected_year}")
    if not re.search(rf"\bGrade\s*{expected_grade}\b", joined_map_text, re.IGNORECASE):
        raise ImportFailure(f"ELA item-map grade mismatch: expected Grade {expected_grade}")

    result = [items[number] for number in sorted(items)]
    visible = sorted(set(visible_numbers))
    if not result or not visible:
        raise ImportFailure(f"No authoritative ELA item rows found in {pdf_path}")
    if any(item.key not in CHOICES or item.session not in (1, 2) for item in result):
        raise ImportFailure(f"Invalid key/session in ELA item map {pdf_path}")
    if any(_standard_grade(item.primary_standard) != expected_grade for item in result):
        raise ImportFailure(f"Wrong-grade standard in ELA item map {pdf_path}")
    if not set(item.number for item in result).issubset(visible):
        raise ImportFailure(f"ELA map visible-number parity failed in {pdf_path}")
    return result, map_pages, visible


def _ela_gray_strip_runs(
    pixels: np.ndarray[Any, Any],
    scale: float,
    strip_start: float,
) -> list[tuple[int, int]]:
    """Return gray-box row runs for one fixed-width horizontal probe."""

    x0 = max(0, round(strip_start * scale))
    x1 = min(pixels.shape[1], round((strip_start + 31.0) * scale))
    if x1 - x0 < 10:
        return []
    strip = pixels[:, x0:x1]
    gray = (strip >= 140) & (strip <= 245)
    indices = np.flatnonzero(gray.mean(axis=1) >= 0.50)
    runs: list[tuple[int, int]] = []
    if indices.size:
        start = previous = int(indices[0])
        # A two-digit number can split a single gray rectangle into upper and
        # lower runs.  The largest observed split is about 10 points.
        max_gap = max(2, round(13.0 * scale))
        for value in indices[1:]:
            y = int(value)
            if y - previous > max_gap:
                runs.append((start, previous))
                start = y
            previous = y
        runs.append((start, previous))
    return runs


def _ela_gray_box_positions(
    pdf_path: Path,
    map_pages: set[int],
    dpi: int,
    *,
    minimum_count: int | None = None,
) -> list[tuple[int, float, Any]]:
    """Detect ELA number boxes, including split-background two-digit boxes."""

    scale = dpi / 72.0
    positions: list[tuple[int, float, Any]] = []
    shifted_positions: list[tuple[int, float, Any]] = []

    with pdfplumber.open(pdf_path) as pdf:
        for page_index, page in enumerate(pdf.pages):
            if page_index in map_pages:
                continue
            with PDF_RENDER_LOCK:
                rendered = page.to_image(resolution=dpi, antialias=True).original.convert("L")
            pixels = np.asarray(rendered)

            def collect_runs(
                runs: Sequence[tuple[int, int]],
                destination: list[tuple[int, float, Any]],
            ) -> None:
                for start_px, end_px in runs:
                    top = start_px / scale
                    height = (end_px - start_px + 1) / scale
                    if not (
                        17.0 <= height <= 34.0
                        and 35.0 <= top <= float(page.height) - 50.0
                    ):
                        continue
                    box = rendered.crop(
                        (
                            max(0, round(28.0 * scale)),
                            max(0, start_px - round(4.0 * scale)),
                            min(rendered.width, round(82.0 * scale)),
                            min(rendered.height, end_px + round(4.0 * scale)),
                        )
                    )
                    destination.append((page_index, top, box.copy()))

            collect_runs(_ela_gray_strip_runs(pixels, scale, 36.0), positions)
            # A small subset of scanned pages horizontally shifts the same
            # 24-point number box far enough left or right that the fixed
            # primary strip sees less than 50% gray.  Record independent
            # shifted geometry families, but merge them only when the
            # primary/vector geometry undercounts the authoritative visible-
            # item total.  Exact isolated-box OCR still owns every identity.
            collect_runs(_ela_gray_strip_runs(pixels, scale, 24.0), shifted_positions)
            collect_runs(_ela_gray_strip_runs(pixels, scale, 48.0), shifted_positions)

            # Some image-backed constructed-response pages render with an
            # inverted transparency mask, so pixel-color detection cannot see
            # the gray fill even though the PDF retains the exact 24x24-point
            # question-number rectangle.  Use that vector geometry as an
            # independent locator and keep OCR responsible for its identity.
            for rectangle in page.rects:
                width = float(rectangle["x1"]) - float(rectangle["x0"])
                height = float(rectangle["bottom"]) - float(rectangle["top"])
                top = float(rectangle["top"])
                if not (
                    20.0 <= width <= 30.0
                    and 20.0 <= height <= 30.0
                    and 30.0 <= float(rectangle["x0"]) <= 85.0
                    and 35.0 <= top <= float(page.height) - 50.0
                ):
                    continue
                if any(
                    existing_page == page_index and abs(existing_top - top) <= 4.0
                    for existing_page, existing_top, _ in positions
                ):
                    continue
                box = rendered.crop(
                    (
                        max(0, round((float(rectangle["x0"]) - 7.0) * scale)),
                        max(0, round((top - 4.0) * scale)),
                        min(rendered.width, round((float(rectangle["x1"]) + 7.0) * scale)),
                        min(rendered.height, round((float(rectangle["bottom"]) + 4.0) * scale)),
                    )
                )
                positions.append((page_index, top, box.copy()))
    if minimum_count is not None and len(positions) < minimum_count:
        for shifted in shifted_positions:
            page_index, top, _ = shifted
            if any(
                existing_page == page_index and abs(existing_top - top) <= 4.0
                for existing_page, existing_top, _ in positions
            ):
                continue
            positions.append(shifted)
    return sorted(positions, key=lambda value: (value[0], value[1]))


def find_ela_question_markers(
    pdf_path: Path,
    expected_numbers: Sequence[int],
    map_pages: set[int],
    cache_root: Path,
    dpi: int,
    tesseract_binary: str | None,
) -> list[Marker]:
    """Resolve every official marker against ELA's gray number boxes."""

    expected = sorted(expected_numbers)
    expected_set = set(expected)
    candidates: list[Marker] = []
    with pdfplumber.open(pdf_path) as pdf:
        for page_index, page in enumerate(pdf.pages):
            if page_index in map_pages:
                continue
            for word in page.extract_words(
                x_tolerance=1,
                y_tolerance=2,
                keep_blank_chars=False,
                extra_attrs=["size"],
            ):
                token = str(word["text"]).strip().strip(".,")
                if not re.fullmatch(r"\d+", token) or int(token) not in expected_set:
                    continue
                x0 = float(word["x0"])
                top = float(word["top"])
                size = float(word.get("size", word.get("height", 0)))
                if 20 <= x0 <= 100 and 35 <= top <= float(page.height) - 50 and 9.5 <= size <= 20:
                    score = abs(x0 - 44.0) * 0.35 + abs(size - 13.0)
                    candidates.append(Marker(int(token), page_index, top, x0, score, "pdf-text"))

        positions = _ela_gray_box_positions(
            pdf_path,
            map_pages,
            dpi,
            minimum_count=len(expected),
        )
        verified = [
            candidate
            for candidate in candidates
            if markers_overlap_gray_boxes([candidate], positions)
        ]
        chosen = choose_monotonic_markers(expected, verified)
        if chosen is not None and markers_overlap_gray_boxes(chosen, positions):
            return chosen

        chosen = gray_box_markers(
            pdf_path,
            expected,
            map_pages,
            dpi,
            verified,
            cache_root,
            tesseract_binary,
            positions,
        )
        if chosen is not None:
            return chosen
        if not tesseract_binary:
            raise ImportFailure(f"ELA question markers require OCR in {pdf_path}")
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
                f"Could not establish exact ELA marker parity in {pdf_path}; "
                f"expected {expected}, found {found}"
            )
    return chosen


def ela_crop_boxes_from_markers(
    pdf_path: Path,
    markers: Sequence[Marker],
) -> dict[int, tuple[int, tuple[float, float, float, float]]]:
    """Build ELA crops with a bounded guard for the last item on each page.

    The shared raster fallback reserves 28 points above the dashed footer rule.
    In some scanned ELA layouts (notably 2016 Grade 5 Q7), a final D line
    descends into that guard while still ending above ``GO ON``.  Reduce that
    raster-only clearance to 20 points for the page's last question.  When the
    footer is selectable, its exact text-row top provides an 8-point boundary
    without relying on the generic raster detector, which can mistake a final
    answer line for the footer.  The smaller exact-text clearance is required
    for answer lines that legitimately end close to ``GO ON``.  Final-WebP OCR
    independently rejects any footer that is actually captured.
    """

    boxes = crop_boxes_from_markers(pdf_path, markers)
    last_marker_by_page: dict[int, Marker] = {}
    for marker in markers:
        current = last_marker_by_page.get(marker.page_index)
        if current is None or marker.top > current.top:
            last_marker_by_page[marker.page_index] = marker
    with pdfplumber.open(pdf_path) as pdf:
        for page_index, marker in last_marker_by_page.items():
            source_page, box = boxes[marker.number]
            page = pdf.pages[page_index]
            page_words = page.extract_words(
                x_tolerance=2,
                y_tolerance=2,
                keep_blank_chars=False,
            )
            word_rows = group_word_rows(page_words)
            selectable_footer_rows = [
                (top, row)
                for top, row in word_rows
                if (
                    top > float(page.height) * 0.72
                    and re.fullmatch(
                        r"\b(?:GO\s*ON|STOP|PARE|SIGA)\b",
                        " ".join(str(word["text"]) for word in row).strip(),
                        re.IGNORECASE,
                    )
                )
            ]
            bottom = box[3]
            if selectable_footer_rows:
                footer_top, footer_row = min(selectable_footer_rows, key=lambda item: item[0])
                safe_bottom = footer_top - 8.0
                bottom = safe_bottom

                # A small number of releases place the final D row beside and
                # slightly below the top of GO ON (2022 Grade 4 Q3).  Preserve
                # positioned answer words to the left of the footer, extending
                # by at most eight points into the footer row.  Rendering masks
                # only the exact selectable footer word box in this overlap.
                footer_left = min(float(word["x0"]) for word in footer_row)
                content_bottoms = [
                    float(word["bottom"])
                    for word in page_words
                    if (
                        marker.top <= float(word["top"]) < footer_top
                        and float(word["x1"]) < footer_left
                    )
                ]
                if content_bottoms and max(content_bottoms) > safe_bottom:
                    bottom = min(max(content_bottoms) + 2.0, footer_top + 8.0)
            else:
                # The generic raster fallback's 28%-ink trigger can mistake a
                # long final answer line for the footer rule.  ELA's actual
                # dashed rule consistently contributes a much denser row.
                # Re-detect it at 45% and keep a 20-point clearance.
                dpi = 120
                with PDF_RENDER_LOCK:
                    rendered = page.to_image(
                        resolution=dpi,
                        antialias=True,
                    ).original.convert("L")
                scale = dpi / 72.0
                pixels = np.asarray(rendered)
                x0 = round(28.0 * scale)
                x1 = rendered.width - round(28.0 * scale)
                start_y = round(float(page.height) * 0.86 * scale)
                dense_rows = np.flatnonzero(
                    (pixels[start_y:, x0:x1] < 120).mean(axis=1) >= 0.45
                )
                if dense_rows.size:
                    rule_top = (start_y + int(dense_rows[0])) / scale
                    bottom = max(float(page.height) * 0.70, rule_top - 20.0)
                else:
                    bottom = box[3] + 8.0
            bottom = min(float(page.height), bottom)
            boxes[marker.number] = (source_page, (box[0], box[1], box[2], bottom))
    return boxes


def _normalized_page_text(text: str) -> str:
    return " ".join(text.replace("\u00ad", "").split())


def _ocr_page_head(
    pdf_path: Path,
    page: Any,
    page_index: int,
    cache_root: Path,
    dpi: int,
    tesseract_binary: str,
) -> str:
    ocr_dpi = min(max(dpi, 120), 170)
    key = hashlib.sha256(
        (
            f"ela-passage-head-v1:{sha256_file(pdf_path)}:{page_index}:{ocr_dpi}:"
            f"{tesseract_version(tesseract_binary)}"
        ).encode("utf-8")
    ).hexdigest()[:24]
    cache_path = cache_root / "ocr" / f"ela-passage-head-{key}.txt"
    if cache_path.exists():
        return cache_path.read_text(encoding="utf-8", errors="replace")

    cache_path.parent.mkdir(parents=True, exist_ok=True)
    with PDF_RENDER_LOCK:
        rendered = page.to_image(resolution=ocr_dpi, antialias=True).original.convert("RGB")
    head = rendered.crop((0, 0, rendered.width, max(1, round(rendered.height * 0.48))))
    with tempfile.NamedTemporaryFile(suffix=".png", dir=cache_root, delete=False) as temporary:
        image_path = Path(temporary.name)
    try:
        head.save(image_path, format="PNG", optimize=True)
        result = subprocess.run(
            [tesseract_binary, str(image_path), "stdout", "--psm", "6", "-l", "eng"],
            check=False,
            capture_output=True,
            text=True,
        )
        if result.returncode != 0:
            raise ImportFailure(f"Passage-heading OCR failed for {pdf_path} page {page_index + 1}")
        atomic_write_bytes(cache_path, result.stdout.encode("utf-8"))
        return result.stdout
    finally:
        image_path.unlink(missing_ok=True)


def detect_passage_instructions(
    pdf_path: Path,
    *,
    map_pages: set[int],
    marker_pages: set[int],
    cache_root: Path,
    dpi: int,
    tesseract_binary: str | None,
) -> list[PassageInstruction]:
    """Find exact question-range directions without retaining passage content."""

    found: dict[tuple[int, int], PassageInstruction] = {}
    with pdfplumber.open(pdf_path) as pdf:
        for page_index, page in enumerate(pdf.pages):
            if page_index in map_pages or page_index in marker_pages:
                continue
            extracted = page.extract_text() or ""
            candidates = [extracted]
            if tesseract_binary and not PASSAGE_INSTRUCTION_RE.search(_normalized_page_text(extracted)):
                candidates.append(
                    _ocr_page_head(pdf_path, page, page_index, cache_root, dpi, tesseract_binary)
                )
            for candidate in candidates:
                normalized = _normalized_page_text(candidate)
                for match in PASSAGE_INSTRUCTION_RE.finditer(normalized):
                    start = int(match.group("start"))
                    end = int(match.group("end"))
                    if start > end:
                        start, end = end, start
                    instruction = PassageInstruction(start, end, page_index + 1, match.group("kind"))
                    key = (start, end)
                    if key in found and found[key].page_start != instruction.page_start:
                        raise ImportFailure(f"Conflicting ELA passage starts for questions {start}-{end}")
                    found[key] = instruction
    result = sorted(found.values(), key=lambda item: (item.question_start, item.question_end))
    if not result:
        raise ImportFailure(f"No passage question-range directions found in {pdf_path}")
    previous_end = 0
    for instruction in result:
        if instruction.question_start <= previous_end:
            raise ImportFailure(f"Overlapping ELA passage ranges in {pdf_path}")
        previous_end = instruction.question_end
    return result


def _build_stimuli(
    year: int,
    grade: int,
    source_url: str,
    instructions: Sequence[PassageInstruction],
    map_items: Sequence[ElaMapItem],
    marker_source_pages: dict[int, int],
) -> tuple[list[dict[str, Any]], dict[int, str]]:
    mc_numbers = {item.number for item in map_items}
    stimuli: list[dict[str, Any]] = []
    stimulus_by_question: dict[int, str] = {}
    for instruction in instructions:
        matching_mc = sorted(
            number
            for number in mc_numbers
            if instruction.question_start <= number <= instruction.question_end
        )
        if not matching_mc:
            continue
        question_pages = [
            marker_source_pages[number]
            for number in marker_source_pages
            if instruction.question_start <= number <= instruction.question_end
        ]
        if not question_pages:
            raise ImportFailure(
                f"Passage {instruction.question_start}-{instruction.question_end} has no question markers"
            )
        page_end = min(question_pages) - 1
        if page_end < instruction.page_start:
            raise ImportFailure(
                f"Passage page range overlaps questions {instruction.question_start}-{instruction.question_end}"
            )
        first_mc, last_mc = matching_mc[0], matching_mc[-1]
        stimulus_id = f"nysed-ela-{year}-g{grade}-stimulus-{first_mc}-{last_mc}"
        is_set = instruction.kind.lower() in {"passages", "texts", "article and poem", "article and the poem"}
        label = f"Official passage{' set' if is_set else ''} for Questions {first_mc}-{last_mc}"
        stimuli.append(
            {
                "id": stimulus_id,
                "label": label,
                "questionStart": first_mc,
                "questionEnd": last_mc,
                "references": [
                    {
                        "label": label,
                        "sourceUrl": source_url,
                        "pageStart": instruction.page_start,
                        "pageEnd": page_end,
                    }
                ],
            }
        )
        for number in matching_mc:
            if number in stimulus_by_question:
                raise ImportFailure(f"ELA question {number} belongs to two passages")
            stimulus_by_question[number] = stimulus_id

    missing = sorted(mc_numbers - set(stimulus_by_question))
    if missing:
        raise ImportFailure(f"ELA MC questions lack an exact passage range: {missing}")
    return stimuli, stimulus_by_question


def _normalized_word(value: str) -> str:
    return re.sub(r"[^a-z0-9]", "", value.lower())


def _catalog_stem_text(value: str, number: int) -> str:
    return re.sub(
        rf"^\s*Question\s+{number}\s*[.):-]?\s*",
        "",
        value,
        count=1,
        flags=re.IGNORECASE,
    )


def _stem_words(
    value: str,
    number: int,
    *,
    has_catalog_prefix: bool,
) -> tuple[str, ...]:
    if has_catalog_prefix:
        value = _catalog_stem_text(value, number)
    else:
        value = re.sub(
            rf"^\s*(?:Question\s+)?{number}(?=$|[\s.\)\]:_\-])\s*[.\)\]:_\-]*\s*",
            "",
            value,
            count=1,
            flags=re.IGNORECASE,
        )
    words = [_normalized_word(token) for token in value.split()]
    words = [word for word in words if word and not word.isdigit()]
    while words:
        first = words[0]
        is_mangled_number = (
            any(character.isdigit() for character in first)
            and SequenceMatcher(None, first, str(number)).ratio() >= 0.45
        )
        is_scan_artifact = len(first) == 1 and first not in {"a", "i"}
        if not is_mangled_number and not is_scan_artifact:
            return tuple(words)
        words.pop(0)
    return ()


def _stem_word_candidates(
    value: str,
    number: int,
    *,
    has_catalog_prefix: bool,
) -> tuple[str, ...]:
    words = _stem_words(value, number, has_catalog_prefix=has_catalog_prefix)
    if not words:
        return ()
    candidates = [words[0]]
    if words[0] in {"a", "i"} and len(words) > 1:
        # Some embedded NYSED fonts extract a first word with an artificial
        # space (for example ``A ccording``).  Keep the literal one-letter
        # word as the primary candidate for valid stems such as ``A
        # student...`` and add only this tightly scoped joined candidate.
        candidates.append(words[0] + words[1])
    return tuple(dict.fromkeys(candidates))


def _first_stem_word(value: str, number: int, *, has_catalog_prefix: bool) -> str:
    candidates = _stem_word_candidates(
        value,
        number,
        has_catalog_prefix=has_catalog_prefix,
    )
    return candidates[0] if candidates else ""


def _is_one_glyph_ocr_difference(source: str, rendered: str) -> bool:
    if source == rendered or abs(len(source) - len(rendered)) > 1:
        return False
    if len(source) == len(rendered):
        return sum(left != right for left, right in zip(source, rendered)) == 1
    shorter, longer = sorted((source, rendered), key=len)
    return any(longer[:index] + longer[index + 1 :] == shorter for index in range(len(longer)))


def _short_first_word_ocr_match(
    source_words: tuple[str, ...],
    rendered_words: tuple[str, ...],
) -> bool:
    if len(source_words) < 2 or len(rendered_words) < 2:
        return False
    source_first, rendered_first = source_words[0], rendered_words[0]
    if len(source_first) > 2 or not _is_one_glyph_ocr_difference(source_first, rendered_first):
        return False
    return SequenceMatcher(None, source_words[1], rendered_words[1]).ratio() >= 0.8


def _joined_first_words_ocr_match(
    source_words: tuple[str, ...],
    rendered_words: tuple[str, ...],
) -> bool:
    if len(source_words) < 3 or len(rendered_words) < 2:
        return False
    if len(source_words[0]) == 1:
        # One-letter A/I splits are handled by the source-candidate repair,
        # which also replaces the malformed PDF accessibility text.
        return False
    if rendered_words[0] != source_words[0] + source_words[1]:
        return False
    return SequenceMatcher(None, source_words[2], rendered_words[1]).ratio() >= 0.8


def _load_stem_head_cache(image_directory: Path) -> dict[int, str]:
    manifest_path = image_directory / ".nysed-import.json"
    try:
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {}
    raw = manifest.get("elaStemHeadText") if isinstance(manifest, dict) else None
    if not isinstance(raw, dict):
        return {}
    result: dict[int, str] = {}
    for key, value in raw.items():
        if not isinstance(key, str) or not key.isdigit() or not isinstance(value, str):
            continue
        normalized = " ".join(value.split())
        if normalized:
            result[int(key)] = normalized
    return result


def _run_stem_head_ocr(image_path: Path, tesseract_binary: str | None) -> str:
    """Read only the stem head, excluding the gray number box and choices."""

    if not tesseract_binary:
        raise ImportFailure(
            f"ELA stem-head OCR requires Tesseract and has no cached evidence: {image_path}"
        )
    try:
        with Image.open(image_path) as opened:
            opened.load()
            if opened.width <= 90 or opened.height < 40:
                raise ImportFailure(f"ELA image is too small for stem-head OCR: {image_path}")
            stem_head = opened.crop(
                (70, 0, opened.width, min(85, opened.height))
            ).convert("L")
    except ImportFailure:
        raise
    except (OSError, ValueError) as exc:
        raise ImportFailure(f"Could not isolate ELA stem head {image_path}: {exc}") from exc
    stem_head = stem_head.resize(
        (stem_head.width * 2, stem_head.height * 2),
        Image.Resampling.LANCZOS,
    )
    payload = io.BytesIO()
    stem_head.save(payload, format="PNG", optimize=True)
    try:
        result = subprocess.run(
            [
                tesseract_binary,
                "stdin",
                "stdout",
                "--psm",
                "6",
                "-l",
                "eng",
            ],
            input=payload.getvalue(),
            check=False,
            capture_output=True,
            timeout=30,
        )
    except (OSError, subprocess.SubprocessError) as exc:
        raise ImportFailure(f"ELA stem-head OCR failed for {image_path}: {exc}") from exc
    stdout = result.stdout.decode("utf-8", "replace") if isinstance(result.stdout, bytes) else result.stdout
    stderr = result.stderr.decode("utf-8", "replace") if isinstance(result.stderr, bytes) else result.stderr
    if result.returncode != 0:
        raise ImportFailure(
            f"ELA stem-head OCR failed for {image_path}: {(stderr or stdout).strip()}"
        )
    normalized = " ".join((stdout or "").split())
    if len(re.sub(r"[^A-Za-z0-9]", "", normalized)) < 16:
        raise ImportFailure(f"ELA stem-head OCR is not substantive for {image_path}")
    return normalized


def _leading_symbol_stem_tokens(value: str, number: int) -> list[str] | None:
    tokens = _catalog_stem_text(value, number).split()
    if len(tokens) < 2 or _normalized_word(tokens[0]):
        return None
    return tokens


def _stem_head_matches_shifted_source(
    head_words: tuple[str, ...],
    source_words: tuple[str, ...],
) -> bool:
    if len(head_words) < 3 or len(source_words) < 2:
        return False
    if re.fullmatch(r"[a-z]{1,12}", head_words[0]) is None:
        return False
    return (
        SequenceMatcher(None, head_words[1], source_words[0]).ratio() >= 0.8
        and SequenceMatcher(None, head_words[2], source_words[1]).ratio() >= 0.8
    )


def _stem_head_matches_repaired_source(
    head_words: tuple[str, ...],
    source_words: tuple[str, ...],
) -> bool:
    if len(head_words) < 2 or len(source_words) < 2:
        return False
    return (
        SequenceMatcher(None, head_words[0], source_words[0]).ratio() >= 0.8
        and SequenceMatcher(None, head_words[1], source_words[1]).ratio() >= 0.8
    )


def _full_ocr_skips_short_source_head(
    source_words: tuple[str, ...],
    rendered_words: tuple[str, ...],
) -> bool:
    if len(source_words) < 2 or not rendered_words:
        return False
    if re.fullmatch(r"[a-z]{1,2}", source_words[0]) is None:
        return False
    return SequenceMatcher(None, rendered_words[0], source_words[1]).ratio() >= 0.8


def _cache_alt_texts(
    image_directory: Path,
    source_alts: dict[int, str],
    stem_head_texts: dict[int, str] | None = None,
) -> None:
    manifest_path = image_directory / ".nysed-import.json"
    try:
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise ImportFailure(
            f"Cannot repair accessibility cache without a valid render manifest: {manifest_path}"
        ) from exc
    if not isinstance(manifest, dict):
        raise ImportFailure(f"Invalid render manifest for accessibility cache: {manifest_path}")
    manifest["altText"] = {
        str(number): value for number, value in sorted(source_alts.items())
    }
    if stem_head_texts:
        existing = manifest.get("elaStemHeadText")
        cached_heads = dict(existing) if isinstance(existing, dict) else {}
        cached_heads.update(
            {str(number): value for number, value in sorted(stem_head_texts.items())}
        )
        manifest["elaStemHeadText"] = cached_heads
    atomic_write_json(manifest_path, manifest)


def validate_final_question_images(
    image_directory: Path,
    numbers: Sequence[int],
    source_alts: dict[int, str],
    cache_root: Path,
    tesseract_binary: str | None,
    *,
    offline: bool,
) -> None:
    """Validate every final WebP and repair proven PDF text-spacing artifacts."""

    repaired_alt = False
    cached_stem_heads = _load_stem_head_cache(image_directory)
    new_stem_heads: dict[int, str] = {}
    for number in sorted(numbers):
        image_path = image_directory / f"q{number:02d}.webp"
        try:
            result = validate_ela_question_image(
                image_path,
                cache_root,
                tesseract_binary=tesseract_binary,
                expected_question_number=number,
                offline=offline,
            )
        except ElaImageValidationError as exc:
            raise ImportFailure(
                f"Final ELA image validation failed for question {number}: {exc}"
            ) from exc

        source_words = _stem_words(
            source_alts[number],
            number,
            has_catalog_prefix=True,
        )
        rendered_words = _stem_words(
            result.normalized_ocr,
            number,
            has_catalog_prefix=False,
        )
        source_candidates = _stem_word_candidates(
            source_alts[number],
            number,
            has_catalog_prefix=True,
        )
        final_word = rendered_words[0] if rendered_words else ""
        if not source_candidates or not final_word:
            raise ImportFailure(f"Final ELA WebP has no OCR-verifiable question stem: {image_path}")
        similarities = [
            SequenceMatcher(None, candidate, final_word).ratio()
            for candidate in source_candidates
        ]
        short_word_ocr_match = _short_first_word_ocr_match(source_words, rendered_words)
        joined_words_ocr_match = _joined_first_words_ocr_match(source_words, rendered_words)
        normal_stem_match = (
            max(similarities) >= 0.55
            or short_word_ocr_match
            or joined_words_ocr_match
        )
        focused_stem_match = False
        if not normal_stem_match:
            leading_symbol_tokens = _leading_symbol_stem_tokens(source_alts[number], number)
            cached_stem_head = cached_stem_heads.get(number)
            full_ocr_skips_short_head = _full_ocr_skips_short_source_head(
                source_words,
                rendered_words,
            )
            if leading_symbol_tokens is not None:
                stem_head_text = cached_stem_head or _run_stem_head_ocr(
                    image_path,
                    tesseract_binary,
                )
                head_words = _stem_words(
                    stem_head_text,
                    number,
                    has_catalog_prefix=False,
                )
                if _stem_head_matches_shifted_source(head_words, source_words):
                    raw_head_tokens = stem_head_text.split()
                    replacement = (
                        re.sub(r"[^A-Za-z0-9]", "", raw_head_tokens[0])
                        if raw_head_tokens
                        else ""
                    )
                    if _normalized_word(replacement) != head_words[0]:
                        raise ImportFailure(
                            f"ELA stem-head OCR has an ambiguous leading token: {image_path}"
                        )
                    leading_symbol_tokens[0] = replacement
                    source_alts[number] = clean_alt_text(
                        " ".join(leading_symbol_tokens),
                        number,
                        "en",
                    )
                    new_stem_heads[number] = stem_head_text
                    repaired_alt = True
                    focused_stem_match = True
            elif full_ocr_skips_short_head:
                stem_head_text = cached_stem_head or _run_stem_head_ocr(
                    image_path,
                    tesseract_binary,
                )
                head_words = _stem_words(
                    stem_head_text,
                    number,
                    has_catalog_prefix=False,
                )
                focused_stem_match = _stem_head_matches_repaired_source(
                    head_words,
                    source_words,
                )
                if focused_stem_match and cached_stem_head is None:
                    new_stem_heads[number] = stem_head_text
            elif cached_stem_head is not None:
                head_words = _stem_words(
                    cached_stem_head,
                    number,
                    has_catalog_prefix=False,
                )
                focused_stem_match = _stem_head_matches_repaired_source(
                    head_words,
                    source_words,
                )
        if (
            not normal_stem_match
            and not focused_stem_match
        ):
            raise ImportFailure(
                f"Final ELA WebP may have a left-truncated stem: {image_path} "
                f"(source={source_candidates[0]!r}, rendered={final_word!r})"
            )
        if (
            not short_word_ocr_match
            and not joined_words_ocr_match
            and similarities[0] < 0.55
            and max(similarities[1:], default=0.0) >= 0.55
        ):
            source_alts[number] = clean_alt_text(result.fallback_alt, number, "en")
            repaired_alt = True
    if repaired_alt or new_stem_heads:
        _cache_alt_texts(image_directory, source_alts, new_stem_heads)


def _import_modern_pdf(
    release: dict[str, Any],
    pdf_path: Path,
    cache_root: Path,
    asset_root: Path,
    public_prefix: str,
    *,
    force_render: bool,
    dpi: int,
    tesseract_binary: str | None,
    offline: bool,
    script_version: str,
) -> dict[str, Any]:
    year = int(release["year"])
    grade = int(release["grade"])
    source_url = str(release["releaseUrl"])
    map_items, map_pages, visible_numbers = parse_ela_item_map(
        pdf_path,
        expected_year=year,
        expected_grade=grade,
    )
    try:
        expected_identities = load_modern_mc_inventory()[(year, grade)]
    except (ElaInventoryError, KeyError) as exc:
        raise ImportFailure(
            f"ELA MC identity inventory failed for {year} Grade {grade}: {exc}"
        ) from exc
    actual_identities = tuple((item.number, item.session) for item in map_items)
    if actual_identities != expected_identities:
        raise ImportFailure(
            f"ELA MC identity mismatch before rendering for {year} Grade {grade}: "
            f"expected {expected_identities}, got {actual_identities}"
        )
    expected_count = EXPECTED_MC_COUNTS[year][grade - 3]
    if len(map_items) != expected_count:
        raise ImportFailure(
            f"ELA MC count mismatch before rendering for {year} Grade {grade}: "
            f"expected {expected_count}, got {len(map_items)}"
        )
    markers = find_ela_question_markers(
        pdf_path,
        visible_numbers,
        map_pages,
        cache_root,
        dpi,
        tesseract_binary,
    )
    all_boxes = ela_crop_boxes_from_markers(pdf_path, markers)
    mc_numbers = [item.number for item in map_items]
    boxes = {number: all_boxes[number] for number in mc_numbers}
    output_directory = asset_root / str(year) / f"grade-{grade}" / "en"
    public_directory = f"{public_prefix.rstrip('/')}/{year}/grade-{grade}/en"
    images = render_question_crops(
        pdf_path,
        boxes,
        output_directory,
        public_directory,
        dpi=dpi,
        force=force_render,
        script_version=script_version,
        mask_selectable_footers=True,
    )
    alts = extract_alt_texts(
        pdf_path,
        boxes,
        output_directory,
        "en",
        tesseract_binary,
        cache=True,
    )
    for number, alt in alts.items():
        if PASSAGE_LEAK_RE.search(alt):
            raise ImportFailure(f"Passage text leaked into ELA question crop {number}")
    validate_final_question_images(
        output_directory,
        mc_numbers,
        alts,
        cache_root,
        tesseract_binary,
        offline=offline,
    )

    marker_source_pages = {number: source_page for number, (source_page, _) in all_boxes.items()}
    instructions = detect_passage_instructions(
        pdf_path,
        map_pages=map_pages,
        marker_pages={marker.page_index for marker in markers},
        cache_root=cache_root,
        dpi=dpi,
        tesseract_binary=tesseract_binary,
    )
    stimuli, stimulus_by_question = _build_stimuli(
        year,
        grade,
        source_url,
        instructions,
        map_items,
        marker_source_pages,
    )
    passage_images = render_passage_assets(
        pdf_path,
        stimuli,
        output_directory,
        public_directory,
        dpi=dpi,
        force=force_render,
    )
    for stimulus in stimuli:
        stimulus["passage"] = dataclasses.asdict(passage_images[str(stimulus["id"])])

    questions: list[dict[str, Any]] = []
    for item in map_items:
        question: dict[str, Any] = {
            "id": f"nysed-ela-{year}-g{grade}-mc-q{item.number}",
            "number": item.number,
            "sourceNumberKind": "official",
            "session": item.session,
            "sourcePage": boxes[item.number][0],
            "primaryStandard": item.primary_standard,
            "stimulusId": stimulus_by_question[item.number],
            "skill": _skill_for_standard(item.primary_standard),
            "correct": item.key,
            "image": dataclasses.asdict(images[item.number]),
            "alt": alts[item.number],
        }
        if item.secondary_standards:
            question["secondaryStandards"] = list(item.secondary_standards)
        questions.append(question)

    framework = "NGLS" if year >= 2023 else "CCLS"
    exam = {
        "id": f"nysed-ela-{year}-grade-{grade}-mc-v1",
        "slug": f"{year}-grade-{grade}-mc",
        "year": year,
        "grade": grade,
        "standardsFramework": framework,
        "title": f"New York Grade {grade} ELA - {year} Released Questions",
        "description": (
            f"Practice the multiple-choice questions released from the {year} "
            f"New York State Grade {grade} English Language Arts Test."
        ),
        "sourceTitle": f"{year} NYS Grade {grade} English Language Arts Test Released Questions",
        "sourceUrl": source_url,
        "stimuli": stimuli,
        "questions": questions,
    }
    validate_modern_exam(exam)
    return exam


def import_modern_release(
    release: dict[str, Any],
    cache_root: Path,
    asset_root: Path,
    public_prefix: str,
    *,
    offline: bool,
    force_download: bool,
    force_render: bool,
    dpi: int,
    tesseract_binary: str | None,
    script_version: str,
) -> dict[str, Any]:
    """Download/cache one official modern release and return its raw exam."""

    year = int(release.get("year", 0))
    grade = int(release.get("grade", 0))
    release_url = str(release.get("releaseUrl", ""))
    if year not in MODERN_YEARS or grade not in GRADES or not release_url.lower().endswith(".pdf"):
        raise ImportFailure(f"Invalid modern ELA release descriptor: {release!r}")
    source = SourceDocument(year, grade, "en", release_url)
    pdf_path = get_pdf(
        source,
        cache_root,
        kind="release",
        offline=offline,
        force=force_download,
        identity_page_limit=None,
    )
    return _import_modern_pdf(
        release,
        pdf_path,
        cache_root,
        asset_root,
        public_prefix,
        force_render=force_render,
        dpi=dpi,
        tesseract_binary=tesseract_binary,
        offline=offline,
        script_version=script_version,
    )


def validate_modern_exam(exam: dict[str, Any]) -> None:
    year = int(exam["year"])
    grade = int(exam["grade"])
    questions = list(exam.get("questions", []))
    expected_row = EXPECTED_MC_COUNTS.get(year)
    if expected_row is None or expected_row[grade - 3] <= 0:
        raise ImportFailure(f"Modern ELA count matrix is not pinned for {year} Grade {grade}")
    expected = expected_row[grade - 3]
    if len(questions) != expected:
        raise ImportFailure(
            f"ELA MC count mismatch for {year} Grade {grade}: expected {expected}, got {len(questions)}"
        )
    numbers = [int(question["number"]) for question in questions]
    if numbers != sorted(set(numbers)):
        raise ImportFailure(f"Duplicate/out-of-order ELA question numbers for {year} Grade {grade}")
    framework_prefix = "NGLS." if year >= 2023 else "CCSS."
    stimulus_ids = {stimulus["id"] for stimulus in exam.get("stimuli", [])}
    for question in questions:
        if question["correct"] not in CHOICES:
            raise ImportFailure(f"Invalid ELA answer key in {question['id']}")
        if not str(question["primaryStandard"]).startswith(framework_prefix):
            raise ImportFailure(f"Wrong ELA standards framework in {question['id']}")
        if _standard_grade(str(question["primaryStandard"])) != grade:
            raise ImportFailure(f"Wrong-grade ELA standard in {question['id']}")
        if question["stimulusId"] not in stimulus_ids:
            raise ImportFailure(f"Missing ELA passage reference in {question['id']}")
        image = question["image"]
        if int(image["width"]) <= 0 or int(image["height"]) <= 0:
            raise ImportFailure(f"Invalid ELA crop dimensions in {question['id']}")
        expected_asset_prefix = f"/vine-app/nysed/ela/{year}/grade-{grade}/en/"
        if not str(image["src"]).startswith(expected_asset_prefix):
            raise ImportFailure(f"ELA asset URL is outside the approved prefix: {question['id']}")
    if len(stimulus_ids) != len(exam.get("stimuli", [])):
        raise ImportFailure(f"Duplicate ELA stimulus ids for {year} Grade {grade}")
    previous_end = 0
    for stimulus in exam.get("stimuli", []):
        start = int(stimulus["questionStart"])
        end = int(stimulus["questionEnd"])
        if start <= previous_end or end < start or not stimulus.get("references"):
            raise ImportFailure(f"Invalid/overlapping ELA stimulus range in {stimulus['id']}")
        previous_end = end
        for reference in stimulus["references"]:
            if int(reference["pageStart"]) < 1 or int(reference["pageEnd"]) < int(reference["pageStart"]):
                raise ImportFailure(f"Invalid ELA passage PDF pages in {stimulus['id']}")
        passage = stimulus.get("passage", {})
        expected_src = (
            f"/vine-app/nysed/ela/{year}/grade-{grade}/en/"
            f"passage-{start}-{end}.webp"
        )
        page_count = sum(
            int(reference["pageEnd"]) - int(reference["pageStart"]) + 1
            for reference in stimulus["references"]
        )
        if (
            passage.get("src") != expected_src
            or int(passage.get("width", 0)) < 420
            or not 260 <= int(passage.get("height", 0)) <= 16_000
            or int(passage.get("pageCount", 0)) != page_count
        ):
            raise ImportFailure(f"Invalid local ELA passage image in {stimulus['id']}")

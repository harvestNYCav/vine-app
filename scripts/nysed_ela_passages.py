#!/usr/bin/env python3
"""Render local, page-break-free images for NYSED ELA passage stimuli."""

from __future__ import annotations

import dataclasses
import json
from pathlib import Path
from typing import Any, Sequence

import numpy as np
import pdfplumber
from PIL import Image, ImageStat

try:
    from scripts.import_nysed_math_mc import (
        PDF_RENDER_LOCK,
        ImportFailure,
        atomic_write_json,
        sha256_file,
        unique_temp_path,
    )
except ModuleNotFoundError:  # pragma: no cover - permits direct script execution.
    from import_nysed_math_mc import (  # type: ignore[no-redef]
        PDF_RENDER_LOCK,
        ImportFailure,
        atomic_write_json,
        sha256_file,
        unique_temp_path,
    )


PASSAGE_SCRIPT_VERSION = "ela-passage-1"
PASSAGE_WEBP_QUALITY = 90


@dataclasses.dataclass(frozen=True)
class PassageImageResult:
    src: str
    width: int
    height: int
    alt: str
    pageCount: int


@dataclasses.dataclass(frozen=True)
class _PreparedPage:
    image: Image.Image
    left: int
    top: int
    right: int
    bottom: int


def _contiguous_edge_bar_width(values: np.ndarray, *, reverse: bool = False) -> int:
    """Return the width of a dark scan bar connected to one page edge."""

    ordered = values[::-1] if reverse else values
    limit = max(1, int(len(ordered) * 0.22))
    width = 0
    for value in ordered[:limit]:
        if float(value) >= 210.0:
            break
        width += 1
    return width


def _remove_scan_edge_bars(image: Image.Image) -> Image.Image:
    """Replace black scan bars outside the paper with white canvas pixels."""

    result = image.convert("RGB").copy()
    gray = np.asarray(result.convert("L"))
    medians = np.median(gray, axis=0)
    left = _contiguous_edge_bar_width(medians)
    right = _contiguous_edge_bar_width(medians, reverse=True)
    pixels = np.asarray(result).copy()
    if left:
        pixels[:, : min(result.width, left + 2)] = 255
    if right:
        pixels[:, max(0, result.width - right - 2) :] = 255
    return Image.fromarray(pixels, mode="RGB")


def _footer_cutoff(gray: np.ndarray) -> int:
    """Find footer-label/rule groups or a centered legacy page number."""

    height, width = gray.shape
    ink = gray < 245
    active_threshold = max(3, round(width * 0.0015))
    active_rows = np.flatnonzero(ink.sum(axis=1) >= active_threshold)
    if active_rows.size == 0:
        return max(1, int(height * 0.95))

    groups: list[tuple[int, int]] = []
    group_start = previous = int(active_rows[0])
    for raw_row in active_rows[1:]:
        row = int(raw_row)
        if row > previous + 1:
            groups.append((group_start, previous))
            group_start = row
        previous = row
    groups.append((group_start, previous))

    footer_start = int(height * 0.875)
    for start, end in groups:
        if start < footer_start:
            continue
        group_ink = ink[start : end + 1]
        columns = np.flatnonzero(group_ink.any(axis=0))
        if columns.size == 0:
            continue
        span = float(columns[-1] - columns[0] + 1) / float(width)
        center = float(columns[0] + columns[-1]) / 2.0 / float(width)
        max_row_fraction = float(group_ink.sum(axis=1).max()) / float(width)
        wide_rule = span >= 0.72 and max_row_fraction >= 0.12
        right_footer_label = center >= 0.78 and span <= 0.24
        if wide_rule or right_footer_label:
            return max(1, start - max(5, round(height * 0.004)))

    # Legacy annotated releases often have no rule or GO ON label. Their only
    # page chrome is a narrow centered page number in the bottom lane.
    for start, end in reversed(groups):
        if start < int(height * 0.91):
            break
        group_ink = ink[start : end + 1]
        columns = np.flatnonzero(group_ink.any(axis=0))
        if columns.size == 0:
            continue
        span = float(columns[-1] - columns[0] + 1) / float(width)
        center = float(columns[0] + columns[-1]) / 2.0 / float(width)
        group_height = float(end - start + 1) / float(height)
        if span <= 0.08 and 0.40 <= center <= 0.60 and group_height <= 0.035:
            return max(1, start - max(5, round(height * 0.004)))

    return max(1, int(height * 0.95))


def _prepare_passage_page(image: Image.Image, *, dpi: int) -> _PreparedPage:
    cleaned = _remove_scan_edge_bars(image)
    gray = np.asarray(cleaned.convert("L"))
    cutoff = _footer_cutoff(gray)
    body = gray[:cutoff]
    ink = body < 245

    row_threshold = max(3, round(cleaned.width * 0.0015))
    column_threshold = max(3, round(cutoff * 0.0015))
    rows = np.flatnonzero(ink.sum(axis=1) >= row_threshold)
    columns = np.flatnonzero(ink.sum(axis=0) >= column_threshold)
    if rows.size == 0 or columns.size == 0:
        raise ImportFailure("ELA passage page has no substantive visual content")

    horizontal_padding = max(12, round(dpi * 0.15))
    vertical_padding = max(8, round(dpi * 0.075))
    return _PreparedPage(
        image=cleaned,
        left=max(0, int(columns[0]) - horizontal_padding),
        top=max(0, int(rows[0]) - vertical_padding),
        right=min(cleaned.width, int(columns[-1]) + 1 + horizontal_padding),
        bottom=min(cutoff, int(rows[-1]) + 1 + vertical_padding),
    )


def validate_passage_image(image: Image.Image, label: str) -> None:
    if image.width < 420 or image.height < 260:
        raise ImportFailure(
            f"Passage image is implausibly small ({image.width}x{image.height}): {label}"
        )
    if image.height > 16_000:
        raise ImportFailure(
            f"Passage image exceeds the safe WebP height ({image.height}px): {label}"
        )
    gray = image.convert("L")
    if ImageStat.Stat(gray).stddev[0] < 4.0:
        raise ImportFailure(f"Passage image has almost no visual content: {label}")
    pixels = np.asarray(gray)
    ink_fraction = float(np.count_nonzero(pixels < 245)) / float(pixels.size)
    if ink_fraction < 0.003:
        raise ImportFailure(
            f"Passage image is effectively blank ({ink_fraction:.4%} ink): {label}"
        )


def stitch_passage_pages(
    pages: Sequence[Image.Image],
    *,
    dpi: int,
    label: str = "ELA passage",
) -> Image.Image:
    """Trim page chrome and join passage pages with no physical-page spacer."""

    if not pages or len(pages) > 4:
        raise ImportFailure(f"Passage must contain one through four pages: {label}")
    widths = [page.width for page in pages]
    if max(widths) / min(widths) > 1.08:
        raise ImportFailure(f"Passage pages have incompatible widths: {label}")
    target_width = min(widths)
    normalized_pages = [
        page.convert("RGB")
        if page.width == target_width
        else page.resize(
            (target_width, max(1, round(page.height * target_width / page.width))),
            Image.Resampling.LANCZOS,
        )
        for page in pages
    ]

    prepared = [_prepare_passage_page(page, dpi=dpi) for page in normalized_pages]
    common_left = min(page.left for page in prepared)
    common_right = max(page.right for page in prepared)
    segments = [
        page.image.crop((common_left, page.top, common_right, page.bottom)).convert("RGB")
        for page in prepared
    ]
    stitched = Image.new(
        "RGB",
        (common_right - common_left, sum(segment.height for segment in segments)),
        "white",
    )
    y = 0
    for segment in segments:
        stitched.paste(segment, (0, y))
        y += segment.height
    validate_passage_image(stitched, label)
    return stitched


def _passage_alt(label: str) -> str:
    return (
        f"{label}. The complete released passage is shown with its original title, byline, "
        "illustrations, line or paragraph numbers, and source credits; PDF page breaks are removed."
    )


def render_passage_assets(
    pdf_path: Path,
    stimuli: Sequence[dict[str, Any]],
    output_directory: Path,
    public_directory: str,
    *,
    dpi: int,
    force: bool,
) -> dict[str, PassageImageResult]:
    """Render one deterministic stitched WebP for every passage stimulus."""

    output_directory.mkdir(parents=True, exist_ok=True)
    manifest_path = output_directory / ".nysed-passages.json"
    try:
        existing_manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        existing_manifest = {}
    if not isinstance(existing_manifest, dict):
        existing_manifest = {}

    passage_basis: dict[str, dict[str, Any]] = {}
    for stimulus in stimuli:
        references = stimulus.get("references")
        if not isinstance(references, list) or len(references) != 1:
            raise ImportFailure(f"ELA stimulus must have exactly one source span: {stimulus.get('id')}")
        reference = references[0]
        page_start = int(reference["pageStart"])
        page_end = int(reference["pageEnd"])
        question_start = int(stimulus["questionStart"])
        question_end = int(stimulus["questionEnd"])
        filename = f"passage-{question_start}-{question_end}.webp"
        passage_basis[str(stimulus["id"])] = {
            "filename": filename,
            "pageStart": page_start,
            "pageEnd": page_end,
            "questionStart": question_start,
            "questionEnd": question_end,
        }

    expected_manifest = {
        "passageScriptVersion": PASSAGE_SCRIPT_VERSION,
        "passageDpi": dpi,
        "passageEncoding": f"smallest-of-lossless-and-webp-q{PASSAGE_WEBP_QUALITY}",
        "passageSourcePdfSha256": sha256_file(pdf_path),
        "passages": passage_basis,
    }
    existing_basis = {key: existing_manifest.get(key) for key in expected_manifest}
    reuse_allowed = not force and existing_basis == expected_manifest
    results: dict[str, PassageImageResult] = {}
    rendered_pages: dict[int, Image.Image] = {}

    with pdfplumber.open(pdf_path) as pdf:
        for stimulus in stimuli:
            stimulus_id = str(stimulus["id"])
            basis = passage_basis[stimulus_id]
            destination = output_directory / str(basis["filename"])
            page_start = int(basis["pageStart"])
            page_end = int(basis["pageEnd"])
            if page_start < 1 or page_end < page_start or page_end > len(pdf.pages):
                raise ImportFailure(f"Passage pages are outside the source PDF: {stimulus_id}")
            page_count = page_end - page_start + 1
            alt = _passage_alt(str(stimulus["label"]))

            if destination.exists() and reuse_allowed:
                try:
                    with Image.open(destination) as cached:
                        cached.load()
                        validate_passage_image(cached, str(destination))
                        results[stimulus_id] = PassageImageResult(
                            src=f"{public_directory.rstrip('/')}/{destination.name}",
                            width=cached.width,
                            height=cached.height,
                            alt=alt,
                            pageCount=page_count,
                        )
                        continue
                except Exception:
                    pass

            page_images: list[Image.Image] = []
            for page_number in range(page_start, page_end + 1):
                page_index = page_number - 1
                if page_index not in rendered_pages:
                    with PDF_RENDER_LOCK:
                        rendered_pages[page_index] = pdf.pages[page_index].to_image(
                            resolution=dpi,
                            antialias=True,
                        ).original.convert("RGB")
                page_images.append(rendered_pages[page_index])
            stitched = stitch_passage_pages(
                page_images,
                dpi=dpi,
                label=f"{pdf_path.name} {stimulus_id}",
            )
            lossless_temporary = unique_temp_path(
                destination.parent,
                f".{destination.name}.lossless.",
                ".tmp",
            )
            lossy_temporary = unique_temp_path(
                destination.parent,
                f".{destination.name}.q{PASSAGE_WEBP_QUALITY}.",
                ".tmp",
            )
            try:
                stitched.save(
                    lossless_temporary,
                    format="WEBP",
                    lossless=True,
                    method=6,
                )
                stitched.save(
                    lossy_temporary,
                    format="WEBP",
                    quality=PASSAGE_WEBP_QUALITY,
                    method=6,
                    exact=True,
                )
                selected = min(
                    (lossless_temporary, lossy_temporary),
                    key=lambda path: path.stat().st_size,
                )
                selected.replace(destination)
            finally:
                lossless_temporary.unlink(missing_ok=True)
                lossy_temporary.unlink(missing_ok=True)
            results[stimulus_id] = PassageImageResult(
                src=f"{public_directory.rstrip('/')}/{destination.name}",
                width=stitched.width,
                height=stitched.height,
                alt=alt,
                pageCount=page_count,
            )

    if set(results) != set(passage_basis):
        raise ImportFailure(f"Rendered passage parity failure for {pdf_path}")
    expected_names = {str(value["filename"]) for value in passage_basis.values()}
    for stale in output_directory.glob("passage-*.webp"):
        if stale.is_file() and stale.name not in expected_names:
            stale.unlink()

    final_manifest = dict(existing_manifest)
    final_manifest.update(expected_manifest)
    final_manifest["passageOutputs"] = {
        stimulus_id: {
            "width": result.width,
            "height": result.height,
            "pageCount": result.pageCount,
        }
        for stimulus_id, result in sorted(results.items())
    }
    atomic_write_json(manifest_path, final_manifest)
    return results

#!/usr/bin/env python3
"""Validate final NYSED ELA question WebPs using deterministic OCR.

The importer deliberately crops question-and-choice images from official PDFs.
Validating PDF text alone is insufficient: a raster annotation, answer key, or
passage can still be present in the final image.  This module therefore treats
OCR of the final WebP as the validation source of truth.

The public entry point is :func:`validate_ela_question_image`.  Successful
results expose ``normalized_ocr`` and ``fallback_alt`` so importers can reuse
the exact validated text when PDF text extraction is unavailable.
"""

from __future__ import annotations

import dataclasses
import hashlib
import io
import json
import os
import re
import subprocess
import tempfile
import unicodedata
from functools import lru_cache
from pathlib import Path
from typing import Any, Sequence

from PIL import Image, ImageOps


VALIDATION_VERSION = "7"
CACHE_SCHEMA_VERSION = 7
MIN_SUBSTANTIVE_ALNUM = 32
DEFAULT_ALT_MAX_LENGTH = 4_000

_CHOICES = ("A", "B", "C", "D")
_EXACT_CHOICE_LINE_RE = re.compile(
    r"^[ \t]*(?:(?:[\(\[]\s*)?([A-D])(?:\s*[\)\]]|[._:;=_\-])[ \t]*|([A-D])[ \t]+)",
    re.IGNORECASE,
)
_GLUED_CHOICE_LINE_RE = re.compile(r"^[ \t]*([A-D])(?=[a-z])")
_ANSWER_OR_ANNOTATION_LEAK_RE = re.compile(
    r"(?:"
    r"(?:^|\n)\s*(?:key|answer)\s*:?\s*[A-D]\b|"
    r"\banswer\s+key\b|"
    r"\bcorrect\s+(?:answer|response|choice)\b|"
    r"\bwhy\s+choice\b|"
    r"\bwhy\s+the\s+other\s+choices\b|"
    r"\bhow\s+this\s+question\b|"
    r"\bquestion\s+annotation\b|"
    r"\bannotated\s+(?:item|response)\b|"
    r"\b(?:primary|secondary|aligned)\s+(?:CCLS|CCSS|standard)\b|"
    r"\bmeasures?(?:\s+CCLS|\s+CCSS)?\s*:\s*(?:NY-)?[3-8]\b|"
    r"\bmap\s+to\s+the\s+standards\b|"
    r"\bscoring\s+rubric\b|"
    r"\bsample(?:\s+student)?\s+responses?\b|"
    r"(?:^|\n)\s*(?:answer\s+rationale|rationale|annotation)\b|"
    r"(?:^|\n)\s*(?:GO\s+ON|STOP|Book\s+\d+|Page\s+\d+)\s*(?=$|\n)"
    r")",
    re.IGNORECASE,
)
_PASSAGE_DIRECTION_LEAK_RE = re.compile(
    r"\bread\s+(?:(?:this|the\s+following|the)\s+)?"
    r"(?:story|article|passage|poem|excerpt|text|selection|passages|texts|"
    r"article\s+and\s+(?:the\s+)?poem)\b"
    r"[\s\S]{0,260}?\b(?:then\s+)?answer\s+questions?\b",
    re.IGNORECASE,
)


class ElaImageValidationError(RuntimeError):
    """The final image or its OCR failed a fail-closed validation rule."""


@dataclasses.dataclass(frozen=True)
class ElaImageValidationResult:
    """Validated OCR and provenance for one final question WebP."""

    image_sha256: str
    normalized_ocr: str
    tesseract_version: str
    cache_path: Path
    used_cache: bool
    choice_labels: tuple[str, str, str, str] = _CHOICES

    @property
    def fallback_alt(self) -> str:
        """Return a deterministic single-line alt-text fallback."""

        return normalized_ocr_for_alt(self.normalized_ocr)


@dataclasses.dataclass(frozen=True)
class _CacheRecord:
    image_sha256: str
    tesseract_version: str
    normalized_ocr: str
    printed_question_number: int | None
    number_ocr_language: str | None
    choice_labels: tuple[str, str, str, str]
    path: Path


def normalize_ocr_text(value: str) -> str:
    """Normalize OCR without discarding line boundaries used for choice labels."""

    if not isinstance(value, str):
        raise TypeError("OCR text must be a string")
    value = unicodedata.normalize("NFKC", value).replace("\r\n", "\n").replace("\r", "\n")
    normalized_lines: list[str] = []
    for raw_line in value.split("\n"):
        safe_line = "".join(
            " " if unicodedata.category(character).startswith("C") else character
            for character in raw_line
        )
        safe_line = re.sub(r"[ \t\f\v]+", " ", safe_line).strip()
        if safe_line:
            normalized_lines.append(safe_line)
    return "\n".join(normalized_lines)


def normalized_ocr_for_alt(value: str, *, max_length: int = DEFAULT_ALT_MAX_LENGTH) -> str:
    """Flatten normalized OCR deterministically for use as fallback alt text."""

    if max_length < 1:
        raise ValueError("max_length must be positive")
    flattened = " ".join(normalize_ocr_text(value).split())
    return flattened[:max_length].rstrip()


def _choice_labels(value: str) -> tuple[str, ...]:
    """Return an ordered A-D sequence from line-leading OCR labels.

    Tesseract sometimes joins a choice glyph to the first answer word (for
    example ``Bs childish`` or ``Csunfair``) or repeats the glyph as ``Cc``.
    A glued glyph is accepted only when it is the next expected label on a
    distinct line.  This keeps the tolerance narrow and makes out-of-order or
    duplicate OCR evidence fail closed.
    """

    labels: list[str] = []
    for line in value.splitlines():
        exact_match = _EXACT_CHOICE_LINE_RE.match(line)
        glued_match = _GLUED_CHOICE_LINE_RE.match(line) if exact_match is None else None
        match = exact_match or glued_match
        if match is None or len(labels) == len(_CHOICES):
            continue
        label = (match.group(1) or (match.group(2) if exact_match else "")).upper()
        if label == _CHOICES[len(labels)]:
            labels.append(label)
    return tuple(labels)


def validate_normalized_ela_ocr(
    value: str,
    *,
    expected_question_number: int | None = None,
    verified_choice_labels: Sequence[str] | None = None,
) -> str:
    """Normalize and validate OCR text without invoking an OCR engine.

    This pure function is useful for tests and for revalidating cached OCR after
    a validation-version change.
    """

    normalized = normalize_ocr_text(value)
    substantive_count = sum(character.isalnum() for character in normalized)
    if substantive_count < MIN_SUBSTANTIVE_ALNUM:
        raise ElaImageValidationError(
            "Final ELA question OCR is not substantive "
            f"({substantive_count} alphanumeric characters)"
        )

    if _ANSWER_OR_ANNOTATION_LEAK_RE.search(normalized):
        raise ElaImageValidationError("Final ELA question image contains answer or annotation metadata")
    if _PASSAGE_DIRECTION_LEAK_RE.search(normalized):
        raise ElaImageValidationError("Final ELA question image contains a full passage direction")

    labels = _choice_labels(normalized)
    verified = tuple(verified_choice_labels or ())
    if labels != _CHOICES and verified != _CHOICES:
        missing = list(_CHOICES[len(labels):])
        raise ElaImageValidationError(
            "Final ELA question image is missing distinct choice labels: " + ", ".join(missing)
        )

    if expected_question_number is not None:
        if not isinstance(expected_question_number, int) or isinstance(expected_question_number, bool):
            raise TypeError("expected_question_number must be an integer or None")
        if expected_question_number < 1:
            raise ValueError("expected_question_number must be positive")
        first_line = normalized.split("\n", 1)[0]
        number_pattern = re.compile(
            rf"^(?:question\s+)?{expected_question_number}(?=$|[\s.\)\]:_\-])",
            re.IGNORECASE,
        )
        if not number_pattern.search(first_line):
            raise ElaImageValidationError(
                "Final ELA question image does not begin with expected printed question "
                f"number {expected_question_number}"
            )
    return normalized


def _sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _assert_webp(path: Path) -> None:
    try:
        with path.open("rb") as stream:
            header = stream.read(12)
    except OSError as exc:
        raise ElaImageValidationError(f"Could not read final ELA image {path}: {exc}") from exc
    if len(header) != 12 or header[:4] != b"RIFF" or header[8:12] != b"WEBP":
        raise ElaImageValidationError(f"Final ELA image is not a WebP: {path}")


def _cache_directory(cache_root: Path) -> Path:
    return cache_root / "ocr" / "ela-final-webp"


def _tesseract_key(tesseract_version: str) -> str:
    return hashlib.sha256(tesseract_version.encode("utf-8")).hexdigest()


def _cache_path(
    cache_root: Path,
    image_sha256: str,
    tesseract_version: str,
    number_ocr_language: str | None,
) -> Path:
    engine_identity = f"{tesseract_version}|number={number_ocr_language or 'none'}"
    return _cache_directory(cache_root) / (
        f"ela-final-webp-v{VALIDATION_VERSION}-{image_sha256}-"
        f"{_tesseract_key(engine_identity)}.json"
    )


def _atomic_write_json(path: Path, value: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    descriptor, temporary_name = tempfile.mkstemp(
        dir=path.parent,
        prefix=f".{path.name}.",
        suffix=".tmp",
    )
    temporary = Path(temporary_name)
    try:
        with os.fdopen(descriptor, "w", encoding="utf-8", newline="\n") as stream:
            json.dump(value, stream, ensure_ascii=False, indent=2, sort_keys=True)
            stream.write("\n")
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(temporary, path)
    finally:
        temporary.unlink(missing_ok=True)


def _read_cache_record(
    path: Path,
    *,
    expected_image_sha256: str,
) -> _CacheRecord | None:
    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None
    if not isinstance(raw, dict):
        return None
    if (
        raw.get("schemaVersion") != CACHE_SCHEMA_VERSION
        or raw.get("validationVersion") != VALIDATION_VERSION
        or raw.get("imageSha256") != expected_image_sha256
        or not isinstance(raw.get("tesseractVersion"), str)
        or not raw["tesseractVersion"].strip()
        or not isinstance(raw.get("normalizedOcr"), str)
        or "printedQuestionNumber" not in raw
        or "numberOcrLanguage" not in raw
        or (
            raw.get("printedQuestionNumber") is not None
            and (
                not isinstance(raw.get("printedQuestionNumber"), int)
                or isinstance(raw.get("printedQuestionNumber"), bool)
                or raw["printedQuestionNumber"] < 1
            )
        )
        or raw.get("numberOcrLanguage") not in (None, "snum", "eng", "snum+eng")
        or ((raw.get("printedQuestionNumber") is None) != (raw.get("numberOcrLanguage") is None))
    ):
        return None
    normalized = normalize_ocr_text(raw["normalizedOcr"])
    if normalized != raw["normalizedOcr"]:
        return None
    raw_choice_labels = raw.get("choiceLabels")
    if raw_choice_labels is None:
        # Validation-v7 cache entries created before the isolated-column
        # fallback were accepted only when full-image OCR itself contained an
        # exact ordered A-D sequence.  Re-derive that evidence so those
        # already-reviewed entries remain replayable without weakening the
        # newer fallback contract.
        choice_labels = _choice_labels(normalized)
    elif isinstance(raw_choice_labels, list):
        choice_labels = tuple(raw_choice_labels)
    else:
        return None
    if choice_labels != _CHOICES:
        return None
    expected_path = _cache_path(
        path.parents[2],
        expected_image_sha256,
        raw["tesseractVersion"],
        raw["numberOcrLanguage"],
    )
    if path.name != expected_path.name:
        return None
    return _CacheRecord(
        image_sha256=expected_image_sha256,
        tesseract_version=raw["tesseractVersion"],
        normalized_ocr=normalized,
        printed_question_number=raw.get("printedQuestionNumber"),
        number_ocr_language=raw["numberOcrLanguage"],
        choice_labels=_CHOICES,
        path=path,
    )


@lru_cache(maxsize=8)
def _probe_tesseract_version(tesseract_binary: str) -> str:
    try:
        result = subprocess.run(
            [tesseract_binary, "--version"],
            check=False,
            capture_output=True,
            text=True,
            timeout=20,
        )
    except (OSError, subprocess.SubprocessError) as exc:
        raise ElaImageValidationError(f"Could not run Tesseract: {exc}") from exc
    if result.returncode != 0:
        raise ElaImageValidationError(
            f"Tesseract version probe failed: {(result.stderr or result.stdout).strip()}"
        )
    lines = (result.stdout or result.stderr).splitlines()
    if not lines or not lines[0].strip():
        raise ElaImageValidationError("Tesseract did not report a version")
    return " ".join(lines[0].split())


@lru_cache(maxsize=8)
def _select_number_ocr_language(tesseract_binary: str) -> str:
    try:
        result = subprocess.run(
            [tesseract_binary, "--list-langs"],
            check=False,
            capture_output=True,
            text=True,
            timeout=20,
        )
    except (OSError, subprocess.SubprocessError) as exc:
        raise ElaImageValidationError(f"Could not list Tesseract languages: {exc}") from exc
    if result.returncode != 0:
        raise ElaImageValidationError(
            f"Tesseract language probe failed: {(result.stderr or result.stdout).strip()}"
        )
    languages = {
        line.strip()
        for line in result.stdout.splitlines()
        if line.strip() and not line.lower().startswith("list of available languages")
    }
    if "snum" in languages and "eng" in languages:
        return "snum+eng"
    if "snum" in languages:
        return "snum"
    if "eng" in languages:
        return "eng"
    raise ElaImageValidationError(
        "Printed-number OCR requires Tesseract's snum or eng language data"
    )


def _run_final_image_ocr(image_path: Path, tesseract_binary: str) -> str:
    command: Sequence[str] = (
        tesseract_binary,
        str(image_path),
        "stdout",
        "--psm",
        "6",
        "-l",
        "eng",
        "--dpi",
        "160",
        "-c",
        "preserve_interword_spaces=1",
    )
    try:
        result = subprocess.run(
            command,
            check=False,
            capture_output=True,
            text=True,
            timeout=90,
        )
    except (OSError, subprocess.SubprocessError) as exc:
        raise ElaImageValidationError(f"Final ELA WebP OCR failed: {exc}") from exc
    if result.returncode != 0:
        raise ElaImageValidationError(
            f"Final ELA WebP OCR failed: {(result.stderr or result.stdout).strip()}"
        )
    return result.stdout


def _run_choice_column_ocr(
    image_path: Path,
    tesseract_binary: str,
) -> tuple[str, str, str, str]:
    """Verify A-D from the isolated left label column after full-OCR failure."""

    try:
        with Image.open(image_path) as opened:
            opened.load()
            if opened.width < 150 or opened.height <= 65:
                raise ElaImageValidationError(
                    "Final ELA image is too small for choice-column validation"
                )
            # Modern releases place the A-D labels near x=100.  Start to the
            # right of the gray question-number box (which can extend through
            # x=67), and below the stem baseline, so neither can be mistaken
            # for another label.
            choice_column = opened.crop((75, 65, 150, opened.height)).convert("L")
    except ElaImageValidationError:
        raise
    except (OSError, ValueError) as exc:
        raise ElaImageValidationError(
            f"Could not isolate final ELA choice-label column: {exc}"
        ) from exc
    thresholded = choice_column.point(
        lambda value: 0 if value < 100 else 255,
        mode="L",
    )
    prepared = ImageOps.expand(thresholded, border=40, fill=255)
    payload = io.BytesIO()
    prepared.save(payload, format="PNG", optimize=True)
    command: Sequence[str] = (
        tesseract_binary,
        "stdin",
        "stdout",
        "--psm",
        "6",
        "-l",
        "eng",
        "-c",
        "tessedit_char_whitelist=ABCD",
    )
    try:
        result = subprocess.run(
            command,
            input=payload.getvalue(),
            check=False,
            capture_output=True,
            timeout=30,
        )
    except (OSError, subprocess.SubprocessError) as exc:
        raise ElaImageValidationError(f"Choice-column OCR failed: {exc}") from exc
    stdout = result.stdout.decode("utf-8", "replace") if isinstance(result.stdout, bytes) else result.stdout
    stderr = result.stderr.decode("utf-8", "replace") if isinstance(result.stderr, bytes) else result.stderr
    if result.returncode != 0:
        raise ElaImageValidationError(
            f"Choice-column OCR failed: {(stderr or stdout).strip()}"
        )
    labels = tuple(normalize_ocr_text(stdout or "").splitlines())
    if labels != _CHOICES:
        raise ElaImageValidationError(
            "Final ELA question image is missing exact ordered A-D choice-column labels: "
            f"{labels!r}"
        )
    return _CHOICES


def _run_question_number_ocr(
    image_path: Path,
    tesseract_binary: str,
    number_ocr_language: str,
) -> int:
    """Read only the printed gray-box number from a final question crop.

    Full-image OCR can confuse scan artifacts such as ``8``/``g`` or
    ``18``/``1g``.  The number is therefore validated independently from the
    fixed top-left box, with a high-contrast digits-only single-character
    pass.  This evidence is cached alongside the full normalized OCR.
    """

    try:
        with Image.open(image_path) as opened:
            opened.load()
            if opened.width < 88 or opened.height < 90:
                raise ElaImageValidationError(
                    "Final ELA image is too small for printed-number validation"
                )
            number_box = opened.crop((0, 0, 75, 90)).convert("L")
            legacy_number_box = opened.crop((20, 0, 75, 50)).convert("L")
            outer_rule = opened.crop((0, 0, 20, 90)).convert("L")
    except ElaImageValidationError:
        raise
    except (OSError, ValueError) as exc:
        raise ElaImageValidationError(
            f"Could not isolate printed ELA question number: {exc}"
        ) from exc

    outer_pixels = outer_rule.load()
    legacy_layout = max(
        sum(1 for y in range(outer_rule.height) if outer_pixels[x, y] < 100)
        for x in range(outer_rule.width)
    ) >= 80
    raw_outputs: list[str] = []
    parsed_numbers: set[int] = set()
    parsed_evidence: list[int] = []

    def read_prepared(
        prepared: Image.Image,
        *,
        psm: str,
        label: str,
        language: str | None = None,
    ) -> None:
        effective_language = language or number_ocr_language
        command: Sequence[str] = (
            tesseract_binary,
            "stdin",
            "stdout",
            "--psm",
            psm,
            "-l",
            effective_language,
            "-c",
            "tessedit_char_whitelist=0123456789",
        )
        bordered = ImageOps.expand(prepared, border=100, fill=255)
        payload = io.BytesIO()
        bordered.save(payload, format="PNG", optimize=True)
        try:
            result = subprocess.run(
                command,
                input=payload.getvalue(),
                check=False,
                capture_output=True,
                timeout=30,
            )
        except (OSError, subprocess.SubprocessError) as exc:
            raise ElaImageValidationError(f"Printed-number OCR failed: {exc}") from exc
        stdout = result.stdout.decode("utf-8", "replace") if isinstance(result.stdout, bytes) else result.stdout
        stderr = result.stderr.decode("utf-8", "replace") if isinstance(result.stderr, bytes) else result.stderr
        if result.returncode != 0:
            raise ElaImageValidationError(
                f"Printed-number OCR failed: {(stderr or stdout).strip()}"
            )
        output = (stdout or "").strip()
        raw_outputs.append(f"{label}:{output}")
        if not output:
            return
        match = re.fullmatch(r"\d{1,3}", output)
        if not match:
            raise ElaImageValidationError(
                f"Printed-number OCR was not an exact integer: {output!r}"
            )
        parsed_number = int(match.group(0))
        parsed_numbers.add(parsed_number)
        parsed_evidence.append(parsed_number)

    if not legacy_layout:
        resized_grayscale = number_box.resize(
            (number_box.width * 6, number_box.height * 6),
            Image.Resampling.LANCZOS,
        )
        thresholds = (90, 100, 120, 140, 160, 180, 200)

        def read_modern_thresholds(language: str, *, profile: str) -> None:
            for threshold in thresholds:
                prepared = resized_grayscale.point(
                    lambda value, cutoff=threshold: 0 if value < cutoff else 255,
                    mode="L",
                )
                # PSM 13 is materially more stable for multi-digit modern
                # gray-box glyphs: PSM 10 can confidently collapse 27 to 9.
                read_prepared(
                    prepared,
                    psm="13",
                    label=f"modern-{profile}-t{threshold}-psm13",
                    language=language,
                )
                if len(parsed_numbers) > 1:
                    raise ElaImageValidationError(
                        "Printed-number OCR preprocessing disagreed: "
                        f"{sorted(parsed_numbers)}"
                    )
                if parsed_evidence and parsed_evidence.count(parsed_evidence[0]) >= 2:
                    break

        read_modern_thresholds(number_ocr_language, profile="primary")
        if not parsed_numbers and number_ocr_language == "snum+eng":
            # A reviewed 2017 scan renders a perfectly legible 5 that the
            # combined traineddata silently drops at every threshold, while
            # snum alone reads it exactly.  Keep the proven combined profile
            # primary and consult the digits-only constituent only when the
            # primary produces zero candidates.  Conflicting or non-integer
            # primary evidence still fails closed and can never be overridden.
            read_modern_thresholds("snum", profile="snum-fallback")
    if legacy_layout:
        # 2015's annotated-layout WebPs retain a narrow outer border before
        # the gray number box.  Its reviewed tight, lower-resolution profile
        # is mutually exclusive with modern OCR: the modern window can
        # confidently misread a legacy 2 as 3.  This exact profile was checked
        # against all 120 released 2015 MC crops.
        legacy_prepared = legacy_number_box.resize(
            (legacy_number_box.width * 3, legacy_number_box.height * 3),
            Image.Resampling.LANCZOS,
        ).point(
            lambda value: 0 if value < 140 else 255,
            mode="L",
        )
        read_prepared(legacy_prepared, psm="10", label="legacy-tight-psm10")
    if not parsed_numbers:
        raise ElaImageValidationError(
            f"Printed-number OCR was not an exact integer: {raw_outputs!r}"
        )
    if len(parsed_numbers) != 1:
        raise ElaImageValidationError(
            f"Printed-number OCR preprocessing disagreed: {sorted(parsed_numbers)}"
        )
    return parsed_numbers.pop()


def _validate_expected_question_number(
    printed_question_number: int | None,
    expected_question_number: int | None,
) -> None:
    if expected_question_number is None:
        return
    if not isinstance(expected_question_number, int) or isinstance(expected_question_number, bool):
        raise TypeError("expected_question_number must be an integer or None")
    if expected_question_number < 1:
        raise ValueError("expected_question_number must be positive")
    if printed_question_number != expected_question_number:
        raise ElaImageValidationError(
            "Final ELA question image has printed question number "
            f"{printed_question_number!r}; expected {expected_question_number}"
        )


def _result_from_record(
    record: _CacheRecord,
    *,
    expected_question_number: int | None,
) -> ElaImageValidationResult:
    normalized = validate_normalized_ela_ocr(
        record.normalized_ocr,
        verified_choice_labels=record.choice_labels,
    )
    _validate_expected_question_number(
        record.printed_question_number,
        expected_question_number,
    )
    return ElaImageValidationResult(
        image_sha256=record.image_sha256,
        normalized_ocr=normalized,
        tesseract_version=record.tesseract_version,
        cache_path=record.path,
        used_cache=True,
        choice_labels=record.choice_labels,
    )


def _replay_cached_ocr(
    cache_root: Path,
    image_sha256: str,
    *,
    expected_question_number: int | None,
) -> ElaImageValidationResult:
    directory = _cache_directory(cache_root)
    pattern = f"ela-final-webp-v{VALIDATION_VERSION}-{image_sha256}-*.json"
    candidates: list[ElaImageValidationResult] = []
    for path in sorted(directory.glob(pattern)):
        record = _read_cache_record(path, expected_image_sha256=image_sha256)
        if record is None:
            continue
        try:
            candidates.append(
                _result_from_record(
                    record,
                    expected_question_number=expected_question_number,
                )
            )
        except ElaImageValidationError:
            continue
    if not candidates:
        raise ElaImageValidationError(
            "Offline ELA image validation requires a valid cached final-WebP OCR result"
        )
    normalized_values = {candidate.normalized_ocr for candidate in candidates}
    if len(normalized_values) != 1:
        versions = sorted(candidate.tesseract_version for candidate in candidates)
        raise ElaImageValidationError(
            "Offline ELA image OCR cache is ambiguous across Tesseract versions: "
            + ", ".join(versions)
        )
    return min(candidates, key=lambda candidate: (candidate.tesseract_version, candidate.cache_path.name))


def validate_ela_question_image(
    image_path: str | Path,
    cache_root: str | Path,
    *,
    tesseract_binary: str | None,
    expected_question_number: int | None = None,
    offline: bool = False,
) -> ElaImageValidationResult:
    """OCR and validate a final ELA question WebP.

    Cache entries are keyed by the complete image SHA-256, this module's
    validation version, and the normalized Tesseract version string.  If
    Tesseract is unavailable, ``offline=True`` replays a valid cache entry.
    Conflicting cached OCR from different Tesseract versions fails closed.
    """

    image = Path(image_path)
    cache = Path(cache_root)
    if expected_question_number is not None:
        if not isinstance(expected_question_number, int) or isinstance(expected_question_number, bool):
            raise TypeError("expected_question_number must be an integer or None")
        if expected_question_number < 1:
            raise ValueError("expected_question_number must be positive")
    _assert_webp(image)
    image_sha256 = _sha256_file(image)

    tesseract_version: str | None = None
    number_ocr_language: str | None = None
    if tesseract_binary:
        try:
            tesseract_version = _probe_tesseract_version(tesseract_binary)
            if expected_question_number is not None:
                number_ocr_language = _select_number_ocr_language(tesseract_binary)
        except ElaImageValidationError:
            if not offline:
                raise
            tesseract_version = None
            number_ocr_language = None
    elif not offline:
        raise ElaImageValidationError("Tesseract is required for final ELA WebP validation")

    if tesseract_version is None:
        return _replay_cached_ocr(
            cache,
            image_sha256,
            expected_question_number=expected_question_number,
        )

    cache_path = _cache_path(
        cache,
        image_sha256,
        tesseract_version,
        number_ocr_language,
    )
    cached = _read_cache_record(cache_path, expected_image_sha256=image_sha256)
    if cached is not None:
        return _result_from_record(
            cached,
            expected_question_number=expected_question_number,
        )

    try:
        raw_ocr = _run_final_image_ocr(image, tesseract_binary)
        normalized_candidate = normalize_ocr_text(raw_ocr)
        if _choice_labels(normalized_candidate) == _CHOICES:
            verified_choice_labels = _CHOICES
        else:
            # Prove that the full crop passes every non-label rule before
            # invoking the narrow geometry fallback.  This prevents the
            # isolated column from masking a passage, annotation, footer, or
            # otherwise non-substantive crop.
            validate_normalized_ela_ocr(
                normalized_candidate,
                verified_choice_labels=_CHOICES,
            )
            verified_choice_labels = _run_choice_column_ocr(
                image,
                tesseract_binary,
            )
    except ElaImageValidationError as live_error:
        if offline:
            try:
                return _replay_cached_ocr(
                    cache,
                    image_sha256,
                    expected_question_number=expected_question_number,
                )
            except ElaImageValidationError as cache_error:
                # ``offline`` may replay a valid hash-bound result from a
                # different Tesseract installation.  If no such result
                # exists, preserve the concrete live crop/OCR failure rather
                # than replacing it with an unhelpful cache-miss message.
                raise live_error from cache_error
        raise
    normalized = validate_normalized_ela_ocr(
        normalized_candidate,
        verified_choice_labels=verified_choice_labels,
    )
    if expected_question_number is not None:
        if number_ocr_language is None:
            raise AssertionError("Number OCR language missing after successful Tesseract probe")
        printed_question_number = _run_question_number_ocr(
            image,
            tesseract_binary,
            number_ocr_language,
        )
    else:
        printed_question_number = None
    _validate_expected_question_number(
        printed_question_number,
        expected_question_number,
    )
    _atomic_write_json(
        cache_path,
        {
            "schemaVersion": CACHE_SCHEMA_VERSION,
            "validationVersion": VALIDATION_VERSION,
            "imageSha256": image_sha256,
            "tesseractVersion": tesseract_version,
            "normalizedOcr": normalized,
            "printedQuestionNumber": printed_question_number,
            "numberOcrLanguage": number_ocr_language,
            "choiceLabels": list(verified_choice_labels),
        },
    )
    return ElaImageValidationResult(
        image_sha256=image_sha256,
        normalized_ocr=normalized,
        tesseract_version=tesseract_version,
        cache_path=cache_path,
        used_cache=False,
        choice_labels=verified_choice_labels,
    )


__all__ = (
    "CACHE_SCHEMA_VERSION",
    "DEFAULT_ALT_MAX_LENGTH",
    "ElaImageValidationError",
    "ElaImageValidationResult",
    "MIN_SUBSTANTIVE_ALNUM",
    "VALIDATION_VERSION",
    "normalize_ocr_text",
    "normalized_ocr_for_alt",
    "validate_ela_question_image",
    "validate_normalized_ela_ocr",
)

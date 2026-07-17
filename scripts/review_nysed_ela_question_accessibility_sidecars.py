#!/usr/bin/env python3
"""Approve and validate reviewed NYSED ELA question transcriptions.

Automated authoring writes only to a draft directory.  After a reviewer has
compared those drafts with the exact released question facsimiles, ``--approve``
preflights the complete 78-exam corpus before replacing any production file.
The review manifest is written last and acts as the activation marker: a mixed
or interrupted sidecar update therefore fails closed.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import sys
import tempfile
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Mapping, Sequence

try:
    from scripts.nysed_ela_question_accessibility import (
        ELA_QUESTION_ACCESSIBILITY_POLICY_VERSION,
        EXPECTED_ELA_QUESTION_ACCESSIBILITY_EXAMS,
        EXPECTED_ELA_QUESTION_ACCESSIBILITY_QUESTIONS,
        ElaQuestionAccessibilityError,
        ela_question_accessibility_input_hash,
        load_exam_question_accessibility,
        sha256_file,
    )
except ModuleNotFoundError:  # pragma: no cover - permits direct execution.
    from nysed_ela_question_accessibility import (  # type: ignore[no-redef]
        ELA_QUESTION_ACCESSIBILITY_POLICY_VERSION,
        EXPECTED_ELA_QUESTION_ACCESSIBILITY_EXAMS,
        EXPECTED_ELA_QUESTION_ACCESSIBILITY_QUESTIONS,
        ElaQuestionAccessibilityError,
        ela_question_accessibility_input_hash,
        load_exam_question_accessibility,
        sha256_file,
    )


REPO_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_CATALOG = REPO_ROOT / "content" / "ela-exams" / "generated" / "catalog.json"
DEFAULT_DRAFT_ROOT = REPO_ROOT / "tmp" / "pdfs" / "ela-question-accessibility-drafts"
DEFAULT_APPROVED_ROOT = REPO_ROOT / "content" / "ela-exams" / "accessibility"
DEFAULT_MANIFEST = (
    REPO_ROOT / "content" / "ela-exams" / "question-accessibility-review-manifest.json"
)
DEFAULT_PUBLIC_ROOT = REPO_ROOT / "public" / "nysed" / "ela"
APP_PUBLIC_PREFIX = "/vine-app/nysed/ela/"
REVIEW_SCHEMA_VERSION = 1
GRADES = [3, 4, 5, 6, 7, 8]
YEARS = [2013, 2014, 2015, 2016, 2017, 2018, 2019, 2021, 2022, 2023, 2024, 2025, 2026]
EXPECTED_RELEASE_PAIRS = frozenset((year, grade) for year in YEARS for grade in GRADES)
SHA256_RE = re.compile(r"^[0-9a-f]{64}$")
SIDECAR_NAME_RE = re.compile(r"^\d{4}-grade-[3-8]\.json$")
MANIFEST_KEYS = {"schemaVersion", "policyVersion", "scope", "reviews"}
REVIEW_KEYS = {
    "examId",
    "year",
    "grade",
    "sourcePdfSha256",
    "sidecarSha256",
    "questionCount",
}
EXPECTED_SCOPE = {
    "years": YEARS,
    "grades": GRADES,
    "examCount": EXPECTED_ELA_QUESTION_ACCESSIBILITY_EXAMS,
    "questionCount": EXPECTED_ELA_QUESTION_ACCESSIBILITY_QUESTIONS,
}


class ElaQuestionAccessibilityReviewError(RuntimeError):
    """Draft review data is incomplete, stale, or unsafe to activate."""


@dataclass(frozen=True)
class ExamInputs:
    exam_id: str
    year: int
    grade: int
    source_pdf_sha256: str
    input_hashes: Mapping[str, str]
    numbers: Mapping[str, int]
    catalog_alts: Mapping[str, str]

    @property
    def sidecar_name(self) -> str:
        return f"{self.year}-grade-{self.grade}.json"


@dataclass(frozen=True)
class ActivationSnapshot:
    records: tuple[dict[str, Any], ...]
    payloads: Mapping[str, bytes]
    reviewed_alts: Mapping[str, str]
    catalog_alts: Mapping[str, str]


def _reject_duplicate_keys(pairs: list[tuple[str, Any]]) -> dict[str, Any]:
    result: dict[str, Any] = {}
    for key, value in pairs:
        if key in result:
            raise ElaQuestionAccessibilityReviewError(
                f"Duplicate JSON key in ELA accessibility review data: {key}"
            )
        result[key] = value
    return result


def _load_json(path: Path) -> Any:
    try:
        return json.loads(
            path.read_text(encoding="utf-8"),
            object_pairs_hook=_reject_duplicate_keys,
        )
    except FileNotFoundError as exc:
        raise ElaQuestionAccessibilityReviewError(f"Missing review input: {path}") from exc
    except json.JSONDecodeError as exc:
        raise ElaQuestionAccessibilityReviewError(
            f"Malformed review input {path}: {exc}"
        ) from exc


def _sha(value: Any, *, label: str) -> str:
    if not isinstance(value, str) or SHA256_RE.fullmatch(value) is None:
        raise ElaQuestionAccessibilityReviewError(f"{label} must be a lowercase SHA-256 digest")
    return value


def _exact_mapping(value: Any, keys: set[str], *, label: str) -> dict[str, Any]:
    if not isinstance(value, dict) or set(value) != keys:
        actual = sorted(value) if isinstance(value, dict) else type(value).__name__
        raise ElaQuestionAccessibilityReviewError(
            f"{label} has unexpected keys; expected={sorted(keys)}, got={actual}"
        )
    return value


def _safe_regular_file(root: Path, relative: str, *, label: str) -> Path:
    if not relative or "\\" in relative:
        raise ElaQuestionAccessibilityReviewError(f"Unsafe {label} path: {relative!r}")
    relative_path = Path(relative)
    if relative_path.is_absolute() or ".." in relative_path.parts:
        raise ElaQuestionAccessibilityReviewError(f"Unsafe {label} path: {relative!r}")
    resolved_root = root.resolve()
    candidate = resolved_root / relative_path
    resolved = candidate.resolve()
    try:
        resolved.relative_to(resolved_root)
    except ValueError as exc:
        raise ElaQuestionAccessibilityReviewError(
            f"{label} escapes its root: {relative!r}"
        ) from exc
    if candidate.is_symlink() or not resolved.is_file():
        raise ElaQuestionAccessibilityReviewError(f"Missing or unsafe {label}: {candidate}")
    return resolved


def _question_image_path(public_root: Path, src: Any, *, year: int, grade: int, number: int) -> Path:
    expected = (
        f"{APP_PUBLIC_PREFIX}{year}/grade-{grade}/en/"
        f"q{number:02d}.webp"
    )
    if src != expected:
        raise ElaQuestionAccessibilityReviewError(
            f"Question image path changed; expected {expected!r}, got {src!r}"
        )
    return _safe_regular_file(
        public_root,
        expected[len(APP_PUBLIC_PREFIX) :],
        label=f"question {year} Grade {grade} #{number} image",
    )


def _catalog_inputs(catalog_path: Path, public_root: Path) -> tuple[ExamInputs, ...]:
    catalog = _exact_mapping(
        _load_json(catalog_path),
        {"schemaVersion", "generatedAt", "accessedAt", "sourceUpdatedAt", "sourceIndexUrl", "exams"},
        label="ELA catalog",
    )
    exams = catalog["exams"]
    if not isinstance(exams, list) or len(exams) != EXPECTED_ELA_QUESTION_ACCESSIBILITY_EXAMS:
        raise ElaQuestionAccessibilityReviewError(
            f"Expected {EXPECTED_ELA_QUESTION_ACCESSIBILITY_EXAMS} ELA exams"
        )

    result: list[ExamInputs] = []
    exam_ids: set[str] = set()
    release_pairs: set[tuple[int, int]] = set()
    question_ids: set[str] = set()
    question_total = 0
    for exam in exams:
        if not isinstance(exam, dict):
            raise ElaQuestionAccessibilityReviewError("ELA catalog exam must be an object")
        exam_id = exam.get("id")
        year = exam.get("year")
        grade = exam.get("grade")
        questions = exam.get("questions")
        if (
            not isinstance(exam_id, str)
            or not exam_id
            or not isinstance(year, int)
            or isinstance(year, bool)
            or not isinstance(grade, int)
            or isinstance(grade, bool)
            or grade not in GRADES
            or not isinstance(questions, list)
            or not questions
        ):
            raise ElaQuestionAccessibilityReviewError("Malformed ELA catalog exam metadata")
        pair = (year, grade)
        expected_exam_id = f"nysed-ela-{year}-grade-{grade}-mc-v1"
        if pair not in EXPECTED_RELEASE_PAIRS:
            raise ElaQuestionAccessibilityReviewError(
                f"Unsupported ELA catalog release: {year} Grade {grade}"
            )
        if exam_id != expected_exam_id:
            raise ElaQuestionAccessibilityReviewError(
                f"Noncanonical ELA catalog exam ID; expected {expected_exam_id!r}, got {exam_id!r}"
            )
        if exam_id in exam_ids or pair in release_pairs:
            raise ElaQuestionAccessibilityReviewError(f"Duplicate ELA exam release: {exam_id}")
        exam_ids.add(exam_id)
        release_pairs.add(pair)

        import_manifest = _safe_regular_file(
            public_root,
            f"{year}/grade-{grade}/en/.nysed-import.json",
            label=f"{year} Grade {grade} import manifest",
        )
        raw_import_manifest = _load_json(import_manifest)
        if not isinstance(raw_import_manifest, dict):
            raise ElaQuestionAccessibilityReviewError(
                f"Malformed import manifest for {year} Grade {grade}"
            )
        source_pdf_sha256 = _sha(
            raw_import_manifest.get("sourcePdfSha256"),
            label=f"{year} Grade {grade} source PDF SHA-256",
        )

        input_hashes: dict[str, str] = {}
        numbers: dict[str, int] = {}
        catalog_alts: dict[str, str] = {}
        for question in questions:
            if not isinstance(question, dict):
                raise ElaQuestionAccessibilityReviewError(
                    f"Malformed question in {exam_id}"
                )
            question_id = question.get("id")
            number = question.get("number")
            image = question.get("image")
            alt = question.get("alt")
            if (
                not isinstance(question_id, str)
                or not question_id
                or question_id in question_ids
                or not isinstance(number, int)
                or isinstance(number, bool)
                or not 1 <= number <= 100
                or not isinstance(image, dict)
                or not isinstance(alt, str)
            ):
                raise ElaQuestionAccessibilityReviewError(
                    f"Malformed or duplicate question in {exam_id}: {question_id!r}"
                )
            question_ids.add(question_id)
            image_path = _question_image_path(
                public_root,
                image.get("src"),
                year=year,
                grade=grade,
                number=number,
            )
            input_hashes[question_id] = ela_question_accessibility_input_hash(
                question_id=question_id,
                number=number,
                source_pdf_sha256=source_pdf_sha256,
                question_image_sha256=sha256_file(image_path),
            )
            numbers[question_id] = number
            catalog_alts[question_id] = alt

        question_total += len(questions)
        result.append(
            ExamInputs(
                exam_id=exam_id,
                year=year,
                grade=grade,
                source_pdf_sha256=source_pdf_sha256,
                input_hashes=input_hashes,
                numbers=numbers,
                catalog_alts=catalog_alts,
            )
        )

    if question_total != EXPECTED_ELA_QUESTION_ACCESSIBILITY_QUESTIONS:
        raise ElaQuestionAccessibilityReviewError(
            "ELA catalog question scope changed: expected "
            f"{EXPECTED_ELA_QUESTION_ACCESSIBILITY_QUESTIONS}, got {question_total}"
        )
    if release_pairs != EXPECTED_RELEASE_PAIRS:
        raise ElaQuestionAccessibilityReviewError(
            "ELA catalog release scope changed; "
            f"missing={sorted(EXPECTED_RELEASE_PAIRS - release_pairs)}, "
            f"unexpected={sorted(release_pairs - EXPECTED_RELEASE_PAIRS)}"
        )
    return tuple(sorted(result, key=lambda item: (item.year, item.grade)))


def _sidecar_paths(root: Path, exams: Sequence[ExamInputs]) -> dict[str, Path]:
    expected_names = {exam.sidecar_name for exam in exams}
    try:
        actual_names = {
            path.name
            for path in root.iterdir()
            if path.is_file() and SIDECAR_NAME_RE.fullmatch(path.name)
        }
    except FileNotFoundError as exc:
        raise ElaQuestionAccessibilityReviewError(f"Missing sidecar root: {root}") from exc
    if actual_names != expected_names:
        raise ElaQuestionAccessibilityReviewError(
            "ELA question sidecar coverage changed; "
            f"missing={sorted(expected_names - actual_names)}, "
            f"orphaned={sorted(actual_names - expected_names)}"
        )
    result: dict[str, Path] = {}
    for name in sorted(expected_names):
        path = root / name
        if path.is_symlink() or not path.is_file():
            raise ElaQuestionAccessibilityReviewError(f"Unsafe sidecar: {path}")
        result[name] = path
    return result


def preflight_sidecar_root(
    *,
    sidecar_root: Path,
    catalog_path: Path,
    public_root: Path,
) -> ActivationSnapshot:
    """Validate every sidecar and exact source input without writing anything."""

    exams = _catalog_inputs(catalog_path, public_root)
    paths = _sidecar_paths(sidecar_root, exams)
    records: list[dict[str, Any]] = []
    payloads: dict[str, bytes] = {}
    reviewed_alts: dict[str, str] = {}
    catalog_alts: dict[str, str] = {}
    for exam in exams:
        path = paths[exam.sidecar_name]
        payload = path.read_bytes()
        try:
            reviewed = load_exam_question_accessibility(
                year=exam.year,
                grade=exam.grade,
                exam_id=exam.exam_id,
                source_pdf_sha256=exam.source_pdf_sha256,
                expected_input_hashes=exam.input_hashes,
                expected_numbers=exam.numbers,
                root=sidecar_root,
                manifest_path=None,
            )
        except (ElaQuestionAccessibilityError, OSError, TypeError, ValueError) as exc:
            raise ElaQuestionAccessibilityReviewError(
                f"Question accessibility sidecar failed for {exam.exam_id}: {exc}"
            ) from exc
        for question_id, alt in reviewed.items():
            if question_id in reviewed_alts:
                raise ElaQuestionAccessibilityReviewError(
                    f"Duplicate reviewed question: {question_id}"
                )
            reviewed_alts[question_id] = alt
        catalog_alts.update(exam.catalog_alts)
        payloads[exam.sidecar_name] = payload
        records.append(
            {
                "examId": exam.exam_id,
                "year": exam.year,
                "grade": exam.grade,
                "sourcePdfSha256": exam.source_pdf_sha256,
                "sidecarSha256": hashlib.sha256(payload).hexdigest(),
                "questionCount": len(reviewed),
            }
        )

    if len(reviewed_alts) != EXPECTED_ELA_QUESTION_ACCESSIBILITY_QUESTIONS:
        raise ElaQuestionAccessibilityReviewError(
            f"Expected {EXPECTED_ELA_QUESTION_ACCESSIBILITY_QUESTIONS} reviewed questions, "
            f"got {len(reviewed_alts)}"
        )
    return ActivationSnapshot(
        records=tuple(records),
        payloads=payloads,
        reviewed_alts=reviewed_alts,
        catalog_alts=catalog_alts,
    )


def review_manifest_payload(records: Sequence[Mapping[str, Any]]) -> dict[str, Any]:
    return {
        "schemaVersion": REVIEW_SCHEMA_VERSION,
        "policyVersion": ELA_QUESTION_ACCESSIBILITY_POLICY_VERSION,
        "scope": EXPECTED_SCOPE,
        "reviews": [dict(record) for record in records],
    }


def validated_review_records(value: Any) -> tuple[dict[str, Any], ...]:
    """Return the exact, independently well-formed 78-record activation ledger."""

    manifest = _exact_mapping(value, MANIFEST_KEYS, label="ELA accessibility review manifest")
    if manifest["schemaVersion"] != REVIEW_SCHEMA_VERSION:
        raise ElaQuestionAccessibilityReviewError("Unsupported accessibility review schema")
    if manifest["policyVersion"] != ELA_QUESTION_ACCESSIBILITY_POLICY_VERSION:
        raise ElaQuestionAccessibilityReviewError("Accessibility review policy changed")
    if manifest["scope"] != EXPECTED_SCOPE:
        raise ElaQuestionAccessibilityReviewError("Accessibility review scope changed")
    reviews = manifest["reviews"]
    if not isinstance(reviews, list) or len(reviews) != EXPECTED_ELA_QUESTION_ACCESSIBILITY_EXAMS:
        raise ElaQuestionAccessibilityReviewError("Accessibility review count changed")

    normalized: list[dict[str, Any]] = []
    exam_ids: set[str] = set()
    release_pairs: set[tuple[int, int]] = set()
    question_total = 0
    for index, raw_review in enumerate(reviews):
        review = _exact_mapping(raw_review, REVIEW_KEYS, label=f"Review record {index}")
        exam_id = review["examId"]
        year = review["year"]
        grade = review["grade"]
        question_count = review["questionCount"]
        if (
            not isinstance(exam_id, str)
            or not exam_id
            or not isinstance(year, int)
            or isinstance(year, bool)
            or not isinstance(grade, int)
            or isinstance(grade, bool)
            or grade not in GRADES
            or not isinstance(question_count, int)
            or isinstance(question_count, bool)
            or question_count <= 0
        ):
            raise ElaQuestionAccessibilityReviewError(f"Invalid review record {index}")
        pair = (year, grade)
        expected_exam_id = f"nysed-ela-{year}-grade-{grade}-mc-v1"
        if pair not in EXPECTED_RELEASE_PAIRS:
            raise ElaQuestionAccessibilityReviewError(
                f"Unsupported accessibility review release: {year} Grade {grade}"
            )
        if exam_id != expected_exam_id:
            raise ElaQuestionAccessibilityReviewError(
                "Noncanonical accessibility review exam ID; "
                f"expected {expected_exam_id!r}, got {exam_id!r}"
            )
        if exam_id in exam_ids or pair in release_pairs:
            raise ElaQuestionAccessibilityReviewError(f"Duplicate review record: {exam_id}")
        exam_ids.add(exam_id)
        release_pairs.add(pair)
        question_total += question_count
        normalized.append(
            {
                "examId": exam_id,
                "year": year,
                "grade": grade,
                "sourcePdfSha256": _sha(
                    review["sourcePdfSha256"], label=f"{exam_id} source PDF SHA-256"
                ),
                "sidecarSha256": _sha(
                    review["sidecarSha256"], label=f"{exam_id} sidecar SHA-256"
                ),
                "questionCount": question_count,
            }
        )
    if question_total != EXPECTED_ELA_QUESTION_ACCESSIBILITY_QUESTIONS:
        raise ElaQuestionAccessibilityReviewError(
            f"Reviewed question total changed: {question_total}"
        )
    if release_pairs != EXPECTED_RELEASE_PAIRS:
        raise ElaQuestionAccessibilityReviewError(
            "Accessibility review release scope changed; "
            f"missing={sorted(EXPECTED_RELEASE_PAIRS - release_pairs)}, "
            f"unexpected={sorted(release_pairs - EXPECTED_RELEASE_PAIRS)}"
        )
    if normalized != sorted(normalized, key=lambda item: (item["year"], item["grade"])):
        raise ElaQuestionAccessibilityReviewError("Review records are not sorted by year and grade")
    return tuple(normalized)


def load_review_manifest(
    manifest_path: Path = DEFAULT_MANIFEST,
) -> dict[str, dict[str, Any]]:
    """Load the activation ledger for fail-closed production sidecar checks."""

    records = validated_review_records(_load_json(manifest_path))
    return {str(record["examId"]): record for record in records}


def validate_review_manifest(value: Any, expected_records: Sequence[Mapping[str, Any]]) -> None:
    normalized = list(validated_review_records(value))
    expected = [dict(record) for record in expected_records]
    if normalized != expected:
        raise ElaQuestionAccessibilityReviewError(
            "Approved sidecar bytes or source metadata differ from the review manifest"
        )


def _manifest_bytes(records: Sequence[Mapping[str, Any]]) -> bytes:
    return (
        json.dumps(review_manifest_payload(records), ensure_ascii=False, indent=2) + "\n"
    ).encode("utf-8")


def _write_fsynced(path: Path, payload: bytes) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("wb") as handle:
        handle.write(payload)
        handle.flush()
        os.fsync(handle.fileno())


def _fsync_directory(path: Path) -> None:
    descriptor = os.open(path, os.O_RDONLY)
    try:
        os.fsync(descriptor)
    finally:
        os.close(descriptor)


def _atomic_write_bytes(path: Path, payload: bytes) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    descriptor, temporary_name = tempfile.mkstemp(
        dir=path.parent,
        prefix=f".{path.name}.",
        suffix=".tmp",
    )
    temporary = Path(temporary_name)
    try:
        with os.fdopen(descriptor, "wb") as handle:
            handle.write(payload)
            handle.flush()
            os.fsync(handle.fileno())
        os.chmod(temporary, (path.stat().st_mode & 0o777) if path.exists() else 0o644)
        os.replace(temporary, path)
        _fsync_directory(path.parent)
    finally:
        temporary.unlink(missing_ok=True)


def approve_drafts(
    *,
    draft_root: Path,
    approved_root: Path,
    manifest_path: Path,
    catalog_path: Path,
    public_root: Path,
) -> None:
    """Preflight all drafts, stage all outputs, then activate manifest last."""

    # This is deliberately the first operation. A validation failure must not
    # create or modify any approved file or activation manifest.
    snapshot = preflight_sidecar_root(
        sidecar_root=draft_root,
        catalog_path=catalog_path,
        public_root=public_root,
    )
    expected_names = set(snapshot.payloads)
    if approved_root.exists():
        unexpected = {
            path.name
            for path in approved_root.iterdir()
            if path.is_file()
            and SIDECAR_NAME_RE.fullmatch(path.name)
            and path.name not in expected_names
        }
        if unexpected:
            raise ElaQuestionAccessibilityReviewError(
                f"Approved sidecar directory has orphaned releases: {sorted(unexpected)}"
            )

    approved_root.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(
        dir=approved_root.parent,
        prefix=".ela-question-accessibility-approved-",
    ) as temporary_directory:
        staged_root = Path(temporary_directory)
        for name, payload in sorted(snapshot.payloads.items()):
            _write_fsynced(staged_root / name, payload)
        staged = preflight_sidecar_root(
            sidecar_root=staged_root,
            catalog_path=catalog_path,
            public_root=public_root,
        )
        if staged.records != snapshot.records:
            raise ElaQuestionAccessibilityReviewError("Staged review records changed")

        approved_root.mkdir(parents=True, exist_ok=True)
        for name in sorted(expected_names):
            os.replace(staged_root / name, approved_root / name)
        _fsync_directory(approved_root)

    # The manifest is the activation marker and must be the final replacement.
    _atomic_write_bytes(manifest_path, _manifest_bytes(snapshot.records))


def validate_approved(
    *,
    approved_root: Path,
    manifest_path: Path,
    catalog_path: Path,
    public_root: Path,
) -> None:
    snapshot = preflight_sidecar_root(
        sidecar_root=approved_root,
        catalog_path=catalog_path,
        public_root=public_root,
    )
    validate_review_manifest(_load_json(manifest_path), snapshot.records)
    if snapshot.reviewed_alts != snapshot.catalog_alts:
        mismatched = sorted(
            question_id
            for question_id, alt in snapshot.reviewed_alts.items()
            if snapshot.catalog_alts.get(question_id) != alt
        )
        raise ElaQuestionAccessibilityReviewError(
            "Generated catalog differs from approved question accessibility text: "
            f"{mismatched[:10]}{'...' if len(mismatched) > 10 else ''}"
        )


def parse_args(argv: Sequence[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    action = parser.add_mutually_exclusive_group(required=True)
    action.add_argument("--approve", action="store_true")
    action.add_argument("--validate", action="store_true")
    parser.add_argument("--catalog", type=Path, default=DEFAULT_CATALOG)
    parser.add_argument("--draft-root", type=Path, default=DEFAULT_DRAFT_ROOT)
    parser.add_argument("--approved-root", type=Path, default=DEFAULT_APPROVED_ROOT)
    parser.add_argument("--manifest", type=Path, default=DEFAULT_MANIFEST)
    parser.add_argument("--public-root", type=Path, default=DEFAULT_PUBLIC_ROOT)
    return parser.parse_args(argv)


def main(argv: Sequence[str] | None = None) -> int:
    args = parse_args(argv or sys.argv[1:])
    common = {
        "approved_root": args.approved_root.resolve(),
        "manifest_path": args.manifest.resolve(),
        "catalog_path": args.catalog.resolve(),
        "public_root": args.public_root.resolve(),
    }
    if args.approve:
        approve_drafts(draft_root=args.draft_root.resolve(), **common)
        print(
            "Approved 78 ELA question accessibility sidecars / 1,583 questions; "
            "activation manifest written last"
        )
    else:
        validate_approved(**common)
        print("Validated approved ELA question accessibility sidecars and generated catalog")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (ElaQuestionAccessibilityReviewError, OSError, TypeError, ValueError) as exc:
        print(f"error: {exc}", file=sys.stderr)
        raise SystemExit(1)

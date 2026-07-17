#!/usr/bin/env python3
"""Record, approve, and validate reviewed NYSED ELA transcript sidecars.

Draft OCR authoring and human approval are intentionally separate. After a
reviewer compares every transcript with its visible NYSED facsimile, ``--record``
captures exact text/image/input hashes and marker/visual expectations. ``--approve``
will only mark sidecars reviewed when every byte still matches that manifest.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import sys
import tempfile
from pathlib import Path
from typing import Any, Sequence

try:
    from scripts.nysed_ela_transcripts import (
        DEFAULT_SIDECAR_ROOT,
        EXPECTED_TRANSCRIPT_QUESTIONS,
        EXPECTED_TRANSCRIPT_STIMULI,
        SOURCE_VALUES,
        TRANSCRIPT_POLICY_VERSION,
        normalize_transcript_text,
        sha256_file,
        transcript_paragraph_markers,
        transcript_visual_description_count,
    )
except ModuleNotFoundError:  # pragma: no cover - permits direct execution.
    from nysed_ela_transcripts import (  # type: ignore[no-redef]
        DEFAULT_SIDECAR_ROOT,
        EXPECTED_TRANSCRIPT_QUESTIONS,
        EXPECTED_TRANSCRIPT_STIMULI,
        SOURCE_VALUES,
        TRANSCRIPT_POLICY_VERSION,
        normalize_transcript_text,
        sha256_file,
        transcript_paragraph_markers,
        transcript_visual_description_count,
    )


REPO_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_CATALOG = REPO_ROOT / "content" / "ela-exams" / "generated" / "catalog.json"
DEFAULT_MANIFEST = REPO_ROOT / "content" / "ela-exams" / "transcript-review-manifest.json"
DEFAULT_PUBLIC_ROOT = REPO_ROOT / "public" / "nysed" / "ela"
EXPECTED_SIDECARS = 78
SHA256_KEYS = {
    "inputHash",
    "sourcePdfSha256",
    "passageImageSha256",
    "textSha256",
}


class TranscriptReviewError(RuntimeError):
    pass


def atomic_write_json(path: Path, value: Any) -> None:
    """Write deterministic review data without importing the PDF toolchain."""

    path.parent.mkdir(parents=True, exist_ok=True)
    encoded = (json.dumps(value, ensure_ascii=False, indent=2) + "\n").encode("utf-8")
    descriptor, temporary_name = tempfile.mkstemp(
        dir=path.parent,
        prefix=f".{path.name}.",
        suffix=".tmp",
    )
    temporary = Path(temporary_name)
    try:
        with os.fdopen(descriptor, "wb") as handle:
            handle.write(encoded)
            handle.flush()
            os.fsync(handle.fileno())
        os.chmod(temporary, (path.stat().st_mode & 0o777) if path.exists() else 0o644)
        os.replace(temporary, path)
    finally:
        temporary.unlink(missing_ok=True)


def _reject_duplicate_keys(pairs: list[tuple[str, Any]]) -> dict[str, Any]:
    result: dict[str, Any] = {}
    for key, value in pairs:
        if key in result:
            raise TranscriptReviewError(f"Duplicate JSON key in transcript review data: {key}")
        result[key] = value
    return result


def _load_json(path: Path) -> Any:
    try:
        return json.loads(
            path.read_text(encoding="utf-8"),
            object_pairs_hook=_reject_duplicate_keys,
        )
    except FileNotFoundError as exc:
        raise TranscriptReviewError(f"Missing transcript review input: {path}") from exc
    except json.JSONDecodeError as exc:
        raise TranscriptReviewError(f"Malformed transcript review input {path}: {exc}") from exc


def _text_sha256(value: str) -> str:
    return hashlib.sha256(normalize_transcript_text(value).encode("utf-8")).hexdigest()


def _catalog_stimuli(catalog_path: Path, public_root: Path) -> tuple[dict[str, dict[str, Any]], int]:
    catalog = _load_json(catalog_path)
    if not isinstance(catalog, dict):
        raise TranscriptReviewError("ELA catalog is not an object")
    result: dict[str, dict[str, Any]] = {}
    question_count = 0
    for exam in catalog.get("exams", []):
        if not isinstance(exam, dict) or int(exam.get("grade", 0)) not in {3, 4, 5, 6, 7, 8}:
            continue
        year = int(exam["year"])
        grade = int(exam["grade"])
        for stimulus in exam.get("stimuli", []):
            if not isinstance(stimulus, dict):
                raise TranscriptReviewError("Malformed Grade 3–8 ELA stimulus")
            stimulus_id = str(stimulus["id"])
            source = str(stimulus.get("passage", {}).get("src", ""))
            prefix = f"/vine-app/nysed/ela/{year}/grade-{grade}/en/"
            if not source.startswith(prefix) or "/../" in source:
                raise TranscriptReviewError(f"Unsafe passage asset for {stimulus_id}")
            image_path = public_root / str(year) / f"grade-{grade}" / "en" / Path(source).name
            if not image_path.is_file() or image_path.is_symlink():
                raise TranscriptReviewError(f"Missing regular passage image for {stimulus_id}")
            if stimulus_id in result:
                raise TranscriptReviewError(f"Duplicate catalog stimulus: {stimulus_id}")
            result[stimulus_id] = {
                "examId": str(exam["id"]),
                "passageImageSha256": sha256_file(image_path),
                # Record/approve intentionally tolerate a catalog that has not
                # been re-imported yet. ``--validate`` below requires this to
                # be the exact manifest-pinned client payload.
                "transcript": stimulus.get("passage", {}).get("transcript"),
            }
            question_count += int(stimulus["questionEnd"]) - int(stimulus["questionStart"]) + 1
    if len(result) != EXPECTED_TRANSCRIPT_STIMULI or question_count != EXPECTED_TRANSCRIPT_QUESTIONS:
        raise TranscriptReviewError(
            "Catalog transcript scope changed: expected "
            f"{EXPECTED_TRANSCRIPT_STIMULI}/{EXPECTED_TRANSCRIPT_QUESTIONS}, "
            f"got {len(result)}/{question_count}"
        )
    return result, question_count


def _load_sidecars(sidecar_root: Path) -> dict[str, tuple[Path, dict[str, Any], dict[str, Any]]]:
    paths = sorted(sidecar_root.glob("????-grade-[3-8].json"))
    if len(paths) != EXPECTED_SIDECARS:
        raise TranscriptReviewError(
            f"Expected {EXPECTED_SIDECARS} Grade 3–8 sidecars, found {len(paths)}"
        )
    result: dict[str, tuple[Path, dict[str, Any], dict[str, Any]]] = {}
    for path in paths:
        sidecar = _load_json(path)
        if not isinstance(sidecar, dict) or sidecar.get("policyVersion") != TRANSCRIPT_POLICY_VERSION:
            raise TranscriptReviewError(f"Unsupported transcript sidecar: {path.name}")
        passages = sidecar.get("passages")
        if not isinstance(passages, list):
            raise TranscriptReviewError(f"Missing transcript passages: {path.name}")
        for passage in passages:
            if not isinstance(passage, dict):
                raise TranscriptReviewError(f"Malformed transcript passage: {path.name}")
            stimulus_id = str(passage.get("stimulusId", ""))
            if not stimulus_id or stimulus_id in result:
                raise TranscriptReviewError(f"Duplicate or missing transcript stimulus: {stimulus_id}")
            result[stimulus_id] = (path, sidecar, passage)
    if len(result) != EXPECTED_TRANSCRIPT_STIMULI:
        raise TranscriptReviewError(
            f"Expected {EXPECTED_TRANSCRIPT_STIMULI} transcript records, found {len(result)}"
        )
    return result


def record_manifest(
    *,
    manifest_path: Path,
    catalog_path: Path,
    public_root: Path,
    sidecar_root: Path,
) -> None:
    catalog_by_id, question_count = _catalog_stimuli(catalog_path, public_root)
    sidecars = _load_sidecars(sidecar_root)
    if set(catalog_by_id) != set(sidecars):
        raise TranscriptReviewError("Catalog/sidecar stimulus parity failed")
    reviews: list[dict[str, Any]] = []
    for stimulus_id in sorted(sidecars):
        _, sidecar, passage = sidecars[stimulus_id]
        text = normalize_transcript_text(str(passage.get("text", "")))
        markers = transcript_paragraph_markers(text)
        if len(markers) < 3 or any(b <= a for a, b in zip(markers, markers[1:])):
            raise TranscriptReviewError(f"Unreviewable marker sequence: {stimulus_id}")
        visual_count = transcript_visual_description_count(text)
        if passage.get("visualDescriptionCount") != visual_count:
            raise TranscriptReviewError(f"Stale visual count before review: {stimulus_id}")
        reviews.append(
            {
                "examId": catalog_by_id[stimulus_id]["examId"],
                "stimulusId": stimulus_id,
                "inputHash": passage.get("inputHash"),
                "source": passage.get("source"),
                "sourcePdfSha256": sidecar.get("sourcePdfSha256"),
                "passageImageSha256": catalog_by_id[stimulus_id]["passageImageSha256"],
                "textSha256": _text_sha256(text),
                "paragraphMarkers": markers,
                "visualDescriptionCount": visual_count,
            }
        )
    payload = {
        "schemaVersion": 1,
        "policyVersion": TRANSCRIPT_POLICY_VERSION,
        "scope": {
            "grades": [3, 4, 5, 6, 7, 8],
            "stimulusCount": EXPECTED_TRANSCRIPT_STIMULI,
            "questionCount": question_count,
        },
        "reviews": reviews,
    }
    manifest_path.parent.mkdir(parents=True, exist_ok=True)
    atomic_write_json(manifest_path, payload)


def _review_by_id(manifest_path: Path) -> dict[str, dict[str, Any]]:
    manifest = _load_json(manifest_path)
    if not isinstance(manifest, dict) or set(manifest) != {
        "schemaVersion",
        "policyVersion",
        "scope",
        "reviews",
    }:
        raise TranscriptReviewError("Review manifest has unexpected keys")
    if manifest.get("schemaVersion") != 1 or manifest.get("policyVersion") != TRANSCRIPT_POLICY_VERSION:
        raise TranscriptReviewError("Unsupported transcript review manifest")
    if manifest.get("scope") != {
        "grades": [3, 4, 5, 6, 7, 8],
        "stimulusCount": EXPECTED_TRANSCRIPT_STIMULI,
        "questionCount": EXPECTED_TRANSCRIPT_QUESTIONS,
    }:
        raise TranscriptReviewError("Review manifest has the wrong Grade 3–8 scope")
    reviews = manifest.get("reviews")
    if not isinstance(reviews, list) or len(reviews) != EXPECTED_TRANSCRIPT_STIMULI:
        raise TranscriptReviewError("Review manifest has the wrong review count")
    expected_keys = {
        "examId",
        "stimulusId",
        "inputHash",
        "source",
        "sourcePdfSha256",
        "passageImageSha256",
        "textSha256",
        "paragraphMarkers",
        "visualDescriptionCount",
    }
    result: dict[str, dict[str, Any]] = {}
    for review in reviews:
        if not isinstance(review, dict) or set(review) != expected_keys:
            raise TranscriptReviewError("Review manifest record has unexpected keys")
        stimulus_id = review.get("stimulusId")
        if not isinstance(stimulus_id, str) or not stimulus_id or stimulus_id in result:
            raise TranscriptReviewError(f"Duplicate or invalid manifest review: {stimulus_id}")
        if review.get("source") not in SOURCE_VALUES:
            raise TranscriptReviewError(f"Invalid reviewed source: {stimulus_id}")
        if any(
            not isinstance(review.get(key), str)
            or len(review[key]) != 64
            or any(character not in "0123456789abcdef" for character in review[key])
            for key in SHA256_KEYS
        ):
            raise TranscriptReviewError(f"Invalid review digest: {stimulus_id}")
        markers = review.get("paragraphMarkers")
        if (
            not isinstance(markers, list)
            or len(markers) < 3
            or not all(isinstance(marker, int) and marker > 0 for marker in markers)
            or any(b <= a for a, b in zip(markers, markers[1:]))
        ):
            raise TranscriptReviewError(f"Invalid reviewed marker sequence: {stimulus_id}")
        visual_count = review.get("visualDescriptionCount")
        if not isinstance(visual_count, int) or isinstance(visual_count, bool) or visual_count < 0:
            raise TranscriptReviewError(f"Invalid reviewed visual count: {stimulus_id}")
        result[stimulus_id] = review
    return result


def approve_or_validate(
    *,
    manifest_path: Path,
    catalog_path: Path,
    public_root: Path,
    sidecar_root: Path,
    approve: bool,
) -> None:
    reviews = _review_by_id(manifest_path)
    catalog_by_id, _ = _catalog_stimuli(catalog_path, public_root)
    sidecars = _load_sidecars(sidecar_root)
    if set(reviews) != set(catalog_by_id) or set(reviews) != set(sidecars):
        raise TranscriptReviewError("Review/catalog/sidecar parity failed")

    changed: dict[Path, dict[str, Any]] = {}
    for stimulus_id in sorted(reviews):
        review = reviews[stimulus_id]
        path, sidecar, passage = sidecars[stimulus_id]
        text = normalize_transcript_text(str(passage.get("text", "")))
        checks = {
            "examId": sidecar.get("examId"),
            "inputHash": passage.get("inputHash"),
            "source": passage.get("source"),
            "sourcePdfSha256": sidecar.get("sourcePdfSha256"),
            "passageImageSha256": catalog_by_id[stimulus_id]["passageImageSha256"],
            "textSha256": _text_sha256(text),
            "paragraphMarkers": transcript_paragraph_markers(text),
            "visualDescriptionCount": transcript_visual_description_count(text),
        }
        for key, actual in checks.items():
            if review.get(key) != actual:
                raise TranscriptReviewError(
                    f"Reviewed {key} changed for {stimulus_id}: "
                    f"expected {review.get(key)!r}, got {actual!r}"
                )
        if approve:
            passage["text"] = text
            passage["paragraphMarkers"] = review["paragraphMarkers"]
            passage["visualDescriptionCount"] = review["visualDescriptionCount"]
            passage["reviewedReadingOrder"] = True
            sidecar["reviewedReadingOrder"] = True
            changed[path] = sidecar
        else:
            if passage.get("reviewedReadingOrder") is not True:
                raise TranscriptReviewError(f"Transcript is not approved: {stimulus_id}")
            catalog_transcript = catalog_by_id[stimulus_id].get("transcript")
            expected_catalog_transcript = {
                "text": text,
                "source": review["source"],
                "sourcePdfSha256": review["sourcePdfSha256"],
                "passageImageSha256": review["passageImageSha256"],
            }
            if not isinstance(catalog_transcript, dict) or set(catalog_transcript) != set(
                expected_catalog_transcript
            ):
                raise TranscriptReviewError(
                    f"Generated catalog transcript has unexpected keys for {stimulus_id}"
                )
            if catalog_transcript != expected_catalog_transcript:
                raise TranscriptReviewError(
                    "Generated catalog transcript differs from the reviewed sidecar for "
                    f"{stimulus_id}"
                )

    if approve:
        for path, sidecar in sorted(changed.items()):
            atomic_write_json(path, sidecar)


def parse_args(argv: Sequence[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    action = parser.add_mutually_exclusive_group(required=True)
    action.add_argument("--record", action="store_true")
    action.add_argument("--approve", action="store_true")
    action.add_argument("--validate", action="store_true")
    parser.add_argument("--catalog", type=Path, default=DEFAULT_CATALOG)
    parser.add_argument("--manifest", type=Path, default=DEFAULT_MANIFEST)
    parser.add_argument("--public-root", type=Path, default=DEFAULT_PUBLIC_ROOT)
    parser.add_argument("--sidecar-root", type=Path, default=DEFAULT_SIDECAR_ROOT)
    return parser.parse_args(argv)


def main(argv: Sequence[str] | None = None) -> int:
    args = parse_args(argv or sys.argv[1:])
    common = {
        "catalog_path": args.catalog.resolve(),
        "public_root": args.public_root.resolve(),
        "sidecar_root": args.sidecar_root.resolve(),
    }
    if args.record:
        record_manifest(manifest_path=args.manifest.resolve(), **common)
        print(f"Recorded reviewed transcript manifest: {args.manifest}")
    else:
        approve_or_validate(
            manifest_path=args.manifest.resolve(),
            approve=bool(args.approve),
            **common,
        )
        print("Approved reviewed transcript sidecars" if args.approve else "Validated reviewed transcript sidecars")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (OSError, ValueError, TranscriptReviewError) as exc:
        print(f"error: {exc}", file=sys.stderr)
        raise SystemExit(1)

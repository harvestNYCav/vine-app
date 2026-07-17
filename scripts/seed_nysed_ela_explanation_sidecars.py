#!/usr/bin/env python3
"""Create provenance-pinned ELA explanation sidecars for authoring.

This is an authoring helper, not part of the production request path. It reads
the generated catalog and the checked-in question/passage assets, computes the
canonical explanation-input hash for every post-2014 question, and creates one
sidecar per exam with empty Vine-authored explanation text ready to be filled.

Existing sidecars are never overwritten. If a source question or image changes,
authors must deliberately review and update the affected explanation rather than
letting this helper bless stale prose with a new hash.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import sys
from pathlib import Path
from typing import Any, Sequence

try:
    from nysed_ela_explanations import (  # type: ignore
        EXPLANATION_POLICY_VERSION,
        EXPLANATION_SIDECAR_SCHEMA_VERSION,
        ElaExplanationError,
        QuestionExplanationInput,
        load_exam_explanations,
        question_explanation_input_hash,
    )
except ModuleNotFoundError:  # Imported as ``scripts.<module>`` in tests/tools.
    from scripts.nysed_ela_explanations import (
        EXPLANATION_POLICY_VERSION,
        EXPLANATION_SIDECAR_SCHEMA_VERSION,
        ElaExplanationError,
        QuestionExplanationInput,
        load_exam_explanations,
        question_explanation_input_hash,
    )


REPO_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_CATALOG = REPO_ROOT / "content" / "ela-exams" / "generated" / "catalog.json"
DEFAULT_ASSET_ROOT = REPO_ROOT / "public" / "nysed" / "ela"
DEFAULT_OUTPUT_DIR = REPO_ROOT / "content" / "ela-exams" / "explanations"
APP_ASSET_PREFIX = "/vine-app/nysed/ela/"


class SidecarSeedError(RuntimeError):
    """Raised when catalog-to-asset provenance cannot be proved."""


def _load_catalog(path: Path) -> dict[str, Any]:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise SidecarSeedError(f"Could not read generated ELA catalog {path}: {exc}") from exc
    if not isinstance(value, dict) or not isinstance(value.get("exams"), list):
        raise SidecarSeedError(f"Generated ELA catalog has no exam list: {path}")
    return value


def _required_text(value: Any, *, label: str) -> str:
    if not isinstance(value, str) or not value.strip():
        raise SidecarSeedError(f"Missing {label}")
    return value.strip()


def _asset_path(src: Any, *, asset_root: Path, label: str) -> Path:
    source = _required_text(src, label=label)
    if not source.startswith(APP_ASSET_PREFIX):
        raise SidecarSeedError(f"{label} is outside {APP_ASSET_PREFIX}: {source}")
    relative = Path(source.removeprefix(APP_ASSET_PREFIX))
    if relative.is_absolute() or ".." in relative.parts:
        raise SidecarSeedError(f"Unsafe {label}: {source}")
    path = asset_root / relative
    if not path.is_file() or path.is_symlink():
        raise SidecarSeedError(f"Missing or unsafe {label}: {path}")
    return path


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def build_exam_sidecar(exam: dict[str, Any], *, asset_root: Path) -> dict[str, Any]:
    exam_id = _required_text(exam.get("id"), label="exam id")
    year = exam.get("year")
    grade = exam.get("grade")
    if not isinstance(year, int) or isinstance(year, bool) or year < 2015:
        raise SidecarSeedError(f"{exam_id} is not a post-2014 ELA exam")
    if not isinstance(grade, int) or isinstance(grade, bool) or grade not in range(3, 9):
        raise SidecarSeedError(f"{exam_id} has an invalid grade")

    raw_stimuli = exam.get("stimuli")
    raw_questions = exam.get("questions")
    if not isinstance(raw_stimuli, list) or not isinstance(raw_questions, list):
        raise SidecarSeedError(f"{exam_id} has malformed questions or stimuli")

    passage_hashes: dict[str, str] = {}
    for stimulus in raw_stimuli:
        if not isinstance(stimulus, dict):
            raise SidecarSeedError(f"{exam_id} has a malformed stimulus")
        stimulus_id = _required_text(stimulus.get("id"), label="stimulus id")
        passage = stimulus.get("passage")
        if not isinstance(passage, dict):
            raise SidecarSeedError(f"{stimulus_id} has no passage asset")
        if stimulus_id in passage_hashes:
            raise SidecarSeedError(f"{exam_id} repeats stimulus {stimulus_id}")
        passage_hashes[stimulus_id] = _sha256(
            _asset_path(
                passage.get("src"),
                asset_root=asset_root,
                label=f"passage image for {stimulus_id}",
            )
        )

    records: dict[str, Any] = {}
    for question in raw_questions:
        if not isinstance(question, dict):
            raise SidecarSeedError(f"{exam_id} has a malformed question")
        question_id = _required_text(question.get("id"), label="question id")
        stimulus_id = _required_text(question.get("stimulusId"), label="question stimulus id")
        if stimulus_id not in passage_hashes:
            raise SidecarSeedError(f"{question_id} references missing stimulus {stimulus_id}")
        if question_id in records:
            raise SidecarSeedError(f"{exam_id} repeats question {question_id}")
        image = question.get("image")
        if not isinstance(image, dict):
            raise SidecarSeedError(f"{question_id} has no question image")
        secondary = question.get("secondaryStandards", [])
        if not isinstance(secondary, list) or not all(isinstance(value, str) for value in secondary):
            raise SidecarSeedError(f"{question_id} has invalid secondary standards")

        explanation_input = QuestionExplanationInput.create(
            question_id=question_id,
            alt=_required_text(question.get("alt"), label=f"alt text for {question_id}"),
            correct=_required_text(question.get("correct"), label=f"answer for {question_id}"),
            primary_standard=_required_text(
                question.get("primaryStandard"),
                label=f"primary standard for {question_id}",
            ),
            secondary_standards=secondary,
            question_image_sha256=_sha256(
                _asset_path(
                    image.get("src"),
                    asset_root=asset_root,
                    label=f"question image for {question_id}",
                )
            ),
            passage_image_sha256=passage_hashes[stimulus_id],
        )
        records[question_id] = {
            "inputHash": question_explanation_input_hash(explanation_input),
            "explanation": {
                "text": "",
                "source": "vine-authored",
            },
        }

    if not records:
        raise SidecarSeedError(f"{exam_id} has no questions")
    return {
        "schemaVersion": EXPLANATION_SIDECAR_SCHEMA_VERSION,
        "policyVersion": EXPLANATION_POLICY_VERSION,
        "examId": exam_id,
        "questions": records,
    }


def seed_sidecars(
    catalog_path: Path,
    asset_root: Path,
    output_dir: Path,
    *,
    years: set[int] | None = None,
    grades: set[int] | None = None,
) -> list[Path]:
    catalog = _load_catalog(catalog_path)
    selected: list[dict[str, Any]] = []
    for exam in catalog["exams"]:
        if not isinstance(exam, dict):
            raise SidecarSeedError("Generated ELA catalog contains a malformed exam")
        year = exam.get("year")
        grade = exam.get("grade")
        if not isinstance(year, int) or year < 2015:
            continue
        if years is not None and year not in years:
            continue
        if grades is not None and grade not in grades:
            continue
        selected.append(exam)
    if not selected:
        raise SidecarSeedError("No post-2014 ELA exams match the requested filters")

    output_dir.mkdir(parents=True, exist_ok=True)
    outputs: list[Path] = []
    for exam in sorted(selected, key=lambda value: (int(value["year"]), int(value["grade"]))):
        year = int(exam["year"])
        grade = int(exam["grade"])
        output = output_dir / f"{year}-grade-{grade}.json"
        if output.exists():
            raise SidecarSeedError(f"Refusing to overwrite existing sidecar {output}")
        payload = build_exam_sidecar(exam, asset_root=asset_root)
        temporary = output.with_suffix(".json.tmp")
        temporary.write_text(
            json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
        temporary.replace(output)
        outputs.append(output)
    return outputs


def validate_sidecars(
    catalog_path: Path,
    asset_root: Path,
    output_dir: Path,
    *,
    years: set[int] | None = None,
    grades: set[int] | None = None,
) -> list[Path]:
    """Recompute every input hash and validate existing sidecars in place."""

    catalog = _load_catalog(catalog_path)
    outputs: list[Path] = []
    normalized_explanations: dict[str, str] = {}
    for exam in sorted(catalog["exams"], key=lambda value: (int(value["year"]), int(value["grade"]))):
        if not isinstance(exam, dict):
            raise SidecarSeedError("Generated ELA catalog contains a malformed exam")
        year = exam.get("year")
        grade = exam.get("grade")
        if not isinstance(year, int) or year < 2015:
            continue
        if years is not None and year not in years:
            continue
        if grades is not None and grade not in grades:
            continue
        seeded = build_exam_sidecar(exam, asset_root=asset_root)
        expected_hashes = {
            question_id: record["inputHash"]
            for question_id, record in seeded["questions"].items()
        }
        try:
            explanations = load_exam_explanations(
                year=year,
                grade=int(grade),
                exam_id=str(seeded["examId"]),
                expected_input_hashes=expected_hashes,
                root=output_dir,
            )
        except (ElaExplanationError, OSError, TypeError, ValueError) as exc:
            raise SidecarSeedError(
                f"Explanation validation failed for {seeded['examId']}: {exc}"
            ) from exc
        for question_id, explanation in explanations.items():
            normalized = " ".join(explanation.text.casefold().split())
            previous = normalized_explanations.get(normalized)
            if previous is not None:
                raise SidecarSeedError(
                    f"Duplicate authored explanation for {previous} and {question_id}"
                )
            normalized_explanations[normalized] = question_id
        outputs.append(output_dir / f"{year}-grade-{grade}.json")
    if not outputs:
        raise SidecarSeedError("No post-2014 ELA exams match the requested filters")
    return outputs


def parse_args(argv: Sequence[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Seed post-2014 ELA explanation sidecars.")
    parser.add_argument("--catalog", type=Path, default=DEFAULT_CATALOG)
    parser.add_argument("--asset-root", type=Path, default=DEFAULT_ASSET_ROOT)
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT_DIR)
    parser.add_argument("--year", type=int, action="append")
    parser.add_argument("--grade", type=int, action="append")
    parser.add_argument(
        "--validate",
        action="store_true",
        help="Validate existing sidecars against recomputed source hashes instead of creating them.",
    )
    return parser.parse_args(argv)


def main(argv: Sequence[str] | None = None) -> int:
    args = parse_args(argv or sys.argv[1:])
    operation = validate_sidecars if args.validate else seed_sidecars
    outputs = operation(
        args.catalog.resolve(),
        args.asset_root.resolve(),
        args.output_dir.resolve(),
        years=set(args.year) if args.year else None,
        grades=set(args.grade) if args.grade else None,
    )
    for output in outputs:
        print(output)
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except SidecarSeedError as exc:
        print(f"error: {exc}", file=sys.stderr)
        raise SystemExit(1)

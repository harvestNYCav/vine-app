#!/usr/bin/env python3
"""Create provenance-pinned NYSED math explanation sidecars for authoring.

This helper reads only the generated catalog and checked-in public question
images. It recomputes every explanation input hash from the question text,
answer key, standards, and exact English/optional Spanish WebP bytes.

Existing sidecars are never overwritten. Validation likewise recomputes the
hashes from source assets before accepting authored explanations.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import sys
from pathlib import Path
from typing import Any, Sequence

try:
    from nysed_math_explanations import (  # type: ignore
        MATH_EXPLANATION_POLICY_VERSION,
        MATH_EXPLANATION_SIDECAR_SCHEMA_VERSION,
        MathExplanationError,
        MathQuestionExplanationInput,
        load_math_exam_explanations,
        math_question_explanation_input_hash,
        normalize_math_explanation_text,
    )
except ModuleNotFoundError:  # Imported as ``scripts.<module>`` in tests/tools.
    from scripts.nysed_math_explanations import (
        MATH_EXPLANATION_POLICY_VERSION,
        MATH_EXPLANATION_SIDECAR_SCHEMA_VERSION,
        MathExplanationError,
        MathQuestionExplanationInput,
        load_math_exam_explanations,
        math_question_explanation_input_hash,
        normalize_math_explanation_text,
    )


REPO_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_CATALOG = REPO_ROOT / "content" / "math-exams" / "generated" / "catalog.json"
DEFAULT_ASSET_ROOT = REPO_ROOT / "public" / "nysed" / "math"
DEFAULT_OUTPUT_DIR = REPO_ROOT / "content" / "math-exams" / "explanations"
APP_ASSET_PREFIX = "/vine-app/nysed/math/"


class SidecarSeedError(RuntimeError):
    """Raised when catalog-to-asset provenance or sidecar validation fails."""


def _load_catalog(path: Path) -> dict[str, Any]:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError, UnicodeError) as exc:
        raise SidecarSeedError(f"Could not read generated math catalog {path}: {exc}") from exc
    if not isinstance(value, dict) or not isinstance(value.get("exams"), list):
        raise SidecarSeedError(f"Generated math catalog has no exam list: {path}")
    return value


def _required_text(value: Any, *, label: str) -> str:
    if not isinstance(value, str) or not value.strip():
        raise SidecarSeedError(f"Missing {label}")
    return value.strip()


def _optional_text(value: Any, *, label: str) -> str | None:
    if value is None:
        return None
    return _required_text(value, label=label)


def _asset_path(
    src: Any,
    *,
    asset_root: Path,
    language: str,
    label: str,
) -> Path:
    source = _required_text(src, label=label)
    if not source.startswith(APP_ASSET_PREFIX):
        raise SidecarSeedError(f"{label} is outside {APP_ASSET_PREFIX}: {source}")
    relative = Path(source.removeprefix(APP_ASSET_PREFIX))
    if relative.is_absolute() or ".." in relative.parts:
        raise SidecarSeedError(f"Unsafe {label}: {source}")
    if relative.suffix.lower() != ".webp" or relative.parent.name != language:
        raise SidecarSeedError(f"{label} is not an exact {language} WebP path: {source}")

    root = asset_root.resolve()
    candidate = asset_root / relative
    try:
        resolved = candidate.resolve(strict=True)
        resolved.relative_to(root)
    except (OSError, ValueError) as exc:
        raise SidecarSeedError(f"Missing or unsafe {label}: {candidate}") from exc
    if candidate.is_symlink() or not resolved.is_file():
        raise SidecarSeedError(f"Missing or unsafe {label}: {candidate}")
    return resolved


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _localized_question_fields(
    question: dict[str, Any],
    *,
    question_id: str,
    asset_root: Path,
) -> tuple[str, str | None, str, str | None]:
    alt = question.get("alt")
    image = question.get("image")
    if not isinstance(alt, dict) or not isinstance(image, dict):
        raise SidecarSeedError(f"{question_id} has malformed localized alt or image metadata")

    alt_en = _required_text(alt.get("en"), label=f"English alt text for {question_id}")
    alt_es = _optional_text(alt.get("es"), label=f"Spanish alt text for {question_id}")
    image_en = image.get("en")
    image_es = image.get("es")
    if not isinstance(image_en, dict):
        raise SidecarSeedError(f"{question_id} has no English question image")
    if image_es is not None and not isinstance(image_es, dict):
        raise SidecarSeedError(f"{question_id} has malformed Spanish image metadata")
    if (alt_es is None) != (image_es is None):
        raise SidecarSeedError(
            f"{question_id} must provide Spanish alt text and image metadata together"
        )

    image_en_sha = _sha256(
        _asset_path(
            image_en.get("src"),
            asset_root=asset_root,
            language="en",
            label=f"English question image for {question_id}",
        )
    )
    image_es_sha = None
    if image_es is not None:
        image_es_sha = _sha256(
            _asset_path(
                image_es.get("src"),
                asset_root=asset_root,
                language="es",
                label=f"Spanish question image for {question_id}",
            )
        )
    return alt_en, alt_es, image_en_sha, image_es_sha


def build_exam_sidecar(exam: dict[str, Any], *, asset_root: Path) -> dict[str, Any]:
    """Build an empty authoring sidecar while pinning all semantic inputs."""

    exam_id = _required_text(exam.get("id"), label="exam id")
    year = exam.get("year")
    grade = exam.get("grade")
    if not isinstance(year, int) or isinstance(year, bool) or year < 2015:
        raise SidecarSeedError(f"{exam_id} is not a post-2014 math exam")
    if not isinstance(grade, int) or isinstance(grade, bool) or grade not in range(3, 9):
        raise SidecarSeedError(f"{exam_id} has an invalid grade")

    raw_questions = exam.get("questions")
    if not isinstance(raw_questions, list):
        raise SidecarSeedError(f"{exam_id} has malformed questions")

    records: dict[str, Any] = {}
    for question in raw_questions:
        if not isinstance(question, dict):
            raise SidecarSeedError(f"{exam_id} has a malformed question")
        question_id = _required_text(question.get("id"), label="question id")
        if question_id in records:
            raise SidecarSeedError(f"{exam_id} repeats question {question_id}")
        secondary = question.get("secondaryStandards", [])
        if not isinstance(secondary, list) or not all(isinstance(value, str) for value in secondary):
            raise SidecarSeedError(f"{question_id} has invalid secondary standards")
        alt_en, alt_es, image_en_sha, image_es_sha = _localized_question_fields(
            question,
            question_id=question_id,
            asset_root=asset_root,
        )

        explanation_input = MathQuestionExplanationInput.create(
            question_id=question_id,
            alt_en=alt_en,
            alt_es=alt_es,
            correct=_required_text(question.get("correct"), label=f"answer for {question_id}"),
            primary_standard=_required_text(
                question.get("primaryStandard"),
                label=f"primary standard for {question_id}",
            ),
            secondary_standards=secondary,
            question_image_en_sha256=image_en_sha,
            question_image_es_sha256=image_es_sha,
        )
        try:
            input_hash = math_question_explanation_input_hash(explanation_input)
        except (MathExplanationError, TypeError, ValueError) as exc:
            raise SidecarSeedError(f"Invalid explanation input for {question_id}: {exc}") from exc
        records[question_id] = {
            "inputHash": input_hash,
            "explanation": {
                "text": {"en": "", "es": ""},
                "source": "vine-authored",
            },
        }

    if not records:
        raise SidecarSeedError(f"{exam_id} has no questions")
    return {
        "schemaVersion": MATH_EXPLANATION_SIDECAR_SCHEMA_VERSION,
        "policyVersion": MATH_EXPLANATION_POLICY_VERSION,
        "examId": exam_id,
        "questions": records,
    }


def _select_exams(
    catalog: dict[str, Any],
    *,
    years: set[int] | None,
    grades: set[int] | None,
) -> list[dict[str, Any]]:
    selected: list[dict[str, Any]] = []
    seen_year_grades: dict[tuple[int, int], str] = {}
    for exam in catalog["exams"]:
        if not isinstance(exam, dict):
            raise SidecarSeedError("Generated math catalog contains a malformed exam")
        year = exam.get("year")
        grade = exam.get("grade")
        if not isinstance(year, int) or isinstance(year, bool):
            raise SidecarSeedError("Generated math catalog contains an invalid exam year")
        if year < 2015:
            continue
        if not isinstance(grade, int) or isinstance(grade, bool) or grade not in range(3, 9):
            raise SidecarSeedError(f"Generated math catalog has an invalid grade for {year}")
        if years is not None and year not in years:
            continue
        if grades is not None and grade not in grades:
            continue
        key = (year, grade)
        exam_id = _required_text(exam.get("id"), label=f"exam id for {year} Grade {grade}")
        previous = seen_year_grades.get(key)
        if previous is not None:
            raise SidecarSeedError(
                f"Generated math catalog repeats {year} Grade {grade}: {previous}, {exam_id}"
            )
        seen_year_grades[key] = exam_id
        selected.append(exam)
    if not selected:
        raise SidecarSeedError("No post-2014 math exams match the requested filters")
    return sorted(selected, key=lambda value: (int(value["year"]), int(value["grade"])))


def seed_sidecars(
    catalog_path: Path,
    asset_root: Path,
    output_dir: Path,
    *,
    years: set[int] | None = None,
    grades: set[int] | None = None,
) -> list[Path]:
    """Create all selected empty sidecars, refusing any overwrite."""

    selected = _select_exams(_load_catalog(catalog_path), years=years, grades=grades)
    planned: list[tuple[Path, dict[str, Any]]] = []
    for exam in selected:
        output = output_dir / f"{exam['year']}-grade-{exam['grade']}.json"
        if output.exists():
            raise SidecarSeedError(f"Refusing to overwrite existing sidecar {output}")
        planned.append((output, build_exam_sidecar(exam, asset_root=asset_root)))

    output_dir.mkdir(parents=True, exist_ok=True)
    outputs: list[Path] = []
    for output, payload in planned:
        try:
            with output.open("x", encoding="utf-8") as destination:
                json.dump(payload, destination, ensure_ascii=False, indent=2)
                destination.write("\n")
        except FileExistsError as exc:
            raise SidecarSeedError(f"Refusing to overwrite existing sidecar {output}") from exc
        except (OSError, TypeError, ValueError) as exc:
            raise SidecarSeedError(f"Could not write math sidecar {output}: {exc}") from exc
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
    """Recompute source hashes and validate every selected authored sidecar."""

    selected = _select_exams(_load_catalog(catalog_path), years=years, grades=grades)
    outputs: list[Path] = []
    normalized_by_language: dict[str, dict[str, str]] = {"English": {}, "Spanish": {}}
    for exam in selected:
        year = int(exam["year"])
        grade = int(exam["grade"])
        seeded = build_exam_sidecar(exam, asset_root=asset_root)
        expected_hashes = {
            question_id: record["inputHash"]
            for question_id, record in seeded["questions"].items()
        }
        try:
            explanations = load_math_exam_explanations(
                year=year,
                grade=grade,
                exam_id=str(seeded["examId"]),
                expected_input_hashes=expected_hashes,
                root=output_dir,
            )
        except (MathExplanationError, OSError, TypeError, ValueError) as exc:
            raise SidecarSeedError(
                f"Explanation validation failed for {seeded['examId']}: {exc}"
            ) from exc

        for question_id, explanation in explanations.items():
            localized = {"English": explanation.en, "Spanish": explanation.es}
            for language, text in localized.items():
                normalized = normalize_math_explanation_text(text).casefold()
                previous = normalized_by_language[language].get(normalized)
                if previous is not None:
                    raise SidecarSeedError(
                        f"Duplicate normalized {language} explanation for "
                        f"{previous} and {question_id}"
                    )
                normalized_by_language[language][normalized] = question_id
        outputs.append(output_dir / f"{year}-grade-{grade}.json")
    return outputs


def parse_args(argv: Sequence[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Seed provenance-pinned post-2014 NYSED math explanation sidecars."
    )
    parser.add_argument("--catalog", type=Path, default=DEFAULT_CATALOG)
    parser.add_argument("--asset-root", type=Path, default=DEFAULT_ASSET_ROOT)
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT_DIR)
    parser.add_argument("--year", type=int, action="append")
    parser.add_argument("--grade", type=int, action="append")
    parser.add_argument(
        "--validate",
        action="store_true",
        help="Validate authored sidecars against recomputed hashes instead of creating them.",
    )
    return parser.parse_args(argv)


def main(argv: Sequence[str] | None = None) -> int:
    args = parse_args(sys.argv[1:] if argv is None else argv)
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

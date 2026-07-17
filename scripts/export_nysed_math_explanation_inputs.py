#!/usr/bin/env python3
"""Export deterministic offline authoring inputs for NYSED math explanations.

The exporter reads the checked-in generated catalog and writes ignored JSON
files under ``tmp/`` by default. It performs no downloads, does not inspect or
modify production assets, and never writes to the generated catalog.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path, PurePosixPath
from typing import Any, Sequence


REPO_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_CATALOG = REPO_ROOT / "content" / "math-exams" / "generated" / "catalog.json"
DEFAULT_OUTPUT_DIR = REPO_ROOT / "tmp" / "math-explanation-inputs"
APP_ASSET_PREFIX = "/vine-app/nysed/math/"
AUTHORING_INPUT_SCHEMA_VERSION = 1
_CHOICES = frozenset(("A", "B", "C", "D"))


class ExplanationInputError(RuntimeError):
    """Raised when catalog data cannot be exported safely and deterministically."""


def _load_catalog(path: Path) -> dict[str, Any]:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError, UnicodeError) as exc:
        raise ExplanationInputError(f"Could not read generated math catalog {path}: {exc}") from exc
    if not isinstance(value, dict) or not isinstance(value.get("exams"), list):
        raise ExplanationInputError(f"Generated math catalog has no exam list: {path}")
    return value


def _required_text(value: Any, *, label: str) -> str:
    if not isinstance(value, str) or not value.strip():
        raise ExplanationInputError(f"Missing {label}")
    return value.strip()


def _optional_text(value: Any, *, label: str) -> str | None:
    if value is None:
        return None
    return _required_text(value, label=label)


def _localized_text(value: Any, *, label: str) -> dict[str, str | None]:
    if not isinstance(value, dict):
        raise ExplanationInputError(f"Missing localized {label}")
    return {
        "en": _required_text(value.get("en"), label=f"English {label}"),
        "es": _optional_text(value.get("es"), label=f"Spanish {label}"),
    }


def _image_url(value: Any, *, language: str, label: str) -> str:
    if not isinstance(value, dict):
        raise ExplanationInputError(f"Missing {label}")
    source = _required_text(value.get("src"), label=label)
    if not source.startswith(APP_ASSET_PREFIX):
        raise ExplanationInputError(f"{label} is outside {APP_ASSET_PREFIX}: {source}")
    relative = PurePosixPath(source.removeprefix(APP_ASSET_PREFIX))
    if relative.is_absolute() or ".." in relative.parts:
        raise ExplanationInputError(f"Unsafe {label}: {source}")
    if relative.suffix.lower() != ".webp" or relative.parent.name != language:
        raise ExplanationInputError(f"{label} is not an exact {language} WebP URL: {source}")
    return source


def _question_authoring_input(question: dict[str, Any], *, exam_id: str) -> dict[str, Any]:
    question_id = _required_text(question.get("id"), label=f"question id in {exam_id}")
    number = question.get("number")
    if not isinstance(number, int) or isinstance(number, bool) or number < 1:
        raise ExplanationInputError(f"{question_id} has an invalid question number")
    correct = _required_text(question.get("correct"), label=f"answer for {question_id}").upper()
    if correct not in _CHOICES:
        raise ExplanationInputError(f"{question_id} answer must be A, B, C, or D")

    primary = _required_text(
        question.get("primaryStandard"),
        label=f"primary standard for {question_id}",
    )
    raw_secondary = question.get("secondaryStandards", [])
    if not isinstance(raw_secondary, list):
        raise ExplanationInputError(f"{question_id} has invalid secondary standards")
    secondary = [
        _required_text(value, label=f"secondary standard for {question_id}")
        for value in raw_secondary
    ]
    if primary in secondary or len(secondary) != len(set(secondary)):
        raise ExplanationInputError(f"{question_id} standards must be unique")

    alt = _localized_text(question.get("alt"), label=f"alt text for {question_id}")
    image = question.get("image")
    if not isinstance(image, dict):
        raise ExplanationInputError(f"{question_id} has malformed image metadata")
    image_es = image.get("es")
    if (alt["es"] is None) != (image_es is None):
        raise ExplanationInputError(
            f"{question_id} must provide Spanish alt text and image metadata together"
        )
    image_urls = {
        "en": _image_url(
            image.get("en"),
            language="en",
            label=f"English question image for {question_id}",
        ),
        "es": (
            _image_url(
                image_es,
                language="es",
                label=f"Spanish question image for {question_id}",
            )
            if image_es is not None
            else None
        ),
    }
    return {
        "id": question_id,
        "number": number,
        "correct": correct,
        "standards": [primary, *secondary],
        "primaryStandard": primary,
        "secondaryStandards": secondary,
        "domain": _required_text(question.get("domain"), label=f"domain for {question_id}"),
        "alt": alt,
        "imageUrl": image_urls,
    }


def build_exam_authoring_input(exam: dict[str, Any]) -> dict[str, Any]:
    exam_id = _required_text(exam.get("id"), label="exam id")
    year = exam.get("year")
    grade = exam.get("grade")
    if not isinstance(year, int) or isinstance(year, bool) or year < 2015:
        raise ExplanationInputError(f"{exam_id} is not a post-2014 math exam")
    if not isinstance(grade, int) or isinstance(grade, bool) or grade not in range(3, 9):
        raise ExplanationInputError(f"{exam_id} has an invalid grade")

    raw_languages = exam.get("supportedLanguages")
    if (
        not isinstance(raw_languages, list)
        or not raw_languages
        or not all(language in ("en", "es") for language in raw_languages)
        or len(raw_languages) != len(set(raw_languages))
        or "en" not in raw_languages
    ):
        raise ExplanationInputError(f"{exam_id} has invalid supported languages")
    supported_languages = [language for language in ("en", "es") if language in raw_languages]

    raw_questions = exam.get("questions")
    if not isinstance(raw_questions, list) or not raw_questions:
        raise ExplanationInputError(f"{exam_id} has no questions")
    questions = []
    seen_question_ids: set[str] = set()
    for raw_question in raw_questions:
        if not isinstance(raw_question, dict):
            raise ExplanationInputError(f"{exam_id} has a malformed question")
        question = _question_authoring_input(raw_question, exam_id=exam_id)
        if question["id"] in seen_question_ids:
            raise ExplanationInputError(f"{exam_id} repeats question {question['id']}")
        seen_question_ids.add(question["id"])
        questions.append(question)
    questions.sort(key=lambda value: (int(value["number"]), str(value["id"])))

    return {
        "schemaVersion": AUTHORING_INPUT_SCHEMA_VERSION,
        "exam": {
            "id": exam_id,
            "slug": _required_text(exam.get("slug"), label=f"slug for {exam_id}"),
            "year": year,
            "grade": grade,
            "standardsFramework": _required_text(
                exam.get("standardsFramework"),
                label=f"standards framework for {exam_id}",
            ),
            "supportedLanguages": supported_languages,
            "title": _localized_text(exam.get("title"), label=f"title for {exam_id}"),
            "description": _localized_text(
                exam.get("description"),
                label=f"description for {exam_id}",
            ),
            "sourceTitle": _localized_text(
                exam.get("sourceTitle"),
                label=f"source title for {exam_id}",
            ),
            "sourceUrl": _localized_text(
                exam.get("sourceUrl"),
                label=f"source URL for {exam_id}",
            ),
        },
        "questions": questions,
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
            raise ExplanationInputError("Generated math catalog contains a malformed exam")
        year = exam.get("year")
        grade = exam.get("grade")
        if not isinstance(year, int) or isinstance(year, bool):
            raise ExplanationInputError("Generated math catalog contains an invalid exam year")
        if year < 2015:
            continue
        if not isinstance(grade, int) or isinstance(grade, bool) or grade not in range(3, 9):
            raise ExplanationInputError(f"Generated math catalog has an invalid grade for {year}")
        if years is not None and year not in years:
            continue
        if grades is not None and grade not in grades:
            continue
        key = (year, grade)
        exam_id = _required_text(exam.get("id"), label=f"exam id for {year} Grade {grade}")
        previous = seen_year_grades.get(key)
        if previous is not None:
            raise ExplanationInputError(
                f"Generated math catalog repeats {year} Grade {grade}: {previous}, {exam_id}"
            )
        seen_year_grades[key] = exam_id
        selected.append(exam)
    if not selected:
        raise ExplanationInputError("No post-2014 math exams match the requested filters")
    return sorted(selected, key=lambda value: (int(value["year"]), int(value["grade"])))


def export_explanation_inputs(
    catalog_path: Path,
    output_dir: Path,
    *,
    years: set[int] | None = None,
    grades: set[int] | None = None,
) -> list[Path]:
    """Write deterministic, regenerable per-exam math authoring JSON."""

    selected = _select_exams(_load_catalog(catalog_path), years=years, grades=grades)
    payloads = [build_exam_authoring_input(exam) for exam in selected]
    output_dir.mkdir(parents=True, exist_ok=True)
    outputs: list[Path] = []
    for payload in payloads:
        exam = payload["exam"]
        output = output_dir / f"{exam['year']}-grade-{exam['grade']}.json"
        temporary = output.with_suffix(".json.tmp")
        try:
            temporary.write_text(
                json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
                encoding="utf-8",
            )
            temporary.replace(output)
        except (OSError, TypeError, ValueError) as exc:
            raise ExplanationInputError(f"Could not write authoring input {output}: {exc}") from exc
        outputs.append(output)
    return outputs


def parse_args(argv: Sequence[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Export offline NYSED math explanation authoring inputs."
    )
    parser.add_argument("--catalog", type=Path, default=DEFAULT_CATALOG)
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT_DIR)
    parser.add_argument("--year", type=int, action="append")
    parser.add_argument("--grade", type=int, action="append")
    return parser.parse_args(argv)


def main(argv: Sequence[str] | None = None) -> int:
    args = parse_args(sys.argv[1:] if argv is None else argv)
    outputs = export_explanation_inputs(
        args.catalog.resolve(),
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
    except ExplanationInputError as exc:
        print(f"error: {exc}", file=sys.stderr)
        raise SystemExit(1)

#!/usr/bin/env python3
"""Export offline authoring inputs for NYSED ELA answer explanations.

The exporter reads the checked-in generated catalog and the already-cached
released-question PDFs. It never downloads source material and never mutates
the catalog or production assets.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import shutil
import subprocess
import sys
import unicodedata
from pathlib import Path
from typing import Any, Sequence

import pdfplumber


REPO_ROOT = Path(__file__).resolve().parents[1]
PUBLIC_ROOT = REPO_ROOT / "public"
DEFAULT_TESSERACT = shutil.which("tesseract")


class ExplanationInputError(RuntimeError):
    """Raised when an authoring input cannot be exported safely."""


def _nonempty_text(value: Any, label: str) -> str:
    if not isinstance(value, str) or not value.strip():
        raise ExplanationInputError(f"Missing {label}")
    return value.strip()


def load_catalog(path: Path) -> dict[str, Any]:
    try:
        raw: Any = json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError as exc:
        raise ExplanationInputError(f"Catalog not found: {path}") from exc
    except json.JSONDecodeError as exc:
        raise ExplanationInputError(f"Catalog is not valid JSON: {path}: {exc}") from exc

    if not isinstance(raw, dict) or not isinstance(raw.get("exams"), list):
        raise ExplanationInputError(f"Catalog has no exam list: {path}")
    return raw


def find_cached_pdf(cache_root: Path, year: int, grade: int) -> Path:
    pattern = f"{year}-g{grade}-en-release-*.pdf"
    matches = sorted(
        path for path in cache_root.rglob(pattern)
        if path.is_file()
    )
    if not matches:
        raise ExplanationInputError(
            f"Missing cached PDF for {year} Grade {grade} under {cache_root} "
            f"(expected {pattern})"
        )
    if len(matches) > 1:
        names = ", ".join(str(path.relative_to(cache_root)) for path in matches)
        raise ExplanationInputError(
            f"Ambiguous cached PDFs for {year} Grade {grade} under {cache_root}: {names}"
        )
    return matches[0]


def _normalize_pdf_text(value: str) -> str:
    value = unicodedata.normalize("NFKC", value).replace("\r\n", "\n").replace("\r", "\n")
    lines = []
    for raw_line in value.splitlines():
        safe_line = "".join(
            " " if unicodedata.category(character).startswith("C") else character
            for character in raw_line
        )
        lines.append(re.sub(r"[ \t]+", " ", safe_line).strip())
    normalized: list[str] = []
    previous_blank = False
    for line in lines:
        blank = not line
        if blank and previous_blank:
            continue
        normalized.append(line)
        previous_blank = blank
    return "\n".join(normalized).strip()


def _passage_image_path(stimulus: dict[str, Any], public_root: Path) -> Path:
    stimulus_id = _nonempty_text(stimulus.get("id"), "stimulus id")
    passage = stimulus.get("passage")
    if not isinstance(passage, dict):
        raise ExplanationInputError(f"Stimulus {stimulus_id} has no passage image metadata")
    source = _nonempty_text(passage.get("src"), "passage image path")
    prefix = "/vine-app/"
    if not source.startswith(prefix):
        raise ExplanationInputError(f"Stimulus {stimulus_id} has an unsafe passage image path")
    root = public_root.resolve()
    image_path = (root / source.removeprefix(prefix)).resolve()
    try:
        image_path.relative_to(root)
    except ValueError as exc:
        raise ExplanationInputError(f"Stimulus {stimulus_id} passage path escapes public assets") from exc
    if not image_path.is_file():
        raise ExplanationInputError(
            f"Stimulus {stimulus_id} passage image is missing for OCR: {image_path}"
        )
    return image_path


def _ocr_passage_image(image_path: Path, tesseract_binary: str | None) -> str:
    if not tesseract_binary:
        raise ExplanationInputError(
            f"Passage {image_path.name} has no selectable PDF text and Tesseract is unavailable"
        )
    command = [
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
    ]
    environment = os.environ.copy()
    environment.update({"LANG": "C", "LC_ALL": "C", "OMP_THREAD_LIMIT": "1"})
    try:
        result = subprocess.run(
            command,
            check=False,
            capture_output=True,
            text=True,
            timeout=120,
            env=environment,
        )
    except (OSError, subprocess.SubprocessError) as exc:
        raise ExplanationInputError(f"Tesseract OCR failed for {image_path}: {exc}") from exc
    if result.returncode != 0:
        detail = _normalize_pdf_text(result.stderr)[:500]
        raise ExplanationInputError(
            f"Tesseract OCR failed for {image_path} with exit {result.returncode}: {detail}"
        )
    return _normalize_pdf_text(result.stdout)


def _passage_text(
    pdf: pdfplumber.PDF,
    stimulus: dict[str, Any],
    *,
    public_root: Path,
    tesseract_binary: str | None,
) -> tuple[str, list[dict[str, Any]], str]:
    stimulus_id = _nonempty_text(stimulus.get("id"), "stimulus id")
    references = stimulus.get("references")
    if not isinstance(references, list) or not references:
        raise ExplanationInputError(f"Stimulus {stimulus_id} has no PDF page references")

    ranges: list[dict[str, Any]] = []
    extracted_ranges: list[str] = []
    for reference in references:
        if not isinstance(reference, dict):
            raise ExplanationInputError(f"Stimulus {stimulus_id} has a malformed page reference")
        page_start = reference.get("pageStart")
        page_end = reference.get("pageEnd")
        if (
            not isinstance(page_start, int)
            or isinstance(page_start, bool)
            or not isinstance(page_end, int)
            or isinstance(page_end, bool)
            or page_start < 1
            or page_end < page_start
            or page_end > len(pdf.pages)
        ):
            raise ExplanationInputError(
                f"Stimulus {stimulus_id} has an invalid PDF page range "
                f"{page_start!r}-{page_end!r} for a {len(pdf.pages)}-page PDF"
            )

        page_texts = [
            _normalize_pdf_text(
                pdf.pages[page_number - 1].extract_text(
                    x_tolerance=2,
                    y_tolerance=3,
                )
                or ""
            )
            for page_number in range(page_start, page_end + 1)
        ]
        extracted_ranges.append("\n\n".join(text for text in page_texts if text))
        ranges.append(
            {
                "label": _nonempty_text(reference.get("label"), "passage reference label"),
                "pageStart": page_start,
                "pageEnd": page_end,
            }
        )

    passage_text = "\n\n".join(text for text in extracted_ranges if text).strip()
    if passage_text:
        return passage_text, ranges, "pdf-text"

    image_path = _passage_image_path(stimulus, public_root)
    passage_text = _ocr_passage_image(image_path, tesseract_binary)
    if not passage_text:
        raise ExplanationInputError(
            f"Stimulus {stimulus_id} has no extractable PDF text or passage-image OCR text"
        )
    return passage_text, ranges, "tesseract-passage-webp"


def _exam_authoring_input(
    exam: dict[str, Any],
    pdf_path: Path,
    *,
    public_root: Path,
    tesseract_binary: str | None,
) -> dict[str, Any]:
    exam_id = _nonempty_text(exam.get("id"), "exam id")
    year = exam.get("year")
    grade = exam.get("grade")
    if not isinstance(year, int) or isinstance(year, bool):
        raise ExplanationInputError(f"Exam {exam_id} has an invalid year")
    if not isinstance(grade, int) or isinstance(grade, bool):
        raise ExplanationInputError(f"Exam {exam_id} has an invalid grade")

    raw_stimuli = exam.get("stimuli")
    raw_questions = exam.get("questions")
    if not isinstance(raw_stimuli, list) or not raw_stimuli:
        raise ExplanationInputError(f"Exam {exam_id} has no stimuli")
    if not isinstance(raw_questions, list) or not raw_questions:
        raise ExplanationInputError(f"Exam {exam_id} has no questions")

    stimuli: list[dict[str, Any]] = []
    stimulus_ids: set[str] = set()
    try:
        with pdfplumber.open(pdf_path) as pdf:
            for raw_stimulus in raw_stimuli:
                if not isinstance(raw_stimulus, dict):
                    raise ExplanationInputError(f"Exam {exam_id} has a malformed stimulus")
                stimulus_id = _nonempty_text(raw_stimulus.get("id"), "stimulus id")
                if stimulus_id in stimulus_ids:
                    raise ExplanationInputError(f"Exam {exam_id} repeats stimulus {stimulus_id}")
                stimulus_ids.add(stimulus_id)
                passage_text, page_ranges, extraction_method = _passage_text(
                    pdf,
                    raw_stimulus,
                    public_root=public_root,
                    tesseract_binary=tesseract_binary,
                )
                stimuli.append(
                    {
                        "id": stimulus_id,
                        "label": _nonempty_text(raw_stimulus.get("label"), "stimulus label"),
                        "questionStart": raw_stimulus.get("questionStart"),
                        "questionEnd": raw_stimulus.get("questionEnd"),
                        "pageRanges": page_ranges,
                        "extractionMethod": extraction_method,
                        "passageText": passage_text,
                    }
                )
    except ExplanationInputError:
        raise
    except Exception as exc:
        raise ExplanationInputError(f"Could not read cached PDF {pdf_path}: {exc}") from exc

    questions: list[dict[str, Any]] = []
    question_ids: set[str] = set()
    for raw_question in raw_questions:
        if not isinstance(raw_question, dict):
            raise ExplanationInputError(f"Exam {exam_id} has a malformed question")
        question_id = _nonempty_text(raw_question.get("id"), "question id")
        stimulus_id = _nonempty_text(raw_question.get("stimulusId"), "question stimulus id")
        if question_id in question_ids:
            raise ExplanationInputError(f"Exam {exam_id} repeats question {question_id}")
        if stimulus_id not in stimulus_ids:
            raise ExplanationInputError(
                f"Question {question_id} references missing stimulus {stimulus_id}"
            )
        image = raw_question.get("image")
        if not isinstance(image, dict):
            raise ExplanationInputError(f"Question {question_id} has no image metadata")
        secondary_standards = raw_question.get("secondaryStandards", [])
        if not isinstance(secondary_standards, list) or not all(
            isinstance(value, str) and value.strip() for value in secondary_standards
        ):
            raise ExplanationInputError(f"Question {question_id} has invalid secondary standards")
        primary_standard = _nonempty_text(
            raw_question.get("primaryStandard"),
            "question primary standard",
        )
        normalized_secondary = [value.strip() for value in secondary_standards]

        question_ids.add(question_id)
        questions.append(
            {
                "id": question_id,
                "number": raw_question.get("number"),
                "stimulusId": stimulus_id,
                "alt": _nonempty_text(raw_question.get("alt"), "question alt text"),
                "correct": _nonempty_text(raw_question.get("correct"), "question answer key"),
                "standards": [primary_standard, *normalized_secondary],
                "primaryStandard": primary_standard,
                "secondaryStandards": normalized_secondary,
                "skill": _nonempty_text(raw_question.get("skill"), "question skill"),
                "imagePath": _nonempty_text(image.get("src"), "question image path"),
            }
        )

    return {
        "schemaVersion": 1,
        "exam": {
            "id": exam_id,
            "slug": _nonempty_text(exam.get("slug"), "exam slug"),
            "year": year,
            "grade": grade,
            "standardsFramework": _nonempty_text(
                exam.get("standardsFramework"),
                "exam standards framework",
            ),
            "title": _nonempty_text(exam.get("title"), "exam title"),
            "description": _nonempty_text(exam.get("description"), "exam description"),
            "sourceTitle": _nonempty_text(exam.get("sourceTitle"), "exam source title"),
            "sourceUrl": _nonempty_text(exam.get("sourceUrl"), "exam source URL"),
            "cachedPdfFilename": pdf_path.name,
        },
        "stimuli": stimuli,
        "questions": questions,
    }


def export_explanation_inputs(
    catalog_path: Path,
    cache_root: Path,
    output_dir: Path,
    *,
    years: set[int] | None = None,
    grades: set[int] | None = None,
    public_root: Path = PUBLIC_ROOT,
    tesseract_binary: str | None = DEFAULT_TESSERACT,
) -> list[Path]:
    catalog = load_catalog(catalog_path)
    selected: list[dict[str, Any]] = []
    for exam in catalog["exams"]:
        if not isinstance(exam, dict):
            raise ExplanationInputError("Catalog contains a malformed exam")
        year = exam.get("year")
        grade = exam.get("grade")
        if years is not None and year not in years:
            continue
        if grades is not None and grade not in grades:
            continue
        selected.append(exam)
    if not selected:
        raise ExplanationInputError("No catalog exams match the requested year and grade filters")

    output_dir.mkdir(parents=True, exist_ok=True)
    outputs: list[Path] = []
    for exam in sorted(selected, key=lambda value: (int(value["year"]), int(value["grade"]))):
        year = int(exam["year"])
        grade = int(exam["grade"])
        pdf_path = find_cached_pdf(cache_root, year, grade)
        payload = _exam_authoring_input(
            exam,
            pdf_path,
            public_root=public_root,
            tesseract_binary=tesseract_binary,
        )
        output_path = output_dir / f"{year}-grade-{grade}.json"
        temporary = output_path.with_suffix(".json.tmp")
        temporary.write_text(
            json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
        temporary.replace(output_path)
        outputs.append(output_path)
    return outputs


def parse_args(argv: Sequence[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Export cached NYSED ELA passage and question text for explanation authoring. "
            "This command is offline-only."
        )
    )
    parser.add_argument("--catalog", type=Path, required=True)
    parser.add_argument("--cache-root", type=Path, required=True)
    parser.add_argument("--output-dir", type=Path, required=True)
    parser.add_argument("--year", type=int, action="append")
    parser.add_argument("--grade", type=int, action="append")
    parser.add_argument(
        "--tesseract",
        default=DEFAULT_TESSERACT,
        help="Tesseract executable used when referenced PDF pages contain no selectable text.",
    )
    return parser.parse_args(argv)


def main(argv: Sequence[str] | None = None) -> int:
    args = parse_args(argv or sys.argv[1:])
    outputs = export_explanation_inputs(
        args.catalog.resolve(),
        args.cache_root.resolve(),
        args.output_dir.resolve(),
        years=set(args.year) if args.year else None,
        grades=set(args.grade) if args.grade else None,
        tesseract_binary=args.tesseract,
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

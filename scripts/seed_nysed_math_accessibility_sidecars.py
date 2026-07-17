#!/usr/bin/env python3
"""Seed or validate reviewed Grade 3-8 math accessibility sidecars.

``--seed-unreviewed`` is an authoring aid only. It converts the importer's raw
text extraction into a structured draft and deliberately inserts a rejected
``[VISUAL REVIEW REQUIRED]`` sentinel whenever it cannot prove four non-empty,
ordered choices. Production imports accept only sidecars that pass the stricter
validator in :mod:`scripts.nysed_math_accessibility` and whose crop hashes still
match.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
from pathlib import Path
from typing import Any, Sequence

try:
    from scripts.nysed_math_accessibility import (
        DEFAULT_MATH_ACCESSIBILITY_ROOT,
        MATH_ACCESSIBILITY_POLICY_VERSION,
        MATH_ACCESSIBILITY_SIDECAR_SCHEMA_VERSION,
        load_math_exam_accessibility,
        math_accessibility_input_hash,
    )
except ModuleNotFoundError:  # pragma: no cover - direct script execution.
    from nysed_math_accessibility import (  # type: ignore[no-redef]
        DEFAULT_MATH_ACCESSIBILITY_ROOT,
        MATH_ACCESSIBILITY_POLICY_VERSION,
        MATH_ACCESSIBILITY_SIDECAR_SCHEMA_VERSION,
        load_math_exam_accessibility,
        math_accessibility_input_hash,
    )


REPO_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_CATALOG = REPO_ROOT / "content" / "math-exams" / "generated" / "catalog.json"
DEFAULT_ASSET_ROOT = REPO_ROOT / "public"
APP_PUBLIC_PREFIX = "/vine-app/"
_LABEL_RE = re.compile(r"(?<![A-Za-z0-9])([ABCD])(?=\s)")
_UNREVIEWED = "[VISUAL REVIEW REQUIRED]"


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _asset_path(asset_root: Path, src: Any) -> Path:
    if not isinstance(src, str) or not src.startswith(APP_PUBLIC_PREFIX):
        raise ValueError(f"Invalid math asset path {src!r}")
    relative = src[len(APP_PUBLIC_PREFIX) :]
    path = asset_root / relative
    if not path.is_file() or path.is_symlink():
        raise ValueError(f"Missing or unsafe math asset {path}")
    return path


def _choice_spans(text: str) -> tuple[str, dict[str, str]] | None:
    """Find the final ordered A/B/C/D run in a raw extraction."""

    matches = list(_LABEL_RE.finditer(text))
    candidates: list[tuple[re.Match[str], re.Match[str], re.Match[str], re.Match[str]]] = []
    for a_index, a in enumerate(matches):
        if a.group(1) != "A":
            continue
        for b_index in range(a_index + 1, len(matches)):
            b = matches[b_index]
            if b.group(1) != "B":
                continue
            for c_index in range(b_index + 1, len(matches)):
                c = matches[c_index]
                if c.group(1) != "C":
                    continue
                d = next(
                    (candidate for candidate in matches[c_index + 1 :] if candidate.group(1) == "D"),
                    None,
                )
                if d is not None:
                    candidates.append((a, b, c, d))
                break
            break
    if not candidates:
        return None
    a, b, c, d = max(candidates, key=lambda values: values[3].start())
    values = {
        "A": text[a.end() : b.start()].strip(" .;:-"),
        "B": text[b.end() : c.start()].strip(" .;:-"),
        "C": text[c.end() : d.start()].strip(" .;:-"),
        "D": text[d.end() :].strip(" .;:-"),
    }
    if any(not value for value in values.values()):
        return None
    return text[: a.start()].strip(), values


def _draft_description(raw: str, language: str) -> str:
    raw = " ".join(raw.split())
    heading = "Choices:" if language == "en" else "Opciones:"
    parsed = _choice_spans(raw)
    if parsed is None:
        return f"{raw} {heading} A: {_UNREVIEWED}; B: {_UNREVIEWED}; C: {_UNREVIEWED}; D: {_UNREVIEWED}."
    stem, choices = parsed
    return (
        f"{stem} {heading} A: {choices['A']}; B: {choices['B']}; "
        f"C: {choices['C']}; D: {choices['D']}."
    )


def _exam_inputs(
    exam: dict[str, Any], asset_root: Path
) -> tuple[dict[str, str], dict[str, int], dict[str, dict[str, str]]]:
    languages = list(exam["supportedLanguages"])
    hashes: dict[str, str] = {}
    numbers: dict[str, int] = {}
    drafts: dict[str, dict[str, str]] = {}
    for question in exam["questions"]:
        question_id = str(question["id"])
        number = int(question["number"])
        image_hashes = {
            language: _sha256(_asset_path(asset_root, question["image"][language]["src"]))
            for language in languages
        }
        hashes[question_id] = math_accessibility_input_hash(
            question_id=question_id,
            number=number,
            image_sha256=image_hashes,
            languages=languages,
        )
        numbers[question_id] = number
        drafts[question_id] = {
            language: _draft_description(question["alt"][language], language)
            for language in languages
        }
    return hashes, numbers, drafts


def _write_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(
        json.dumps(value, ensure_ascii=False, indent=2, sort_keys=False) + "\n",
        encoding="utf-8",
    )
    temporary.replace(path)


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--catalog", type=Path, default=DEFAULT_CATALOG)
    parser.add_argument("--asset-root", type=Path, default=DEFAULT_ASSET_ROOT)
    parser.add_argument("--sidecar-root", type=Path, default=DEFAULT_MATH_ACCESSIBILITY_ROOT)
    parser.add_argument("--seed-unreviewed", action="store_true")
    args = parser.parse_args(argv)

    catalog = json.loads(args.catalog.read_text(encoding="utf-8"))
    exams = [exam for exam in catalog["exams"] if exam["grade"] in range(3, 9)]
    if len(exams) != 78:
        raise ValueError(f"Expected 78 Grade 3-8 exams, found {len(exams)}")
    total_questions = 0
    total_localizations = 0
    for exam in exams:
        hashes, numbers, drafts = _exam_inputs(exam, args.asset_root)
        total_questions += len(hashes)
        total_localizations += len(hashes) * len(exam["supportedLanguages"])
        path = args.sidecar_root / f"{exam['year']}-grade-{exam['grade']}.json"
        if args.seed_unreviewed:
            _write_json(
                path,
                {
                    "schemaVersion": MATH_ACCESSIBILITY_SIDECAR_SCHEMA_VERSION,
                    "policyVersion": MATH_ACCESSIBILITY_POLICY_VERSION,
                    "examId": exam["id"],
                    "languages": exam["supportedLanguages"],
                    "questions": {
                        question_id: {
                            "inputHash": hashes[question_id],
                            "description": drafts[question_id],
                        }
                        for question_id in hashes
                    },
                },
            )
            continue
        load_math_exam_accessibility(
            year=int(exam["year"]),
            grade=int(exam["grade"]),
            exam_id=str(exam["id"]),
            languages=exam["supportedLanguages"],
            expected_input_hashes=hashes,
            expected_numbers=numbers,
            root=args.sidecar_root,
        )
    grade_5_8_exams = [exam for exam in exams if exam["grade"] in range(5, 9)]
    grade_5_8_questions = sum(len(exam["questions"]) for exam in grade_5_8_exams)
    grade_5_8_localizations = sum(
        len(exam["questions"]) * len(exam["supportedLanguages"])
        for exam in grade_5_8_exams
    )
    if (grade_5_8_questions, grade_5_8_localizations) != (1_277, 2_174):
        raise ValueError(
            "Grade 5-8 accessibility coverage changed: got "
            f"{grade_5_8_questions} questions / {grade_5_8_localizations} localizations"
        )
    if (total_questions, total_localizations) != (1_839, 3_131):
        raise ValueError(
            f"Accessibility coverage changed: got {total_questions} questions / "
            f"{total_localizations} localizations"
        )
    action = "Seeded unreviewed" if args.seed_unreviewed else "Validated reviewed"
    print(f"{action} math accessibility sidecars: {total_questions} questions / {total_localizations} localizations")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

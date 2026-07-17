#!/usr/bin/env python3
"""Source-pinned, screen-reader text for NYSED ELA question images.

Question crops are retained as the visual facsimile, but their PDF text layers
and OCR are not reliable enough to expose directly.  Production imports load
checked-in, reviewed transcriptions instead.  Each transcription is pinned to
both the exact released PDF and exact WebP crop, and coverage must match the
exam exactly.
"""

from __future__ import annotations

import hashlib
import json
import re
import unicodedata
from pathlib import Path
from typing import Any, Mapping


REPO_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_ELA_QUESTION_ACCESSIBILITY_ROOT = (
    REPO_ROOT / "content" / "ela-exams" / "accessibility"
)
DEFAULT_ELA_QUESTION_ACCESSIBILITY_REVIEW_MANIFEST = (
    REPO_ROOT
    / "content"
    / "ela-exams"
    / "question-accessibility-review-manifest.json"
)
ELA_QUESTION_ACCESSIBILITY_POLICY_VERSION = "ela-question-accessibility-1"
ELA_QUESTION_ACCESSIBILITY_SCHEMA_VERSION = 1
EXPECTED_ELA_QUESTION_ACCESSIBILITY_EXAMS = 78
EXPECTED_ELA_QUESTION_ACCESSIBILITY_QUESTIONS = 1_583

SHA256_RE = re.compile(r"^[0-9a-f]{64}$")
CHOICE_RE = re.compile(r"(?<![A-Za-z0-9])(?P<label>[ABCD]):\s*")
LOCAL_FILESYSTEM_PATH_RE = re.compile(
    r"(?:file://|/(?:Users|home|private|tmp|root|workspace|workspaces|var)/|"
    r"[A-Za-z]:\\|\\\\[^\\\s]+\\[^\\\s]+)",
    re.IGNORECASE,
)
ANSWER_LEAK_RE = re.compile(
    r"\b(?:answer\s+key|correct\s+(?:answer|choice|option|response)|"
    r"answer\s+choice\s+(?:is\s+)?[A-D]\b|"
    r"(?:the\s+)?answer\s*(?::|=|\bis\b|\bwas\b)\s*(?:choice\s*)?[A-D]\b|"
    r"correct\s*(?::|\bis\b)\s*[A-D]\b|"
    r"[A-D]\s+is\s+correct\b|"
    r"(?:choice\s+|option\s+)?[A-D]\s*\(\s*correct\s*\)(?!\w)(?=\W|$)|"
    r"choice\s+[A-D]\s+is\s+correct\b|"
    r"(?:choice|option)\s+[A-D]\s+is\s+(?:the\s+)?answer\b|"
    r"key\s*(?::|=|\bis\b)?\s*[A-D]\b|"
    r"(?:answer|key|response|solution)\s*(?::|=|\bis\b)\s*[A-D]|"
    r"(?:choice|option)\s+[A-D]\s+is\s+(?:correct|right|best)|"
    r"why\s+(?:choice|answer)\s+[A-D]\s+is\s+(?:the\s+)?correct|"
    r"scoring\s+rubric\b|annotated\s+item\b)",
    re.IGNORECASE,
)
KNOWN_OCR_ARTIFACT_RE = re.compile(
    r"(?:\ufffd|[\ufb00-\ufb06]|_{1,}|"
    r"(?<![A-Za-z])(?:Aa|Bb|Cc|Dd|Tt|Pp)(?![A-Za-z])|"
    r"(?<![A-Za-z])/n(?![A-Za-z])|"
    r"(?<![A-Za-z])(?:Bs|Ds)(?![A-Za-z])|"
    r"\b(?:H\s+ow|I\s+n|W\s+hat|B\s+ased|W\s+hy|T\s+he|"
    r"R\s+ead|L\s+ines|W\s+hich|A\s+s|b\s+est|Th\s+e|O\s+ne-Eyed|"
    r"(?:fi|fl)\s+[a-z]+)\b|"
    r"\b(?:Heis|Howis|Itis|Itincludes|anangry|aworld|ina|hasa|hammingbirds|"
    r"by(?:raising|speaking|explaining|showing|describing))\b|"
    r"\b(?:be\s+s\s+t|b\s+e\s+st|m\s+o\s+st|d\s+lown|couldn[’']\s+t|astory|tobe)\b|"
    r"\b(?:1g|2g|209)\b|\bGO\s+ON\b|"
    r"(?<![A-Za-z])(?-i:c)(?![A-Za-z])|"
    r"(?<![A-Za-z0-9])(?:Pp|P|q)(?![A-Za-z0-9])|"
    r"(?:=|»)|\byoud\b|=\s*=\s*SS\b|walls;'|,\.\.|(?<!\.)\.\.(?!\.))",
    re.IGNORECASE,
)
SPACED_LETTER_OCR_RE = re.compile(r"(?:\b[A-Za-z]\s+){3,}[A-Za-z]\b")
DOUBLED_CHARACTER_TOKEN_RE = re.compile(r"\b[A-Za-z][A-Za-z-]*[A-Za-z]\b")
DOUBLED_CHARACTER_LAYOUT_RE = re.compile(r"(?:““|””|::|\bThThee\b|\b4400\b)")
ALLOWED_EXPRESSIVE_REPEAT_TOKENS = frozenset({"Snoozzzzzze", "go-rillllllas"})


class ElaQuestionAccessibilityError(ValueError):
    """A reviewed ELA question transcription is missing, stale, or unsafe."""


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _sha(value: Any, *, label: str) -> str:
    if not isinstance(value, str) or not SHA256_RE.fullmatch(value.strip().lower()):
        raise ElaQuestionAccessibilityError(f"{label} must be a SHA-256 digest")
    return value.strip().lower()


def _exact_mapping(value: Any, expected: set[str], *, label: str) -> dict[str, Any]:
    if not isinstance(value, dict):
        raise ElaQuestionAccessibilityError(f"{label} must be a JSON object")
    if set(value) != expected:
        raise ElaQuestionAccessibilityError(
            f"{label} keys changed; expected={sorted(expected)}, got={sorted(value)}"
        )
    return value


def _load_json_without_duplicates(path: Path) -> Any:
    def pairs(values: list[tuple[str, Any]]) -> dict[str, Any]:
        result: dict[str, Any] = {}
        for key, value in values:
            if key in result:
                raise ElaQuestionAccessibilityError(
                    f"Duplicate JSON key in ELA question accessibility sidecar: {key}"
                )
            result[key] = value
        return result

    return json.loads(path.read_text(encoding="utf-8"), object_pairs_hook=pairs)


def normalize_ela_question_accessibility_text(value: str) -> str:
    """Normalize spacing without compatibility-folding literary punctuation."""

    if not isinstance(value, str):
        raise TypeError("ELA question accessibility text must be a string")
    text = unicodedata.normalize("NFC", value)
    if any(
        unicodedata.category(character) in {"Co", "Cs"}
        or (
            unicodedata.category(character) == "Cc"
            and character not in {"\t", "\n", "\r"}
        )
        for character in text
    ):
        raise ElaQuestionAccessibilityError(
            "ELA question accessibility text contains unsafe control or private-use characters"
        )
    return re.sub(r"\s+", " ", text).strip()


def _is_doubled_character_token(token: str) -> bool:
    if token in ALLOWED_EXPRESSIVE_REPEAT_TOKENS:
        return False
    for component in token.split("-"):
        if len(component) < 4 or len(component) % 2:
            continue
        equal_pairs = sum(
            component[index] == component[index + 1]
            for index in range(0, len(component), 2)
        )
        pair_count = len(component) // 2
        if equal_pairs == pair_count:
            return True
        if (
            len(component) >= 8
            and equal_pairs >= 3
            and equal_pairs / pair_count >= 0.6
        ):
            return True
    return False


def ela_question_accessibility_input_hash(
    *,
    question_id: str,
    number: int,
    source_pdf_sha256: str,
    question_image_sha256: str,
    policy_version: str = ELA_QUESTION_ACCESSIBILITY_POLICY_VERSION,
) -> str:
    if not isinstance(question_id, str) or not question_id.strip():
        raise ElaQuestionAccessibilityError("Question id must not be empty")
    if not isinstance(number, int) or isinstance(number, bool) or not 1 <= number <= 100:
        raise ElaQuestionAccessibilityError("Question number is invalid")
    payload = {
        "number": number,
        "policyVersion": policy_version,
        "questionId": question_id.strip(),
        "questionImageSha256": _sha(
            question_image_sha256, label="Question image SHA-256"
        ),
        "sourcePdfSha256": _sha(source_pdf_sha256, label="Source PDF SHA-256"),
    }
    encoded = json.dumps(
        payload, ensure_ascii=False, sort_keys=True, separators=(",", ":")
    ).encode("utf-8")
    return hashlib.sha256(encoded).hexdigest()


def validate_ela_question_accessibility_text(
    value: Any,
    *,
    question_id: str,
    number: int,
) -> str:
    if not isinstance(value, str):
        raise ElaQuestionAccessibilityError(
            f"Accessibility text for {question_id} must be a string"
        )
    text = normalize_ela_question_accessibility_text(value)
    if not 45 <= len(text) <= 6_000:
        raise ElaQuestionAccessibilityError(
            f"Accessibility text for {question_id} must be 45-6000 characters"
        )
    prefix = f"Question {number}."
    if not text.startswith(prefix):
        raise ElaQuestionAccessibilityError(
            f"Accessibility text for {question_id} must start with {prefix!r}"
        )
    if text.count("Choices:") != 1:
        raise ElaQuestionAccessibilityError(
            f"Accessibility text for {question_id} must contain one Choices heading"
        )
    stem, choices_text = text.split("Choices:", 1)
    stem = stem[len(prefix) :].strip()
    if len(re.sub(r"[^A-Za-z0-9]", "", stem)) < 6:
        raise ElaQuestionAccessibilityError(
            f"Accessibility text for {question_id} lacks a substantive stem"
        )
    if re.match(rf"{number}\b", stem):
        raise ElaQuestionAccessibilityError(
            f"Accessibility text for {question_id} repeats its crop number"
        )
    number_text = str(number)
    if len(number_text) == 2 and re.search(
        rf"(?<!\d){number_text[0]}\s+{number_text[1]}\s*$", stem
    ):
        raise ElaQuestionAccessibilityError(
            f"Accessibility text for {question_id} repeats a spaced crop number at the stem tail"
        )
    matches = list(CHOICE_RE.finditer(choices_text))
    labels = [match.group("label") for match in matches]
    if labels != ["A", "B", "C", "D"]:
        raise ElaQuestionAccessibilityError(
            f"Accessibility text for {question_id} must contain one ordered A-D transcription"
        )
    choice_bodies: list[tuple[str, str]] = []
    for index, match in enumerate(matches):
        end = matches[index + 1].start() if index + 1 < len(matches) else len(choices_text)
        body = choices_text[match.end() : end].strip(" ;")
        choice_bodies.append((match.group("label"), body))
        if not body or not any(character.isalnum() for character in body):
            raise ElaQuestionAccessibilityError(
                f"Accessibility text for {question_id} has an empty choice {match.group('label')}"
            )
        if re.match(rf"{number}\b", body):
            raise ElaQuestionAccessibilityError(
                f"Accessibility text for {question_id} repeats a crop number in choice {match.group('label')}"
            )
        if match.group("label") in {"B", "C", "D"} and re.match(
            rf"{match.group('label')}\s+", body
        ):
            raise ElaQuestionAccessibilityError(
                f"Accessibility text for {question_id} repeats choice label {match.group('label')}"
            )
    for segment_label, segment in [("stem", stem), *choice_bodies]:
        if segment.count("“") != segment.count("”") or segment.count('"') % 2:
            raise ElaQuestionAccessibilityError(
                f"Accessibility text for {question_id} has unbalanced quotation marks in {segment_label}"
            )
    if ANSWER_LEAK_RE.search(text):
        raise ElaQuestionAccessibilityError(
            f"Accessibility text for {question_id} leaks answer/scoring metadata"
        )
    if LOCAL_FILESYSTEM_PATH_RE.search(text):
        raise ElaQuestionAccessibilityError(
            f"Accessibility text for {question_id} exposes a local filesystem path"
        )
    if (
        KNOWN_OCR_ARTIFACT_RE.search(text)
        or SPACED_LETTER_OCR_RE.search(text)
        or DOUBLED_CHARACTER_LAYOUT_RE.search(text)
    ):
        raise ElaQuestionAccessibilityError(
            f"Accessibility text for {question_id} contains a known OCR artifact"
        )
    doubled = [
        token
        for token in DOUBLED_CHARACTER_TOKEN_RE.findall(text)
        if _is_doubled_character_token(token)
    ]
    if doubled:
        raise ElaQuestionAccessibilityError(
            f"Accessibility text for {question_id} contains doubled-character OCR: {doubled}"
        )
    return text


def _asset_path(asset_root: Path, src: Any) -> Path:
    prefix = "/vine-app/nysed/ela/"
    if not isinstance(src, str) or not src.startswith(prefix):
        raise ElaQuestionAccessibilityError(f"Invalid ELA question image path {src!r}")
    root = asset_root.resolve()
    candidate = root / src[len(prefix) :]
    if candidate.is_symlink():
        raise ElaQuestionAccessibilityError(f"Unsafe symlink ELA question image {candidate}")
    path = candidate.resolve()
    try:
        path.relative_to(root)
    except ValueError as exc:
        raise ElaQuestionAccessibilityError(
            f"ELA question image escapes the asset root: {src!r}"
        ) from exc
    if not path.is_file() or path.is_symlink():
        raise ElaQuestionAccessibilityError(f"Missing or unsafe ELA question image {path}")
    return path


def _sidecar_path(year: int, grade: int, root: Path) -> Path:
    if year < 2013 or year > 2100 or grade not in range(3, 9):
        raise ElaQuestionAccessibilityError("ELA accessibility year or grade is invalid")
    return root / f"{year}-grade-{grade}.json"


def load_exam_question_accessibility(
    *,
    year: int,
    grade: int,
    exam_id: str,
    source_pdf_sha256: str,
    expected_input_hashes: Mapping[str, str],
    expected_numbers: Mapping[str, int],
    root: Path = DEFAULT_ELA_QUESTION_ACCESSIBILITY_ROOT,
    manifest_path: Path | None = DEFAULT_ELA_QUESTION_ACCESSIBILITY_REVIEW_MANIFEST,
) -> dict[str, str]:
    path = _sidecar_path(year, grade, root)
    try:
        record = _exact_mapping(
            _load_json_without_duplicates(path),
            {"schemaVersion", "policyVersion", "examId", "sourcePdfSha256", "questions"},
            label="ELA question accessibility sidecar",
        )
    except OSError as exc:
        raise ElaQuestionAccessibilityError(
            f"Could not read ELA question accessibility sidecar {path.name}: {exc}"
        ) from exc
    if record["schemaVersion"] != ELA_QUESTION_ACCESSIBILITY_SCHEMA_VERSION:
        raise ElaQuestionAccessibilityError("ELA accessibility schemaVersion is invalid")
    if record["policyVersion"] != ELA_QUESTION_ACCESSIBILITY_POLICY_VERSION:
        raise ElaQuestionAccessibilityError("ELA accessibility policyVersion is invalid")
    if record["examId"] != exam_id:
        raise ElaQuestionAccessibilityError("ELA accessibility examId does not match")
    if _sha(record["sourcePdfSha256"], label="Sidecar source PDF SHA-256") != _sha(
        source_pdf_sha256, label="Expected source PDF SHA-256"
    ):
        raise ElaQuestionAccessibilityError("ELA accessibility source PDF hash mismatch")
    questions = record["questions"]
    if not isinstance(questions, dict):
        raise ElaQuestionAccessibilityError("ELA accessibility questions must be an object")
    expected_ids = set(expected_input_hashes)
    if set(questions) != expected_ids or set(expected_numbers) != expected_ids:
        raise ElaQuestionAccessibilityError(
            "ELA accessibility coverage changed; "
            f"missing={sorted(expected_ids - set(questions))}, "
            f"orphaned={sorted(set(questions) - expected_ids)}"
        )
    if manifest_path is not None:
        # Import lazily: the approval tool imports this module while validating
        # draft sidecars, so a module-level import would create a cycle.
        try:
            from scripts.review_nysed_ela_question_accessibility_sidecars import (
                ElaQuestionAccessibilityReviewError,
                load_review_manifest,
            )
        except ModuleNotFoundError:  # pragma: no cover - direct script execution.
            from review_nysed_ela_question_accessibility_sidecars import (  # type: ignore[no-redef]
                ElaQuestionAccessibilityReviewError,
                load_review_manifest,
            )

        try:
            reviews = load_review_manifest(manifest_path)
        except (ElaQuestionAccessibilityReviewError, OSError, TypeError, ValueError) as exc:
            raise ElaQuestionAccessibilityError(
                f"ELA accessibility review manifest failed: {exc}"
            ) from exc
        review = reviews.get(exam_id)
        if review is None:
            raise ElaQuestionAccessibilityError(
                f"ELA accessibility review is missing for {exam_id}"
            )
        expected_source = _sha(
            source_pdf_sha256, label="Expected source PDF SHA-256"
        )
        if (
            review["year"] != year
            or review["grade"] != grade
            or review["sourcePdfSha256"] != expected_source
            or review["questionCount"] != len(expected_ids)
            or review["sidecarSha256"] != sha256_file(path)
        ):
            raise ElaQuestionAccessibilityError(
                f"ELA accessibility review metadata or approved bytes changed for {exam_id}"
            )
    result: dict[str, str] = {}
    for question_id in sorted(expected_ids):
        item = _exact_mapping(
            questions[question_id],
            {"inputHash", "alt"},
            label=f"ELA accessibility entry for {question_id}",
        )
        if _sha(item["inputHash"], label=f"Input hash for {question_id}") != _sha(
            expected_input_hashes[question_id], label=f"Expected input hash for {question_id}"
        ):
            raise ElaQuestionAccessibilityError(
                f"ELA accessibility input hash mismatch for {question_id}"
            )
        result[question_id] = validate_ela_question_accessibility_text(
            item["alt"], question_id=question_id, number=expected_numbers[question_id]
        )
    return result


def load_and_attach_exam_question_accessibility(
    exam: dict[str, Any],
    *,
    pdf_path: Path,
    asset_root: Path,
    root: Path = DEFAULT_ELA_QUESTION_ACCESSIBILITY_ROOT,
    manifest_path: Path | None = DEFAULT_ELA_QUESTION_ACCESSIBILITY_REVIEW_MANIFEST,
) -> None:
    """Replace raw extraction with exact-coverage reviewed question text."""

    year = int(exam.get("year", 0))
    grade = int(exam.get("grade", 0))
    exam_id = str(exam.get("id", ""))
    questions = exam.get("questions")
    if not isinstance(questions, list) or not all(isinstance(item, dict) for item in questions):
        raise ElaQuestionAccessibilityError(f"Malformed question list in {exam_id}")
    source_pdf_sha256 = sha256_file(pdf_path)
    input_hashes: dict[str, str] = {}
    numbers: dict[str, int] = {}
    for question in questions:
        question_id = str(question.get("id", ""))
        number = int(question.get("number", 0))
        image = question.get("image")
        if not isinstance(image, dict):
            raise ElaQuestionAccessibilityError(f"Missing image for {question_id}")
        image_sha256 = sha256_file(_asset_path(asset_root, image.get("src")))
        input_hashes[question_id] = ela_question_accessibility_input_hash(
            question_id=question_id,
            number=number,
            source_pdf_sha256=source_pdf_sha256,
            question_image_sha256=image_sha256,
        )
        numbers[question_id] = number
    reviewed = load_exam_question_accessibility(
        year=year,
        grade=grade,
        exam_id=exam_id,
        source_pdf_sha256=source_pdf_sha256,
        expected_input_hashes=input_hashes,
        expected_numbers=numbers,
        root=root,
        manifest_path=manifest_path,
    )
    for question in questions:
        question["alt"] = reviewed[str(question["id"])]

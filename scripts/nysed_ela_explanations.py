#!/usr/bin/env python3
"""Validate provenance-backed explanations for NYSED ELA questions.

This module intentionally does not know how an exam is imported or rendered.
It provides three small, deterministic building blocks that an importer can
compose:

* extract the correct-choice rationale from a legacy NYSED annotation block;
* hash every source input that an authored explanation depends on; and
* load a checked-in per-exam sidecar only when its coverage and provenance
  exactly match the current exam inputs.

Sidecars use this shape::

    {
      "schemaVersion": 1,
      "policyVersion": "ela-explanation-1",
      "examId": "nysed-ela-2026-grade-3-mc-v1",
      "questions": {
        "nysed-ela-2026-g3-mc-q1": {
          "inputHash": "<sha256>",
          "explanation": {
            "text": "...",
            "source": "vine-authored"
          }
        }
      }
    }

The public question-explanation value remains only ``{text, source}``; the
input hash is sidecar provenance and is not part of the app-facing schema.
"""

from __future__ import annotations

import dataclasses
import hashlib
import json
import re
import unicodedata
from pathlib import Path
from typing import Any, Literal, Mapping, Sequence


EXPLANATION_POLICY_VERSION = "ela-explanation-1"
EXPLANATION_SIDECAR_SCHEMA_VERSION = 1
MIN_EXPLANATION_LENGTH = 60
MAX_EXPLANATION_LENGTH = 1_200

DEFAULT_EXPLANATIONS_ROOT = (
    Path(__file__).resolve().parents[1] / "content" / "ela-exams" / "explanations"
)

ExplanationSource = Literal[
    "official-nysed",
    "official-nysed-corrected",
    "vine-authored",
]
_EXPLANATION_SOURCES = frozenset(
    ("official-nysed", "official-nysed-corrected", "vine-authored")
)
_CHOICES = frozenset(("A", "B", "C", "D"))
_SHA256_RE = re.compile(r"^[0-9a-f]{64}$")

_OPTIONAL_QUOTE = r"[\"'\u2018\u2019\u201c\u201d]?"
_CORRECT_RATIONALE_HEADING_RE = re.compile(
    rf"^[ \t]*WHY[ \t]+(?:CHOICE|ANSWER)[ \t]+"
    rf"{_OPTIONAL_QUOTE}[ \t]*(?P<key>[A-D])[ \t]*{_OPTIONAL_QUOTE}"
    rf"[ \t]+IS[ \t]+(?:THE[ \t]+)?CORRECT"
    rf"(?:[ \t]+(?:CHOICE|ANSWER|RESPONSE))?[ \t]*:?[ \t]*$",
    re.IGNORECASE | re.MULTILINE,
)
_RATIONALE_END_HEADING_RE = re.compile(
    r"^[ \t]*(?:"
    r"WHY[ \t]+(?:THE[ \t]+)?OTHER[ \t]+(?:CHOICES|ANSWERS|RESPONSES)"
    r"[ \t]+ARE[ \t]+INCORRECT|"
    r"HOW[ \t]+TO[ \t]+HELP[ \t]+STUDENTS[ \t]+MASTER\b[^\n]*|"
    r"INSTRUCTIONAL[ \t]+(?:SUGGESTIONS?|IMPLICATIONS?)\b[^\n]*|"
    r"QUESTION[ \t]+ANNOTATION\b[^\n]*"
    r")[ \t]*:?[ \t]*$",
    re.IGNORECASE | re.MULTILINE,
)

_REASONING_CONNECTIVE_RE = re.compile(
    r"\b(?:"
    r"because|since|therefore|thus|consequently|so|as[ \t]+a[ \t]+result|"
    r"which[ \t]+(?:show(?:s|ed|ing)?|means?|indicates?|demonstrates?|reveals?|explains?)|"
    r"(?:this|that)[ \t]+(?:show(?:s|ed|ing)?|means?|indicates?|supports?|demonstrates?|reveals?|explains?)|"
    r"show(?:s|ed|ing)?|means?|illustrat(?:e|es|ed|ing)|suggest(?:s|ed|ing)?|"
    r"clarif(?:y|ies|ied)|supports?|supported[ \t]+by|evidence|demonstrates?|indicates?|reveals?|"
    r"explains?|confirms?|contradicts?|connect(?:s|ed|ing)?|"
    r"identif(?:y|ies|ied)|recogniz(?:e|es|ed)|understand(?:s|ing)?|"
    r"deduc(?:e|es|ed)|determin(?:e|es|ed)|infer(?:s|red|ring)?|"
    r"interpret(?:s|ed|ing)?|rel(?:y|ies|ied)|uses?|contribut(?:e|es|ed|ing)"
    r")\b",
    re.IGNORECASE,
)
_GENERIC_PROVENANCE_RE = re.compile(
    r"\b(?:"
    r"according[ \t]+to[ \t]+(?:the[ \t]+)?(?:official[ \t]+|NYSED[ \t]+)?"
    r"answer(?:[ \t]+key)?|"
    r"(?:official[ \t]+NYSED|official|NYSED)[ \t]+answer[ \t]+key|"
    r"answer[ \t]+is[ \t]+(?:correct|right)[ \t]+according[ \t]+to|"
    r"because[ \t]+(?:it|this|that|choice[ \t]+[A-D])[ \t]+is[ \t]+"
    r"(?:the[ \t]+)?(?:correct|right)[ \t]+(?:answer|choice|response)|"
    r"because[ \t]+(?:the[ \t]+)?(?:official[ \t]+|NYSED[ \t]+)?answer[ \t]+key"
    r")\b",
    re.IGNORECASE,
)
_GENERIC_ONLY_RE = re.compile(
    r"^(?:"
    r"(?:the[ \t]+)?(?:correct|right)[ \t]+(?:answer|choice)[ \t]+is[ \t]+[A-D]|"
    r"(?:choice|answer)[ \t]+[A-D][ \t]+is[ \t]+(?:the[ \t]+)?(?:correct|right)"
    r"(?:[ \t]+(?:answer|choice))?"
    r")[.!]?$",
    re.IGNORECASE,
)
_ANNOTATION_ARTIFACT_RE = re.compile(
    r"\b(?:WHY[ \t]+(?:CHOICE|ANSWER)|WHY[ \t]+(?:THE[ \t]+)?OTHER[ \t]+"
    r"(?:CHOICES|ANSWERS|RESPONSES)|HOW[ \t]+TO[ \t]+HELP[ \t]+STUDENTS|"
    r"INSTRUCTIONAL[ \t]+(?:SUGGESTIONS?|IMPLICATIONS?)|QUESTION[ \t]+ANNOTATION)\b|"
    r"(?<=[.!?\u201d\u2019])[ \t]+\d{1,3}$",
    re.IGNORECASE,
)
_LOCAL_FILESYSTEM_PATH_RE = re.compile(
    r"(?:file://|/(?:Users|home|private|tmp|root|workspace|workspaces)/|"
    r"/var/folders/|[A-Za-z]:\\|\\\\[^\\\s]+\\[^\\\s]+)",
    re.IGNORECASE,
)


class ElaExplanationError(ValueError):
    """An official rationale, explanation input, or sidecar is invalid."""


@dataclasses.dataclass(frozen=True)
class QuestionExplanation:
    """The app-facing explanation for one multiple-choice question."""

    text: str
    source: ExplanationSource


@dataclasses.dataclass(frozen=True)
class QuestionExplanationInput:
    """All source inputs that can change the meaning of an explanation."""

    question_id: str
    alt: str
    correct: str
    primary_standard: str
    question_image_sha256: str
    passage_image_sha256: str
    secondary_standards: tuple[str, ...] = ()
    policy_version: str = EXPLANATION_POLICY_VERSION

    @classmethod
    def create(
        cls,
        *,
        question_id: str,
        alt: str,
        correct: str,
        primary_standard: str,
        question_image_sha256: str,
        passage_image_sha256: str,
        secondary_standards: Sequence[str] = (),
        policy_version: str = EXPLANATION_POLICY_VERSION,
    ) -> "QuestionExplanationInput":
        """Create an immutable input while defensively copying standards."""

        return cls(
            question_id=question_id,
            alt=alt,
            correct=correct,
            primary_standard=primary_standard,
            question_image_sha256=question_image_sha256,
            passage_image_sha256=passage_image_sha256,
            secondary_standards=tuple(secondary_standards),
            policy_version=policy_version,
        )


def _annotation_text(value: str) -> str:
    if not isinstance(value, str):
        raise TypeError("Official annotation block must be a string")
    value = unicodedata.normalize("NFKC", value).replace("\r\n", "\n").replace("\r", "\n")
    value = value.replace("\f", "\n")
    lines = [re.sub(r"[ \t\v]+", " ", line).strip() for line in value.split("\n")]
    return "\n".join(lines)


def normalize_explanation_text(value: str) -> str:
    """Return deterministic, single-paragraph explanation text."""

    if not isinstance(value, str):
        raise TypeError("Explanation text must be a string")
    normalized = unicodedata.normalize("NFKC", value)
    normalized = "".join(
        " " if unicodedata.category(character).startswith("C") else character
        for character in normalized
    )
    return re.sub(r"\s+", " ", normalized).strip()


def _strip_trailing_annotation_page_number(value: str) -> str:
    """Remove an isolated PDF page footer captured after a rationale."""

    return re.sub(r"(?<=[.!?\u201d\u2019])\s+\d{1,3}$", "", value).strip()


def _validated_choice(value: str, *, label: str) -> str:
    if not isinstance(value, str):
        raise TypeError(f"{label} must be a string")
    normalized = value.strip().upper()
    if normalized not in _CHOICES:
        raise ElaExplanationError(f"{label} must be one of A, B, C, or D")
    return normalized


def extract_official_rationale(block_text: str, key: str) -> str:
    """Extract the official correct-choice rationale from one annotation block.

    Legacy releases vary between curly quotes, ASCII quotes, and no quotes,
    and use both ``CHOICE`` and ``ANSWER`` in headings. The heading's printed
    choice must agree with the separately parsed answer key; a mismatch fails
    closed instead of attaching a plausible rationale to the wrong question.
    """

    expected_key = _validated_choice(key, label="Answer key")
    annotation = _annotation_text(block_text)
    headings = list(_CORRECT_RATIONALE_HEADING_RE.finditer(annotation))
    if len(headings) != 1:
        raise ElaExplanationError(
            "Official annotation must contain exactly one correct-choice rationale heading; "
            f"found {len(headings)}"
        )
    heading = headings[0]
    heading_key = heading.group("key").upper()
    if heading_key != expected_key:
        raise ElaExplanationError(
            f"Official rationale heading identifies choice {heading_key}, but the answer key is {expected_key}"
        )

    end_heading = _RATIONALE_END_HEADING_RE.search(annotation, heading.end())
    end = end_heading.start() if end_heading else len(annotation)
    rationale = _strip_trailing_annotation_page_number(
        normalize_explanation_text(annotation[heading.end() : end])
    )
    substantive_count = sum(character.isalnum() for character in rationale)
    if substantive_count < 24:
        raise ElaExplanationError("Official correct-choice rationale is missing or not substantive")
    return rationale


def _required_hash_text(value: str, *, label: str, flatten: bool = False) -> str:
    if not isinstance(value, str):
        raise TypeError(f"{label} must be a string")
    normalized = normalize_explanation_text(value) if flatten else unicodedata.normalize("NFC", value).strip()
    if not normalized:
        raise ElaExplanationError(f"{label} must not be empty")
    return normalized


def _normalized_sha256(value: str, *, label: str) -> str:
    if not isinstance(value, str):
        raise TypeError(f"{label} must be a string")
    normalized = value.strip().lower()
    if not _SHA256_RE.fullmatch(normalized):
        raise ElaExplanationError(f"{label} must be a 64-character SHA-256 hex digest")
    return normalized


def question_explanation_input_hash(value: QuestionExplanationInput) -> str:
    """Return a canonical SHA-256 over every explanation source input."""

    if not isinstance(value, QuestionExplanationInput):
        raise TypeError("value must be a QuestionExplanationInput")
    question_id = _required_hash_text(value.question_id, label="Question id")
    alt = _required_hash_text(value.alt, label="Question alt", flatten=True)
    correct = _validated_choice(value.correct, label="Correct choice")
    primary = _required_hash_text(value.primary_standard, label="Primary standard")
    secondary = [
        _required_hash_text(standard, label="Secondary standard")
        for standard in value.secondary_standards
    ]
    if len(secondary) != len(set(secondary)) or primary in secondary:
        raise ElaExplanationError("Question standards must be unique")
    policy_version = _required_hash_text(value.policy_version, label="Policy version")
    payload = {
        "assets": {
            "passageImageSha256": _normalized_sha256(
                value.passage_image_sha256,
                label="Passage image SHA-256",
            ),
            "questionImageSha256": _normalized_sha256(
                value.question_image_sha256,
                label="Question image SHA-256",
            ),
        },
        "correct": correct,
        "policyVersion": policy_version,
        "questionAlt": alt,
        "questionId": question_id,
        "standards": {
            "primary": primary,
            "secondary": secondary,
        },
    }
    encoded = json.dumps(
        payload,
        ensure_ascii=False,
        separators=(",", ":"),
        sort_keys=True,
    ).encode("utf-8")
    return hashlib.sha256(encoded).hexdigest()


def _validate_explanation_text(
    value: Any,
    *,
    question_id: str,
    require_reasoning_connective: bool = True,
) -> str:
    if not isinstance(value, str):
        raise ElaExplanationError(f"Explanation text for {question_id} must be a string")
    text = normalize_explanation_text(value)
    if not MIN_EXPLANATION_LENGTH <= len(text) <= MAX_EXPLANATION_LENGTH:
        raise ElaExplanationError(
            f"Explanation text for {question_id} must be "
            f"{MIN_EXPLANATION_LENGTH}-{MAX_EXPLANATION_LENGTH} characters"
        )
    alphanumeric_count = sum(character.isalnum() for character in text)
    words = re.findall(r"[^\W_]+(?:['\u2019][^\W_]+)?|\d+", text, flags=re.UNICODE)
    distinct_words = {word.casefold() for word in words if len(word) >= 3}
    if alphanumeric_count < 40 or len(words) < 10 or len(distinct_words) < 6:
        raise ElaExplanationError(f"Explanation text for {question_id} is not substantive")
    if require_reasoning_connective and not _REASONING_CONNECTIVE_RE.search(text):
        raise ElaExplanationError(
            f"Explanation text for {question_id} lacks an explicit reasoning connective"
        )
    if _GENERIC_PROVENANCE_RE.search(text) or _GENERIC_ONLY_RE.fullmatch(text):
        raise ElaExplanationError(
            f"Explanation text for {question_id} merely restates answer-key correctness"
        )
    if _ANNOTATION_ARTIFACT_RE.search(text):
        raise ElaExplanationError(
            f"Explanation text for {question_id} contains an annotation or page-footer artifact"
        )
    if _LOCAL_FILESYSTEM_PATH_RE.search(text):
        raise ElaExplanationError(
            f"Explanation text for {question_id} contains a local filesystem path"
        )
    return text


def _exact_object_keys(value: Any, expected: set[str], *, label: str) -> dict[str, Any]:
    if not isinstance(value, dict):
        raise ElaExplanationError(f"{label} must be a JSON object")
    actual = set(value)
    if actual != expected:
        missing = sorted(expected - actual)
        unexpected = sorted(actual - expected)
        raise ElaExplanationError(
            f"{label} keys changed; missing={missing}, unexpected={unexpected}"
        )
    return value


def validate_question_explanation(
    value: Any,
    *,
    question_id: str,
) -> QuestionExplanation:
    """Validate one exact app-facing ``{text, source}`` explanation value."""

    normalized_question_id = _required_hash_text(question_id, label="Question id")
    explanation = _exact_object_keys(
        value,
        {"text", "source"},
        label=f"Explanation for {normalized_question_id}",
    )
    source = explanation["source"]
    if not isinstance(source, str) or source not in _EXPLANATION_SOURCES:
        raise ElaExplanationError(
            f"Explanation source for {normalized_question_id} must be "
            "official-nysed, official-nysed-corrected, or vine-authored"
        )
    text = _validate_explanation_text(
        explanation["text"],
        question_id=normalized_question_id,
        require_reasoning_connective=source == "vine-authored",
    )
    return QuestionExplanation(text=text, source=source)


def _validated_expected_hashes(expected_input_hashes: Mapping[str, str]) -> dict[str, str]:
    if not isinstance(expected_input_hashes, Mapping):
        raise TypeError("expected_input_hashes must be a mapping")
    result: dict[str, str] = {}
    for raw_question_id, raw_hash in expected_input_hashes.items():
        question_id = _required_hash_text(raw_question_id, label="Expected question id")
        if question_id in result:
            raise ElaExplanationError(f"Duplicate expected question id {question_id}")
        result[question_id] = _normalized_sha256(raw_hash, label=f"Expected input hash for {question_id}")
    if not result:
        raise ElaExplanationError("Expected question coverage must not be empty")
    return result


def validate_exam_explanation_sidecar(
    value: Any,
    *,
    exam_id: str,
    expected_input_hashes: Mapping[str, str],
    policy_version: str = EXPLANATION_POLICY_VERSION,
) -> dict[str, QuestionExplanation]:
    """Validate one parsed sidecar and return its app-facing explanations."""

    expected_exam_id = _required_hash_text(exam_id, label="Exam id")
    expected_policy = _required_hash_text(policy_version, label="Policy version")
    expected_hashes = _validated_expected_hashes(expected_input_hashes)
    document = _exact_object_keys(
        value,
        {"schemaVersion", "policyVersion", "examId", "questions"},
        label="Explanation sidecar",
    )
    if (
        not isinstance(document["schemaVersion"], int)
        or isinstance(document["schemaVersion"], bool)
        or document["schemaVersion"] != EXPLANATION_SIDECAR_SCHEMA_VERSION
    ):
        raise ElaExplanationError(
            "Explanation sidecar schemaVersion must be "
            f"{EXPLANATION_SIDECAR_SCHEMA_VERSION}"
        )
    if document["policyVersion"] != expected_policy:
        raise ElaExplanationError(
            f"Explanation sidecar policyVersion does not match {expected_policy}"
        )
    if document["examId"] != expected_exam_id:
        raise ElaExplanationError(
            f"Explanation sidecar examId does not match {expected_exam_id}"
        )
    questions = document["questions"]
    if not isinstance(questions, dict):
        raise ElaExplanationError("Explanation sidecar questions must be a JSON object")

    actual_ids = set(questions)
    expected_ids = set(expected_hashes)
    missing = sorted(expected_ids - actual_ids)
    orphaned = sorted(actual_ids - expected_ids)
    if missing or orphaned:
        raise ElaExplanationError(
            f"Explanation sidecar question coverage changed; missing={missing}, orphaned={orphaned}"
        )

    explanations: dict[str, QuestionExplanation] = {}
    for question_id in expected_hashes:
        record = _exact_object_keys(
            questions[question_id],
            {"inputHash", "explanation"},
            label=f"Explanation record for {question_id}",
        )
        input_hash = _normalized_sha256(
            record["inputHash"],
            label=f"Input hash for {question_id}",
        )
        if input_hash != expected_hashes[question_id]:
            raise ElaExplanationError(f"Explanation input hash mismatch for {question_id}")
        explanations[question_id] = validate_question_explanation(
            record["explanation"],
            question_id=question_id,
        )
    return explanations


def _reject_duplicate_json_keys(pairs: list[tuple[str, Any]]) -> dict[str, Any]:
    result: dict[str, Any] = {}
    for key, value in pairs:
        if key in result:
            raise ElaExplanationError(f"Duplicate JSON key in explanation sidecar: {key}")
        result[key] = value
    return result


def explanation_sidecar_path(
    year: int,
    grade: int,
    *,
    root: Path = DEFAULT_EXPLANATIONS_ROOT,
) -> Path:
    """Return the fixed checked-in sidecar location for one year and grade."""

    if not isinstance(year, int) or isinstance(year, bool) or not 2000 <= year <= 2100:
        raise ElaExplanationError("ELA explanation year must be an integer from 2000 through 2100")
    if not isinstance(grade, int) or isinstance(grade, bool) or grade not in range(3, 9):
        raise ElaExplanationError("ELA explanation grade must be an integer from 3 through 8")
    return Path(root) / f"{year}-grade-{grade}.json"


def load_exam_explanations(
    *,
    year: int,
    grade: int,
    exam_id: str,
    expected_input_hashes: Mapping[str, str],
    root: Path = DEFAULT_EXPLANATIONS_ROOT,
    policy_version: str = EXPLANATION_POLICY_VERSION,
) -> dict[str, QuestionExplanation]:
    """Load and fail-closed validate one checked-in per-exam sidecar."""

    path = explanation_sidecar_path(year, grade, root=root)
    try:
        serialized = path.read_text(encoding="utf-8")
    except OSError as exc:
        raise ElaExplanationError(f"Could not read ELA explanation sidecar {path.name}: {exc}") from exc
    try:
        value = json.loads(serialized, object_pairs_hook=_reject_duplicate_json_keys)
    except ElaExplanationError:
        raise
    except (json.JSONDecodeError, UnicodeError) as exc:
        raise ElaExplanationError(f"Invalid JSON in ELA explanation sidecar {path.name}: {exc}") from exc
    return validate_exam_explanation_sidecar(
        value,
        exam_id=exam_id,
        expected_input_hashes=expected_input_hashes,
        policy_version=policy_version,
    )

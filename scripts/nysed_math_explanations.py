#!/usr/bin/env python3
"""Provenance and validation helpers for NYSED math explanations."""

from __future__ import annotations

import dataclasses
import hashlib
import json
import re
import unicodedata
from pathlib import Path
from typing import Any, Literal, Mapping, Sequence


MATH_EXPLANATION_POLICY_VERSION = "math-explanation-1"
MATH_EXPLANATION_SIDECAR_SCHEMA_VERSION = 1
DEFAULT_MATH_EXPLANATIONS_ROOT = (
    Path(__file__).resolve().parents[1] / "content" / "math-exams" / "explanations"
)
DEFAULT_MATH_OFFICIAL_RATIONALE_OVERRIDES = (
    Path(__file__).resolve().parents[1]
    / "content"
    / "math-exams"
    / "official-rationale-overrides.json"
)
MATH_OFFICIAL_RATIONALE_OVERRIDE_POLICY_VERSION = "math-official-rationale-repair-1"
MATH_OFFICIAL_RATIONALE_OVERRIDE_SCHEMA_VERSION = 1

MathExplanationSource = Literal[
    "official-nysed",
    "official-nysed-corrected",
    "vine-authored",
]
_SOURCES = frozenset(("official-nysed", "official-nysed-corrected", "vine-authored"))
_CHOICES = frozenset(("A", "B", "C", "D"))
_SHA256_RE = re.compile(r"^[0-9a-f]{64}$")
_GENERIC_RE = re.compile(
    r"(?:official\s+NYSED\s+answer\s+key|"
    r"(?:answer|response)\s+key\s+(?:identifies|says|shows)|"
    r"(?:la\s+)?clave\s+oficial\s+de\s+respuestas\s+de\s+NYSED|"
    r"correct(?:a|o)?\s+(?:according\s+to|seg[uú]n)\s+(?:the\s+)?(?:official\s+)?(?:answer|key|clave))",
    re.IGNORECASE,
)
_EN_REASONING_RE = re.compile(
    r"\b(?:because|since|so|therefore|thus|which|gives?|equals?|represents?|"
    r"shows?|means?|substitut(?:e|ing)|calculat(?:e|ing)|divid(?:e|ing)|"
    r"multip(?:ly|lying)|add(?:ing)?|subtract(?:ing)?|simplif(?:y|ying)|"
    r"compar(?:e|ing)|count(?:ing)?|measur(?:e|ing)|convert(?:ing)?|"
    r"factor(?:ing)?|solv(?:e|ing)|evaluat(?:e|ing))\b|[=×÷+−<>]",
    re.IGNORECASE,
)
_ES_REASONING_RE = re.compile(
    r"\b(?:porque|ya\s+que|por\s+lo\s+tanto|as[ií]\s+que|entonces|lo\s+que|"
    r"da|resulta|equivale|representa|muestra|significa|sustitu(?:ir|yendo)|"
    r"calcul(?:ar|ando)|divid(?:ir|iendo)|multiplic(?:ar|ando)|sum(?:ar|ando)|"
    r"rest(?:ar|ando)|simplific(?:ar|ando)|compar(?:ar|ando)|cont(?:ar|ando)|"
    r"med(?:ir|iendo)|convert(?:ir|iendo)|resolv(?:er|iendo)|evalu(?:ar|ando))\b|"
    r"[=×÷+−<>]",
    re.IGNORECASE,
)
_ANSWER_CHOICE_HEADING_RE = re.compile(
    r"^[ \t]*Answer[ \t]+(?:Choice|Option)[ \t]+(?P<key>[A-D])[ \t]*:[ \t]*",
    re.IGNORECASE | re.MULTILINE,
)
_ANSWER_CHOICES_SUMMARY_RE = re.compile(
    # Singular "answer choice C" can occur inside an explanation sentence;
    # only the official plural summary heading terminates a rationale.
    r"^[ \t]*Answer[ \t]+(?:choices|options)\b",
    re.IGNORECASE | re.MULTILINE,
)

OFFICIAL_RATIONALE_OVERRIDE_QUESTION_IDS = frozenset(
    {
        "nysed-2013-g3-mc-q1",
        "nysed-2013-g3-mc-q4",
        "nysed-2013-g3-mc-q8",
        "nysed-2013-g3-mc-q9",
        "nysed-2013-g4-mc-q3",
        "nysed-2013-g4-mc-q5",
        "nysed-2013-g4-mc-q7",
        "nysed-2013-g4-mc-q8",
        "nysed-2013-g5-mc-q1",
        "nysed-2013-g5-mc-q3",
        "nysed-2013-g5-mc-q4",
        "nysed-2013-g5-mc-q10",
        "nysed-2013-g5-mc-q11",
        "nysed-2013-g6-mc-q2",
        "nysed-2013-g6-mc-q13",
        "nysed-2013-g6-mc-q14",
        "nysed-2013-g6-mc-q27",
        "nysed-2013-g7-mc-q2",
        "nysed-2013-g7-mc-q5",
        "nysed-2013-g7-mc-q7",
        "nysed-2013-g8-mc-q6",
        "nysed-2013-g8-mc-q17",
        "nysed-2013-g8-mc-q19",
        "nysed-2013-g8-mc-q25",
        "nysed-2013-g8-mc-q49",
        "nysed-2013-g8-mc-q50",
        "nysed-2014-g3-mc-q8",
        "nysed-2014-g3-mc-q14",
        "nysed-2014-g3-mc-q26",
        "nysed-2014-g3-mc-q28",
        "nysed-2014-g3-mc-q31",
        "nysed-2014-g3-mc-q41",
        "nysed-2014-g4-mc-q1",
        "nysed-2014-g4-mc-q11",
        "nysed-2014-g4-mc-q17",
        "nysed-2014-g4-mc-q27",
        "nysed-2014-g4-mc-q29",
        "nysed-2014-g4-mc-q31",
        "nysed-2014-g4-mc-q35",
        "nysed-2014-g4-mc-q42",
        "nysed-2014-g4-mc-q49",
        "nysed-2014-g5-mc-q7",
        "nysed-2014-g5-mc-q9",
        "nysed-2014-g5-mc-q10",
        "nysed-2014-g5-mc-q13",
        "nysed-2014-g5-mc-q16",
        "nysed-2014-g5-mc-q23",
        "nysed-2014-g5-mc-q33",
        "nysed-2014-g5-mc-q36",
        "nysed-2014-g5-mc-q40",
        "nysed-2014-g5-mc-q41",
        "nysed-2014-g5-mc-q43",
        "nysed-2014-g5-mc-q44",
        "nysed-2014-g5-mc-q49",
        "nysed-2014-g6-mc-q1",
        "nysed-2014-g6-mc-q10",
        "nysed-2014-g6-mc-q23",
        "nysed-2014-g6-mc-q25",
        "nysed-2014-g6-mc-q26",
        "nysed-2014-g6-mc-q27",
        "nysed-2014-g6-mc-q31",
        "nysed-2014-g6-mc-q37",
        "nysed-2014-g6-mc-q44",
        "nysed-2014-g6-mc-q47",
        "nysed-2014-g6-mc-q51",
        "nysed-2014-g6-mc-q52",
        "nysed-2014-g6-mc-q55",
        "nysed-2014-g7-mc-q1",
        "nysed-2014-g7-mc-q2",
        "nysed-2014-g7-mc-q4",
        "nysed-2014-g7-mc-q5",
        "nysed-2014-g7-mc-q7",
        "nysed-2014-g7-mc-q8",
        "nysed-2014-g7-mc-q11",
        "nysed-2014-g7-mc-q15",
        "nysed-2014-g7-mc-q17",
        "nysed-2014-g7-mc-q18",
        "nysed-2014-g7-mc-q20",
        "nysed-2014-g7-mc-q21",
        "nysed-2014-g7-mc-q23",
        "nysed-2014-g7-mc-q24",
        "nysed-2014-g7-mc-q27",
        "nysed-2014-g7-mc-q29",
        "nysed-2014-g8-mc-q1",
        "nysed-2014-g8-mc-q4",
        "nysed-2014-g8-mc-q6",
        "nysed-2014-g8-mc-q7",
        "nysed-2014-g8-mc-q9",
        "nysed-2014-g8-mc-q10",
        "nysed-2014-g8-mc-q12",
        "nysed-2014-g8-mc-q14",
        "nysed-2014-g8-mc-q19",
        "nysed-2014-g8-mc-q20",
        "nysed-2014-g8-mc-q21",
        "nysed-2014-g8-mc-q22",
        "nysed-2014-g8-mc-q23",
        "nysed-2014-g8-mc-q25",
    }
)
OFFICIAL_RATIONALE_SEMANTIC_CORRECTION_IDS = frozenset(
    {
        "nysed-2013-g4-mc-q8",
        "nysed-2013-g6-mc-q14",
        "nysed-2014-g4-mc-q29",
        "nysed-2014-g5-mc-q44",
        "nysed-2014-g7-mc-q1",
    }
)


class MathExplanationError(ValueError):
    """A rationale, explanation, provenance input, or sidecar is invalid."""


@dataclasses.dataclass(frozen=True)
class LocalizedMathExplanation:
    en: str
    es: str
    source: MathExplanationSource


@dataclasses.dataclass(frozen=True)
class OfficialMathRationaleOverride:
    raw_rationale_sha256: str
    text: str
    source: MathExplanationSource


@dataclasses.dataclass(frozen=True)
class MathQuestionExplanationInput:
    question_id: str
    alt_en: str
    alt_es: str | None
    correct: str
    primary_standard: str
    question_image_en_sha256: str
    question_image_es_sha256: str | None
    secondary_standards: tuple[str, ...] = ()
    policy_version: str = MATH_EXPLANATION_POLICY_VERSION

    @classmethod
    def create(
        cls,
        *,
        question_id: str,
        alt_en: str,
        alt_es: str | None,
        correct: str,
        primary_standard: str,
        question_image_en_sha256: str,
        question_image_es_sha256: str | None,
        secondary_standards: Sequence[str] = (),
        policy_version: str = MATH_EXPLANATION_POLICY_VERSION,
    ) -> "MathQuestionExplanationInput":
        return cls(
            question_id=question_id,
            alt_en=alt_en,
            alt_es=alt_es,
            correct=correct,
            primary_standard=primary_standard,
            question_image_en_sha256=question_image_en_sha256,
            question_image_es_sha256=question_image_es_sha256,
            secondary_standards=tuple(secondary_standards),
            policy_version=policy_version,
        )


def normalize_math_explanation_text(value: str) -> str:
    if not isinstance(value, str):
        raise TypeError("Math explanation text must be a string")
    # Compatibility normalization rewrites mathematical superscripts into
    # baseline digits (for example, 12²⁰ becomes 1220).  Preserve authored and
    # official notation while still composing canonically equivalent text.
    normalized = unicodedata.normalize("NFC", value)
    normalized = "".join(
        " " if unicodedata.category(character).startswith("C") else character
        for character in normalized
    )
    return re.sub(r"\s+", " ", normalized).strip()


def _normalize_pinned_question_input_text(value: str, *, label: str) -> str:
    """Retain the established compatibility-normalized explanation input hash."""

    if not isinstance(value, str):
        raise TypeError(f"{label} must be a string")
    normalized = unicodedata.normalize("NFKC", value)
    normalized = "".join(
        " " if unicodedata.category(character).startswith("C") else character
        for character in normalized
    )
    normalized = re.sub(r"\s+", " ", normalized).strip()
    if not normalized:
        raise MathExplanationError(f"{label} must not be empty")
    return normalized


def _annotation_text(value: str) -> str:
    if not isinstance(value, str):
        raise TypeError("Official annotation block must be a string")
    normalized = unicodedata.normalize("NFC", value).replace("\r", "\n").replace("\f", "\n")
    return "\n".join(re.sub(r"[ \t]+", " ", line).strip() for line in normalized.splitlines())


def _choice(value: str, *, label: str) -> str:
    if not isinstance(value, str):
        raise TypeError(f"{label} must be a string")
    normalized = value.strip().upper()
    if normalized not in _CHOICES:
        raise MathExplanationError(f"{label} must be A, B, C, or D")
    return normalized


def extract_official_math_rationale(block_text: str, key: str) -> str:
    """Extract the correct answer-choice paragraph from an Extended Rationale."""

    expected = _choice(key, label="Answer key")
    annotation = _annotation_text(block_text)
    headings = list(_ANSWER_CHOICE_HEADING_RE.finditer(annotation))
    matches = [heading for heading in headings if heading.group("key").upper() == expected]
    if len(matches) != 1:
        raise MathExplanationError(
            f"Official annotation must contain exactly one Answer Choice {expected} rationale; "
            f"found {len(matches)}"
        )
    heading = matches[0]
    next_heading = next((candidate for candidate in headings if candidate.start() > heading.start()), None)
    summary = _ANSWER_CHOICES_SUMMARY_RE.search(annotation, heading.end())
    ends = [candidate.start() for candidate in (next_heading, summary) if candidate is not None]
    rationale = normalize_math_explanation_text(annotation[heading.end() : min(ends, default=len(annotation))])
    if sum(character.isalnum() for character in rationale) < 32:
        raise MathExplanationError("Official correct-choice rationale is missing or not substantive")
    return rationale


def _required(value: str, *, label: str, flatten: bool = False) -> str:
    if not isinstance(value, str):
        raise TypeError(f"{label} must be a string")
    normalized = normalize_math_explanation_text(value) if flatten else unicodedata.normalize("NFC", value).strip()
    if not normalized:
        raise MathExplanationError(f"{label} must not be empty")
    return normalized


def _optional(value: str | None, *, label: str, flatten: bool = False) -> str | None:
    if value is None:
        return None
    return _required(value, label=label, flatten=flatten)


def _sha(value: str, *, label: str) -> str:
    if not isinstance(value, str):
        raise TypeError(f"{label} must be a string")
    normalized = value.strip().lower()
    if not _SHA256_RE.fullmatch(normalized):
        raise MathExplanationError(f"{label} must be a SHA-256 hex digest")
    return normalized


def math_question_explanation_input_hash(value: MathQuestionExplanationInput) -> str:
    if not isinstance(value, MathQuestionExplanationInput):
        raise TypeError("value must be a MathQuestionExplanationInput")
    primary = _required(value.primary_standard, label="Primary standard")
    secondary = [_required(item, label="Secondary standard") for item in value.secondary_standards]
    if primary in secondary or len(secondary) != len(set(secondary)):
        raise MathExplanationError("Question standards must be unique")
    image_es = None
    if value.question_image_es_sha256 is not None:
        image_es = _sha(value.question_image_es_sha256, label="Spanish question image SHA-256")
    payload = {
        "questionId": _required(value.question_id, label="Question id"),
        "questionAlt": {
            "en": _normalize_pinned_question_input_text(
                value.alt_en,
                label="English question alt",
            ),
            "es": (
                _normalize_pinned_question_input_text(
                    value.alt_es,
                    label="Spanish question alt",
                )
                if value.alt_es is not None
                else None
            ),
        },
        "correct": _choice(value.correct, label="Correct choice"),
        "standards": {"primary": primary, "secondary": secondary},
        "assets": {
            "en": _sha(value.question_image_en_sha256, label="English question image SHA-256"),
            "es": image_es,
        },
        "policyVersion": _required(value.policy_version, label="Policy version"),
    }
    encoded = json.dumps(payload, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")
    return hashlib.sha256(encoded).hexdigest()


def _validate_text(value: Any, *, question_id: str, language: str, source: str) -> str:
    if not isinstance(value, str):
        raise MathExplanationError(f"{language} explanation for {question_id} must be a string")
    text = normalize_math_explanation_text(value)
    if not 55 <= len(text) <= 1_000:
        raise MathExplanationError(f"{language} explanation for {question_id} must be 55-1000 characters")
    words = re.findall(r"[^\W_]+(?:['’][^\W_]+)?|\d+", text, flags=re.UNICODE)
    if len(words) < 9 or sum(character.isalnum() for character in text) < 40:
        raise MathExplanationError(f"{language} explanation for {question_id} is not substantive")
    if _GENERIC_RE.search(text):
        raise MathExplanationError(f"{language} explanation for {question_id} merely cites an answer key")
    if source == "vine-authored":
        pattern = _EN_REASONING_RE if language == "English" else _ES_REASONING_RE
        if not pattern.search(text):
            raise MathExplanationError(f"{language} explanation for {question_id} lacks mathematical reasoning")
    return text


def _exact_keys(value: Any, expected: set[str], *, label: str) -> dict[str, Any]:
    if not isinstance(value, dict):
        raise MathExplanationError(f"{label} must be a JSON object")
    actual = set(value)
    if actual != expected:
        raise MathExplanationError(
            f"{label} keys changed; missing={sorted(expected - actual)}, "
            f"unexpected={sorted(actual - expected)}"
        )
    return value


def validate_math_question_explanation(value: Any, *, question_id: str) -> LocalizedMathExplanation:
    record = _exact_keys(value, {"text", "source"}, label=f"Explanation for {question_id}")
    source = record["source"]
    if source not in _SOURCES:
        raise MathExplanationError(f"Explanation source for {question_id} is invalid")
    localized = _exact_keys(record["text"], {"en", "es"}, label=f"Localized explanation for {question_id}")
    return LocalizedMathExplanation(
        en=_validate_text(localized["en"], question_id=question_id, language="English", source=source),
        es=_validate_text(localized["es"], question_id=question_id, language="Spanish", source=source),
        source=source,
    )


def official_math_rationale_extraction_hash(value: str) -> str:
    """Hash the exact normalized extraction an override was reviewed against."""

    normalized = normalize_math_explanation_text(value)
    if not normalized:
        raise MathExplanationError("Official rationale extraction must not be empty")
    return hashlib.sha256(normalized.encode("utf-8")).hexdigest()


def validate_official_math_rationale_overrides(
    value: Any,
    *,
    expected_question_ids: frozenset[str] = OFFICIAL_RATIONALE_OVERRIDE_QUESTION_IDS,
) -> dict[str, OfficialMathRationaleOverride]:
    """Validate exact repair coverage and provenance for known NYSED defects."""

    document = _exact_keys(
        value,
        {"schemaVersion", "policyVersion", "questions"},
        label="Official math rationale override document",
    )
    if document["schemaVersion"] != MATH_OFFICIAL_RATIONALE_OVERRIDE_SCHEMA_VERSION:
        raise MathExplanationError("Official rationale override schemaVersion is invalid")
    if document["policyVersion"] != MATH_OFFICIAL_RATIONALE_OVERRIDE_POLICY_VERSION:
        raise MathExplanationError("Official rationale override policyVersion is invalid")
    questions = document["questions"]
    if not isinstance(questions, dict):
        raise MathExplanationError("Official rationale override questions must be an object")
    actual_ids = set(questions)
    if actual_ids != set(expected_question_ids):
        raise MathExplanationError(
            "Official rationale override coverage changed; "
            f"missing={sorted(set(expected_question_ids) - actual_ids)}, "
            f"orphaned={sorted(actual_ids - set(expected_question_ids))}"
        )

    result: dict[str, OfficialMathRationaleOverride] = {}
    for question_id in sorted(expected_question_ids):
        item = _exact_keys(
            questions[question_id],
            {"rawRationaleSha256", "text", "source"},
            label=f"Official rationale override for {question_id}",
        )
        source = item["source"]
        expected_source = (
            "official-nysed-corrected"
            if question_id in OFFICIAL_RATIONALE_SEMANTIC_CORRECTION_IDS
            else "official-nysed"
        )
        if source != expected_source:
            raise MathExplanationError(
                f"Official rationale override {question_id} must use {expected_source} provenance"
            )
        text = _validate_text(
            item["text"],
            question_id=question_id,
            language="English",
            source=source,
        )
        result[question_id] = OfficialMathRationaleOverride(
            raw_rationale_sha256=_sha(
                item["rawRationaleSha256"],
                label=f"Raw rationale SHA-256 for {question_id}",
            ),
            text=text,
            source=source,
        )
    return result


def load_official_math_rationale_overrides(
    path: Path = DEFAULT_MATH_OFFICIAL_RATIONALE_OVERRIDES,
) -> dict[str, OfficialMathRationaleOverride]:
    try:
        value = json.loads(
            Path(path).read_text(encoding="utf-8"),
            object_pairs_hook=_reject_duplicate_keys,
        )
    except MathExplanationError:
        raise
    except (OSError, json.JSONDecodeError, UnicodeError) as exc:
        raise MathExplanationError(
            f"Could not read official math rationale overrides: {exc}"
        ) from exc
    return validate_official_math_rationale_overrides(value)


def resolve_official_math_rationale(
    *,
    question_id: str,
    raw_rationale: str,
    overrides: Mapping[str, OfficialMathRationaleOverride],
) -> LocalizedMathExplanation:
    """Apply a reviewed repair only when the source extraction still matches."""

    normalized = normalize_math_explanation_text(raw_rationale)
    override = overrides.get(question_id)
    if override is None:
        text = _validate_text(
            normalized,
            question_id=question_id,
            language="English",
            source="official-nysed",
        )
        return LocalizedMathExplanation(en=text, es=text, source="official-nysed")
    actual_hash = official_math_rationale_extraction_hash(normalized)
    if actual_hash != override.raw_rationale_sha256:
        raise MathExplanationError(
            f"Official rationale extraction changed for {question_id}; "
            "the reviewed repair must be re-audited"
        )
    return LocalizedMathExplanation(
        en=override.text,
        es=override.text,
        source=override.source,
    )


def validate_math_exam_explanation_sidecar(
    value: Any,
    *,
    exam_id: str,
    expected_input_hashes: Mapping[str, str],
) -> dict[str, LocalizedMathExplanation]:
    expected_exam_id = _required(exam_id, label="Exam id")
    expected_hashes = {question_id: _sha(digest, label=f"Expected hash for {question_id}") for question_id, digest in expected_input_hashes.items()}
    if not expected_hashes:
        raise MathExplanationError("Expected question coverage must not be empty")
    document = _exact_keys(
        value,
        {"schemaVersion", "policyVersion", "examId", "questions"},
        label="Math explanation sidecar",
    )
    if document["schemaVersion"] != MATH_EXPLANATION_SIDECAR_SCHEMA_VERSION:
        raise MathExplanationError("Math explanation sidecar schemaVersion is invalid")
    if document["policyVersion"] != MATH_EXPLANATION_POLICY_VERSION:
        raise MathExplanationError("Math explanation sidecar policyVersion is invalid")
    if document["examId"] != expected_exam_id:
        raise MathExplanationError("Math explanation sidecar examId does not match")
    questions = document["questions"]
    if not isinstance(questions, dict):
        raise MathExplanationError("Math explanation sidecar questions must be an object")
    missing = sorted(set(expected_hashes) - set(questions))
    orphaned = sorted(set(questions) - set(expected_hashes))
    if missing or orphaned:
        raise MathExplanationError(
            f"Math explanation coverage changed; missing={missing}, orphaned={orphaned}"
        )
    result: dict[str, LocalizedMathExplanation] = {}
    for question_id, expected_hash in expected_hashes.items():
        item = _exact_keys(
            questions[question_id],
            {"inputHash", "explanation"},
            label=f"Explanation record for {question_id}",
        )
        if _sha(item["inputHash"], label=f"Input hash for {question_id}") != expected_hash:
            raise MathExplanationError(f"Math explanation input hash mismatch for {question_id}")
        explanation = validate_math_question_explanation(item["explanation"], question_id=question_id)
        if explanation.source != "vine-authored":
            raise MathExplanationError(f"Sidecar explanation {question_id} must be Vine-authored")
        result[question_id] = explanation
    return result


def _reject_duplicate_keys(pairs: list[tuple[str, Any]]) -> dict[str, Any]:
    result: dict[str, Any] = {}
    for key, value in pairs:
        if key in result:
            raise MathExplanationError(f"Duplicate JSON key in math explanation sidecar: {key}")
        result[key] = value
    return result


def math_explanation_sidecar_path(
    year: int,
    grade: int,
    *,
    root: Path = DEFAULT_MATH_EXPLANATIONS_ROOT,
) -> Path:
    if not isinstance(year, int) or isinstance(year, bool) or not 2000 <= year <= 2100:
        raise MathExplanationError("Math explanation year is invalid")
    if not isinstance(grade, int) or isinstance(grade, bool) or grade not in range(3, 9):
        raise MathExplanationError("Math explanation grade is invalid")
    return Path(root) / f"{year}-grade-{grade}.json"


def load_math_exam_explanations(
    *,
    year: int,
    grade: int,
    exam_id: str,
    expected_input_hashes: Mapping[str, str],
    root: Path = DEFAULT_MATH_EXPLANATIONS_ROOT,
) -> dict[str, LocalizedMathExplanation]:
    path = math_explanation_sidecar_path(year, grade, root=root)
    try:
        value = json.loads(path.read_text(encoding="utf-8"), object_pairs_hook=_reject_duplicate_keys)
    except MathExplanationError:
        raise
    except (OSError, json.JSONDecodeError, UnicodeError) as exc:
        raise MathExplanationError(f"Could not read math explanation sidecar {path.name}: {exc}") from exc
    return validate_math_exam_explanation_sidecar(
        value,
        exam_id=exam_id,
        expected_input_hashes=expected_input_hashes,
    )

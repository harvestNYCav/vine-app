#!/usr/bin/env python3
"""Hash-pinned, human-reviewed accessibility descriptions for NYSED math."""

from __future__ import annotations

import hashlib
import json
import re
import unicodedata
from pathlib import Path
from typing import Any, Mapping, Sequence


MATH_ACCESSIBILITY_POLICY_VERSION = "math-accessibility-1"
MATH_ACCESSIBILITY_SIDECAR_SCHEMA_VERSION = 1
DEFAULT_MATH_ACCESSIBILITY_ROOT = (
    Path(__file__).resolve().parents[1] / "content" / "math-exams" / "accessibility"
)

_SHA256_RE = re.compile(r"^[0-9a-f]{64}$")
_CHOICE_LABEL_RE = re.compile(r"(?<![A-Za-z0-9])(?P<label>[ABCD])\s*:")
_QUESTION_PREFIX = {"en": "Question", "es": "Pregunta"}
_OCR_ARTIFACT_RE = re.compile(
    r"(?:\ufffd|"
    r"(?<![A-Za-z])Cc(?![A-Za-z])|"
    r"(?<![A-Za-z])gp(?![A-Za-z])|"
    r"(?<![A-Za-z])[A-D]\s+[A-D](?:\s+[A-D]){1,2}(?![A-Za-z]))",
)
_ANSWER_LEAK_RE = re.compile(
    r"\b(?:the\s+)?(?:correct\s+(?:answer|choice)|answer\s+is|respuesta\s+correcta|"
    r"opci[oó]n\s+correcta)\b",
    re.IGNORECASE,
)
_EVALUATIVE_CHOICE_RE = re.compile(
    r"\b(?:mislabel(?:ed|led)|incorrect(?:ly)?|wrong|correct(?:ly)?|"
    r"(?:choice|option)\s+[A-D]\s+is\s+(?:the\s+)?(?:right|best|accurate)|"
    r"(?:the\s+)?(?:right|best|accurate)\s+(?:answer|response|choice)\s+is\s+[A-D]|"
    r"etiquetad[ao]\s+incorrectamente|incorrect[ao]s?|equivocad[ao]s?|correct[ao]s?|"
    r"(?:la\s+)?opci[oó]n\s+[A-D]\s+es\s+(?:la\s+)?(?:mejor|adecuada)|"
    r"(?:la\s+)?(?:mejor|adecuada)\s+respuesta\s+es\s+[A-D])\b",
    re.IGNORECASE,
)
_LOCAL_FILESYSTEM_PATH_RE = re.compile(
    r"(?:file://|/(?:Users|home|private|tmp|root|workspace|workspaces|var)/|"
    r"[A-Za-z]:\\|\\\\[^\\\s]+\\[^\\\s]+)",
    re.IGNORECASE,
)
_UNREVIEWED_RE = re.compile(
    r"(?:visual\s+review\s+required|shown\s+in\s+(?:the\s+)?image|"
    r"see\s+(?:the\s+)?(?:image|diagram)|described\s+above|"
    r"cropped\s+out|cut\s+off|outside\s+(?:the\s+)?crop|"
    r"beyond\s+(?:the\s+)?(?:crop|lower\s+boundary)|"
    r"not\s+(?:legible|readable|visible)|"
    r"no\s+(?:wording|text|content|value)\s+is\s+(?:legible|readable|visible)|"
    r"(?:text|value|wording|(?:choice|option)(?:\s+[A-D])?)\s+(?:is|appears)\s+"
    r"(?:overprinted|garbled)|"
    r"(?:overprinted|garbled)\s+(?:text|value|choice|option|wording)|"
    r"(?:choice|option)\s+(?:[A-D]\s+)?is\s+missing|"
    r"does\s+not\s+appear\s+(?:inside|within)|"
    r"fuera\s+(?:de\s+los\s+l[ií]mites\s+)?del\s+recorte|"
    r"fuera\s+del\s+l[ií]mite\s+inferior|\brecortad[ao]s?\b|"
    r"(?:el|la)\s+(?:texto|valor|opci[oó]n)\s+(?:est[aá]|aparece)\s+"
    r"(?:superpuest[ao]|ilegible)|"
    r"no\s+(?:es\s+)?legible|no\s+es\s+visible|"
    r"no\s+aparece\s+(?:dentro|en)|"
    r"(?:la\s+)?opci[oó]n\s+(?:[A-D]\s+)?(?:falta|no\s+aparece))",
    re.IGNORECASE,
)
_MISSING_FI_EN_RE = re.compile(
    r"\b(?:nding|gure|gures|rst|oor|oors|ower|owers)\b",
    re.IGNORECASE,
)
_MISSING_FI_ES_RE = re.compile(
    r"\b(?:a\s+rmaci[oó]n|gura|guras|nal|nales)\b",
    re.IGNORECASE,
)
_REVERSED_AXIS_RE = re.compile(r"srewolF\s+fo\s+rebmuN", re.IGNORECASE)
_VERIFIED_THREE_CHOICE_QUESTION_ID = "nysed-2016-g4-mc-q24"
_VERIFIED_SINGLE_LETTER_CHOICE_QUESTION_IDS = frozenset(
    {"nysed-2017-g4-mc-q27", "nysed-2018-g4-mc-q31"}
)
_SUPPORTED_GRADES = frozenset(range(3, 9))
_NON_SUBSTANTIVE_CHOICE_RE = re.compile(
    r"^(?:[A-D]|(?:choice|option|opci[oó]n)\s*[A-D]|"
    r"(?:visual|graph|figure|diagram|table|image|imagen|gr[aá]fica|figura|diagrama|tabla)\s*"
    r"(?:choice|option|opci[oó]n)?\s*[A-D]?)$",
    re.IGNORECASE,
)


class MathAccessibilityError(ValueError):
    """A reviewed accessibility sidecar or description is invalid."""


def normalize_math_accessibility_text(value: str) -> str:
    if not isinstance(value, str):
        raise TypeError("Math accessibility description must be a string")
    # Compatibility normalization destroys mathematical semantics (for example,
    # 12² becomes 122). Canonical normalization composes accents while keeping
    # superscripts, subscripts, vulgar fractions, and operators intact.
    normalized = unicodedata.normalize("NFC", value)
    if any(
        unicodedata.category(character) in {"Co", "Cs"}
        or (
            unicodedata.category(character) == "Cc"
            and character not in {"\t", "\n", "\r"}
        )
        for character in normalized
    ):
        raise MathAccessibilityError(
            "Math accessibility description contains unsafe control or private-use characters"
        )
    return re.sub(r"\s+", " ", normalized).strip()


def _sha(value: Any, *, label: str) -> str:
    if not isinstance(value, str) or not _SHA256_RE.fullmatch(value.strip().lower()):
        raise MathAccessibilityError(f"{label} must be a SHA-256 hex digest")
    return value.strip().lower()


def _exact_mapping(value: Any, expected: set[str], *, label: str) -> dict[str, Any]:
    if not isinstance(value, dict):
        raise MathAccessibilityError(f"{label} must be a JSON object")
    if set(value) != expected:
        raise MathAccessibilityError(
            f"{label} keys changed; expected={sorted(expected)}, got={sorted(value)}"
        )
    return value


def math_accessibility_input_hash(
    *,
    question_id: str,
    number: int,
    image_sha256: Mapping[str, str],
    languages: Sequence[str],
    policy_version: str = MATH_ACCESSIBILITY_POLICY_VERSION,
) -> str:
    """Hash the exact localized image crops a description was reviewed against."""

    if not isinstance(question_id, str) or not question_id.strip():
        raise MathAccessibilityError("Accessibility question id must not be empty")
    if not isinstance(number, int) or isinstance(number, bool) or not 1 <= number <= 100:
        raise MathAccessibilityError("Accessibility question number is invalid")
    language_list = list(languages)
    if language_list not in (["en"], ["en", "es"]):
        raise MathAccessibilityError("Accessibility languages must be English or English and Spanish")
    if set(image_sha256) != set(language_list):
        raise MathAccessibilityError("Accessibility image hashes do not match localized coverage")
    payload = {
        "questionId": question_id.strip(),
        "number": number,
        "imageSha256": {
            language: _sha(image_sha256[language], label=f"{language} image SHA-256")
            for language in language_list
        },
        "languages": language_list,
        "policyVersion": policy_version,
    }
    encoded = json.dumps(payload, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode(
        "utf-8"
    )
    return hashlib.sha256(encoded).hexdigest()


def validate_math_accessibility_description(
    value: Any,
    *,
    question_id: str,
    number: int,
    language: str,
    allow_verbatim_choice_evaluation: bool = False,
    allow_verbatim_stem_answer_language: bool = False,
    allow_verbatim_short_question: bool = False,
    allow_verbatim_single_letter_choices: bool = False,
    expected_choice_labels: Sequence[str] = ("A", "B", "C", "D"),
    required_source_tokens: Sequence[str] = (),
) -> str:
    if language not in _QUESTION_PREFIX:
        raise MathAccessibilityError(f"Unsupported accessibility language {language!r}")
    if not isinstance(value, str):
        raise MathAccessibilityError(
            f"{language} accessibility description for {question_id} must be a string"
        )
    text = normalize_math_accessibility_text(value)
    minimum_description_length = 50 if allow_verbatim_short_question else 80
    if not minimum_description_length <= len(text) <= 6_000:
        raise MathAccessibilityError(
            f"{language} accessibility description for {question_id} must be "
            f"{minimum_description_length}-6000 characters"
        )
    expected_prefix = f"{_QUESTION_PREFIX[language]} {number}."
    if not text.startswith(expected_prefix):
        raise MathAccessibilityError(
            f"{language} accessibility description for {question_id} must start with {expected_prefix!r}"
        )
    localized_choice_heading = "Choices:" if language == "en" else "Opciones:"
    other_choice_heading = "Opciones:" if language == "en" else "Choices:"
    if text.count(localized_choice_heading) != 1 or other_choice_heading in text:
        raise MathAccessibilityError(
            f"{language} accessibility description for {question_id} must use one localized "
            f"{localized_choice_heading!r} heading"
        )
    stem = text[len(expected_prefix) : text.index(localized_choice_heading)].strip()
    minimum_stem_characters = 8 if allow_verbatim_short_question else 12
    if len(re.sub(r"[^A-Za-zÀ-ÿ0-9]", "", stem)) < minimum_stem_characters:
        raise MathAccessibilityError(
            f"{language} accessibility description for {question_id} lacks a substantive question stem"
        )
    choice_labels = list(expected_choice_labels)
    if choice_labels not in (["A", "B", "C"], ["A", "B", "C", "D"]):
        raise MathAccessibilityError("Math accessibility choice labels are invalid")
    choices_text = text[text.index(localized_choice_heading) + len(localized_choice_heading) :]
    labels = [
        match.group("label").upper() for match in _CHOICE_LABEL_RE.finditer(choices_text)
    ]
    if labels != choice_labels:
        raise MathAccessibilityError(
            f"{language} accessibility description for {question_id} must contain exactly one ordered "
            f"{', '.join(f'{label}:' for label in choice_labels)} choice transcription"
        )
    choice_matches = list(_CHOICE_LABEL_RE.finditer(choices_text))
    for index, match in enumerate(choice_matches):
        body = choices_text[
            match.end() : choice_matches[index + 1].start()
            if index + 1 < len(choice_matches)
            else len(choices_text)
        ].strip(" \t\n\r.;,:-")
        source_is_single_letter = bool(re.fullmatch(r"[A-Z]", body))
        if (
            not body
            or not any(character.isalnum() for character in body)
            or (
                _NON_SUBSTANTIVE_CHOICE_RE.fullmatch(body)
                and not (
                    allow_verbatim_single_letter_choices
                    and source_is_single_letter
                )
            )
        ):
            raise MathAccessibilityError(
                f"{language} accessibility description for {question_id} has a bare or generic "
                f"choice {match.group('label').upper()}"
            )
    if _ANSWER_LEAK_RE.search(choices_text) or (
        _ANSWER_LEAK_RE.search(stem) and not allow_verbatim_stem_answer_language
    ):
        raise MathAccessibilityError(
            f"{language} accessibility description for {question_id} leaks grading information"
        )
    if _EVALUATIVE_CHOICE_RE.search(choices_text) and not allow_verbatim_choice_evaluation:
        raise MathAccessibilityError(
            f"{language} accessibility description for {question_id} evaluates a choice instead of describing it"
        )
    if _OCR_ARTIFACT_RE.search(text):
        raise MathAccessibilityError(
            f"{language} accessibility description for {question_id} contains a known OCR artifact"
        )
    if _UNREVIEWED_RE.search(text):
        raise MathAccessibilityError(
            f"{language} accessibility description for {question_id} contains generic visual fallback text"
        )
    if _LOCAL_FILESYSTEM_PATH_RE.search(text):
        raise MathAccessibilityError(
            f"{language} accessibility description for {question_id} exposes a local filesystem path"
        )
    body = text[len(expected_prefix) :].lstrip()
    if re.match(rf"(?:00|{number})\b", body):
        raise MathAccessibilityError(
            f"{language} accessibility description for {question_id} repeats a crop marker or question number"
        )
    missing_fi_pattern = _MISSING_FI_EN_RE if language == "en" else _MISSING_FI_ES_RE
    if missing_fi_pattern.search(text) or _REVERSED_AXIS_RE.search(text):
        raise MathAccessibilityError(
            f"{language} accessibility description for {question_id} contains damaged extracted words"
        )
    minimum_total_characters = 40 if allow_verbatim_short_question else 50
    if sum(character.isalnum() for character in text) < minimum_total_characters:
        raise MathAccessibilityError(
            f"{language} accessibility description for {question_id} is not substantive"
        )
    if not isinstance(required_source_tokens, (list, tuple)) or any(
        not isinstance(token, str) or not token.strip() for token in required_source_tokens
    ):
        raise MathAccessibilityError(
            f"{language} required source tokens for {question_id} are invalid"
        )
    normalized_required_tokens = [
        normalize_math_accessibility_text(token) for token in required_source_tokens
    ]
    if len(normalized_required_tokens) != len(set(normalized_required_tokens)):
        raise MathAccessibilityError(
            f"{language} required source tokens for {question_id} contain duplicates"
        )
    missing_tokens = [token for token in normalized_required_tokens if token not in text]
    if missing_tokens:
        raise MathAccessibilityError(
            f"{language} accessibility description for {question_id} changed a source-pinned "
            f"coordinate, inequality, or operator token: {missing_tokens}"
        )
    return text


def math_accessibility_sidecar_path(
    year: int,
    grade: int,
    *,
    root: Path = DEFAULT_MATH_ACCESSIBILITY_ROOT,
) -> Path:
    if year < 2013 or year > 2100 or grade not in _SUPPORTED_GRADES:
        raise MathAccessibilityError("Accessibility sidecar year or grade is invalid")
    return root / f"{year}-grade-{grade}.json"


def _load_json_no_duplicates(path: Path) -> Any:
    def pairs(values: list[tuple[str, Any]]) -> dict[str, Any]:
        result: dict[str, Any] = {}
        for key, value in values:
            if key in result:
                raise MathAccessibilityError(
                    f"Duplicate JSON key in math accessibility sidecar: {key}"
                )
            result[key] = value
        return result

    return json.loads(path.read_text(encoding="utf-8"), object_pairs_hook=pairs)


def load_math_exam_accessibility(
    *,
    year: int,
    grade: int,
    exam_id: str,
    languages: Sequence[str],
    expected_input_hashes: Mapping[str, str],
    expected_numbers: Mapping[str, int],
    root: Path = DEFAULT_MATH_ACCESSIBILITY_ROOT,
) -> dict[str, dict[str, str]]:
    """Load one exact-coverage, crop-hash-pinned accessibility sidecar."""

    path = math_accessibility_sidecar_path(year, grade, root=root)
    try:
        record = _exact_mapping(
            _load_json_no_duplicates(path),
            {"schemaVersion", "policyVersion", "examId", "languages", "questions"},
            label="Math accessibility sidecar",
        )
    except OSError as exc:
        raise MathAccessibilityError(f"Could not read math accessibility sidecar {path.name}: {exc}") from exc
    if record["schemaVersion"] != MATH_ACCESSIBILITY_SIDECAR_SCHEMA_VERSION:
        raise MathAccessibilityError("Math accessibility sidecar schemaVersion is invalid")
    if record["policyVersion"] != MATH_ACCESSIBILITY_POLICY_VERSION:
        raise MathAccessibilityError("Math accessibility sidecar policyVersion is invalid")
    if record["examId"] != exam_id:
        raise MathAccessibilityError("Math accessibility sidecar examId does not match")
    language_list = list(languages)
    if record["languages"] != language_list:
        raise MathAccessibilityError("Math accessibility sidecar language coverage changed")
    questions = record["questions"]
    if not isinstance(questions, dict):
        raise MathAccessibilityError("Math accessibility sidecar questions must be an object")
    expected_ids = set(expected_input_hashes)
    if set(questions) != expected_ids or set(expected_numbers) != expected_ids:
        raise MathAccessibilityError(
            "Math accessibility coverage changed; "
            f"missing={sorted(expected_ids - set(questions))}, "
            f"orphaned={sorted(set(questions) - expected_ids)}"
        )

    result: dict[str, dict[str, str]] = {}
    for question_id in sorted(expected_ids):
        raw_item = questions[question_id]
        if not isinstance(raw_item, dict):
            raise MathAccessibilityError(
                f"Math accessibility entry for {question_id} must be a JSON object"
            )
        allowed_evaluation = raw_item.get("verbatimEvaluativeChoices", False)
        if "verbatimEvaluativeChoices" in raw_item and allowed_evaluation is not True:
            raise MathAccessibilityError(
                f"verbatimEvaluativeChoices for {question_id} must be true when present"
            )
        if question_id == _VERIFIED_THREE_CHOICE_QUESTION_ID:
            if raw_item.get("verbatimThreeChoices") is not True:
                raise MathAccessibilityError(
                    f"verbatimThreeChoices for {question_id} must be true"
                )
            verbatim_three_choices = True
        elif "verbatimThreeChoices" in raw_item:
            raise MathAccessibilityError(
                "verbatimThreeChoices is only permitted for "
                f"{_VERIFIED_THREE_CHOICE_QUESTION_ID}"
            )
        else:
            verbatim_three_choices = False
        verbatim_stem_answer_language = raw_item.get(
            "verbatimAnswerLanguageInStem", False
        )
        if (
            "verbatimAnswerLanguageInStem" in raw_item
            and verbatim_stem_answer_language is not True
        ):
            raise MathAccessibilityError(
                f"verbatimAnswerLanguageInStem for {question_id} must be true when present"
            )
        verbatim_short_question = raw_item.get("verbatimShortQuestion", False)
        if "verbatimShortQuestion" in raw_item and verbatim_short_question is not True:
            raise MathAccessibilityError(
                f"verbatimShortQuestion for {question_id} must be true when present"
            )
        if question_id in _VERIFIED_SINGLE_LETTER_CHOICE_QUESTION_IDS:
            if raw_item.get("verbatimSingleLetterChoices") is not True:
                raise MathAccessibilityError(
                    f"verbatimSingleLetterChoices for {question_id} must be true"
                )
            verbatim_single_letter_choices = True
        elif "verbatimSingleLetterChoices" in raw_item:
            raise MathAccessibilityError(
                "verbatimSingleLetterChoices is only permitted for audited IDs "
                f"{sorted(_VERIFIED_SINGLE_LETTER_CHOICE_QUESTION_IDS)}"
            )
        else:
            verbatim_single_letter_choices = False
        raw_required_source_tokens = raw_item.get("requiredSourceTokens")
        if raw_required_source_tokens is not None:
            required_source_tokens = _exact_mapping(
                raw_required_source_tokens,
                set(language_list),
                label=f"Required source tokens for {question_id}",
            )
            if any(
                not isinstance(required_source_tokens[language], list)
                or not required_source_tokens[language]
                for language in language_list
            ):
                raise MathAccessibilityError(
                    f"Required source tokens for {question_id} must contain non-empty localized lists"
                )
        else:
            required_source_tokens = {language: [] for language in language_list}
        expected_item_keys = {"inputHash", "description"}
        if allowed_evaluation is True:
            expected_item_keys.add("verbatimEvaluativeChoices")
        if verbatim_three_choices is True:
            expected_item_keys.add("verbatimThreeChoices")
        if verbatim_stem_answer_language is True:
            expected_item_keys.add("verbatimAnswerLanguageInStem")
        if verbatim_short_question is True:
            expected_item_keys.add("verbatimShortQuestion")
        if verbatim_single_letter_choices is True:
            expected_item_keys.add("verbatimSingleLetterChoices")
        if raw_required_source_tokens is not None:
            expected_item_keys.add("requiredSourceTokens")
        item = _exact_mapping(
            raw_item,
            expected_item_keys,
            label=f"Math accessibility entry for {question_id}",
        )
        if _sha(item["inputHash"], label=f"Accessibility input hash for {question_id}") != _sha(
            expected_input_hashes[question_id], label=f"Expected accessibility input hash for {question_id}"
        ):
            raise MathAccessibilityError(f"Math accessibility input hash mismatch for {question_id}")
        localized = _exact_mapping(
            item["description"],
            set(language_list),
            label=f"Localized accessibility description for {question_id}",
        )
        result[question_id] = {
            language: validate_math_accessibility_description(
                localized[language],
                question_id=question_id,
                number=expected_numbers[question_id],
                language=language,
                allow_verbatim_choice_evaluation=allowed_evaluation,
                allow_verbatim_stem_answer_language=verbatim_stem_answer_language,
                allow_verbatim_short_question=verbatim_short_question,
                allow_verbatim_single_letter_choices=verbatim_single_letter_choices,
                expected_choice_labels=("A", "B", "C")
                if verbatim_three_choices
                else ("A", "B", "C", "D"),
                required_source_tokens=required_source_tokens[language],
            )
            for language in language_list
        }
    return result

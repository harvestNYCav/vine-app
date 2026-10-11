"""Narrow checks for reviewed, student-facing text (not raw PDF extraction)."""

import re

# Match arithmetic, not compounds such as x-axis, 1/3-pound or 65-year-old.
# Do not replace every hyphen: punctuation and source wording remain legitimate.
ASCII_MATH_MINUS_RE = re.compile(
    r"(?<![\w])-(?=(?:\d|\(|[a-z]\b))"
    r"|(?<=[\w)²³⁴⁵⁶⁷⁸⁹⁰%°])\s+-\s+(?=[$\d(]|[a-z]\b)"
)


def validate_math_minus_signs(text: str, *, question_id: str) -> None:
    if ASCII_MATH_MINUS_RE.search(text):
        raise ValueError(f"ASCII hyphen used as a mathematical minus in {question_id}")


def validate_explanation_choice(text: str, *, correct: str, question_id: str) -> None:
    # Only the explicit positive rationale template, not mentions of distractors.
    for match in re.finditer(r"\bstudents? who choose\s+[\"'“‘]?([A-D])\b", text, re.I):
        if match[1].upper() != correct:
            raise ValueError(f"Explanation choice {match[1]} does not match key {correct} in {question_id}")

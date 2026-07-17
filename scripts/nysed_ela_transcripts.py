#!/usr/bin/env python3
"""Fail-closed, source-pinned accessible transcripts for NYSED ELA passages.

The released booklets are authoritative, but their text layers are uneven:
some pages contain clean selectable text, some use private-use ligatures, and
some are scans.  Transcript sidecars are therefore authored offline from the
exact booklet and stitched passage image, then checked into the repository.
The production importer only validates and attaches those reviewed sidecars;
it never silently re-OCRs a changed source.
"""

from __future__ import annotations

import dataclasses
import hashlib
import json
import re
import unicodedata
from pathlib import Path
from typing import Any, Iterable


REPO_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_SIDECAR_ROOT = REPO_ROOT / "content" / "ela-exams" / "transcripts"
DEFAULT_REVIEW_MANIFEST = REPO_ROOT / "content" / "ela-exams" / "transcript-review-manifest.json"
TRANSCRIPT_POLICY_VERSION = "ela-accessible-transcript-1"
TRANSCRIPT_GRADES = frozenset({3, 4, 5, 6, 7, 8})
EXPECTED_TRANSCRIPT_STIMULI = 242
EXPECTED_TRANSCRIPT_QUESTIONS = 1583
SOURCE_VALUES = frozenset(
    {
        "official-pdf-text",
        "mixed-official-pdf-text-and-ocr",
        "passage-image-ocr",
    }
)

# NYSED's embedded Minion/Garamond fonts use these private-use glyphs for
# common ligatures.  Dropping them changes words such as "That" and "after".
KNOWN_PDF_GLYPHS = {
    "\ue062": "Th",
    "\ue092": "fb",
    "\ue09d": "ft",
    "\ue0bb": "Th",
    "\ue117": "ft",
}

BOOKLET_CHROME_RE = re.compile(
    r"^(?:GO\s*ON|STOP|Session\s+\d+|Page\s+\d+(?:\s+.*)?|"
    r"Page\s+\d+\s+Session\s+\d+|Session\s+\d+\s+Page\s+\d+)\s*$",
    re.IGNORECASE,
)
BOOKLET_CHROME_INLINE_RE = re.compile(
    r"(?:\bSession\s+\d+\s+Page\s+\d+\b|"
    r"\bPage\s+\d+\s+Session\s+\d+\b)",
    re.IGNORECASE,
)
DIRECTION_RE = re.compile(r"^D\s*irections\s*$", re.IGNORECASE)
READ_QUESTIONS_RE = re.compile(
    r"^Read\s+this\s+(?:article|story|passage|poem|excerpt)\.\s*"
    r"Then\s+answer\s+questions\b.*$",
    re.IGNORECASE,
)
RELEASE_FOOTER_RE = re.compile(
    r"^(?:\d{1,3}\s+)?\d{4}\s+ELA\s+Grade\s+[3-8]\s+Released\s+Questions"
    r"(?:\s+\d{1,3})?$",
    re.IGNORECASE,
)
ANSWER_LEAK_RE = re.compile(
    r"(?:\bAnswer\s+Key\b|\bCorrect\s+(?:Answer|Response)\b|"
    r"\bCorrect\s+(?:Choice|Option)\s*(?::|\bis\b)\s*[A-D]\b|"
    r"\bWHY\s+CHOICE\b|\bScoring\s+Rubric\b|\bAnnotated\s+Item\b|"
    r"\b(?:Answer|Response|Key)\s*(?::|\bis\b)\s*[A-D]\b|"
    r"\b(?:Choice|Option)\s+[A-D]\s+(?:is|was|would\s+be)\s+"
    r"(?:correct|right|best|accurate)\b|"
    r"\b(?:Clave|Respuesta(?:\s+correcta)?)\s*(?::|\bes\b)\s*[A-D]\b|"
    r"\b(?:La\s+)?(?:opci[oó]n|alternativa|respuesta)\s+[A-D]\s+es\s+"
    r"(?:correcta|acertada|la\s+mejor)\b)",
    re.IGNORECASE,
)
KNOWN_OCR_CORRUPTION_RE = re.compile(
    r"(?:\bDivcions\b|\bcartt\b|\b[JT]\s+don['’]t\b|"
    r"\bT[’']{1,2}m\b|\bTt[’']?s\b|\bLam\s+responsible\b|"
    r"\byoud\b|=\s*=\s*SS\b|—{2}\s*=|"
    r"[“\"']ll\s+get\b|[:;][’'](?=\s|$)|‘(?:The|They)\b)",
    re.IGNORECASE,
)
# The 2017 embedded PDF font occasionally emits visible word fragments as
# separate text runs (for example, ``Th e``, ``fi eld``, and ``fl oor``). Keep
# this detector narrow enough to allow the genuine phrase ``sci-fi fishland``
# while failing closed on every source-reviewed split class found corpus-wide.
SPLIT_WORD_OCR_RE = re.compile(
    r"(?:\bTh\s+(?:e|at|en|ere|ese|ey|eir|is|ough)\b|"
    r"\b(?:Aft|aft)\s+(?:er|ernoon)\b|"
    r"\b(?:C\s+oral|F\s+ire|I\s+nterference|O\s+ne-Eyed)\b|"
    r"\b\d+f\s+rappé\b|"
    r"(?<!sci-)(?<!Sci-)\b[A-Za-z]*(?:fi|fl)\s+[a-z]+\b|"
    r"\b(?:stuff\s+ed|soft\s+en|drift\s+ed|heft\s+ing|"
    r"diff\s+erent|off\s+er|eff\s+ective|refl\s+ect)\b)"
)
DOUBLED_CHARACTER_TOKEN_RE = re.compile(r"\b[A-Za-z][A-Za-z-]*[A-Za-z]\b")
DOUBLED_CHARACTER_LAYOUT_RE = re.compile(r"(?:““|””|::|\bThThee\b|\b4400\b)")
ALLOWED_EXPRESSIVE_REPEAT_TOKENS = frozenset({"Snoozzzzzze", "go-rillllllas"})
SINGLE_CLOSING_QUOTE_RE = re.compile(r"[,!?\.]’")
# These source-reviewed fragments contain genuine closing single quotation
# marks nested inside double-quoted speech. Every other punctuation-plus-single-
# close sequence in the reviewed corpus is treated as an OCR substitution for a
# curly double quotation mark.
ALLOWED_NESTED_SINGLE_QUOTE_FRAGMENTS: dict[str, tuple[str, ...]] = {
    "nysed-ela-2014-g5-stimulus-15-21": (
        "which means ‘very small.’",
        "head ‘no,’ but",
    ),
    "nysed-ela-2015-g5-stimulus-8-13": (
        "‘We’ll all go this time.’ ”",
    ),
    "nysed-ela-2017-g8-stimulus-29-35": (
        "anymore.’ And I took",
        "‘Baby, yes, you can see.’ I said",
        "see with your hands.’ And then",
        "hands and your nose and your ears.’ ”",
    ),
    "nysed-ela-2019-g8-stimulus-29-35": (
        "‘new woman.’ She",
        "‘eternal feminine,’ who",
    ),
    "nysed-ela-2018-g7-stimulus-15-21": (
        "‘eat\nmore, eat more,’” explains",
    ),
    "nysed-ela-2021-g6-stimulus-8-14": (
        "that ‘nearby\nnature,’” Louv",
    ),
    "nysed-ela-2021-g7-stimulus-8-14": (
        "‘eat\nmore, eat more,’” explains",
    ),
    "nysed-ela-2021-g8-stimulus-22-28": (
        "‘new woman.’ She",
        "‘eternal feminine,’ who",
    ),
    "nysed-ela-2022-g6-stimulus-8-14": (
        "out where they go,’ ” remembers",
    ),
    "nysed-ela-2023-g7-stimulus-36-42": (
        "win the election.’\n3 “I",
        "the truth all this time.’ ”",
        "‘You were right.’ ”",
        "paper.’ ”",
    ),
    "nysed-ela-2023-g8-stimulus-29-35": (
        "‘What the . . .’ He",
        "excited.’\n_",
    ),
    "nysed-ela-2025-g6-stimulus-8-14": (
        "‘This is it!’ because",
    ),
    "nysed-ela-2026-g7-stimulus-29-35": (
        "animals. ‘That’s where you’re needed,’ he",
        "‘Mr. Zuo’s\nwaterwheels.’” Chengli",
    ),
    "nysed-ela-2017-g3-stimulus-25-31": ("‘you have to slow down.’ ”",),
    "nysed-ela-2019-g4-stimulus-19-24": ("Send him over.’ Then",),
    "nysed-ela-2023-g3-stimulus-26-31": ("‘thunderstorm,’ ”",),
    "nysed-ela-2025-g3-stimulus-1-6": ("‘Paint Out!’ Sounds",),
    "nysed-ela-2026-g3-stimulus-20-24": (
        "vote ‘no,’ there",
        "‘Save Our Zoo!’ with",
    ),
}
LOCAL_FILESYSTEM_PATH_RE = re.compile(
    r"(?:file://|/(?:Users|home|private|tmp|root|workspace|workspaces|var(?:/folders)?)/|"
    r"[A-Za-z]:\\|\\\\[^\\\s]+\\[^\\\s]+)",
    re.IGNORECASE,
)
SHA256_RE = re.compile(r"^[0-9a-f]{64}$")
# Some NYSED informational passages number a bulleted paragraph (for example,
# ``11 • Cross Country``). Keep the accepted prefix deliberately narrow: a
# marker must still be followed by prose punctuation/capitalization or the
# literal bullet printed in the booklet.
LEADING_NUMBER_RE = re.compile(
    r"^\s*(\d{1,3})\s+(?:[1-6]\.\s+)?(?=[A-Za-z“\"‘'•(\[])"
)
VISUAL_DESCRIPTION_RE = re.compile(
    r"^\[(?:Illustration|Diagram|Photograph|Map|Chart|Text box|Sidebar|Caption):\s+\S.+\]$",
    re.IGNORECASE,
)
REQUIRED_VISUAL_DESCRIPTION_COUNTS = {
    "nysed-ela-2014-g3-stimulus-1-4": 2,
    "nysed-ela-2014-g3-stimulus-10-16": 2,
    "nysed-ela-2014-g4-stimulus-12-17": 1,
    "nysed-ela-2017-g3-stimulus-19-24": 3,
    "nysed-ela-2017-g4-stimulus-25-31": 2,
    "nysed-ela-2018-g3-stimulus-1-6": 1,
    "nysed-ela-2019-g3-stimulus-7-12": 2,
    "nysed-ela-2019-g4-stimulus-13-18": 4,
    "nysed-ela-2021-g3-stimulus-7-12": 2,
    "nysed-ela-2023-g4-stimulus-26-31": 2,
    "nysed-ela-2024-g4-stimulus-1-6": 1,
    "nysed-ela-2024-g4-stimulus-26-31": 2,
    "nysed-ela-2025-g4-stimulus-1-6": 1,
    "nysed-ela-2026-g3-stimulus-13-19": 4,
    "nysed-ela-2026-g4-stimulus-26-31": 1,
    # Grade 5–8 descriptions are intentionally enumerated rather than inferred
    # from OCR. Nineteen descriptions are required by released multiple-choice
    # questions; six additional structured G5–6 visuals are preserved so the
    # full passage remains understandable outside the facsimile image.
    "nysed-ela-2014-g5-stimulus-8-14": 1,
    "nysed-ela-2014-g7-stimulus-13-19": 2,
    "nysed-ela-2015-g6-stimulus-1-7": 1,
    "nysed-ela-2015-g7-stimulus-1-7": 1,
    "nysed-ela-2015-g7-stimulus-15-21": 1,
    "nysed-ela-2016-g8-stimulus-36-42": 1,
    "nysed-ela-2017-g5-stimulus-1-7": 1,
    "nysed-ela-2017-g5-stimulus-36-42": 1,
    "nysed-ela-2018-g5-stimulus-29-35": 1,
    "nysed-ela-2018-g6-stimulus-29-35": 1,
    "nysed-ela-2019-g6-stimulus-29-35": 2,
    "nysed-ela-2021-g6-stimulus-8-14": 1,
    "nysed-ela-2021-g6-stimulus-22-28": 1,
    "nysed-ela-2022-g5-stimulus-29-35": 1,
    "nysed-ela-2023-g6-stimulus-22-26": 1,
    "nysed-ela-2024-g6-stimulus-15-21": 1,
    "nysed-ela-2024-g5-stimulus-22-26": 1,
    "nysed-ela-2025-g5-stimulus-29-35": 1,
    "nysed-ela-2025-g6-stimulus-8-14": 1,
    "nysed-ela-2025-g6-stimulus-22-26": 1,
    "nysed-ela-2026-g5-stimulus-15-21": 1,
    "nysed-ela-2026-g5-stimulus-22-27": 1,
    "nysed-ela-2026-g6-stimulus-22-27": 1,
}


class ElaTranscriptError(RuntimeError):
    """Raised when an accessible passage transcript is missing or stale."""


def sha256_file(path: Path) -> str:
    """Hash a local source without importing the PDF/image authoring stack."""

    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


@dataclasses.dataclass(frozen=True)
class PassageTranscript:
    text: str
    source: str
    sourcePdfSha256: str
    passageImageSha256: str


def _required_text(value: Any, *, label: str) -> str:
    if not isinstance(value, str) or not value.strip():
        raise ElaTranscriptError(f"Missing {label}")
    return value.strip()


def _reject_duplicate_json_keys(pairs: list[tuple[str, Any]]) -> dict[str, Any]:
    result: dict[str, Any] = {}
    for key, value in pairs:
        if key in result:
            raise ElaTranscriptError(f"Duplicate JSON key in transcript sidecar: {key}")
        result[key] = value
    return result


def _canonical_json(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def normalize_transcript_text(value: str) -> str:
    """Normalize reviewed transcript text without changing reading order."""

    text = value.replace("\r\n", "\n").replace("\r", "\n")
    for glyph, replacement in KNOWN_PDF_GLYPHS.items():
        text = text.replace(glyph, replacement)
    # Preserve browser-facing mathematical and typographic meaning. In
    # particular, compatibility normalization would flatten 12² and ½ into
    # plain digits. Known embedded-font ligatures are handled explicitly above.
    text = unicodedata.normalize("NFC", text)

    cleaned: list[str] = []
    for raw_line in text.splitlines():
        line = "".join(
            " " if unicodedata.category(character).startswith("C") else character
            for character in raw_line
        )
        line = re.sub(r"[ \t]+", " ", line).strip()
        if DIRECTION_RE.fullmatch(line) or READ_QUESTIONS_RE.fullmatch(line):
            continue
        if BOOKLET_CHROME_RE.fullmatch(line) or RELEASE_FOOTER_RE.fullmatch(line):
            continue
        # Legacy booklet folios are emitted as bare lines by content-flow
        # extraction; printed passage markers share a line with their text.
        if re.fullmatch(r"\d{1,3}", line):
            continue
        if re.fullmatch(r"\d{1,2}(?:\s+\d){1,3}\.?", line):
            continue
        if re.fullmatch(r"\d{5,8}[A-Z]", line):
            continue
        # Correct only unambiguous, repeatedly observed OCR confusions.
        line = re.sub(r"^ll(?=\s+[A-Z“\"'])", "11", line)
        line = re.sub(r"([“\"'])T\s+don([’']t\b)", r"\1I don\2", line)
        line = re.sub(r"([“\"'])J\s+don([’']t\b)", r"\1I don\2", line)
        line = re.sub(r"([“\"'])T[’']{1,2}m\b", r"\1I’m", line)
        line = re.sub(r"([“\"'])ll\s+get\b", r"\1I’ll get", line)
        line = re.sub(r"\bTt[’']s\b", "It’s", line)
        line = re.sub(r"\bLam\s+responsible\b", "I am responsible", line)
        line = re.sub(r"\bcartt\b", "can’t", line, flags=re.IGNORECASE)
        cleaned.append(line)

    # Preserve semantic line/paragraph breaks while removing runs introduced
    # by physical PDF page boundaries.
    normalized: list[str] = []
    prior_blank = True
    for line in cleaned:
        blank = not line
        if blank and prior_blank:
            continue
        normalized.append(line)
        prior_blank = blank
    while normalized and not normalized[-1]:
        normalized.pop()
    return "\n".join(normalized).strip()


def transcript_paragraph_markers(text: str) -> list[int]:
    # A table, caption, or wrapped sentence can also begin with a number (for
    # example, ``50 percent larger``). Printed passage markers are monotonic,
    # so ignore numeric prose that would move backwards; the exact reviewed
    # sequence remains pinned in the manifest and is checked on every import.
    candidates: list[int] = []
    for line in text.splitlines():
        match = LEADING_NUMBER_RE.match(line)
        if match:
            candidates.append(int(match.group(1)))
    if not candidates:
        return []
    # Pick the longest increasing subsequence. This discards numeric headings
    # such as ``48 hours`` before a 1–20 paragraph sequence, as well as numbers
    # embedded in a chart after the real markers have begun.
    best: list[list[int]] = []
    for index, marker in enumerate(candidates):
        prior = max(
            (best[prior_index] for prior_index in range(index) if candidates[prior_index] < marker),
            key=len,
            default=[],
        )
        best.append([*prior, marker])
    return max(best, key=len)


def transcript_visual_description_count(text: str) -> int:
    return sum(1 for line in text.splitlines() if VISUAL_DESCRIPTION_RE.fullmatch(line.strip()))


def transcript_text_sha256(text: str) -> str:
    return hashlib.sha256(normalize_transcript_text(text).encode("utf-8")).hexdigest()


def _text_without_allowed_nested_single_closings(text: str, stimulus_id: str) -> str:
    masked = text
    for fragment in ALLOWED_NESTED_SINGLE_QUOTE_FRAGMENTS.get(stimulus_id, ()):
        if masked.count(fragment) > 1:
            raise ElaTranscriptError(
                f"Transcript repeats an allowed nested quotation context: {stimulus_id}"
            )
        masked = masked.replace(fragment, fragment.replace("’", "'"), 1)
    return masked


def load_review_manifest(path: Path = DEFAULT_REVIEW_MANIFEST) -> dict[str, dict[str, Any]]:
    """Load the exact, independently reviewed Grade 3–8 transcript inventory."""

    try:
        raw: Any = json.loads(
            path.read_text(encoding="utf-8"),
            object_pairs_hook=_reject_duplicate_json_keys,
        )
    except FileNotFoundError as exc:
        raise ElaTranscriptError(f"Missing transcript review manifest: {path.name}") from exc
    except json.JSONDecodeError as exc:
        raise ElaTranscriptError(f"Malformed transcript review manifest {path.name}: {exc}") from exc
    if not isinstance(raw, dict) or set(raw) != {
        "schemaVersion",
        "policyVersion",
        "scope",
        "reviews",
    }:
        raise ElaTranscriptError("Transcript review manifest has unexpected keys")
    if raw.get("schemaVersion") != 1 or raw.get("policyVersion") != TRANSCRIPT_POLICY_VERSION:
        raise ElaTranscriptError("Unsupported transcript review manifest")
    if raw.get("scope") != {
        "grades": [3, 4, 5, 6, 7, 8],
        "stimulusCount": EXPECTED_TRANSCRIPT_STIMULI,
        "questionCount": EXPECTED_TRANSCRIPT_QUESTIONS,
    }:
        raise ElaTranscriptError("Transcript review manifest has the wrong scope")
    reviews = raw.get("reviews")
    if not isinstance(reviews, list) or len(reviews) != EXPECTED_TRANSCRIPT_STIMULI:
        raise ElaTranscriptError("Transcript review manifest has the wrong review count")
    expected_keys = {
        "examId",
        "stimulusId",
        "inputHash",
        "source",
        "sourcePdfSha256",
        "passageImageSha256",
        "textSha256",
        "paragraphMarkers",
        "visualDescriptionCount",
    }
    digest_keys = {
        "inputHash",
        "sourcePdfSha256",
        "passageImageSha256",
        "textSha256",
    }
    result: dict[str, dict[str, Any]] = {}
    for review in reviews:
        if not isinstance(review, dict) or set(review) != expected_keys:
            raise ElaTranscriptError("Transcript review record has unexpected keys")
        stimulus_id = _required_text(review.get("stimulusId"), label="review stimulus id")
        if stimulus_id in result:
            raise ElaTranscriptError(f"Duplicate transcript review: {stimulus_id}")
        if review.get("source") not in SOURCE_VALUES:
            raise ElaTranscriptError(f"Transcript review has an invalid source: {stimulus_id}")
        if any(
            not isinstance(review.get(key), str) or not SHA256_RE.fullmatch(review[key])
            for key in digest_keys
        ):
            raise ElaTranscriptError(f"Transcript review has an invalid digest: {stimulus_id}")
        markers = review.get("paragraphMarkers")
        if (
            not isinstance(markers, list)
            or len(markers) < 3
            or not all(
                isinstance(marker, int) and not isinstance(marker, bool) and marker > 0
                for marker in markers
            )
            or any(right <= left for left, right in zip(markers, markers[1:]))
        ):
            raise ElaTranscriptError(f"Transcript review has invalid markers: {stimulus_id}")
        visual_count = review.get("visualDescriptionCount")
        if (
            not isinstance(visual_count, int)
            or isinstance(visual_count, bool)
            or visual_count < 0
        ):
            raise ElaTranscriptError(f"Transcript review has an invalid visual count: {stimulus_id}")
        result[stimulus_id] = review
    return result


def _has_doubled_character_extraction(text: str) -> bool:
    """Detect fully or mostly pair-doubled PDF glyph runs without rejecting wordplay."""

    if DOUBLED_CHARACTER_LAYOUT_RE.search(text):
        return True
    for match in DOUBLED_CHARACTER_TOKEN_RE.finditer(text):
        token = match.group(0)
        if token in ALLOWED_EXPRESSIVE_REPEAT_TOKENS:
            continue
        for component in token.split("-"):
            if len(component) < 4 or len(component) % 2 != 0:
                continue
            equal_pairs = sum(
                component[index] == component[index + 1]
                for index in range(0, len(component), 2)
            )
            pair_count = len(component) // 2
            if equal_pairs == pair_count:
                return True
            # Some embedded fonts double most glyphs but leave ligatures such
            # as ``fi`` intact (for example, ``PPrroofifilleess``). Requiring
            # three matching pairs across at least eight characters keeps the
            # gate fail-closed on that source defect without flagging ordinary
            # short double letters.
            if (
                len(component) >= 8
                and equal_pairs >= 3
                and equal_pairs / pair_count >= 0.6
            ):
                return True
    return False


def validate_transcript_text(
    value: Any,
    *,
    stimulus_id: str,
    expected_markers: list[int] | None = None,
    expected_visual_descriptions: int | None = None,
) -> str:
    text = normalize_transcript_text(_required_text(value, label=f"transcript for {stimulus_id}"))
    if len(text) < 400 or len(text) > 20_000:
        raise ElaTranscriptError(
            f"Transcript length is implausible for {stimulus_id}: {len(text)} characters"
        )
    words = re.findall(r"[A-Za-z0-9]+", text)
    if len(words) < 80:
        raise ElaTranscriptError(f"Transcript is not substantive for {stimulus_id}")
    if any(unicodedata.category(character) in {"Co", "Cs"} for character in text):
        raise ElaTranscriptError(f"Transcript retains a private-use/surrogate glyph: {stimulus_id}")
    if BOOKLET_CHROME_INLINE_RE.search(text):
        raise ElaTranscriptError(f"Transcript retains booklet page chrome: {stimulus_id}")
    if ANSWER_LEAK_RE.search(text):
        raise ElaTranscriptError(f"Transcript leaks answer/scoring metadata: {stimulus_id}")
    if KNOWN_OCR_CORRUPTION_RE.search(text):
        raise ElaTranscriptError(f"Transcript retains known OCR corruption: {stimulus_id}")
    if SPLIT_WORD_OCR_RE.search(text):
        raise ElaTranscriptError(
            f"Transcript retains split-word OCR corruption: {stimulus_id}"
        )
    if _has_doubled_character_extraction(text):
        raise ElaTranscriptError(
            f"Transcript retains doubled-character PDF extraction: {stimulus_id}"
        )
    if SINGLE_CLOSING_QUOTE_RE.search(
        _text_without_allowed_nested_single_closings(text, stimulus_id)
    ):
        raise ElaTranscriptError(
            f"Transcript retains an OCR single/double closing-quote substitution: {stimulus_id}"
        )
    if LOCAL_FILESYSTEM_PATH_RE.search(text):
        raise ElaTranscriptError(f"Transcript exposes a local filesystem path: {stimulus_id}")

    paragraph_numbers = transcript_paragraph_markers(text)
    if len(paragraph_numbers) < 3:
        raise ElaTranscriptError(
            f"Transcript does not preserve enough printed line/paragraph numbers: {stimulus_id}"
        )
    if any(right <= left for left, right in zip(paragraph_numbers, paragraph_numbers[1:])):
        raise ElaTranscriptError(
            f"Transcript has duplicated or out-of-order printed markers: {stimulus_id}"
        )
    if expected_markers is not None and paragraph_numbers != expected_markers:
        raise ElaTranscriptError(
            f"Transcript has the wrong exact printed marker sequence for {stimulus_id}: "
            f"expected {expected_markers}, got {paragraph_numbers}"
        )
    visual_description_count = transcript_visual_description_count(text)
    required_visual_descriptions = REQUIRED_VISUAL_DESCRIPTION_COUNTS.get(stimulus_id)
    if (
        required_visual_descriptions is not None
        and visual_description_count != required_visual_descriptions
    ):
        raise ElaTranscriptError(
            f"Transcript has the wrong required visual-description count for {stimulus_id}: "
            f"expected {required_visual_descriptions}, got {visual_description_count}"
        )
    if (
        expected_visual_descriptions is not None
        and visual_description_count != expected_visual_descriptions
    ):
        raise ElaTranscriptError(
            f"Transcript has the wrong visual-description count for {stimulus_id}"
        )
    return text


def passage_transcript_input_hash(
    *,
    exam_id: str,
    stimulus: dict[str, Any],
    source_pdf_sha256: str,
    passage_image_sha256: str,
) -> str:
    passage = stimulus.get("passage")
    if not isinstance(passage, dict):
        raise ElaTranscriptError(f"Stimulus has no passage asset: {stimulus.get('id')}")
    payload = {
        "policyVersion": TRANSCRIPT_POLICY_VERSION,
        "examId": exam_id,
        "stimulus": {
            "id": stimulus.get("id"),
            "label": stimulus.get("label"),
            "questionStart": stimulus.get("questionStart"),
            "questionEnd": stimulus.get("questionEnd"),
            "references": stimulus.get("references"),
            "passage": {
                "src": passage.get("src"),
                "width": passage.get("width"),
                "height": passage.get("height"),
                "pageCount": passage.get("pageCount"),
            },
        },
        "sourcePdfSha256": source_pdf_sha256,
        "passageImageSha256": passage_image_sha256,
    }
    return hashlib.sha256(_canonical_json(payload).encode("utf-8")).hexdigest()


def _passage_image_path(asset_root: Path, exam: dict[str, Any], stimulus: dict[str, Any]) -> Path:
    passage = stimulus.get("passage")
    if not isinstance(passage, dict):
        raise ElaTranscriptError(f"Stimulus has no passage asset: {stimulus.get('id')}")
    source = _required_text(passage.get("src"), label="passage image path")
    expected_prefix = f"/vine-app/nysed/ela/{exam['year']}/grade-{exam['grade']}/en/"
    if not source.startswith(expected_prefix) or "/../" in source or source.endswith("/"):
        raise ElaTranscriptError(f"Unsafe passage image path for {stimulus.get('id')}")
    path = asset_root / str(exam["year"]) / f"grade-{exam['grade']}" / "en" / Path(source).name
    if not path.is_file() or path.is_symlink():
        raise ElaTranscriptError(f"Missing regular passage image for {stimulus.get('id')}")
    return path


def load_and_attach_exam_transcripts(
    exam: dict[str, Any],
    *,
    pdf_path: Path,
    asset_root: Path,
    sidecar_root: Path = DEFAULT_SIDECAR_ROOT,
    review_manifest_path: Path = DEFAULT_REVIEW_MANIFEST,
) -> int:
    """Validate and attach every required transcript for one Grade 3–8 exam."""

    grade = int(exam["grade"])
    if grade not in TRANSCRIPT_GRADES:
        return 0
    year = int(exam["year"])
    reviewed_by_id = load_review_manifest(review_manifest_path)
    sidecar_path = sidecar_root / f"{year}-grade-{grade}.json"
    try:
        raw: Any = json.loads(
            sidecar_path.read_text(encoding="utf-8"),
            object_pairs_hook=_reject_duplicate_json_keys,
        )
    except FileNotFoundError as exc:
        raise ElaTranscriptError(f"Missing transcript sidecar: {sidecar_path.name}") from exc
    except json.JSONDecodeError as exc:
        raise ElaTranscriptError(f"Malformed transcript sidecar {sidecar_path.name}: {exc}") from exc
    expected_top_keys = {
        "schemaVersion",
        "policyVersion",
        "examId",
        "sourcePdfSha256",
        "reviewedReadingOrder",
        "passages",
    }
    if not isinstance(raw, dict) or set(raw) != expected_top_keys or raw.get("schemaVersion") != 1:
        raise ElaTranscriptError(f"Unsupported transcript sidecar schema: {sidecar_path.name}")
    if raw.get("policyVersion") != TRANSCRIPT_POLICY_VERSION:
        raise ElaTranscriptError(f"Wrong transcript policy version: {sidecar_path.name}")
    if raw.get("reviewedReadingOrder") is not True:
        raise ElaTranscriptError(f"Transcript reading order is not reviewed: {sidecar_path.name}")
    exam_id = _required_text(exam.get("id"), label="exam id")
    if raw.get("examId") != exam_id:
        raise ElaTranscriptError(f"Transcript sidecar belongs to the wrong exam: {sidecar_path.name}")
    pdf_sha = sha256_file(pdf_path)
    if not isinstance(raw.get("sourcePdfSha256"), str) or not SHA256_RE.fullmatch(raw["sourcePdfSha256"]):
        raise ElaTranscriptError(f"Transcript sidecar has an invalid PDF digest: {sidecar_path.name}")
    if raw.get("sourcePdfSha256") != pdf_sha:
        raise ElaTranscriptError(f"Transcript sidecar has a stale source PDF: {sidecar_path.name}")
    records = raw.get("passages")
    if not isinstance(records, list):
        raise ElaTranscriptError(f"Transcript sidecar has no passage list: {sidecar_path.name}")
    by_id: dict[str, dict[str, Any]] = {}
    for record in records:
        if not isinstance(record, dict):
            raise ElaTranscriptError(f"Malformed transcript record: {sidecar_path.name}")
        if set(record) != {
            "stimulusId",
            "inputHash",
            "source",
            "text",
            "reviewedReadingOrder",
            "paragraphMarkers",
            "visualDescriptionCount",
        }:
            raise ElaTranscriptError(f"Transcript record has unexpected keys: {sidecar_path.name}")
        stimulus_id = _required_text(record.get("stimulusId"), label="transcript stimulus id")
        if stimulus_id in by_id:
            raise ElaTranscriptError(f"Duplicate transcript record: {stimulus_id}")
        by_id[stimulus_id] = record

    stimuli = exam.get("stimuli")
    if not isinstance(stimuli, list) or not stimuli:
        raise ElaTranscriptError(f"Exam has no passage stimuli: {exam_id}")
    expected_ids = {str(stimulus.get("id")) for stimulus in stimuli}
    if set(by_id) != expected_ids:
        missing = sorted(expected_ids - set(by_id))
        orphaned = sorted(set(by_id) - expected_ids)
        raise ElaTranscriptError(
            f"Transcript parity failed for {exam_id}; missing={missing}, orphaned={orphaned}"
        )

    attached = 0
    for stimulus in stimuli:
        stimulus_id = str(stimulus["id"])
        record = by_id[stimulus_id]
        review = reviewed_by_id.get(stimulus_id)
        if not isinstance(review, dict) or review.get("examId") != exam_id:
            raise ElaTranscriptError(f"Missing matching transcript review for {stimulus_id}")
        if record.get("reviewedReadingOrder") is not True:
            raise ElaTranscriptError(f"Transcript reading order is not reviewed for {stimulus_id}")
        image_sha = sha256_file(_passage_image_path(asset_root, exam, stimulus))
        expected_hash = passage_transcript_input_hash(
            exam_id=exam_id,
            stimulus=stimulus,
            source_pdf_sha256=pdf_sha,
            passage_image_sha256=image_sha,
        )
        if not isinstance(record.get("inputHash"), str) or not SHA256_RE.fullmatch(record["inputHash"]):
            raise ElaTranscriptError(f"Transcript has an invalid input digest for {stimulus_id}")
        if record.get("inputHash") != expected_hash:
            raise ElaTranscriptError(f"Transcript record is stale for {stimulus_id}")
        if review.get("inputHash") != expected_hash:
            raise ElaTranscriptError(f"Transcript review has a stale input for {stimulus_id}")
        if review.get("sourcePdfSha256") != pdf_sha:
            raise ElaTranscriptError(f"Transcript review has a stale PDF for {stimulus_id}")
        if review.get("passageImageSha256") != image_sha:
            raise ElaTranscriptError(f"Transcript review has a stale image for {stimulus_id}")
        source = record.get("source")
        if source not in SOURCE_VALUES:
            raise ElaTranscriptError(f"Transcript has an invalid source for {stimulus_id}")
        if review.get("source") != source:
            raise ElaTranscriptError(f"Transcript source differs from review for {stimulus_id}")
        paragraph_markers = record.get("paragraphMarkers")
        if (
            not isinstance(paragraph_markers, list)
            or len(paragraph_markers) < 3
            or not all(isinstance(value, int) and not isinstance(value, bool) and value > 0 for value in paragraph_markers)
        ):
            raise ElaTranscriptError(f"Transcript has invalid reviewed markers for {stimulus_id}")
        visual_description_count = record.get("visualDescriptionCount")
        if (
            not isinstance(visual_description_count, int)
            or isinstance(visual_description_count, bool)
            or visual_description_count < 0
        ):
            raise ElaTranscriptError(f"Transcript has an invalid visual-description count for {stimulus_id}")
        text = validate_transcript_text(
            record.get("text"),
            stimulus_id=stimulus_id,
            expected_markers=paragraph_markers,
            expected_visual_descriptions=visual_description_count,
        )
        if review.get("paragraphMarkers") != paragraph_markers:
            raise ElaTranscriptError(f"Transcript markers differ from review for {stimulus_id}")
        if review.get("visualDescriptionCount") != visual_description_count:
            raise ElaTranscriptError(f"Transcript visual count differs from review for {stimulus_id}")
        if review.get("textSha256") != transcript_text_sha256(text):
            raise ElaTranscriptError(f"Transcript text differs from review for {stimulus_id}")
        stimulus["passage"]["transcript"] = dataclasses.asdict(
            PassageTranscript(
                text=text,
                source=str(source),
                sourcePdfSha256=pdf_sha,
                passageImageSha256=image_sha,
            )
        )
        attached += 1
    return attached


def validate_full_transcript_coverage(exams: Iterable[dict[str, Any]]) -> None:
    transcript_count = 0
    question_count = 0
    for exam in exams:
        grade = int(exam["grade"])
        stimuli = exam.get("stimuli", [])
        if grade in TRANSCRIPT_GRADES:
            for stimulus in stimuli:
                if not isinstance(stimulus.get("passage", {}).get("transcript"), dict):
                    raise ElaTranscriptError(f"Missing transcript for {stimulus.get('id')}")
                transcript_count += 1
                question_count += int(stimulus["questionEnd"]) - int(stimulus["questionStart"]) + 1
        elif any(stimulus.get("passage", {}).get("transcript") for stimulus in stimuli):
            raise ElaTranscriptError(f"Unexpected out-of-scope transcript in {exam.get('id')}")
    if transcript_count != EXPECTED_TRANSCRIPT_STIMULI or question_count != EXPECTED_TRANSCRIPT_QUESTIONS:
        raise ElaTranscriptError(
            "Full accessible transcript parity failed: expected "
            f"{EXPECTED_TRANSCRIPT_STIMULI}/{EXPECTED_TRANSCRIPT_QUESTIONS}, got "
            f"{transcript_count}/{question_count}"
        )

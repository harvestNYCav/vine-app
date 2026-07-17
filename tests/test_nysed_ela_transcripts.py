from __future__ import annotations

import copy
import hashlib
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from scripts.nysed_ela_transcripts import (
    REQUIRED_VISUAL_DESCRIPTION_COUNTS,
    ALLOWED_NESTED_SINGLE_QUOTE_FRAGMENTS,
    DEFAULT_REVIEW_MANIFEST,
    DEFAULT_SIDECAR_ROOT,
    ElaTranscriptError,
    SINGLE_CLOSING_QUOTE_RE,
    load_and_attach_exam_transcripts,
    load_review_manifest,
    normalize_transcript_text,
    transcript_paragraph_markers,
    transcript_visual_description_count,
    validate_transcript_text,
)


REPO_ROOT = Path(__file__).resolve().parents[1]
CATALOG_PATH = REPO_ROOT / "content" / "ela-exams" / "generated" / "catalog.json"
ASSET_ROOT = REPO_ROOT / "public" / "nysed" / "ela"


def real_sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def substantive_transcript(middle: str) -> str:
    padding = (
        "This reviewed paragraph contains enough ordinary passage words to make the "
        "sample substantive while preserving a clear and continuous reading order for "
        "students who use assistive technology. "
    )
    return f"1 {padding * 2}\n\n2 {middle} {padding * 2}\n\n3 {padding * 2}"


class TranscriptTextValidationTests(unittest.TestCase):
    def test_display_normalization_preserves_math_symbols(self) -> None:
        source = "12², ½, ≤, ≥, and ÷ remain meaningful."

        self.assertEqual(normalize_transcript_text(source), source)

    def test_literal_bullet_after_printed_marker_is_preserved(self) -> None:
        text = (
            "10 Alpha\n"
            "11 • Cross Country is a section heading.\n"
            "12 Beta\n"
            "13 1. Cacao is grown on trees.\n"
            "14 2. The beans are separated from the pods."
        )

        self.assertEqual(transcript_paragraph_markers(text), [10, 11, 12, 13, 14])

    def test_legitimate_go_on_dialogue_is_not_treated_as_booklet_chrome(self) -> None:
        text = validate_transcript_text(
            substantive_transcript('“Go on,” she said, inviting the student to continue.'),
            stimulus_id="test-go-on-dialogue",
        )

        self.assertIn('“Go on,” she said', text)

    def test_standalone_go_on_booklet_chrome_is_removed(self) -> None:
        normalized = normalize_transcript_text(
            substantive_transcript("The story continues after this sentence.") + "\nGO ON\n"
        )

        self.assertNotRegex(normalized, r"(?im)^\s*GO\s*ON\s*$")

    def test_rejects_recurrent_single_for_double_closing_quote_ocr_error(self) -> None:
        with self.assertRaisesRegex(ElaTranscriptError, "single/double closing-quote"):
            validate_transcript_text(
                substantive_transcript('“Remember the story and finish the work,’ she said.'),
                stimulus_id="test-bad-closing-quote",
            )

    def test_rejects_colon_or_semicolon_apostrophe_quote_artifact(self) -> None:
        for artifact in ("The concrete walls;' Kathryn said.", "Our movements:'"):
            with self.subTest(artifact=artifact):
                with self.assertRaisesRegex(ElaTranscriptError, "known OCR corruption"):
                    validate_transcript_text(
                        substantive_transcript(artifact),
                        stimulus_id="test-punctuation-quote-artifact",
                    )

    def test_rejects_spurious_single_quote_before_the_or_they(self) -> None:
        for artifact in ("3 ‘The reviewed passage", "Spices. ‘They called it cocoa"):
            text = substantive_transcript("The passage continues normally.").replace(
                "3 This reviewed paragraph",
                artifact,
            )
            with self.subTest(artifact=artifact):
                with self.assertRaisesRegex(ElaTranscriptError, "known OCR corruption"):
                    validate_transcript_text(text, stimulus_id="test-spurious-opening-quote")

    def test_rejects_residual_bare_youd_and_image_layout_debris(self) -> None:
        artifacts = (
            "Until your body adjusts, youd stay up later.",
            "The architect had studied art = = SS before beginning the project.",
            "The building in Bilbao was —— = his own fantasy come true.",
        )
        for artifact in artifacts:
            with self.subTest(artifact=artifact):
                with self.assertRaisesRegex(ElaTranscriptError, "known OCR corruption"):
                    validate_transcript_text(
                        substantive_transcript(artifact),
                        stimulus_id="test-residual-ocr-layout-debris",
                    )

    def test_rejects_split_word_pdf_extraction_artifacts(self) -> None:
        artifacts = (
            "Th e field was quiet.",
            "They returned aft ernoon.",
            "The fi rst fi sh crossed the fl oor.",
            "The result was diff erent and eff ective.",
            "Excerpt from C oral Reef.",
            "Excerpt from O ne-Eyed Cat.",
            "The paint drift ed while he was heft ing it.",
            "2f rappé: an iced or chilled drink.",
        )
        for artifact in artifacts:
            with self.subTest(artifact=artifact):
                with self.assertRaisesRegex(ElaTranscriptError, "split-word OCR"):
                    validate_transcript_text(
                        substantive_transcript(artifact),
                        stimulus_id="test-split-word-pdf-extraction",
                    )

        allowed = validate_transcript_text(
            substantive_transcript("This sci-fi fishland is part of the story."),
            stimulus_id="test-legitimate-sci-fi-phrase",
        )
        self.assertIn("sci-fi fishland", allowed)

    def test_rejects_doubled_character_pdf_extraction_artifacts(self) -> None:
        artifacts = (
            "EExxcceerrpptt ffrroomm the story.",
            "The vveennddoorrss sold art.",
            "The PPrroofifilleess heading was corrupted.",
            "IInnssiiggnniifificcaanntt appeared in the title.",
            "EExxcceerrpptt ffrroomm ThThee book.",
            "““A doubled title”” appeared above 4400 entries.",
        )
        for artifact in artifacts:
            with self.subTest(artifact=artifact):
                with self.assertRaisesRegex(ElaTranscriptError, "doubled-character"):
                    validate_transcript_text(
                        substantive_transcript(artifact),
                        stimulus_id="test-doubled-character-pdf-extraction",
                    )

        allowed = validate_transcript_text(
            substantive_transcript(
                "The expressive words Snoozzzzzze and go-rillllllas are source text."
            ),
            stimulus_id="test-expressive-character-repetition",
        )
        self.assertIn("Snoozzzzzze", allowed)
        self.assertIn("go-rillllllas", allowed)

    def test_allows_reviewed_nested_single_quotation_context(self) -> None:
        text = validate_transcript_text(
            substantive_transcript('He said, “You mean ‘thunderstorm,’ ” and corrected the word.'),
            stimulus_id="nysed-ela-2023-g3-stimulus-26-31",
        )

        self.assertIn("‘thunderstorm,’ ”", text)

    def test_rejects_english_and_spanish_answer_key_leaks(self) -> None:
        leaks = (
            "Key: B. Choice B is correct because the printed evidence supports it.",
            "The answer is C. Option C is the best response to the question.",
            "The correct option is B because the printed evidence supports it.",
            "Clave: D. La opción D es correcta porque coincide con el texto.",
        )
        for leak in leaks:
            with self.subTest(leak=leak):
                with self.assertRaisesRegex(ElaTranscriptError, "answer/scoring metadata"):
                    validate_transcript_text(
                        substantive_transcript(leak),
                        stimulus_id="test-answer-leak",
                    )

    def test_rejects_common_local_workspace_paths(self) -> None:
        paths = (
            "/workspaces/vine-app/content/passage.json",
            "/var/folders/75/cache/passage.txt",
        )
        for path in paths:
            with self.subTest(path=path):
                with self.assertRaisesRegex(ElaTranscriptError, "local filesystem path"):
                    validate_transcript_text(
                        substantive_transcript(f"The private review source was {path}."),
                        stimulus_id="test-local-path-leak",
                    )

    def test_question_relevant_visuals_require_the_exact_reviewed_count(self) -> None:
        one_description = (
            substantive_transcript("The passage continues with reviewed prose.")
            + "\n\n[Diagram: A reviewed tree diagram appears beside the passage.]"
        )
        with self.assertRaisesRegex(ElaTranscriptError, "required visual-description count"):
            validate_transcript_text(
                one_description,
                stimulus_id="nysed-ela-2014-g3-stimulus-1-4",
                expected_visual_descriptions=1,
            )


class TranscriptReviewManifestTests(unittest.TestCase):
    def setUp(self) -> None:
        self.manifest = json.loads(DEFAULT_REVIEW_MANIFEST.read_text(encoding="utf-8"))

    def write_manifest(self, directory: Path, value: object) -> Path:
        path = directory / "review-manifest.json"
        path.write_text(json.dumps(value), encoding="utf-8")
        return path

    def test_manifest_pins_exact_grade_3_8_scope_and_provenance(self) -> None:
        reviews = load_review_manifest()

        self.assertEqual(len(reviews), 242)
        self.assertEqual(
            {review["source"] for review in reviews.values()},
            {
                "official-pdf-text",
                "mixed-official-pdf-text-and-ocr",
                "passage-image-ocr",
            },
        )

    def test_required_visual_counts_match_the_reviewed_sidecars(self) -> None:
        passages: dict[str, dict[str, object]] = {}
        for path in sorted(DEFAULT_SIDECAR_ROOT.glob("????-grade-[3-8].json")):
            sidecar = json.loads(path.read_text(encoding="utf-8"))
            passages.update(
                (passage["stimulusId"], passage)
                for passage in sidecar["passages"]
            )

        for stimulus_id, expected_count in REQUIRED_VISUAL_DESCRIPTION_COUNTS.items():
            passage = passages[stimulus_id]
            self.assertEqual(passage["visualDescriptionCount"], expected_count)
            self.assertEqual(
                transcript_visual_description_count(str(passage["text"])),
                expected_count,
            )

    def test_source_verified_transcript_feedback_corrections_are_preserved(self) -> None:
        passages: dict[str, str] = {}
        for path in sorted(DEFAULT_SIDECAR_ROOT.glob("????-grade-[3-8].json")):
            sidecar = json.loads(path.read_text(encoding="utf-8"))
            passages.update(
                (passage["stimulusId"], str(passage["text"]))
                for passage in sidecar["passages"]
            )

        expected_fragments = {
            "nysed-ela-2016-g5-stimulus-1-7": (
                "like “brainiest” or “best athlete”—but",
                "Or I’d fill squirt guns",
            ),
            "nysed-ela-2016-g5-stimulus-36-42": (
                "Two Days With No Phone\nby Sarah Jane Brian",
                "11 These were the rules",
                "life with no phone wasn’t easy, he admitted, “it had benefits.”",
                "Everybody in the world should try it.”",
                "without\nit. Said the teen, “It was a reality check.”",
            ),
            "nysed-ela-2018-g5-stimulus-1-7": (
                "“Poor Woolly-Puff,” Wendy said.",
                "It’s as if they’re avoiding us.",
            ),
            "nysed-ela-2016-g6-stimulus-36-42": (
                "you can watch it grow,” Culpepper² says.",
            ),
            "nysed-ela-2019-g6-stimulus-1-7": (
                "a person who chooses items for use in a museum",
            ),
            "nysed-ela-2026-g5-stimulus-22-27": (
                "the Wild on a Snowmobile”\nby Aaron Derr",
            ),
        }
        rejected_fragments = {
            "nysed-ela-2016-g5-stimulus-36-42": ("e\nTwo Days", "try it?”"),
            "nysed-ela-2018-g5-stimulus-1-7": ("they’ re",),
            "nysed-ela-2016-g6-stimulus-36-42": ("grow. Culpepper",),
            "nysed-ela-2019-g6-stimulus-1-7": ("musuem",),
        }

        for stimulus_id, fragments in expected_fragments.items():
            with self.subTest(stimulus_id=stimulus_id):
                for fragment in fragments:
                    self.assertIn(fragment, passages[stimulus_id])
        for stimulus_id, fragments in rejected_fragments.items():
            with self.subTest(stimulus_id=stimulus_id):
                for fragment in fragments:
                    self.assertNotIn(fragment, passages[stimulus_id])

    def test_all_reviewed_transcripts_pass_text_validation(self) -> None:
        reviews = load_review_manifest()
        seen: set[str] = set()
        for path in sorted(DEFAULT_SIDECAR_ROOT.glob("????-grade-[3-8].json")):
            sidecar = json.loads(path.read_text(encoding="utf-8"))
            self.assertIs(sidecar.get("reviewedReadingOrder"), True)
            for passage in sidecar["passages"]:
                stimulus_id = passage["stimulusId"]
                review = reviews[stimulus_id]
                self.assertIs(passage.get("reviewedReadingOrder"), True)
                self.assertEqual(
                    validate_transcript_text(
                        passage["text"],
                        stimulus_id=stimulus_id,
                        expected_markers=review["paragraphMarkers"],
                        expected_visual_descriptions=review["visualDescriptionCount"],
                    ),
                    passage["text"],
                )
                seen.add(stimulus_id)

        self.assertEqual(seen, set(reviews))

    def test_corpus_contains_only_the_reviewed_nested_single_closings(self) -> None:
        matches: list[tuple[str, str]] = []
        for path in sorted(DEFAULT_SIDECAR_ROOT.glob("????-grade-[3-8].json")):
            sidecar = json.loads(path.read_text(encoding="utf-8"))
            for passage in sidecar["passages"]:
                stimulus_id = passage["stimulusId"]
                for match in SINGLE_CLOSING_QUOTE_RE.finditer(passage["text"]):
                    matches.append((stimulus_id, match.group(0)))

        expected_match_count = sum(
            len(tuple(SINGLE_CLOSING_QUOTE_RE.finditer(fragment)))
            for fragments in ALLOWED_NESTED_SINGLE_QUOTE_FRAGMENTS.values()
            for fragment in fragments
        )
        self.assertEqual(len(matches), expected_match_count)
        for stimulus_id, fragments in ALLOWED_NESTED_SINGLE_QUOTE_FRAGMENTS.items():
            sidecar_path = next(
                path
                for path in DEFAULT_SIDECAR_ROOT.glob("????-grade-[3-8].json")
                if stimulus_id in path.read_text(encoding="utf-8")
            )
            text = json.loads(sidecar_path.read_text(encoding="utf-8"))
            passage_text = next(
                passage["text"]
                for passage in text["passages"]
                if passage["stimulusId"] == stimulus_id
            )
            self.assertTrue(all(passage_text.count(fragment) == 1 for fragment in fragments))

    def test_rejects_changed_policy_version_and_source(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            wrong_policy = copy.deepcopy(self.manifest)
            wrong_policy["policyVersion"] = "ela-accessible-transcript-changed"
            with self.assertRaisesRegex(ElaTranscriptError, "Unsupported transcript review"):
                load_review_manifest(self.write_manifest(root, wrong_policy))

            wrong_source = copy.deepcopy(self.manifest)
            wrong_source["reviews"][0]["source"] = "unreviewed-ocr"
            with self.assertRaisesRegex(ElaTranscriptError, "invalid source"):
                load_review_manifest(self.write_manifest(root, wrong_source))

    def test_rejects_duplicate_json_keys(self) -> None:
        source = DEFAULT_REVIEW_MANIFEST.read_text(encoding="utf-8")
        duplicate = source.replace(
            '"schemaVersion": 1,',
            '"schemaVersion": 1,\n  "schemaVersion": 1,',
            1,
        )
        with tempfile.TemporaryDirectory() as temporary:
            path = Path(temporary) / "duplicate.json"
            path.write_text(duplicate, encoding="utf-8")
            with self.assertRaisesRegex(ElaTranscriptError, "Duplicate JSON key"):
                load_review_manifest(path)

    def test_loader_rejects_sidecar_provenance_changed_after_review(self) -> None:
        catalog = json.loads(CATALOG_PATH.read_text(encoding="utf-8"))
        exam = next(
            copy.deepcopy(value)
            for value in catalog["exams"]
            if value["year"] == 2013 and value["grade"] == 3
        )
        source_sidecar = DEFAULT_SIDECAR_ROOT / "2013-grade-3.json"
        sidecar = json.loads(source_sidecar.read_text(encoding="utf-8"))
        original_source = sidecar["passages"][0]["source"]
        sidecar["passages"][0]["source"] = (
            "passage-image-ocr"
            if original_source != "passage-image-ocr"
            else "official-pdf-text"
        )
        with tempfile.TemporaryDirectory() as temporary:
            sidecar_root = Path(temporary)
            synthetic_pdf = sidecar_root / "source.pdf"
            (sidecar_root / source_sidecar.name).write_text(
                json.dumps(sidecar),
                encoding="utf-8",
            )

            def pinned_sha256(path: Path) -> str:
                if Path(path) == synthetic_pdf:
                    return sidecar["sourcePdfSha256"]
                return real_sha256_file(Path(path))

            with patch(
                "scripts.nysed_ela_transcripts.sha256_file",
                side_effect=pinned_sha256,
            ):
                with self.assertRaisesRegex(ElaTranscriptError, "source differs from review"):
                    load_and_attach_exam_transcripts(
                        exam,
                        pdf_path=synthetic_pdf,
                        asset_root=ASSET_ROOT,
                        sidecar_root=sidecar_root,
                    )


if __name__ == "__main__":
    unittest.main()

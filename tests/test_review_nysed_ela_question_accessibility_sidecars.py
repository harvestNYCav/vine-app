from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path
from unittest import mock

from scripts.review_nysed_ela_question_accessibility_sidecars import (
    ELA_QUESTION_ACCESSIBILITY_POLICY_VERSION,
    EXPECTED_SCOPE,
    ElaQuestionAccessibilityReviewError,
    approve_drafts,
    review_manifest_payload,
    validate_review_manifest,
    validated_review_records,
)


YEARS = [2013, 2014, 2015, 2016, 2017, 2018, 2019, 2021, 2022, 2023, 2024, 2025, 2026]


def review_records() -> list[dict[str, object]]:
    records: list[dict[str, object]] = []
    question_total = 0
    for year in YEARS:
        for grade in range(3, 9):
            # The manifest validator only needs a positive, exact grand total.
            # Give the last record the remainder after 77 one-question records.
            count = 1
            if year == YEARS[-1] and grade == 8:
                count = 1_583 - question_total
            question_total += count
            records.append(
                {
                    "examId": f"nysed-ela-{year}-grade-{grade}-mc-v1",
                    "year": year,
                    "grade": grade,
                    "sourcePdfSha256": "a" * 64,
                    "sidecarSha256": "b" * 64,
                    "questionCount": count,
                }
            )
    return records


class ReviewManifestTests(unittest.TestCase):
    def test_manifest_rejects_a_replacement_year_outside_the_supported_matrix(self) -> None:
        manifest = review_manifest_payload(review_records())
        manifest["reviews"][0]["year"] = 2012

        with self.assertRaisesRegex(
            ElaQuestionAccessibilityReviewError,
            "Unsupported accessibility review release",
        ):
            validated_review_records(manifest)

    def test_manifest_rejects_a_noncanonical_exam_id(self) -> None:
        manifest = review_manifest_payload(review_records())
        manifest["reviews"][0]["examId"] = "replacement-exam-id"

        with self.assertRaisesRegex(
            ElaQuestionAccessibilityReviewError,
            "Noncanonical accessibility review exam ID",
        ):
            validated_review_records(manifest)

    def test_manifest_rejects_stale_sidecar_hash(self) -> None:
        expected = review_records()
        manifest = review_manifest_payload(expected)
        manifest["reviews"][0]["sidecarSha256"] = "c" * 64

        with self.assertRaisesRegex(
            ElaQuestionAccessibilityReviewError,
            "differ from the review manifest",
        ):
            validate_review_manifest(manifest, expected)

    def test_manifest_shape_and_scope_are_exact(self) -> None:
        expected = review_records()
        manifest = review_manifest_payload(expected)

        self.assertEqual(manifest["schemaVersion"], 1)
        self.assertEqual(
            manifest["policyVersion"],
            ELA_QUESTION_ACCESSIBILITY_POLICY_VERSION,
        )
        self.assertEqual(manifest["scope"], EXPECTED_SCOPE)
        validate_review_manifest(manifest, expected)


class AtomicApprovalTests(unittest.TestCase):
    def test_preflight_failure_writes_no_approved_files_or_manifest(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            root = Path(temporary_directory)
            drafts = root / "drafts"
            approved = root / "approved"
            manifest = root / "review-manifest.json"
            approved.mkdir()
            existing = approved / "2013-grade-3.json"
            existing.write_text('{"existing": true}\n', encoding="utf-8")
            manifest.write_text('{"active": "old"}\n', encoding="utf-8")
            before_sidecar = existing.read_bytes()
            before_manifest = manifest.read_bytes()

            with mock.patch(
                "scripts.review_nysed_ela_question_accessibility_sidecars.preflight_sidecar_root",
                side_effect=ElaQuestionAccessibilityReviewError("draft review failed"),
            ):
                with self.assertRaisesRegex(
                    ElaQuestionAccessibilityReviewError,
                    "draft review failed",
                ):
                    approve_drafts(
                        draft_root=drafts,
                        approved_root=approved,
                        manifest_path=manifest,
                        catalog_path=root / "catalog.json",
                        public_root=root / "public",
                    )

            self.assertEqual(existing.read_bytes(), before_sidecar)
            self.assertEqual(manifest.read_bytes(), before_manifest)
            self.assertEqual(
                sorted(path.name for path in approved.iterdir()),
                ["2013-grade-3.json"],
            )


if __name__ == "__main__":
    unittest.main()

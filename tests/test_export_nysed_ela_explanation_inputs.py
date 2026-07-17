from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path
from unittest import mock

from PIL import Image, ImageDraw
from reportlab.pdfgen import canvas

from scripts.export_nysed_ela_explanation_inputs import (
    ExplanationInputError,
    export_explanation_inputs,
    find_cached_pdf,
)


def _write_pdf(path: Path, page_texts: list[str]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    document = canvas.Canvas(str(path))
    for text in page_texts:
        if text:
            document.drawString(72, 720, text)
        document.showPage()
    document.save()


def _catalog(*, page_end: int = 2) -> dict[str, object]:
    return {
        "schemaVersion": 2,
        "exams": [
            {
                "id": "nysed-ela-2026-grade-3-mc-v1",
                "slug": "2026-grade-3-mc",
                "year": 2026,
                "grade": 3,
                "standardsFramework": "NGLS",
                "title": "New York Grade 3 ELA - 2026 Released Questions",
                "description": "Released Grade 3 ELA practice.",
                "sourceTitle": "2026 Grade 3 ELA Released Questions",
                "sourceUrl": "https://www.nysedregents.org/example.pdf",
                "stimuli": [
                    {
                        "id": "nysed-ela-2026-g3-stimulus-1-1",
                        "label": "Official passage for Question 1",
                        "questionStart": 1,
                        "questionEnd": 1,
                        "references": [
                            {
                                "label": "Official passage for Question 1",
                                "sourceUrl": "https://www.nysedregents.org/example.pdf",
                                "pageStart": 1,
                                "pageEnd": page_end,
                            }
                        ],
                        "passage": {
                            "src": "/vine-app/nysed/ela/2026/grade-3/en/passage-1-1.webp"
                        },
                    }
                ],
                "questions": [
                    {
                        "id": "nysed-ela-2026-g3-mc-q1",
                        "number": 1,
                        "stimulusId": "nysed-ela-2026-g3-stimulus-1-1",
                        "alt": "Question 1. Which detail best supports the main idea?",
                        "correct": "B",
                        "primaryStandard": "NGLS.ELA.Content.NY-3R2",
                        "secondaryStandards": ["NGLS.ELA.Content.NY-3R1"],
                        "skill": "key-ideas-details",
                        "image": {"src": "/vine-app/nysed/ela/2026/grade-3/en/q01.webp"},
                    }
                ],
            }
        ],
    }


class ElaExplanationInputExporterTests(unittest.TestCase):
    def test_exports_passage_text_and_question_authoring_fields(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            catalog_path = root / "catalog.json"
            catalog_path.write_text(json.dumps(_catalog()), encoding="utf-8")
            cache_root = root / "cache"
            _write_pdf(
                cache_root / "pdfs" / "2026-g3-en-release-fixture.pdf",
                ["Passage text from page one.", "Passage text from page two."],
            )

            outputs = export_explanation_inputs(
                catalog_path,
                cache_root,
                root / "output",
                years={2026},
                grades={3},
            )

            self.assertEqual([path.name for path in outputs], ["2026-grade-3.json"])
            payload = json.loads(outputs[0].read_text(encoding="utf-8"))
            self.assertEqual(payload["exam"]["id"], "nysed-ela-2026-grade-3-mc-v1")
            self.assertEqual(payload["exam"]["cachedPdfFilename"], "2026-g3-en-release-fixture.pdf")
            self.assertEqual(payload["stimuli"][0]["extractionMethod"], "pdf-text")
            self.assertIn("Passage text from page one.", payload["stimuli"][0]["passageText"])
            self.assertIn("Passage text from page two.", payload["stimuli"][0]["passageText"])
            self.assertEqual(
                payload["questions"][0],
                {
                    "id": "nysed-ela-2026-g3-mc-q1",
                    "number": 1,
                    "stimulusId": "nysed-ela-2026-g3-stimulus-1-1",
                    "alt": "Question 1. Which detail best supports the main idea?",
                    "correct": "B",
                    "standards": [
                        "NGLS.ELA.Content.NY-3R2",
                        "NGLS.ELA.Content.NY-3R1",
                    ],
                    "primaryStandard": "NGLS.ELA.Content.NY-3R2",
                    "secondaryStandards": ["NGLS.ELA.Content.NY-3R1"],
                    "skill": "key-ideas-details",
                    "imagePath": "/vine-app/nysed/ela/2026/grade-3/en/q01.webp",
                },
            )

    def test_cached_pdf_must_be_unique(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            cache_root = Path(directory)
            with self.assertRaisesRegex(ExplanationInputError, "Missing cached PDF"):
                find_cached_pdf(cache_root, 2026, 3)

            first = cache_root / "one" / "2026-g3-en-release-first.pdf"
            first.parent.mkdir(parents=True)
            first.write_bytes(b"first")
            self.assertEqual(find_cached_pdf(cache_root, 2026, 3), first)

            second = cache_root / "two" / "2026-g3-en-release-second.pdf"
            second.parent.mkdir(parents=True)
            second.write_bytes(b"second")
            with self.assertRaisesRegex(ExplanationInputError, "Ambiguous cached PDFs"):
                find_cached_pdf(cache_root, 2026, 3)

    def test_uses_deterministic_passage_image_ocr_when_pdf_text_is_empty(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            catalog_path = root / "catalog.json"
            catalog_path.write_text(
                json.dumps(_catalog(page_end=1)),
                encoding="utf-8",
            )
            cache_root = root / "cache"
            _write_pdf(
                cache_root / "pdfs" / "2026-g3-en-release-blank.pdf",
                [""],
            )
            public_root = root / "public"
            passage_path = public_root / "nysed" / "ela" / "2026" / "grade-3" / "en" / "passage-1-1.webp"
            passage_path.parent.mkdir(parents=True)
            passage = Image.new("RGB", (600, 400), "white")
            ImageDraw.Draw(passage).text((40, 40), "1 Passage OCR fixture.", fill="black")
            passage.save(passage_path, format="WEBP", lossless=True)

            completed = mock.Mock(
                returncode=0,
                stdout="1   Passage OCR fixture.\n2   Number marker remains.\n",
                stderr="",
            )
            with mock.patch(
                "scripts.export_nysed_ela_explanation_inputs.subprocess.run",
                return_value=completed,
            ) as run:
                outputs = export_explanation_inputs(
                    catalog_path,
                    cache_root,
                    root / "output",
                    public_root=public_root,
                    tesseract_binary="/fixture/tesseract",
                )

            payload = json.loads(outputs[0].read_text(encoding="utf-8"))
            self.assertEqual(
                payload["stimuli"][0]["extractionMethod"],
                "tesseract-passage-webp",
            )
            self.assertIn("1 Passage OCR fixture.", payload["stimuli"][0]["passageText"])
            self.assertIn("2 Number marker remains.", payload["stimuli"][0]["passageText"])
            command = run.call_args.args[0]
            self.assertEqual(command[0], "/fixture/tesseract")
            self.assertEqual(command[command.index("--psm") + 1], "6")
            self.assertEqual(run.call_args.kwargs["env"]["OMP_THREAD_LIMIT"], "1")

    def test_empty_pdf_and_ocr_text_fail_closed(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            catalog_path = root / "catalog.json"
            catalog_path.write_text(
                json.dumps(_catalog(page_end=1)),
                encoding="utf-8",
            )
            cache_root = root / "cache"
            _write_pdf(
                cache_root / "pdfs" / "2026-g3-en-release-blank.pdf",
                [""],
            )
            public_root = root / "public"
            passage_path = public_root / "nysed" / "ela" / "2026" / "grade-3" / "en" / "passage-1-1.webp"
            passage_path.parent.mkdir(parents=True)
            Image.new("RGB", (600, 400), "white").save(
                passage_path,
                format="WEBP",
                lossless=True,
            )

            completed = mock.Mock(returncode=0, stdout="\n\f\n", stderr="")
            with mock.patch(
                "scripts.export_nysed_ela_explanation_inputs.subprocess.run",
                return_value=completed,
            ):
                with self.assertRaisesRegex(
                    ExplanationInputError,
                    "no extractable PDF text or passage-image OCR text",
                ):
                    export_explanation_inputs(
                        catalog_path,
                        cache_root,
                        root / "output",
                        public_root=public_root,
                        tesseract_binary="/fixture/tesseract",
                    )


if __name__ == "__main__":
    unittest.main()

from __future__ import annotations

import unittest

import numpy as np
from PIL import Image, ImageDraw

from scripts.nysed_ela_passages import stitch_passage_pages


def synthetic_passage_page(number: int, *, edge_bars: bool = False) -> Image.Image:
    page = Image.new("RGB", (600, 800), "white")
    draw = ImageDraw.Draw(page)
    if edge_bars:
        draw.rectangle((0, 0, 44, 799), fill="black")
        draw.rectangle((555, 0, 599, 799), fill="black")
    draw.text((70, 65), f"Passage page {number}", fill="black")
    draw.text((48, 145), str(number), fill=(0, 0, 255))
    draw.rectangle((92, 145, 515, 166), fill="black")
    draw.rectangle((92, 205, 485, 226), fill="black")
    draw.rectangle((92, 265, 525, 286), fill="black")
    draw.rectangle((92, 335, 470, 356), fill="black")
    # Physical-page chrome lives below the renderer's reviewed content lane.
    draw.text((480, 716), "GO ON", fill=(255, 0, 0))
    draw.line((48, 744, 552, 744), fill=(255, 0, 0), width=3)
    draw.text((280, 770), str(number), fill=(255, 0, 0))
    return page


class ElaPassageStitchTests(unittest.TestCase):
    def test_preserves_number_gutter_and_removes_physical_page_chrome(self) -> None:
        stitched = stitch_passage_pages(
            [synthetic_passage_page(1), synthetic_passage_page(2)],
            dpi=160,
            label="synthetic two-page passage",
        )

        pixels = np.asarray(stitched)
        blue = (pixels[:, :, 2] > 180) & (pixels[:, :, 0] < 80)
        red = (pixels[:, :, 0] > 180) & (pixels[:, :, 1] < 80)
        self.assertGreater(int(blue.sum()), 0, "printed line/paragraph numbers should remain")
        self.assertEqual(int(red.sum()), 0, "GO ON, footer rules, and page numbers should be removed")
        self.assertLess(stitched.height, 1_000, "trimmed pages should join without full-page gaps")

    def test_removes_dark_scan_bars_before_common_horizontal_crop(self) -> None:
        stitched = stitch_passage_pages(
            [synthetic_passage_page(1, edge_bars=True)],
            dpi=160,
            label="scanned passage",
        )
        gray = np.asarray(stitched.convert("L"))
        self.assertGreater(float(gray[:, :4].mean()), 245.0)
        self.assertGreater(float(gray[:, -4:].mean()), 245.0)

    def test_keeps_low_body_content_above_a_centered_legacy_page_number(self) -> None:
        page = synthetic_passage_page(1)
        draw = ImageDraw.Draw(page)
        draw.rectangle((80, 685, 420, 705), fill=(0, 180, 0))
        stitched = stitch_passage_pages([page], dpi=160, label="legacy passage")
        pixels = np.asarray(stitched)
        green = (pixels[:, :, 1] > 120) & (pixels[:, :, 0] < 80)
        red = (pixels[:, :, 0] > 180) & (pixels[:, :, 1] < 80)
        self.assertGreater(int(green.sum()), 0, "low passage content should remain")
        self.assertEqual(int(red.sum()), 0, "legacy page chrome should be removed")

    def test_output_pixels_are_deterministic(self) -> None:
        pages = [synthetic_passage_page(1), synthetic_passage_page(2)]
        first = stitch_passage_pages(pages, dpi=160)
        second = stitch_passage_pages(pages, dpi=160)
        self.assertEqual(first.size, second.size)
        self.assertTrue(np.array_equal(np.asarray(first), np.asarray(second)))

    def test_normalizes_minor_source_page_width_differences(self) -> None:
        first = synthetic_passage_page(1)
        second = synthetic_passage_page(2).resize((601, 800))
        stitched = stitch_passage_pages([first, second], dpi=160)
        self.assertGreater(stitched.width, 420)
        self.assertGreater(stitched.height, 500)


if __name__ == "__main__":
    unittest.main()

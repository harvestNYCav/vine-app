from __future__ import annotations

import unittest

from PIL import Image

from scripts.import_nysed_math_mc import (
    Marker,
    remap_markers_to_gray_box_positions,
)


class MarkerDpiRetryTests(unittest.TestCase):
    def test_high_dpi_identities_reuse_original_crop_coordinates(self) -> None:
        box = Image.new("L", (40, 40), 255)
        original_positions = [
            (8, 45.9, box),
            (9, 222.3, box),
        ]
        retry_markers = [
            Marker(4, 8, 46.2, 40.0, 0.0, "gray-box-verified"),
            Marker(41, 9, 222.6, 40.0, 0.0, "gray-box-verified"),
        ]

        remapped = remap_markers_to_gray_box_positions(
            retry_markers,
            original_positions,
        )

        self.assertIsNotNone(remapped)
        self.assertEqual([marker.number for marker in remapped or []], [4, 41])
        self.assertEqual([marker.top for marker in remapped or []], [45.9, 222.3])
        self.assertTrue(
            all(marker.method.endswith("-render-dpi-remap") for marker in remapped or [])
        )

    def test_retry_cannot_reuse_or_guess_a_different_gray_box(self) -> None:
        box = Image.new("L", (40, 40), 255)
        positions = [(8, 45.9, box)]

        self.assertIsNone(
            remap_markers_to_gray_box_positions(
                [
                    Marker(4, 8, 46.2, 40.0, 0.0, "gray-box-verified"),
                    Marker(5, 8, 46.3, 40.0, 0.0, "gray-box-verified"),
                ],
                positions,
            )
        )
        self.assertIsNone(
            remap_markers_to_gray_box_positions(
                [Marker(4, 8, 60.0, 40.0, 0.0, "gray-box-verified")],
                positions,
            )
        )


if __name__ == "__main__":
    unittest.main()

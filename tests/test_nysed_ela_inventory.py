from __future__ import annotations

import json
import sys
import tempfile
import unittest
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO_ROOT / "scripts"))

from nysed_ela_inventory import (  # noqa: E402
    EXPECTED_QUESTION_COUNT,
    INVENTORY_PATH,
    ElaInventoryError,
    load_modern_mc_inventory,
)


class ModernElaInventoryTests(unittest.TestCase):
    def test_reviewed_fixture_has_exact_release_and_question_totals(self) -> None:
        inventory = load_modern_mc_inventory()
        self.assertEqual(len(inventory), 60)
        self.assertEqual(sum(map(len, inventory.values())), EXPECTED_QUESTION_COUNT)
        self.assertEqual(inventory[(2016, 3)][0], (1, 1))
        self.assertEqual(inventory[(2026, 8)][-1], (42, 2))

    def test_tampered_identity_fails_the_hardcoded_sha(self) -> None:
        raw = json.loads(INVENTORY_PATH.read_text(encoding="utf-8"))
        raw["releases"]["2026-8"]["session2"][-1] = 43
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "inventory.json"
            path.write_text(json.dumps(raw), encoding="utf-8")
            with self.assertRaisesRegex(ElaInventoryError, "SHA-256"):
                load_modern_mc_inventory(path)


if __name__ == "__main__":
    unittest.main()

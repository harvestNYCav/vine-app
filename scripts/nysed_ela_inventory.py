#!/usr/bin/env python3
"""Load the reviewed NYSED ELA modern multiple-choice item inventory."""

from __future__ import annotations

import hashlib
import json
import re
from pathlib import Path
from typing import Any


INVENTORY_PATH = Path(__file__).with_name("nysed_ela_mc_inventory.json")
EXPECTED_SCHEMA_VERSION = 1
EXPECTED_SOURCE_INDEX_URL = "https://www.nysedregents.org/ei/ei-ela.html"
EXPECTED_ITEM_TYPE = "Multiple Choice"
EXPECTED_RELEASE_COUNT = 60
EXPECTED_QUESTION_COUNT = 1_314
EXPECTED_INVENTORY_SHA256 = (
    "27a8b41de5a59aaf3b7291c886ea21592dc684879a8cf183265da1280cb45d71"
)
MODERN_YEARS = (2016, 2017, 2018, 2019, 2021, 2022, 2023, 2024, 2025, 2026)
GRADES = (3, 4, 5, 6, 7, 8)


class ElaInventoryError(RuntimeError):
    """The checked-in official MC identity fixture is missing or invalid."""


def _integer_list(value: Any, *, label: str) -> list[int]:
    if not isinstance(value, list) or any(
        not isinstance(number, int) or isinstance(number, bool) for number in value
    ):
        raise ElaInventoryError(f"ELA MC inventory {label} must be an integer array")
    if any(number < 1 or number > 100 for number in value):
        raise ElaInventoryError(f"ELA MC inventory {label} contains an invalid item number")
    if value != sorted(set(value)):
        raise ElaInventoryError(f"ELA MC inventory {label} must be sorted and unique")
    return value


def load_modern_mc_inventory(
    path: Path = INVENTORY_PATH,
) -> dict[tuple[int, int], tuple[tuple[int, int], ...]]:
    """Return exact ordered ``(number, session)`` pairs for all 60 releases.

    Both the fixture and this loader pin the canonical SHA-256.  Updating the
    official identity inventory therefore requires an explicit reviewed code
    change as well as a fixture change.
    """

    if path.is_symlink() or not path.is_file():
        raise ElaInventoryError(f"Missing or unsafe ELA MC inventory fixture: {path}")
    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise ElaInventoryError(f"Unreadable ELA MC inventory fixture: {path}") from exc
    if not isinstance(raw, dict) or set(raw) != {
        "schemaVersion",
        "sourceIndexUrl",
        "itemType",
        "modernQuestionCount",
        "inventorySha256",
        "releases",
    }:
        raise ElaInventoryError("ELA MC inventory fixture has an unexpected top-level schema")
    if raw["schemaVersion"] != EXPECTED_SCHEMA_VERSION:
        raise ElaInventoryError("ELA MC inventory schema version changed")
    if raw["sourceIndexUrl"] != EXPECTED_SOURCE_INDEX_URL:
        raise ElaInventoryError("ELA MC inventory source index changed")
    if raw["itemType"] != EXPECTED_ITEM_TYPE:
        raise ElaInventoryError("ELA MC inventory item type must be singular Multiple Choice")
    if raw["modernQuestionCount"] != EXPECTED_QUESTION_COUNT:
        raise ElaInventoryError("ELA MC inventory declared total changed")

    releases = raw["releases"]
    if not isinstance(releases, dict):
        raise ElaInventoryError("ELA MC inventory releases must be an object")
    canonical = json.dumps(
        releases,
        ensure_ascii=True,
        sort_keys=True,
        separators=(",", ":"),
    ).encode("utf-8")
    digest = hashlib.sha256(canonical).hexdigest()
    if raw["inventorySha256"] != digest or digest != EXPECTED_INVENTORY_SHA256:
        raise ElaInventoryError("ELA MC inventory SHA-256 self-check failed")

    expected_keys = {f"{year}-{grade}" for year in MODERN_YEARS for grade in GRADES}
    if set(releases) != expected_keys or len(releases) != EXPECTED_RELEASE_COUNT:
        raise ElaInventoryError("ELA MC inventory release matrix changed")

    result: dict[tuple[int, int], tuple[tuple[int, int], ...]] = {}
    total = 0
    for key in sorted(releases, key=lambda value: tuple(map(int, value.split("-")))):
        if not re.fullmatch(r"20\d{2}-[3-8]", key):
            raise ElaInventoryError(f"Malformed ELA MC inventory release key: {key!r}")
        release = releases[key]
        if not isinstance(release, dict) or set(release) != {"session1", "session2"}:
            raise ElaInventoryError(f"Malformed ELA MC inventory release: {key}")
        session1 = _integer_list(release["session1"], label=f"{key} session1")
        session2 = _integer_list(release["session2"], label=f"{key} session2")
        all_numbers = session1 + session2
        if all_numbers != sorted(set(all_numbers)):
            raise ElaInventoryError(f"ELA MC inventory sessions overlap or are out of order: {key}")
        year, grade = map(int, key.split("-"))
        result[(year, grade)] = tuple(
            [(number, 1) for number in session1]
            + [(number, 2) for number in session2]
        )
        total += len(all_numbers)
    if total != EXPECTED_QUESTION_COUNT:
        raise ElaInventoryError(
            f"ELA MC inventory total mismatch: expected {EXPECTED_QUESTION_COUNT}, got {total}"
        )
    return result


__all__ = (
    "EXPECTED_INVENTORY_SHA256",
    "EXPECTED_QUESTION_COUNT",
    "ElaInventoryError",
    "INVENTORY_PATH",
    "load_modern_mc_inventory",
)

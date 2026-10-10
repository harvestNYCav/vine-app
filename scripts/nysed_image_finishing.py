"""Exact-source, geometry-pinned presentation repairs reviewed in NYSED round 2."""

import hashlib
import json
from pathlib import Path

from PIL import Image, ImageDraw

POLICY_VERSION = "nysed-image-finishing-1"
MANIFEST = Path(__file__).resolve().parents[1] / "content/nysed-image-finishing.json"


def finishing_cache_policy(directory: str, kind: str) -> str | None:
    """Invalidate only affected rendering caches when reviewed geometry changes."""
    prefix = directory.rstrip("/") + "/" + kind
    records = {k: v for k, v in json.loads(MANIFEST.read_text())["images"].items() if k.startswith(prefix)}
    if not records:
        return None
    digest = hashlib.sha256(json.dumps(records, sort_keys=True, separators=(",", ":")).encode()).hexdigest()
    return f"{POLICY_VERSION}:{digest}"


def finish_reviewed_image(image: Image.Image, *, asset: str, source_sha256: str) -> Image.Image:
    record = json.loads(MANIFEST.read_text())["images"].get(asset)
    if record is None:
        return image
    if source_sha256 != record["sourcePdfSha256"] or list(image.size) != record["inputSize"]:
        raise ValueError(f"Reviewed image finishing source/geometry changed: {asset}")
    result = image.convert("RGB")
    for left, top, right, bottom in record.get("clearRects", []):
        if not (0 <= left < right <= image.width and 0 <= top < bottom <= image.height):
            raise ValueError(f"Invalid reviewed item-code mask: {asset}")
        ImageDraw.Draw(result).rectangle((left, top, right, bottom), fill="white")
    if "crop" in record:
        left, top, right, bottom = record["crop"]
        if not (0 <= left < right <= image.width and 0 <= top < bottom <= image.height):
            raise ValueError(f"Invalid reviewed crop: {asset}")
        result = result.crop((left, top, right, bottom))
    if "gap" in record:
        y, height = record["gap"]
        if not (0 < y < result.height and 0 < height < 100):
            raise ValueError(f"Invalid reviewed stanza gap: {asset}")
        expanded = Image.new("RGB", (result.width, result.height + height), "white")
        expanded.paste(result.crop((0, 0, result.width, y)), (0, 0))
        expanded.paste(result.crop((0, y, result.width, result.height)), (0, y + height))
        result = expanded
    return result

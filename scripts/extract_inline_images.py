#!/usr/bin/env python3
"""Extract data:image URIs from index.html into hashed WebP assets."""
from __future__ import annotations

import base64
import hashlib
import io
import re
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
HTML_PATH = ROOT / "index.html"
OUT_DIR = ROOT / "assets" / "img"
IMG_RE = re.compile(
    r'(<img\b)([^>]*?)(src=")(data:image/(png|jpeg|jpg|gif|webp);base64,[^"]+)(")([^>]*)(>)',
    re.IGNORECASE,
)
SLUG_RE = re.compile(r"[^a-z0-9]+")


def slug(alt: str, digest: str) -> str:
    base = SLUG_RE.sub("-", (alt or "image").lower()).strip("-")[:48] or "image"
    return f"{base}-{digest[:10]}"


def to_webp(raw: bytes) -> bytes:
    image = Image.open(io.BytesIO(raw))
    if image.mode not in {"RGB", "RGBA"}:
        image = image.convert("RGBA" if "A" in image.mode else "RGB")
    buf = io.BytesIO()
    image.save(buf, format="WEBP", quality=78, method=6)
    return buf.getvalue()


def patch_attrs(prefix: str, mid: str, suffix: str, *, lazy: bool) -> str:
    attrs = f"{prefix}{mid}{suffix}"
    self_closing = False
    stripped = attrs.rstrip()
    if stripped.endswith("/"):
        self_closing = True
        attrs = stripped[:-1].rstrip()
    if lazy and "loading=" not in attrs.lower():
        attrs += ' loading="lazy" decoding="async"'
    elif "decoding=" not in attrs.lower():
        attrs += ' decoding="async"'
    if self_closing:
        attrs += " /"
    return attrs


def main() -> None:
    html = HTML_PATH.read_text(encoding="utf-8")
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    cache: dict[str, str] = {}
    seen_brand = False
    converted = 0

    def replace(match: re.Match[str]) -> str:
        nonlocal seen_brand, converted
        start, before, src_eq, data_uri, _kind, quote, after, end = match.groups()
        header, b64 = data_uri.split(",", 1)
        digest = hashlib.sha256(b64.encode("ascii")).hexdigest()
        if digest in cache:
            rel = cache[digest]
        else:
            raw = base64.b64decode(b64)
            payload = to_webp(raw)
            alt_m = re.search(r'\balt="([^"]*)"', before + after)
            name = slug(alt_m.group(1) if alt_m else "image", digest)
            dest = OUT_DIR / f"{name}.webp"
            dest.write_bytes(payload)
            rel = f"/assets/img/{dest.name}"
            cache[digest] = rel
            converted += 1
        is_brand = "brand-logo" in before or "brand-logo" in after
        lazy = not (is_brand and not seen_brand)
        if is_brand:
            seen_brand = True
        attrs = patch_attrs(before, f"{src_eq}{rel}{quote}", after, lazy=lazy)
        return f"{start}{attrs}{end}"

    new_html = IMG_RE.sub(replace, html)
    leftover = new_html.count("data:image/")
    HTML_PATH.write_text(new_html, encoding="utf-8")
    print(f"files={converted} unique={len(cache)} leftover_data_uri={leftover} bytes={HTML_PATH.stat().st_size}")


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""Build a curated static artifact for a Cloudflare Pages direct upload."""

from __future__ import annotations

import shutil
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SITE = ROOT / ".cloudflare-site"

PUBLIC_FILES = [
    ".nojekyll",
    "404.html",
    "_headers",
    "_redirects",
    "app.js",
    "favicon.svg",
    "index.html",
    "ireland.css",
    "ireland.html",
    "ireland.js",
    "og.png",
    "print-studio.html",
    "robots.txt",
    "site.webmanifest",
    "sitemap.xml",
    "static.html",
    "styles.css",
    "sw.js",
]
PUBLIC_DATA_FILES = [
    "data/geometry.csv",
    "data/geometry.js",
    "data/geometry.json",
    "data/geometry.schema.json",
]
PUBLIC_ICON_FILES = [
    "icons/atlas-180.png",
    "icons/atlas-192.png",
    "icons/atlas-512.png",
    "icons/atlas-maskable.svg",
]
PUBLIC_RESEARCH_FILES = [
    "research/README.md",
    "research/acquired-assets.json",
    "research/analysis-method.md",
    "research/annotated-atlas.html",
    "research/asset-measurements.json",
    "research/constructor-evidence.json",
    "research/data-probes.json",
    "research/geometry-analysis.json",
    "research/image-manifest.json",
    "research/measurement-register.json",
    "research/model-metadata.json",
    "research/next-acquisition-prompt.md",
    "research/scan-manifest.json",
    "research/st-pauls-colmap.json",
]
PUBLIC_RESEARCH_FILES += [
    path.relative_to(ROOT).as_posix()
    for path in sorted((ROOT / "research" / "images").glob("*.jpg"))
]


def copy_file(relative_path: str) -> None:
    source = ROOT / relative_path
    if not source.is_file():
        raise SystemExit(f"Missing Cloudflare public file: {relative_path}")
    destination = SITE / relative_path
    destination.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(source, destination)


def main() -> None:
    if SITE.exists():
        shutil.rmtree(SITE)
    SITE.mkdir()
    all_files = PUBLIC_FILES + PUBLIC_DATA_FILES + PUBLIC_ICON_FILES + PUBLIC_RESEARCH_FILES
    for path in all_files:
        copy_file(path)
    expected = set(all_files)
    actual = {path.relative_to(SITE).as_posix() for path in SITE.rglob("*") if path.is_file()}
    if actual != expected:
        raise SystemExit(f"Unexpected Cloudflare artifact contents: {sorted(actual)}")
    print(f"Prepared curated Cloudflare Pages artifact with {len(actual)} public files.")


if __name__ == "__main__":
    main()

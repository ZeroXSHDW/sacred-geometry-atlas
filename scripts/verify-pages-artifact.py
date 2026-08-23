#!/usr/bin/env python3
"""Verify the final, URL-stamped GitHub Pages artifact before upload."""

from __future__ import annotations

import csv
import json
import os
import re
from pathlib import Path
from urllib.parse import quote


def fail(message: str) -> None:
    raise SystemExit(message)


base_value = os.environ.get("PAGES_BASE_URL", "").strip()
if not base_value:
    fail("PAGES_BASE_URL is required to verify the Pages artifact")
base_url = base_value.rstrip("/") + "/"
schema_target = f"{base_url}data/geometry.schema.json"
site = Path(os.environ.get("PAGES_SITE_DIR", "_site"))

if not site.is_dir():
    fail(f"Pages artifact directory is missing: {site}")

expected_files = {
    ".nojekyll",
    "404.html",
    "app.js",
    "favicon.svg",
    "icons/atlas-180.png",
    "icons/atlas-192.png",
    "icons/atlas-512.png",
    "icons/atlas-maskable.svg",
    "index.html",
    "og.png",
    "robots.txt",
    "site.webmanifest",
    "sitemap.xml",
    "static.html",
    "styles.css",
    "sw.js",
    "data/geometry.csv",
    "data/geometry.js",
    "data/geometry.json",
    "data/geometry.schema.json",
}
custom_domain = Path("CNAME")
if custom_domain.is_file():
    expected_files.add("CNAME")
actual_files = {path.relative_to(site).as_posix() for path in site.rglob("*") if path.is_file()}
if actual_files != expected_files:
    fail(f"Published artifact contains unexpected files: {sorted(actual_files)}")
if custom_domain.is_file() and (site / "CNAME").read_text() != custom_domain.read_text():
    fail("Published custom-domain CNAME does not match the repository CNAME")

page = (site / "index.html").read_text()
static_page = (site / "static.html").read_text()
manifest = (site / "site.webmanifest").read_text()
service_worker = (site / "sw.js").read_text()
not_found = (site / "404.html").read_text()
robots = (site / "robots.txt").read_text()
sitemap = (site / "sitemap.xml").read_text()

cache_match = re.search(r'const CACHE_NAME = "([^"]+)";', service_worker)
if not cache_match:
    fail("Published service worker does not expose a cache name")
cache_name = cache_match.group(1)
expected_cache_name = os.environ.get("PAGES_CACHE_NAME", "").strip()
if expected_cache_name:
    if cache_name != expected_cache_name:
        fail(f"Published service-worker cache name {cache_name!r} does not match the deployment revision {expected_cache_name!r}")
elif not re.fullmatch(r"sacred-geometry-atlas-(?:v2|[0-9a-f]{40})", cache_name):
    fail(f"Published service-worker cache name is not a local v2 or revision fingerprint: {cache_name!r}")

shell_match = re.search(r"const SHELL_PATHS = \[(.*?)\];", service_worker, re.S)
if not shell_match:
    fail("Published service worker does not expose its static shell paths")
shell_paths = re.findall(r'"([^"]+)"', shell_match.group(1))
shell_files = {
    "index.html" if path in (".", "./") else path.lstrip("./")
    for path in shell_paths
}
missing_shell_files = sorted(path for path in shell_files if path not in actual_files)
if missing_shell_files:
    fail(f"Published service-worker shell references files outside the Pages artifact: {missing_shell_files}")
expected_page = [
    '<meta name="theme-color" media="(prefers-color-scheme: dark)" content="#111817" />',
    '<meta name="theme-color" media="(prefers-color-scheme: light)" content="#f4f6f1" />',
    f'<link rel="canonical" href="{base_url}" />',
    '<link rel="manifest" href="site.webmanifest" />',
    '<link rel="apple-touch-icon" sizes="180x180" href="icons/atlas-180.png" />',
    f'<meta property="og:url" content="{base_url}" />',
    f'<meta property="og:image" content="{base_url}og.png" />',
    f'<meta name="twitter:image" content="{base_url}og.png" />',
    f'"@id": "{base_url}data/geometry.json"',
    f'"contentUrl": "{base_url}data/geometry.json"',
    f'"contentUrl": "{base_url}data/geometry.csv"',
    f'"contentUrl": "{schema_target}"',
]
missing = [token for token in expected_page if token not in page]
missing.extend(token for token in [
    f"Sitemap: {base_url}sitemap.xml",
    f"<loc>{base_url}</loc>",
    f"<loc>{base_url}static.html</loc>",
    f"<loc>{base_url}data/geometry.json</loc>",
    f"<loc>{base_url}data/geometry.csv</loc>",
    f"<loc>{schema_target}</loc>",
] if token not in robots + sitemap)
missing.extend(token for token in [
    '<meta name="theme-color" media="(prefers-color-scheme: dark)" content="#111817" />',
    '<meta name="theme-color" media="(prefers-color-scheme: light)" content="#f4f6f1" />',
    f'<a class="home-link" data-site-root href="{base_url}">',
    f'<a class="home-link home-link-secondary" data-site-method href="{base_url}#method">',
    f'<a class="home-link home-link-secondary" data-site-static href="{base_url}static.html">',
    f'<a class="home-link home-link-secondary" data-site-dataset href="{base_url}data/geometry.json">',
    f'<a class="home-link home-link-secondary" data-site-csv href="{base_url}data/geometry.csv">',
    f'<a class="home-link home-link-secondary" data-site-schema href="{schema_target}">',
    f'<link rel="icon" id="site-favicon" href="{base_url}favicon.svg" type="image/svg+xml" />',
    f'<link rel="manifest" id="site-manifest" href="{base_url}site.webmanifest" />',
    f'<link rel="apple-touch-icon" id="site-apple-touch-icon" sizes="180x180" href="{base_url}icons/atlas-180.png" />',
    '<meta name="application-name" content="Sacred Geometry Atlas" />',
    '<meta name="mobile-web-app-capable" content="yes" />',
    '<meta name="apple-mobile-web-app-capable" content="yes" />',
    '<meta name="apple-mobile-web-app-title" content="Geometry Atlas" />',
] if token not in not_found)
if missing:
    fail("Deployed metadata is incomplete: " + ", ".join(missing))

static_required = [
    '<title>Static collection · Sacred Geometry Atlas</title>',
    '<meta name="description" content="The static, no-JavaScript collection index for the Sacred Geometry Atlas." />',
    '<link rel="stylesheet" href="styles.css" />',
    '<body class="static-fallback-page">',
    '<section class="noscript-index" role="main" aria-labelledby="noscript-heading">',
    '<section class="noscript-method" aria-labelledby="noscript-method-heading">',
    '<a class="nav-button" href="./">Interactive atlas</a>',
    '<a class="nav-button is-active" href="#noscript-heading" aria-current="page">Collection</a>',
    'href="data/geometry.json"',
    'href="data/geometry.csv"',
    'href="data/geometry.schema.json"',
]
missing_static = [token for token in static_required if token not in static_page]
if missing_static:
    fail("Published static collection fallback is incomplete: " + ", ".join(missing_static))
if "<script" in static_page.lower():
    fail("Published static collection fallback must remain script-free")

try:
    manifest_data = json.loads(manifest)
except json.JSONDecodeError as error:
    fail(f"Published web manifest is not valid JSON: {error}")
manifest_icons = {
    icon.get("src"): icon
    for icon in manifest_data.get("icons", [])
    if isinstance(icon, dict) and isinstance(icon.get("src"), str)
}
required_manifest_icons = {
    "icons/atlas-192.png": {"sizes": "192x192", "type": "image/png"},
    "icons/atlas-512.png": {"sizes": "512x512", "type": "image/png"},
    "icons/atlas-maskable.svg": {"sizes": "any", "type": "image/svg+xml", "purpose": "maskable"},
    "favicon.svg": {"sizes": "any", "type": "image/svg+xml"},
}
if (
    manifest_data.get("name") != "Sacred Geometry Atlas"
    or manifest_data.get("short_name") != "Geometry Atlas"
    or manifest_data.get("start_url") != "./"
    or manifest_data.get("scope") != "./"
    or manifest_data.get("display") != "standalone"
    or manifest_data.get("theme_color") != "#111817"
    or any(
        manifest_icons.get(src, {}).get(key) != value
        for src, requirements in required_manifest_icons.items()
        for key, value in requirements.items()
    )
):
    fail("Published web manifest is missing its static Atlas identity or complete icon set")
required_shortcuts = {
    "./#atlas": "Explore Atlas",
    "./#compare": "Compare studies",
    "./#method": "Read Method",
}
manifest_shortcuts = {
    shortcut.get("url"): shortcut
    for shortcut in manifest_data.get("shortcuts", [])
    if isinstance(shortcut, dict) and isinstance(shortcut.get("url"), str)
}
if (
    not {"education", "reference"}.issubset(set(manifest_data.get("categories", [])))
    or any(
        manifest_shortcuts.get(url, {}).get("name") != name
        for url, name in required_shortcuts.items()
    )
):
    fail("Published web manifest is missing its Atlas navigation shortcuts")
for icon_path, width, height in (
    ("icons/atlas-180.png", 180, 180),
    ("icons/atlas-192.png", 192, 192),
    ("icons/atlas-512.png", 512, 512),
):
    icon_bytes = (site / icon_path).read_bytes()
    if (
        icon_bytes[:8] != b"\x89PNG\r\n\x1a\n"
        or int.from_bytes(icon_bytes[16:20], "big") != width
        or int.from_bytes(icon_bytes[20:24], "big") != height
    ):
        fail(f"Published icon has an invalid PNG signature or dimensions: {icon_path}")
if not all(token in service_worker for token in (
    'self.addEventListener("install"',
    'self.addEventListener("activate"',
    'self.addEventListener("fetch"',
    'static.html',
    'data/geometry.json',
    'networkFirst(request)',
)):
    fail("Published service worker is missing its versioned app shell or fetch strategy")
maskable_icon = (site / "icons/atlas-maskable.svg").read_text()
if '<rect width="32" height="32" fill="#111817"/>' not in maskable_icon or 'transform="translate(3.2 3.2) scale(.8)"' not in maskable_icon:
    fail("Published maskable icon does not preserve its opaque background and safe-zone mark")

try:
    dataset = json.loads((site / "data/geometry.json").read_text())
    published_schema = json.loads((site / "data/geometry.schema.json").read_text())
except (OSError, json.JSONDecodeError) as error:
    fail(f"Published data contract is not valid JSON: {error}")

if dataset.get("schemaUrl") != schema_target:
    fail("Published JSON does not point to the absolute Pages schema URL")
schema_properties = published_schema.get("properties", {}).get("schemaUrl", {})
schema_study = published_schema.get("$defs", {}).get("study", {})
status_values = dataset.get("schema", {}).get("statusValues", [])
published_status_values = schema_study.get("properties", {}).get("status", {}).get("enum", [])
if (
    published_schema.get("$id") != schema_target
    or schema_properties.get("const") != schema_target
    or published_status_values != status_values
):
    fail("Published JSON Schema does not match the stamped dataset contract")

studies = dataset.get("studies")
if not isinstance(studies, list):
    fail("Published JSON dataset is missing its studies array")

try:
    with (site / "data/geometry.csv").open(newline="", encoding="utf-8-sig") as handle:
        reader = csv.DictReader(handle)
        rows = list(reader)
except (OSError, csv.Error) as error:
    fail(f"Published CSV dataset could not be read: {error}")

required_csv_fields = {"ID", "Index", "Status", "Route", "Schema URL", "Reading profile basis"}
if not reader.fieldnames or not required_csv_fields.issubset(reader.fieldnames):
    fail("Published CSV is missing its index, route, status, or schema columns")
if len(rows) != len(studies):
    fail(f"Published CSV has {len(rows)} records; expected {len(studies)}")
expected_profile_context = "linearity = length ÷ span · verticality = height ÷ span · radiality = typology cue · repetition = bay count; Interpretive proportional tendencies, not empirical measurements."
for study, row in zip(studies, rows):
    if row.get("ID") != study.get("id") or row.get("Index") != study.get("index") or row.get("Status") != study.get("status"):
        fail(f"Published CSV row does not match dataset record: {study.get('id')}")
    encoded_id = quote(str(study.get("id", "")), safe="-_.!~*'()")
    expected_route = f"#atlas/{encoded_id}/plan/exterior/all"
    if row.get("Route") != expected_route:
        fail(f"Published CSV route is not direct and deterministic for {study.get('id')}")
    if row.get("Schema URL") != schema_target:
        fail(f"Published CSV schema URL is not absolute for {study.get('id')}")
    if row.get("Reading profile basis") != expected_profile_context:
        fail(f"Published CSV reading-profile basis is missing or inconsistent for {study.get('id')}")

print(f"Published Pages artifact contract verified: {len(studies)} study rows and {len(actual_files)} public files.")

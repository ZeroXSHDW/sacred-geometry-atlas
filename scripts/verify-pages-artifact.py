#!/usr/bin/env python3
"""Verify the final, URL-stamped GitHub Pages artifact before upload."""

from __future__ import annotations

import csv
import json
import os
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
    "index.html",
    "og.png",
    "robots.txt",
    "sitemap.xml",
    "styles.css",
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
not_found = (site / "404.html").read_text()
robots = (site / "robots.txt").read_text()
sitemap = (site / "sitemap.xml").read_text()
expected_page = [
    f'<link rel="canonical" href="{base_url}" />',
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
    f"<loc>{base_url}data/geometry.json</loc>",
    f"<loc>{base_url}data/geometry.csv</loc>",
    f"<loc>{schema_target}</loc>",
] if token not in robots + sitemap)
missing.extend(token for token in [
    f'<a class="home-link" data-site-root href="{base_url}">',
    f'<a class="home-link home-link-secondary" data-site-dataset href="{base_url}data/geometry.json">',
    f'<a class="home-link home-link-secondary" data-site-csv href="{base_url}data/geometry.csv">',
    f'<a class="home-link home-link-secondary" data-site-schema href="{schema_target}">',
] if token not in not_found)
if missing:
    fail("Deployed metadata is incomplete: " + ", ".join(missing))

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

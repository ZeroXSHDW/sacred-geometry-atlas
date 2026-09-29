#!/usr/bin/env bash
# Lightweight CI for Sacred Geometry Atlas (static HTML/JS site).
# Wraps the existing pages-source validator plus shell syntax and README links.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "== required files =="
test -f README.md
test -f LICENSE
test -f index.html
test -f app.js
test -f styles.css
test -f data/geometry.js
test -f data/geometry.json
test -f data/geometry.schema.json
test -f scripts/validate-pages-source.sh
test -f scripts/validate-geometry-data.js
test -f scripts/sync-geometry-json.js

echo "== shell syntax =="
mapfile -t sh_files < <(find scripts -type f -name '*.sh' | sort)
for f in "${sh_files[@]}"; do
  echo "bash -n $f"
  bash -n "$f"
done

echo "== pages source validation =="
bash scripts/validate-pages-source.sh

echo "== README relative links =="
python3 scripts/ci-check-readme-links.py

echo "== validate OK =="

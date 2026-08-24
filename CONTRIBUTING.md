# Contributing to Sacred Geometry Atlas

## Before editing

Keep changes small and reviewable. Do not replace sourced building identities with placeholders, promote schematic values to measured claims without evidence, or add research assets without provenance and rights notes.

## Local verification

Run these commands from the repository root:

Use the exact Node.js version recorded in [`.node-version`](.node-version)
before running the JavaScript checks or generators.

```bash
node --check app.js
node --check data/geometry.js
node --check sw.js
node --check scripts/sync-geometry-json.js
node --check scripts/validate-geometry-data.js
node scripts/validate-geometry-data.js
node scripts/sync-geometry-json.js --check
node scripts/validate-workflow.mjs
python3 -m py_compile scripts/prepare-cloudflare-site.py scripts/verify-pages-artifact.py
python3 scripts/prepare-cloudflare-site.py
test -s .cloudflare-site/ireland.html
test -s .cloudflare-site/research/annotated-atlas.html
test -s .cloudflare-site/_redirects
test -s .cloudflare-site/_headers
git diff --check
```

If either workflow or its inline checks change, run `actionlint -shellcheck '' .github/workflows/pages.yml .github/workflows/cloudflare-pages.yml` when it is available. The local Cloudflare command only assembles and inspects the public artifact; it does not deploy or contact Cloudflare. Use a local static server for browser and keyboard/accessibility checks; do not run a deployment workflow as a substitute for review.

## Data and generated files

Edit `data/geometry.js` as the source of truth. Regenerate the committed JSON, CSV, JSON Schema, and `static.html` outputs with `node scripts/sync-geometry-json.js` and keep the generated diff in the same pull request. Preserve absolute `http` or `https` provenance URLs and the explicit `schematic` versus `measured` distinction.

## Pull requests

Describe the user-visible behavior, provenance or security impact, generated files, commands run, browser checks performed, and any external limitation. Never include secrets or private client data in commits, issue comments, screenshots, or logs.

# Contributing to Sacred Geometry Atlas

## Before editing

Keep changes small and reviewable. Do not replace sourced building identities with placeholders, promote schematic values to measured claims without evidence, or add research assets without provenance and rights notes.

## Local verification

Run these commands from the repository root:

```bash
node --check app.js
node --check data/geometry.js
node --check sw.js
node --check scripts/sync-geometry-json.js
node --check scripts/validate-geometry-data.js
node scripts/validate-geometry-data.js
node scripts/sync-geometry-json.js --check
node scripts/validate-workflow.mjs
python3 -m py_compile scripts/verify-pages-artifact.py
git diff --check
```

If the workflow or its inline Pages checks change, run `actionlint` when it is available. Use a local static server for browser and keyboard/accessibility checks; do not run the Pages deployment workflow as a substitute for review.

## Data and generated files

Edit `data/geometry.js` as the source of truth. Regenerate the committed JSON, CSV, JSON Schema, and `static.html` outputs with `node scripts/sync-geometry-json.js` and keep the generated diff in the same pull request. Preserve absolute `http` or `https` provenance URLs and the explicit `schematic` versus `measured` distinction.

## Pull requests

Describe the user-visible behavior, provenance or security impact, generated files, commands run, browser checks performed, and any external limitation. Never include secrets or private client data in commits, issue comments, screenshots, or logs.

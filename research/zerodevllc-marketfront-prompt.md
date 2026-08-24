# Reusable implementation prompt

You are a senior static-web product engineer, information designer, and research-data editor. Work in the repository at `/Users/admin/Desktop/Churches`.

Extend the existing Sacred Geometry Atlas into a credible ZERODEVLLC.EU marketfront project called **Ireland Map Design Lab**.

## Product goal

Create a research-led, accessible flow that:

1. explains how a schematic map of Ireland is built from layers;
2. shows design maths and symbolic cues without pretending that the prototype is a legal or measured boundary map;
3. lets a visitor compose an original map-based garment concept;
4. exports transparent, print-ready SVG and PNG artwork;
5. explains the handoff from design → provider upload → sample → fulfilment/shipping;
6. exposes clean Cloudflare Pages redirects for the marketfront and print-to-ship research links;
7. remains deployable from GitHub Actions and usable as a static GitHub Pages fallback.

## Existing project constraints

- Preserve the existing church atlas, its hash routes, research data, no-JavaScript fallback, comparison tools, service worker, and validation contract.
- Keep the implementation dependency-light: plain HTML, CSS, JavaScript, and Python helper scripts are preferred.
- Do not add a server, database, login, payment flow, provider API integration, or secret key to the static site.
- Keep all data claims labelled as schematic, rounded, approximate, or source-backed as appropriate.
- Keep map and symbol artwork original or clearly marked as a prototype; do not copy protected logos, official seals, or unlicensed map tiles.
- Preserve keyboard navigation, focus states, reduced-motion support, touch-sized controls, forced-colour support, and responsive layouts.

## Ireland Map Design Lab requirements

- Add `ireland.html`, `ireland.css`, and `ireland.js`.
- Add a route from the main atlas navigation, hero actions, footer, static fallback, and web-manifest shortcut.
- Build a visible SVG map studio with independent layers for island outline, province cues, rounded place anchors, grid/axes, and symbolic marks.
- Make map controls work with mouse, keyboard, and screen readers; use `aria-pressed`, live status text, titles, and meaningful SVG descriptions.
- Include an honest research note that the hand-simplified outline is a composition scaffold, not a navigation map, legal boundary, or measured survey.
- Include a design-maths panel with inspectable formulas such as grid count, width/height ratio, province count, and place-anchor count. Distinguish design-derived values from geographic measurements.
- Include a garment preview for at least a T-shirt, hoodie, and tote bag, with controls for map layer, palette, caption, and an original symbol cue.
- Make the artwork exportable as transparent SVG and 2400 × 3000 PNG, and provide a print sample sheet action.
- Include a four-step print-to-ship explanation: export, upload, sample, ship.
- Add provider handoffs to Printful, Printify, and Gelato. State clearly that these are outbound research links and that product, tax, shipping, returns, rights, and availability must be checked at order time.

## Cloudflare and GitHub requirements

- Add `_redirects` with:
  - `/marketfront` → `/ireland.html`;
  - `/ireland` → `/ireland.html`;
  - `/ireland-map` → `/ireland.html#map`;
  - `/ireland-design` → `/ireland.html#design`;
  - `/print-to-ship` → `/ireland.html#print`;
  - `/go/printful`, `/go/printify`, `/go/gelato` → their official provider pages.
- Add `_headers` with conservative security and cache headers.
- Add a curated Cloudflare artifact builder so repository notes, source scripts, and unverified research assets are not deployed accidentally.
- Add `.github/workflows/cloudflare-pages.yml` using `cloudflare/wrangler-action@v4`, `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, and the Pages project `zerodevllc-marketfront`.
- Extend the existing GitHub Pages artifact and service-worker shell so the Ireland lab is published there too.
- Document the custom-domain decision: Cloudflare Pages should be canonical for `ZERODEVLLC.EU`; do not point the same apex DNS at both GitHub Pages and Cloudflare Pages.

## Research requirements

Use official or primary sources where possible. Start with Tailte Éireann Boundary Data and GeoHive, Ireland’s open-data portal, Cloudflare Pages redirect/direct-upload/custom-domain docs, GitHub Pages custom-domain/action docs, and the official Printful/Printify/Gelato product or fulfilment documentation. Record links and evidence limits in `CLOUDFLARE-GITHUB.md` or a project research note.

## Acceptance checks

Run:

```bash
node --check ireland.js
python3 -m py_compile scripts/prepare-cloudflare-site.py
python3 scripts/prepare-cloudflare-site.py
node --check app.js
node scripts/validate-geometry-data.js
node scripts/sync-geometry-json.js --check
```

Then serve the repository with `python3 -m http.server 8000` and manually check desktop and approximately 390 px wide layouts. Test map layer toggles, place focus, garment controls, SVG/PNG downloads, print preview, direct and Cloudflare redirect links, no horizontal overflow, and the existing atlas routes.

Finish by reporting changed files, tests run, remaining external setup (Cloudflare secrets, Pages custom domain, DNS, provider accounts), and any map-data licensing decision that still needs a human owner.

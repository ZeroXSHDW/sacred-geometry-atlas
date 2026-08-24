# Sacred Geometry Atlas — 10/10 production prompt

You are a senior product designer, frontend engineer, visual information designer, and research-data editor. Work from the checked-out repository root and elevate the Sacred Geometry Atlas into a production-quality public experience.

## Outcome

Create a calm, editorial, responsive atlas that lets a visitor:

1. browse 99 real, named churches and sacred buildings;
2. inspect source-linked reference evidence and rights/provenance notes;
3. switch between plan, elevation, and section views;
4. compare an honest live schematic rendering with the real reference layer when a local image exists;
5. open a print-ready study sheet and export scalable SVG plus study JSON;
6. understand the handoff from design → proof → print → fulfilment/shipping.

The result should feel like a museum-quality research tool: distinctive, fast, legible, trustworthy, and useful on a phone as well as a large display.

## Non-negotiable truthfulness

- Use the existing 99-study dataset and preserve its IDs, source URLs, source notes, indexes, and validation contract.
- Never invent a church, image, measurement, attribution, licence, architectural feature, or historical claim.
- A schematic is a design interpretation, not a measured survey. Label that boundary beside every relevant rendering and export.
- If no local reference image is available, show an explicit `Source only` state; never use a generic or misleading substitute.
- Keep image source, attribution, retrieval date, rights status, and evidence scope visible or one click away.
- Keep commercial print/resale conditional on human rights review and provider proofing.

## Live atlas experience

- Make the first viewport immediately communicate the Atlas, the number of studies, the evidence boundary, and the primary action.
- Use a refined visual system: strong typographic hierarchy, generous spacing, restrained colour, crisp borders, intentional hover/focus states, and no decorative noise.
- Keep the data explorer fast: searchable/selectable study list, stable hash routes, keyboard navigation, accessible labels, live status text, and no horizontal overflow.
- Render plan/elevation/section schematics as crisp inline SVG or equivalent vector graphics. They must update immediately when the study, surface, or mode changes.
- Pair each schematic with the real local reference image when available, without implying scale, alignment, or survey accuracy.
- Show source, reference, rights, evidence status, and export actions in a consistent inspection panel.
- Include a no-JavaScript or static fallback for the core study collection.

## Print Studio and print-to-ship handoff

- Provide an unmistakable Print Studio route from the Atlas navigation and a stable `/print-studio` Cloudflare Pages route.
- Let the visitor select any study, surface, and view, then preview an A4 landscape study sheet with title, mode, schematic, reference layer, source link, evidence note, and rights note.
- Export an SVG that remains vector-editable and a JSON file containing the selected study and rendering state.
- Make `Print / save PDF` invoke the browser print flow with deliberate print CSS and no clipped panels.
- Explain the provider handoff without pretending it is an integrated order system. Link to official provider pages for research only; never upload or place an order without explicit credentials and confirmation.
- Include sample/proof guidance: verify dimensions, safe area, colour profile, image rights, paper or garment, shipping destination, VAT/customs, returns, and final product description.

## Hosting and asset discipline

- Keep the site static and dependency-light: plain HTML, CSS, JavaScript, SVG, JSON, and small Python build helpers.
- Publish only the curated public artifact to Cloudflare Pages; keep research notes and build-only files out of the deployed root.
- Keep GitHub Pages as a validated fallback where configured, while using one canonical custom-domain host.
- Cache immutable assets safely, preserve service-worker correctness, and avoid stale CSS collisions with deliberate versioning where needed.
- Never commit API tokens, provider credentials, private research, or unlicensed assets.

## Quality gates

Before finishing, run the repository validators and syntax checks, build the Cloudflare artifact, and verify:

- all 99 studies remain present and source-linked;
- every local reference image has a manifest entry and attribution/rights link;
- every image path resolves in the published artifact;
- desktop and approximately 390 px mobile layouts have no horizontal overflow;
- keyboard focus, reduced motion, forced colours, light/dark/system themes, and readable contrast work;
- study, surface, and mode changes update the SVG, reference state, metadata, print sheet, and hash route together;
- source-only studies are honest and visually understandable;
- SVG and JSON exports use the current study state;
- print preview is A4-ready and does not cut off critical evidence;
- the deployed route returns the new artifact before reporting success.

When a requirement depends on an external account, secret, DNS record, provider, or rights decision, stop at the boundary, state exactly what is missing, and provide the smallest safe handoff. Report changed files, tests, deployment URL, and any remaining human decision.

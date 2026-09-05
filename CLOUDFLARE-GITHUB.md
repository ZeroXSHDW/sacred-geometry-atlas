# ZERODEVLLC.EU marketfront deployment

The Sacred Geometry Print Studio is part of the same public artifact: it combines live vector renderings, real reference images when present, source and rights links, an A4 print sheet, and scalable SVG export.

The Ireland Map Design Lab is a static page at [`ireland.html`](ireland.html). It is designed to be tracked in GitHub and served from Cloudflare Pages, with the existing GitHub Pages workflow retained as a second publish target.

## Current deployed setup

The connected Cloudflare Pages project is `sacred-geometry-atlas`, sourced from
`ZeroXSHDW/sacred-geometry-atlas` on `main`. Its accepted production
deployment is a separate `pages.dev` catalogue surface; the current immutable
deployment URL and commit are recorded in the dated ZeroDevLLC workspace
evidence. GitHub Pages is also accepted for the same commit at
`https://zeroxshdw.github.io/sacred-geometry-atlas/`.

Neither deployment is connected to the canonical ZeroDevLLC domains. Do not
point the same apex domain at GitHub Pages and Cloudflare Pages at the same
time. A future canonical `ZERODEVLLC.EU` connection requires an owner/provider
decision, authoritative Cloudflare zone confirmation, and public acceptance
with rollback evidence.

For a new, separately approved Cloudflare Pages project or a future canonical
cutover:

1. Create or select the exact approved Cloudflare Pages project.
2. Add `ZERODEVLLC.EU` as a custom domain in the Pages project before relying on the DNS record. For an apex domain, Cloudflare requires the domain to be a Cloudflare zone and manages the Pages DNS connection after activation.
3. In GitHub repository settings → Secrets and variables → Actions, add:
   - `CLOUDFLARE_API_TOKEN` — a scoped token with Account → Cloudflare Pages → Edit.
   - `CLOUDFLARE_ACCOUNT_ID` — the Cloudflare account ID for the Pages project.
4. Push to `main`. `.github/workflows/cloudflare-pages.yml` creates a curated `.cloudflare-site` artifact and deploys it with Wrangler.
5. Verify these routes after the first deployment:
   - https://ZERODEVLLC.EU/print-studio
   - https://ZERODEVLLC.EU/research/annotated-atlas.html
   - `https://ZERODEVLLC.EU/marketfront`
   - `https://ZERODEVLLC.EU/ireland-map`
   - `https://ZERODEVLLC.EU/ireland-design`
   - `https://ZERODEVLLC.EU/print-to-ship`
   - `https://ZERODEVLLC.EU/go/printful`
   - `https://ZERODEVLLC.EU/go/printify`
   - `https://ZERODEVLLC.EU/go/gelato`

The short routes come from [`_redirects`](_redirects). Cloudflare Pages reads that extensionless file from the deployed asset directory; GitHub Pages does not execute it. On GitHub Pages, the provider cards intentionally fall back to the direct provider URLs.

## Cloudflare Git integration contract

The connected Cloudflare Pages project `sacred-geometry-atlas` uses the same
curated artifact contract as the direct-upload workflow:

- build command: `python3 scripts/prepare-cloudflare-site.py`;
- build output directory: `.cloudflare-site`;
- project source: `ZeroXSHDW/sacred-geometry-atlas`, production branch `main`;
- repository-only research notes, workflows, and build scripts remain outside
  the published asset directory.

Keep [`wrangler.toml`](wrangler.toml) aligned with that contract. A Cloudflare
Git build must not publish the repository root, because the root contains
operator instructions and research/build tooling that are not public-site
assets. The direct-upload workflow remains useful for an explicit, reviewable
release and uses the same generator before calling Wrangler.

## GitHub Pages fallback

The Pages artifact also carries Print Studio and the evidence-aware research layer. The current research register has 24 local visual anchors for the 99 source-linked named studies; local thumbnails are visual evidence only and must be rights-checked before commercial print or resale.

The existing [`pages.yml`](.github/workflows/pages.yml) still validates and publishes the atlas plus the Ireland lab. It is useful as a repository-backed preview or fallback, but the custom-domain DNS should have one canonical destination.

## Local check

For the full design and print surface, open http://localhost:8000/print-studio.html.

```bash
python3 -m http.server 8000
```

Open <http://localhost:8000/ireland.html>. Local development uses direct provider URLs so that the Cloudflare-only `/go/...` routes do not create false local failures.

## Research and rights gate

The map shown in the prototype is intentionally labelled schematic. Before selling a map-derived product:

- replace the hand-simplified outline with a source geometry whose licence permits the intended use;
- keep the source URL, retrieval date, projection, simplification tolerance, and licence beside the exported asset;
- verify that any county/province boundary, place label, historic map, photograph, flag treatment, or symbol is cleared for commercial use;
- order a sample and check print size, safe area, colour, fabric, delivery, VAT/customs, and returns;
- keep the product description honest about the map’s evidence level and jurisdictions.

Tailte Éireann’s [Boundary Data guidance](https://tailte.ie/map-shop/professional-map-products/boundary-data/) lists open-data boundary families and warns that boundary maps are not legal property boundaries. Its [GeoHive hub](https://tailte.ie/services/geohive/) is the next authoritative source for replacing the schematic layer with a data-backed map. Ireland’s [open-data portal](https://data.gov.ie/) is useful for dataset and licence discovery.

The print cards are research handoffs, not live integrations. Printful describes print-on-demand production, packing, and shipping; Printify describes provider selection and fulfilment; Gelato describes a distributed local-production network. All product availability, fulfilment locations, costs, delivery times, and terms must be rechecked at order time.

## Official implementation references

- [Cloudflare Pages redirects](https://developers.cloudflare.com/pages/configuration/redirects/)
- [Cloudflare Pages: deploy static HTML](https://developers.cloudflare.com/pages/framework-guides/deploy-anything/)
- [Cloudflare Pages: direct upload with continuous integration](https://developers.cloudflare.com/pages/how-to/use-direct-upload-with-continuous-integration/)
- [Cloudflare Pages custom domains](https://developers.cloudflare.com/pages/configuration/custom-domains/)
- [Cloudflare Wrangler Action](https://github.com/cloudflare/wrangler-action)
- [GitHub Pages custom domains](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site)
- [GitHub Pages custom workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)
- [Printful print-on-demand](https://www.printful.com/print-on-demand)
- [Printify print-on-demand](https://printify.com/print-on-demand-ab/)
- [Gelato local production](https://www.gelato.com/the-power-of-local)

# Sacred Geometry Atlas

An interactive, static GitHub Pages site for exploring the geometry of church interiors and exteriors.
It is designed as a visual field atlas: choose a study, switch between plan/elevation/section, focus
on a geometry layer, compare proportions, and share a direct link to any study.

## What is included

- Six representative church typologies with schematic proportional studies.
- Interactive plan, elevation, and section drawings.
- Outside / inside surface switch.
- Geometry layer focus for isolating envelope, rhythm, axis, or schematic dimensions.
- Zoom and reset controls for the SVG drawing instrument.
- A plain-language drawing context line that keeps the active surface, mode, layer focus, and zoom visible beside the interpretive caption.
- One-click drawing reset that returns surface, mode, layer focus, and zoom to their default state.
- Derived readings for bounding area, section ratio, module ratio, radial reach, estimated volume, and four proportion profiles.
- Explicit reference, provenance, and interpretive reading text for each schematic study.
- Reading-profile bars expose their 0–100 scores as accessible meters as well as visual guides.
- Search across study names, references, notes, detail vocabulary, numeric geometry dimensions, and derived ratios, with multi-word queries matching all terms across the record; typology, location, era, and measured/schematic status filtering use an explicit provenance key.
- Matching terms are highlighted in catalog cards so multi-word results can be scanned at a glance.
- Search cards identify when a query matched a reference, reading, dimension, or derived-ratio field that is not shown in the compact card.
- Visible filter chips with one-click clearing for each active catalog filter or the full filter set.
- A filter-aware “Add visible to compare” action turns the current catalog view into a comparison set without losing existing selections.
- The Atlas comparison tray previews selected study names, including selections outside the current filter view.
- Contextual empty states keep filtered-out catalog views understandable and recoverable.
- Catalog cards keep typology, place, era, emphasis, and data status visible at a glance.
- A visible runtime recovery panel preserves a usable static-data path if the app script is blocked or fails before initialization.
- Previous/next study controls that follow the active filter set, including touch-sized buttons.
- Copyable citations that include the active study, reference, provenance, key geometry dimensions, data status, drawing state, and shareable route; if browser copy APIs are unavailable, the citation is revealed in a manually copyable field.
- Share controls use native sharing where available, then fall back to clipboard or a manually copyable link field with visible and live completion feedback.
- Sorting by curated order, length, height, span, length-to-span ratio, symmetry, or name.
- Multi-study comparison with side-by-side study envelopes, per-record schematic/measured status, place/era context, and proportional charts.
- Comparison study cards expose a visible “Open in Atlas” cue for returning to a selected study.
- Focused comparisons keep their selected-study strip visible, with inline removal and clear-all controls that preserve keyboard focus.
- An expandable semantic comparison table with recorded study status, lengths, spans, ratios, heights, bays, modules, symmetry values, optional floor-area and volume estimates, and volume provenance; each status cell carries its definition for assistive technology, with keyboard-accessible horizontal scrolling on narrow screens.
- Context-aware CSV export for the active comparison scope, including per-record status definitions, optional floor-area and volume estimates, estimate provenance, scope, and reproducible route, alongside the full-atlas and filtered-view JSON downloads.
- Section-aware navigation that brings Atlas, Compare, and Method views into place.
- Shareable study and catalog views: hash routes such as `#atlas/gothic/section/interior/axis/1.3` (the optional final segment restores 130% drawing zoom), focused comparisons such as `#compare/basilica,gothic`, and bookmarkable catalog query/filter/sort state; selected comparison studies persist in the Atlas URL and browser history restores the selected context. Partial or malformed study links and catalog parameters are canonicalized to valid defaults.
- Browser history restores each route once, even when a traversal emits both hash and history events, so focus and live announcements do not repeat for the same URL.
- Catalog study entries are real route links as well as in-place selectors, so a study can be opened in a new tab or copied from the browser without losing the current drawing context.
- Browser tab titles follow the active study, drawing state, catalog scope, and comparison selection.
- Downloadable full-atlas JSON, filtered catalog-view JSON, and context-aware active-study JSON with view state, derived readings, and a deterministic `provenance` manifest that records scope, record count, and schema-backed schematic/measured status definitions; the committed [`data/geometry.json`](data/geometry.json) artifact remains available for static and no-script use.
- Exportable SVG files for the active drawing, preserving the selected surface, view, vector geometry, layer focus, and accessible title/description metadata.
- Download and export actions hold a brief busy state to guard duplicate activation, announce completion through live status feedback, and explain a recovery path when a browser cannot trigger downloads.
- Print-friendly atlas output with a Print sheet action for turning the active study into a readable research sheet.
- A Method view with an accessible research key for interpreting derived area, ratio, radius, volume, and profile readings.
- Branded `og.png` social preview card wired to Open Graph and X metadata.
- Repository-relative `robots.txt` and `sitemap.xml` crawl templates stamped to the final public Pages URL during deployment.
- A branded, project-root-aware `404.html` recovery page for missing GitHub Pages paths, with a direct route to the static dataset.
- A GitHub Actions workflow at `.github/workflows/pages.yml` with static, accessibility, and geometry-schema validation on pull requests and before GitHub Pages deployment.
- Responsive layout, keyboard focus states, forced-colors affordances, view-change focus management, semantic comparison readings, skip navigation, live status feedback, and a no-script study index with reference, provenance, and interpretive context.

### Keyboard shortcuts

When the Atlas view is active, press `/` to focus study search, `Esc` to clear a focused search,
`J` / `K` to move through the visible studies, `1` / `2` / `3` to switch between plan, elevation,
and section, `I` / `O` to switch inside/outside, and `R` to reset zoom.
When two or more studies are selected, press `C` to open the focused comparison.

## Run locally

From this folder, run any simple static server, for example:

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000>.

## Publish on GitHub Pages

1. Create an empty repository on GitHub.
2. From this already initialized checkout, point the existing history at the new repository and push it:

```bash
git branch -M main
git remote add origin https://github.com/YOUR-ACCOUNT/YOUR-REPOSITORY.git
git push -u origin main
```

If `git status` shows local changes you want to publish first, commit them before the push:

```bash
git add .
git commit -m "Update Sacred Geometry Atlas"
```

3. In the repository, open **Settings → Pages** and set the source to **GitHub Actions** if GitHub has not enabled it automatically.
4. Push to `main` or run the **Deploy static site to GitHub Pages** workflow manually.

The source metadata uses repository-relative paths so local previews and project-site subpaths work without a hard-coded repository name. During deployment, the Pages workflow stamps the final absolute Pages URL into the canonical, `og:url`, `og:image`, `twitter:image`, `robots.txt`, and `sitemap.xml` crawl metadata before uploading the site artifact.

The committed tree already includes the Pages workflow, `.nojekyll`, `favicon.svg`, `robots.txt`, `sitemap.xml`, the social preview, and the data artifacts required by the site.

## Add real churches

The current values are explicitly schematic, illustrative proportions—not a measured survey of every church. To expand the atlas, edit [`data/geometry.js`](data/geometry.js) and add another object using the same fields. Replace the values with measured plans, sections, heights, modules, and radii when you have them.

Each record should include:

```js
{
  id: "unique-id",
  index: "07",
  name: "Display name",
  shortName: "Short display name",
  churchName: "Actual building name, or a clearly labelled representative study",
  typology: "Basilica",
  place: "Region or location",
  era: "Date or period",
  emphasis: "Processional axis",
  status: "schematic", // use "measured" when supported by a source
  source: "Survey, archive, publication, or atlas model",
  sourceNote: "Short provenance note",
  length: 58,
  span: 22,
  height: 18,
  bayCount: 7,
  module: 7.2,
  radius: 11,
  symmetry: 1,
  floorAreaEstimate: 1276,
  volumeEstimate: 14239,
  volumeBasis: "Bounding area × height × occupancy factor",
  envelope: "Rectangle + semicircle",
  axis: "Longitudinal",
  type: "basilica",
  details: [
    ["primary figure", "rectangle + semicircle"],
    ["structural rhythm", "7 bays"]
  ],
  surfaceNote: "Short interpretive reading of the geometry.",
  exteriorNote: "...",
  interiorNote: "..."
}
```

The schema metadata is exported with the downloadable JSON as `CHURCH_GEOMETRY_SCHEMA`, including the definitions for each allowed data status. Those same definitions drive the visible filter/comparison guidance and accessible study labels, with comparison counts following the focused selection when one is active, so the interface and exports use one provenance vocabulary. Each generated JSON export also includes a `provenance` object with its scope, record count, status counts, and those schema-backed definitions. The committed [`data/geometry.json`](data/geometry.json) is generated from the same source and checked in CI so it cannot drift from [`data/geometry.js`](data/geometry.js). Keep `status: "schematic"` when dimensions are inferred or illustrative, and include a source/provenance note for measured records.

## Test locally

The project has no build step. Check JavaScript syntax, serve the files, and test the atlas in a browser:

```bash
node --check app.js
node --check data/geometry.js
node -e "JSON.parse(require('fs').readFileSync('data/geometry.json', 'utf8'))"
python3 -c "import xml.etree.ElementTree as ET; ET.parse('sitemap.xml')"
python3 -m http.server 8000
```

The site has no build step and keeps all navigation client-side with hash URLs, so it works on a
repository subpath without special server rewrites. The Pages workflow repeats the syntax, required-file,
social-metadata, and social-card dimension checks before publishing.

The browser QA checklist is: test desktop and approximately 390px phone width; verify no horizontal overflow; test every study in plan/elevation/section and outside/inside modes; test filters, sorting, zoom, layer focus, comparison, method navigation, citation copying, JSON export, SVG drawing export, and print output; and check for console errors.

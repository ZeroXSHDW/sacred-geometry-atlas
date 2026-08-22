# Sacred Geometry Atlas

An interactive, static GitHub Pages site for exploring the geometry of church interiors and exteriors.
It is designed as a visual field atlas: choose a study, switch between plan/elevation/section, focus
on a geometry layer, compare proportions, and share a direct link to any study.

## What is included

- Six representative church typologies with schematic proportional studies.
- Interactive plan, elevation, and section drawings.
- Outside / inside surface switch.
- Geometry layer focus for isolating envelope, rhythm, axis, or schematic dimensions.
- An expandable layer guide explains what All, Envelope, Rhythm, Axis, and Dimensions reveal before a visitor isolates a drawing layer; the focus buttons repeat those definitions in accessible labels and live announcements.
- Zoom and reset controls for the SVG drawing instrument.
- A plain-language drawing context line that keeps the active surface, mode, layer focus, and zoom visible beside the interpretive caption.
- Study-selection announcements repeat that active drawing context, so assistive-technology users receive the same surface, mode, layer, and zoom handoff as the visible drawing caption.
- A schema-backed collection note keeps the visible provenance label, units, and version aligned with the dataset and exports.
- The data-status vocabulary is read from the schema, so documented statuses beyond schematic/measured remain filterable, counted, announced, and preserved in exports.
- Displayed dimensions, SVG labels, citations, comparison tables, and CSV headers use the schema-backed unit symbol, so a changed unit system cannot silently retain metre labels.
- The Method warning adapts when a collection mixes schematic and source-supported records, so its limitations stay accurate as the atlas grows.
- A dependency-free [`scripts/sync-geometry-json.js`](scripts/sync-geometry-json.js) command regenerates the committed JSON, CSV, and JSON Schema artifacts plus the no-JavaScript plain-text index from the editable geometry source, with a `--check` mode used by GitHub Actions.
- One-click drawing reset that returns surface, mode, layer focus, and zoom to their default state.
- Derived readings for bounding area, section ratio, module ratio, radial reach, estimated volume, and four proportion profiles.
- Explicit reference, provenance, and interpretive reading text for each schematic study.
- Reading-profile bars expose their 0–100 scores as accessible meters while keeping the duplicate visual score label out of the accessibility tree, so assistive technology hears one reading per profile.
- Search across study names, references, provenance definitions, notes, detail vocabulary, numeric geometry dimensions, and derived ratios, with multi-word queries matching all terms across the record; repeated whitespace is normalized so shared catalog URLs and scope announcements stay canonical; typology, location, era, geometric axis, and measured/schematic status filtering use explicit catalog keys.
- Every catalog filter option shows a scope-aware matching count, so the current search and other active filters make the remaining choices legible before a visitor opens a menu.
- Provenance guidance follows the active catalog scope, keeping schematic/measured counts aligned with the records currently shown.
- Catalog scope changes announce the active query, filters, and sort order alongside the updated result count, without repeating that count in the live status.
- Changing or clearing the catalog data-status filter also announces the schema-backed status definition, so provenance meaning is available at the moment the filter changes.
- Matching terms are highlighted in catalog cards so multi-word results can be scanned at a glance.
- Search cards identify when a query matched a reference, reading, dimension, or derived-ratio field that is not shown in the compact card.
- Visible filter chips with one-click clearing for each active catalog filter or the full filter set.
- A filter-aware “Add visible to compare” action turns the current catalog view into a comparison set without losing existing selections.
- The Atlas comparison tray previews selected study names and a compact schematic/measured status summary, including selections outside the current filter view; its live selection label keeps each study's status attached for assistive technology.
- Contextual empty states keep filtered-out catalog views understandable and recoverable.
- Catalog and comparison cards keep typology, place, era, envelope dimensions, radius, exact geometric axis, emphasis, and dedicated schematic/measured provenance badges visible at a glance; their accessible labels include the explicit data-status name and definition plus the same radius context, and the active study header repeats that status, axis, and envelope context when its title receives keyboard focus.
- Human-facing axis labels normalize source values that already include the word “axis,” keeping catalog cards and filters, comparison, no-script, share, citation, and assistive labels consistent while raw exports retain the source value.
- Valid deep links keep their requested study open even when the current catalog filters hide it, with an explicit out-of-scope notice and a one-click return to the visible catalog.
- The active study includes a keyboard-accessible provenance disclosure with its status definition and schema/unit metadata.
- Runtime and data-load recovery panels offer a one-click retry that preserves the current study, comparison, or catalog route, plus a usable static-data path if the app script or local geometry data fails before initialization.
- Runtime recovery distinguishes a missing dataset, an empty collection, and an incomplete record shape, so its explanation stays accurate while the static JSON path remains available.
- The no-script collection index includes schema/unit metadata, each record’s source note, and clearly labelled key derived readings (bays, module, radius, length/span ratio, height/span ratio, symmetry, area, and volume), keeping the static fallback research-ready.
- The no-script collection index also includes a compact reading key for axes, ratios, modules, symmetry, and optional volume estimates, with direct JSON, CSV, and schema links so the static fallback explains its vocabulary before a visitor opens an artifact.
- The no-script collection index keeps each study name as a direct deep link into its interactive route, explicitly associates that link with the visible study metadata, and provides matching static fragment targets that bring visitors without JavaScript to the selected record; the same links remain a useful handoff when JavaScript is restored or enabled.
- The no-script generator also renders an honest empty-collection state if future data edits temporarily remove all study records.
- Previous/next study controls that follow the active filter set, including touch-sized buttons; when the active study is outside a filtered set, the navigator identifies that state and jumps into the visible set.
- Copyable citations for the active study, current catalog view, and full/focused comparisons, including reference, axis, provenance, data-status definition, key geometry dimensions, catalog scope, selected comparison identities, or comparison scope as relevant, drawing state where relevant, and a shareable route; if browser copy APIs are unavailable, the citation is revealed in a manually copyable field.
- Share controls use native sharing where available, with study names, axes, and data statuses included in the share text for the active study, catalog selection, and focused comparison; they then fall back to clipboard or a manually copyable link field with visible and live completion feedback.
- Sorting by curated order, length, height, span, length-to-span ratio, symmetry, or name; numeric indices and tied measurements resolve naturally and deterministically so catalog views and exports remain reproducible as the collection grows.
- Multi-study comparison with side-by-side study envelopes, per-record schematic/measured status, typology/place/era/axis context, and proportional charts.
- Comparison chart rows keep each study’s geometric axis visible beside its name and provenance status, so the visual comparison retains the same orientation context as the accessible labels and table.
- Comparison chart rows identify the current Atlas study with a visible cue and matching accessible context, keeping ratio, height, and module readings oriented while a visitor moves between comparison and Atlas.
- Each normalized comparison chart includes a dynamic zero, midpoint, and active-maximum guide so focused selections remain visually honest when their scale changes.
- Focused comparison range announcements keep each active chart maximum available to assistive technology as the selection changes.
- Comparison bars also expose their active range and value as semantic meters, keeping the normalized readings available beyond the visual bar lengths.
- Comparison chart rows include the schema-backed status definition in their accessible labels, so provenance remains explicit without relying on hover tooltips.
- Comparison study cards, the edit-selection handoff, and table links expose visible Atlas cues for returning to a selected study and mark the current Atlas study for orientation; the focused comparison helper also explains when that study is outside the selected set. Each is route-native and preserves the focused selection when opened in a new tab.
- Focused comparisons keep their selected-study strip visible, with inline removal, per-study axis and provenance badges, a current-Atlas-study cue, and clear-all controls that preserve keyboard focus.
- A one-study comparison handoff stays visible on the Compare page as a pending selection, with a clear “select one more” prompt while the full collection remains the comparison scope.
- Focused comparison cards, charts, tables, and exports preserve the order in which studies were selected or shared in the comparison route.
- An expandable semantic comparison table with route-native study links, axis and recorded study status, lengths, spans, ratios, heights, bays, modules, radii, symmetry values, optional floor-area and volume estimates, and volume provenance; each status cell carries its definition for assistive technology, with keyboard-accessible horizontal scrolling and live position feedback on narrow screens.
- The comparison table keeps its column headings visible below the sticky site header while long records are scanned vertically, and keeps the study-name column visible while scrolling horizontally.
- Comparison tables carry the same schematic/measured status styling as cards and charts, so provenance stays visible across every comparison surface.
- The active study status badge uses the same schematic/measured styling as the catalog, charts, and comparison table.
- Context-aware CSV and structured JSON exports for the active comparison scope, including typology/place/era/axis context, per-record status definitions, optional floor-area and volume estimates, derived readings, estimate provenance, scope, reproducible route, schema version, and units, alongside the full-atlas and filtered-view JSON downloads.
- Comparison JSON records keep each raw study paired with its derived readings, preserving the selected order for downstream research or analysis.
- Comparison CSV text that resembles a spreadsheet formula is prefixed safely, so research exports remain inert when opened in spreadsheet software.
- Section-aware navigation that brings Atlas, Compare, and Method views into place.
- Shareable study and catalog views: hash routes such as `#atlas/gothic/section/interior/axis/1.3` (the optional final segment restores 130% drawing zoom), study-aware Method links such as `#method/gothic`, focused comparisons such as `#compare/basilica,gothic`, pending comparisons such as `?compare=basilica#compare`, and bookmarkable catalog query/filter/sort/axis state; selected comparison studies persist in Atlas and Method URLs, while a one-study selection remains attached to its pending Compare route until it becomes a focused comparison, including when a legacy `#compare/basilica` link is opened. Reserved characters in future study IDs are encoded before comparison delimiters, query routes keep that encoding canonical, and older double-encoded query links remain readable. Browser history restores the selected context. Partial or malformed study links and catalog parameters are canonicalized to valid defaults.
- Browser history restores each route once, even when a traversal emits both hash and history events, so focus and live announcements do not repeat for the same URL.
- Catalog study entries are real route links as well as in-place selectors, so a study can be opened in a new tab or copied from the browser without losing the current drawing context.
- Compact pointer selections reveal the active drawing heading after catalog, comparison-card, or table links, while the activating study card retains focus for a predictable return path.
- Primary Atlas, Compare, Method, comparison-edit, and Method-return navigation uses real, context-aware hash links, preserving the active catalog scope, comparison selection, and study context for open-in-new-tab, middle-click, and copy-link behavior while ordinary clicks retain in-place focus and history handling.
- The branded home link preserves normal modified-click and middle-click behavior, while an ordinary click still returns to the Atlas view in place.
- Browser tab titles follow the active study, drawing state, catalog scope, and comparison selection.
- Downloadable full-atlas JSON, filtered catalog-view JSON/CSV, and context-aware active-study JSON with view state, derived readings, a published schema URL resolved from the current site origin, and deterministic `provenance` manifests that record scope, record count, and schema-backed schematic/measured status definitions; filtered catalog JSON keeps the raw `studies` array for compatibility and adds ordered `records` pairing each study with its derived readings, plus human-readable `comparisonSelection` entries with each selected study’s ID, name, axis, status, and status definition, even when a selected study is outside the active catalog filters; filtered catalog CSV repeats the active comparison IDs and context on every row; the committed [`data/geometry.json`](data/geometry.json) and [`data/geometry.csv`](data/geometry.csv) artifacts remain available for static and no-script use.
- Visible Raw JSON, Raw CSV, and Schema links keep the committed collection and its data contract reachable when a browser cannot trigger a generated download, and the CSV carries schema-backed status, provenance, units, derived ratios, and direct study routes.
- A published [`data/geometry.schema.json`](data/geometry.schema.json) contract describes the collection envelope, status vocabulary, required study fields, numeric bounds, optional estimates, and detail pairs for downstream validation; the Method view provides an **Open schema** link alongside the JSON and CSV artifacts.
- Exportable SVG files for the active drawing, preserving the selected surface, view, vector geometry, layer focus, and accessible title/description metadata.
- Generated study and SVG filenames normalize dataset IDs, so spaces, separators, and punctuation cannot create ambiguous download paths.
- Download and export actions hold a brief busy state to guard duplicate activation, announce completion through live status feedback, and explain a recovery path when a browser cannot trigger downloads.
- Print-friendly atlas output with a Print sheet action for turning the active study into a readable research sheet; the status definition, schema/unit provenance, and reproducible direct route remain included even when the interactive disclosure is collapsed.
- Print-ready comparison sheets that preserve the active full-collection or focused comparison, visible provenance context, charts, the complete comparison table, and a reproducible route.
- Study and comparison print surfaces expose those reproducible routes as native links, so a researcher can reopen or copy the exact view before printing.
- A Method view with an accessible research key for interpreting derived area, ratio, radius, volume, and profile readings.
- A Method data dictionary that explains the stable identity, context, geometry, rhythm, interpretation, provenance, and optional-estimate fields behind the JSON/CSV records, with direct links to both artifacts.
- The Method view keeps the current study in context with a study-aware deep link, a visible context label, and a dynamic return-to-study action, or returns to the filtered Atlas catalog when the current study is outside the active view.
- Branded `og.png` social preview card wired to Open Graph and X metadata.
- Repository-relative `robots.txt` and `sitemap.xml` crawl templates stamped to the final public Pages URL during deployment.
- A branded, project-root-aware `404.html` recovery page for missing GitHub Pages paths, with direct routes to the static JSON, CSV, and schema artifacts.
- A GitHub Actions workflow at `.github/workflows/pages.yml` with static, accessibility, local-fragment, HTML-resource, and geometry-schema validation on pull requests and before GitHub Pages deployment.
- Responsive layout, keyboard focus states, forced-colors affordances, view-change focus management, semantic comparison readings, skip navigation, live status feedback, and a no-script study index with reference, provenance, and interpretive context.
- Forced-colors mode maps meter tracks, fills, chart guides, and the generated SVG drawing instrument to system colors so quantitative and geometric readings remain legible in high-contrast themes.
- A `prefers-contrast: more` layer strengthens muted text, boundaries, meters, selected-study markers, the drawing instrument, and focus rings across the Atlas and branded 404 recovery page without changing the default dark palette.
- Compact catalog actions keep JSON and CSV format labels visible at tablet widths, then add short Share and Cite labels at phone widths so identical glyphs remain distinguishable.
- The full-atlas download keeps a compact JSON label at tablet and phone widths, with a visible Done state during export feedback, while its accessible name remains explicit.
- Active-study Share, Cite, JSON, and Print actions keep compact visible labels at phone widths, while their full accessible names and live feedback remain intact.
- Static JSON, CSV, and Schema links keep compact format labels at tablet and phone widths, so raw artifacts remain distinguishable from generated downloads.
- The header wraps before tablet data controls become crowded, while fragment targets, view sections, the sticky catalog, active-study reveal, and comparison table headings share the larger responsive offset below the multi-row header.
- At the narrowest phone widths, header artifact controls tighten their spacing and padding without reducing their compact format labels or touch-target heights.
- The desktop catalog panel stays below the sticky site header while visitors scan a long study list, without changing its static mobile flow.
- The comparison table reveals a live visual cue only when its columns overflow, updating from “More columns →” to edge-aware directions as touch or keyboard scrolling moves through the data.
- At phone widths, the drawing toolbar gives its scale readout a full row and wraps the export, reset, and zoom controls so the instrument remains usable without horizontal overflow.
- The drawing toolbar labels its ratio as an illustrative diagram reference, keeping the schematic studies distinct from measured survey output.

### Keyboard shortcuts

When the Atlas view is active, press `/` to focus study search, `Esc` to clear a focused search or close an open disclosure,
`J` / `K` to move through the visible studies (or hear a recovery hint when filters leave none visible), `1` / `2` / `3` to switch between plan, elevation,
and section, `I` / `O` to switch inside/outside, and `R` to reset zoom. These shortcuts remain
available while Atlas controls are focused; text fields, links, and disclosure summaries retain
their native keyboard behavior.
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

The root document also includes machine-readable CollectionPage and Dataset metadata so search engines and research tools can identify the atlas and its JSON, CSV, and JSON Schema distributions. The HTML advertises the JSON Schema through an `application/schema+json` alternate link. Browser-generated exports resolve their schema URL from the current site origin, while deployment resolves the Dataset metadata—including the JSON Schema distribution URL—and stamps the published JSON, CSV, and JSON Schema artifacts with the final absolute Pages address.

The sitemap includes the landing page plus the published JSON, CSV, and JSON Schema artifacts, so the static research surface is discoverable without JavaScript.

The workflow keeps pull-request validation read-only; Pages write and OIDC permissions are scoped to the non-pull-request deploy job.

The Pages workflow pins validation to Node.js 22 so syntax and data checks do not depend on the runner's preinstalled version.

The committed tree already includes the Pages workflow, `.nojekyll`, `favicon.svg`, `robots.txt`, `sitemap.xml`, the social preview, and the data artifacts required by the site.

## Add real churches

The current values are explicitly schematic, illustrative proportions—not a measured survey of every church. To expand the atlas, edit [`data/geometry.js`](data/geometry.js) and add another object using the same fields. Replace the values with measured plans, sections, heights, modules, and radii when you have them.

After editing the source, regenerate the static artifacts with:

```bash
node scripts/sync-geometry-json.js
```

Use `node scripts/sync-geometry-json.js --check` to verify that the committed JSON, CSV, JSON Schema, and no-JavaScript index are current without changing files.

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
  status: "schematic", // use a value declared in CHURCH_GEOMETRY_SCHEMA.statusValues
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

The symmetry index is normalized from 0 to 1; `0` is valid for an intentionally asymmetric study, while physical dimensions and counts remain positive.

The schema metadata is exported with the downloadable JSON as `CHURCH_GEOMETRY_SCHEMA`, including the definitions for each allowed data status and the collection-level `note`. Those same definitions and the note drive the visible filter/comparison guidance, Method warning, no-JavaScript fallback, and accessible study labels, with comparison counts following the focused selection when one is active, so the interface and exports use one provenance vocabulary. Each generated JSON export also includes a `schemaUrl` and a `provenance` object with its scope, record count, status counts, and those schema-backed definitions; live exports resolve the schema URL against the page origin. The committed [`data/geometry.json`](data/geometry.json) and [`data/geometry.csv`](data/geometry.csv) artifacts are generated from the same source and checked in CI so they cannot drift from [`data/geometry.js`](data/geometry.js), then receive the final absolute schema URL during Pages deployment. Keep `status: "schematic"` when dimensions are inferred or illustrative, and include a source/provenance note for measured records.

## Test locally

The project has no build step. Check JavaScript syntax, serve the files, and test the atlas in a browser:

```bash
node --check app.js
node --check data/geometry.js
node --check scripts/sync-geometry-json.js
node scripts/sync-geometry-json.js --check
node -e "JSON.parse(require('fs').readFileSync('data/geometry.json', 'utf8'))"
node -e "if (!require('fs').readFileSync('data/geometry.csv', 'utf8').trim().split(/\r?\n/).length) process.exit(1)"
python3 -c "import xml.etree.ElementTree as ET; ET.parse('sitemap.xml')"
python3 -m http.server 8000
```

The site has no build step and keeps all navigation client-side with hash URLs, so it works on a
repository subpath without special server rewrites. The Pages workflow repeats the syntax, required-file,
social-metadata, and social-card dimension checks before publishing.

The browser QA checklist is: test desktop and approximately 390px phone width; verify no horizontal overflow; test every study in plan/elevation/section and outside/inside modes; test filters, sorting, zoom, layer focus, comparison, method navigation, citation copying, JSON export, SVG drawing export, and print output; and check for console errors.

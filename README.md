# Sacred Geometry Atlas

An interactive, static GitHub Pages site for exploring the geometry of church interiors and exteriors.
It is designed as a visual field atlas: choose a study, switch between plan/elevation/section, focus
on a geometry layer, compare proportions, and share a direct link to any study.

## What is included

- Six named churches as real reference buildings—Basilica of Sant'Apollinare in Classe, Notre-Dame de Chartres, Hosios Loukas Katholikon, Sant'Andrea al Quirinale, Borgund Stave Church, and Church of the Light—with schematic proportional studies.
- Interactive plan, elevation, and section drawings.
- Outside / inside surface switch.
- Geometry layer focus for isolating envelope, rhythm, axis, or schematic dimensions.
- An expandable layer guide explains what All, Envelope, Rhythm, Axis, and Dimensions reveal before a visitor isolates a drawing layer; the focus buttons repeat those definitions in accessible labels and live announcements.
- Zoom and reset controls for the SVG drawing instrument.
- A plain-language drawing context line that keeps the active surface, mode, layer focus, and zoom visible beside the interpretive caption.
- The first-viewport hero presents the script-free collection as a named “Open the static index” research route, while the root document advertises the same page as a text/html alternate.
- The zoom control group is described by its live percentage readout, so the current zoom is announced when keyboard or assistive-technology users enter those controls.
- Study-selection announcements repeat that active drawing context, so assistive-technology users receive the same surface, mode, layer, and zoom handoff as the visible drawing caption.
- A schema-backed collection note keeps the visible provenance label, units, and version aligned with the dataset and exports.
- The data-status vocabulary is read from the schema, so documented statuses beyond schematic/measured remain filterable, counted, announced, and preserved in exports.
- Human-facing status labels normalize separator-delimited schema codes across badges, charts, citations, and the no-JavaScript record index, while raw codes remain available for machine-readable exports and styling hooks.
- Displayed dimensions, SVG labels, citations, comparison tables, and CSV headers use the schema-backed unit symbol, so a changed unit system cannot silently retain metre labels.
- The Method warning and derived-reading preface adapt when a collection mixes schematic, measured, or custom-status records, so its limitations stay accurate as the atlas grows.
- A dependency-free [`scripts/sync-geometry-json.js`](scripts/sync-geometry-json.js) command regenerates the committed JSON, CSV, and JSON Schema artifacts plus the no-JavaScript plain-text index from the editable geometry source, with a `--check` mode used by GitHub Actions.
- One-click drawing reset that returns surface, mode, layer focus, and zoom to their default state.
- Derived readings for floor area, section ratio, module ratio, radial reach, estimated volume, and four proportion profiles; floor area identifies whether it uses a supplied estimate or the length × span fallback.
- Explicit named-building references, linked source pages, provenance, and interpretive reading text for each schematic study.
- Reading-profile bars expose their 0–100 scores as accessible meters, identify each study by curated index and name, name their ratio/typology/bay-count basis in the announced value, and distinguish interpretive proportional tendencies from empirical measurements while keeping duplicate visual score labels out of the accessibility tree.
- Search across study names, references, provenance definitions, notes, detail vocabulary, numeric geometry dimensions, derived ratios, and reading-profile labels/scores, with multi-word queries matching all terms across the record; repeated whitespace is normalized so shared catalog URLs and scope announcements stay canonical; typology, location, era, geometric axis, and measured/schematic status filtering use explicit catalog keys.
- Persistent search guidance keeps the searchable fields, all-term matching behavior, `/` focus shortcut, and `Esc` clear shortcut visible after the placeholder disappears.
- Every catalog filter option shows a scope-aware matching count, so the current search and other active filters make the remaining choices legible before a visitor opens a menu.
- Visible Typology, Sort by, Location, Era, Axis, and Data status labels keep selected catalog values understandable for sighted visitors as well as assistive technology.
- Provenance guidance follows the active catalog scope, keeping schematic/measured counts aligned with the records currently shown.
- Catalog scope changes announce the active query, filters, and sort order alongside the updated result count, without repeating that count in the live status.
- Changing or clearing the catalog data-status filter also announces the schema-backed status definition, so provenance meaning is available at the moment the filter changes.
- Matching terms are highlighted in catalog cards so multi-word results can be scanned at a glance.
- Search cards identify when a query matched a reference, reading, dimension, derived-ratio, or reading-profile field that is not shown in the compact card.
- Visible filter chips with one-click clearing for each active catalog filter or the full filter set.
- Active filter chips prefix typology, location, era, axis, and data-status values, so a dense filtered view stays self-describing.
- The active catalog settings group reports its count to assistive technology and keeps search, filters, and sorting state under one consistent label.
- Catalog search includes each published study index, highlights an index match in the result card, and explains index-only matches in the visible result context and accessible label.
- Catalog scope labels carry those same prefixes into result announcements, document titles, citations, shares, print feedback, and export provenance.
- A filter-aware “Add visible to compare” action turns the current catalog view into a comparison set without losing existing selections; its visible label reports the exact number of additions or already-selected visible studies.
- The Atlas comparison tray previews selected study names and a compact schema-status summary, including selections outside the current filter view; it explicitly reports how many selected studies sit outside the current catalog scope, while its live selection label keeps each study's status attached for assistive technology.
- Contextual empty states keep filtered-out catalog views understandable and recoverable, with a clear catalog-settings reset that names its search, filter, and sort scope.
- Catalog and comparison cards keep typology, place, era, envelope dimensions, radius, exact geometric axis, emphasis, and dedicated schema-backed provenance badges visible at a glance; their accessible labels include the curated study index, explicit data-status name and definition, source, and source note plus the same radius context, and the active study header now associates its index, status, axis, envelope, and source context with its focusable title.
- Human-facing axis labels normalize source values that already include the word “axis,” keeping catalog cards and filters, comparison, no-script, share, citation, and assistive labels consistent while raw exports retain the source value.
- Valid deep links keep their requested study open even when the current catalog filters hide it, with an explicit out-of-scope notice and a one-click return to the visible catalog.
- The active study includes a keyboard-accessible provenance disclosure with its status definition and schema/unit metadata.
- Runtime and data-load recovery panels offer a one-click retry that preserves the current study, comparison, or catalog route, plus a usable static-data path if the app script or local geometry data fails before initialization.
- A generated, script-free `static.html` collection index turns those failure states into a browsable research surface with the collection, evidence labels, reading key, and direct JSON/CSV/schema links; it is regenerated with the geometry artifacts and cached offline.
- The standalone collection page carries its own canonical, crawl, alternate-artifact, Open Graph, X, and mobile app-identity metadata, with deployment stamping those URLs to the final GitHub Pages origin while reusing the established Atlas preview card.
- The interactive footer keeps the script-free collection and its JSON, CSV, and schema artifacts discoverable after a long reading session; the static collection repeats the same research handoff with a link back to the interactive Atlas.
- The geometry data and app scripts load in document order with deferred execution; the route-preserving recovery link is synchronized as soon as the static shell exists, allowing the shell and recovery actions to paint before interactive boot while preserving the no-JavaScript fallback.
- Runtime recovery distinguishes a missing dataset, an empty collection, and an incomplete record shape, so its explanation stays accurate while the static collection and raw JSON paths remain available.
- The no-script collection index includes schema/unit metadata, each record’s source note, and clearly labelled key derived readings (bays, module, radius, length/span ratio, height/span ratio, symmetry, area, area basis, volume with its calculation basis, and the four interpretive 0–100 reading-profile scores with their note and basis), keeping the static fallback research-ready; a direct reading-key link keeps the static vocabulary one jump away.
- The no-script collection index also includes a compact reading key for axes, ratios, modules, symmetry, profile-score basis, and optional volume estimates, with direct JSON, CSV, and schema links so the static fallback explains its vocabulary before a visitor opens an artifact.
- The no-script collection index keeps each study name as a direct jump to its focusable static fragment record, explicitly associates that link with the visible study metadata, derived readings, status definition, provenance, and interpretive reading, and explains that interactive drawings require JavaScript; the same hash remains a useful route handoff when JavaScript is restored or enabled.
- Each generated static record also offers a route-preserving “Open interactive view” handoff, so a reader can move from the plain-text evidence record into the matching Atlas drawing without rebuilding the study route.
- The no-script generator also renders an honest empty-collection state if future data edits temporarily remove all study records.
- Previous/next study controls that follow the active filter set, including touch-sized buttons; when the active study is outside a filtered set, the navigator identifies that state and jumps into the visible set.
- Copyable citations for the active study, current catalog view, full/focused comparisons, and the Method guide, including reference, curated study indexes, axis, source notes, provenance, data-status definition, key geometry dimensions, interpretive reading-profile scores and basis, catalog scope, selected comparison identities, guide vocabulary, current study context, or comparison scope as relevant, drawing state where relevant, and a shareable route; sentence boundaries are normalized when schema or provenance text is edited, and if browser copy APIs are unavailable, the citation is revealed in a manually copyable field.
- Share controls use native sharing where available, with curated study indexes, study names, axes, interpretive reading-profile scores, their note and basis, data statuses, and concise source/provenance context included in the share text for the active study, catalog selection, focused comparison, and Method guide; clipboard and manual-copy fallbacks preserve that descriptive message alongside the route, while visible, live, and accessible completion, cancellation, or Unavailable feedback keeps the shared study, active catalog/comparison scope, or Method context identifiable.
- Sorting by curated order, length, height, span, length-to-span ratio, symmetry, any of the four reading profiles, or name, with a reversible order control for lowest-first and Z–A views; numeric indices and tied measurements or profile scores resolve naturally and deterministically so catalog views and exports remain reproducible as the collection grows.
- Multi-study comparison with side-by-side study envelopes, per-record schema-defined status, typology/place/era/axis context, and proportional charts.
- Comparison chart rows keep each study’s geometric axis visible beside its name and provenance status, while their accessible labels also include the source and source note so the visual comparison retains the same orientation and evidence context as the table.
- Comparison chart rows identify the current Atlas study with a visible cue and matching accessible context, keeping ratio, height, and module readings oriented while a visitor moves between comparison and Atlas.
- The comparison view also places the same four interpretive reading-profile scores beside every study, with semantic 0–100 meters whose value text names the normalized length/span, height/span, typology-cue, or bay-count basis alongside the interpretive status, axis/status context, and source provenance; the note keeps these proportional tendencies distinct from empirical measurements.
- Each normalized comparison chart includes a dynamic zero, midpoint, and active-maximum guide so focused selections remain visually honest when their scale changes.
- Focused comparison range announcements keep each active chart maximum available to assistive technology as the selection changes.
- Comparison bars expose their active range and value as semantic meters; visible chart labels and numeric readouts stay out of the accessibility tree so each normalized reading is announced once.
- Comparison chart rows include the curated study index, schema-backed status definition, source, and source note in their visible labels and accessible names, so identity and provenance remain explicit without relying on hover tooltips.
- Comparison study cards, the edit-selection handoff, and table links expose visible Atlas cues for returning to a selected study and mark the current Atlas study for orientation; the focused comparison helper also explains when that study is outside the selected set. Each is route-native and preserves the focused selection when opened in a new tab.
- Focused comparisons keep their selected-study strip visible, with each curated study index, route-native Atlas links, separate inline removal controls, per-study axis, status, and source/provenance context, a current-Atlas-study cue, a count-aware focused or pending heading, and clear-all controls that preserve keyboard focus.
- A one-study comparison handoff stays visible on the Compare page as a pending selection, with a clear “select one more” prompt while the full collection remains the comparison scope; the helper repeats both the per-study + control and the batch action so the next step is discoverable from the route.
- Focused comparison cards, charts, tables, and exports preserve the order in which studies were selected or shared in the comparison route.
- An expandable semantic comparison table with visible curated study indexes and route-native study links whose accessible labels carry axis, recorded status, source, and source note context, plus lengths, spans, ratios, heights, bays, modules, radii, symmetry values, optional floor-area estimates with their basis, volume estimates with provenance, four interpretive 0–100 reading-profile scores whose individual cells name the study and score basis, and explicit missing-data states; each status cell carries its definition for assistive technology, with keyboard-accessible horizontal scrolling and live position feedback on narrow screens.
- The comparison table keeps its column headings visible below the sticky site header while long records are scanned vertically, and keeps the study-name column visible while scrolling horizontally.
- Comparison tables carry the same schema-status styling as cards and charts, so provenance stays visible across every comparison surface.
- The active study status badge uses the same schema-status styling as the catalog, charts, and comparison table, with custom documented statuses receiving a distinct caution treatment instead of inheriting the schematic color.
- The first viewport surfaces a schema-driven dataset-status note, so visitors see the collection’s evidence level before opening a study.
- Context-aware CSV and structured JSON exports for the active comparison scope, including typology/place/era/axis context, optional floor-area estimates with an explicit supplied-estimate/fallback basis, volume estimates with provenance, derived readings, self-describing reading-profile scores with their basis and interpretive note, scope, reproducible route, schema version, and units, alongside the full-atlas and filtered-view JSON downloads.
- Comparison JSON records keep each raw study paired with its derived readings, preserving the selected order for downstream research or analysis.
- Comparison CSV and JSON actions are visible in the Compare header, so a focused or full-collection export does not require opening the records disclosure first; the records view remains the detailed table-reading surface.
- Comparison CSV text that resembles a spreadsheet formula, including formula-like text preceded by Unicode whitespace, is prefixed safely, so research exports remain inert when opened in spreadsheet software.
- Section-aware navigation that brings Atlas, Compare, and Method views into place.
- A non-route-changing Back to top control appears after a longer scroll, returns keyboard focus to the main content, respects reduced-motion preferences, and stays out of print output.
- Shareable study and catalog views: hash routes such as `#atlas/gothic/section/interior/axis/1.3` (the optional final segment restores 130% drawing zoom), study-aware Method links such as `#method/gothic`, focused comparisons such as `#compare/basilica,gothic`, pending comparisons such as `?compare=basilica#compare`, and bookmarkable catalog query/filter/sort/order/axis state; selected comparison studies persist in Atlas and Method URLs, while a one-study selection remains attached to its pending Compare route until it becomes a focused comparison, including when a legacy `#compare/basilica` link is opened. Reserved characters in future study IDs are encoded before comparison delimiters, query routes keep that encoding canonical, and older double-encoded query links remain readable. Browser history restores the selected context. Partial or malformed study links and catalog parameters are canonicalized to valid defaults, and the initial Method links plus installed-app shortcut use the canonical `#method` route while legacy `#methodView` links remain readable.
- Browser history restores each route once, even when a traversal emits both hash and history events, so focus and live announcements do not repeat for the same URL.
- Catalog study entries are real route links as well as in-place selectors, so a study can be opened in a new tab or copied from the browser without losing the current drawing context.
- The catalog marks a study link as the current page only when a study-specific Atlas route is active; the collection route keeps its default selected drawing distinct from page-current navigation semantics.
- Compact pointer selections reveal the active drawing heading after catalog, comparison-card, or table links, while the activating study card retains focus for a predictable return path.
- `J` / `K` study navigation reveals the newly focused active-study heading, keeping keyboard movement visible when the drawing is below the current viewport.
- Narrow phone layouts and other narrow mobile layouts keep catalog, study, comparison, filter, disclosure, recovery, and artifact actions at consistent 36–40px targets even when the browser does not report a coarse pointer; icon-only compare and search-clear controls retain those touch-sized targets across the full narrow breakpoint, and the branded 404 actions use the same protection.
- Primary Atlas, Compare, Method, comparison-edit, and Method-return navigation uses real, context-aware hash links, preserving the active catalog scope, comparison selection, and study context for open-in-new-tab, middle-click, and copy-link behavior while ordinary clicks retain in-place focus and history handling.
- The branded home link preserves normal modified-click and middle-click behavior, while an ordinary click still returns to the Atlas view in place.
- Browser tab titles follow the active study’s curated index, drawing state, catalog scope, and comparison selection; a pending one-study comparison also names the indexed study waiting for its second selection, while previous/next and Method route labels keep the same identity visible to assistive technology.
- Route-aware document descriptions and Open Graph/X titles now keep the default Atlas collection route collection-level while following explicit study, filtered catalog, comparison-selection, or Method context in the browser; the committed root metadata and branded preview remain the safe static fallback for crawlers.
- Downloadable full-atlas JSON and schema-aware full-atlas CSV, filtered catalog-view JSON/CSV, and context-aware active-study JSON/CSV with view state, derived readings, a published schema URL resolved from the current site origin, and deterministic `provenance` manifests that record scope, record count, and schema-backed data-status definitions; full-atlas JSON keeps the raw `studies` array for compatibility and adds ordered `records` pairing each study with derived readings and an explicit `studyRoute` URL; the generated full-atlas CSV preserves curated source order, schema-backed status/provenance, units, derived ratios, optional-estimate bases, reading-profile scores, a reproducible full-collection route, and direct study routes; the active-study CSV is a single-row research export that repeats the current drawing route and surface, mode, layer, and zoom context; filtered catalog JSON adds the same enriched records plus human-readable `comparisonSelection` entries with each selected study’s ID, curated index, name, axis, status, status definition, source, and source note, even when a selected study is outside the active catalog filters; filtered catalog and comparison CSV exports include each study’s curated source index, repeat the active comparison IDs and context where relevant, preserve the active view route, add a direct study route for each row, append the four 0–100 reading-profile scores plus a self-describing basis/note column, and record the active sort key and direction explicitly for catalog views; the committed [`data/geometry.json`](data/geometry.json) and [`data/geometry.csv`](data/geometry.csv) artifacts remain available for static and no-script use.
- Visible Raw JSON, Raw CSV, and Schema links keep the committed collection and its data contract reachable when a browser cannot trigger a generated download, and the CSV carries the curated source index alongside schema-backed status, provenance, units, derived ratios, active view routes, and direct study routes.
- A published [`data/geometry.schema.json`](data/geometry.schema.json) contract describes the collection envelope, unit system, status vocabulary, required study fields, numeric bounds, optional estimates, and estimate-basis semantics for downstream validation; the Method view provides an **Open schema** link alongside the JSON and CSV artifacts.
- Exportable SVG files for the active drawing, preserving the selected surface, view, vector geometry, layer focus, theme-aware colors, language, and accessible title/description metadata, including the study’s data status, source note, interpretive reading-profile scores and basis, floor-area basis, and volume basis so the drawing remains interpretable as a standalone research artifact.
- Generated study and SVG filenames normalize dataset IDs, so spaces, separators, and punctuation cannot create ambiguous download paths.
- Download and export actions hold a brief busy state to guard duplicate activation, announce completion through live status feedback, and explain a recovery path when a browser cannot trigger downloads; blocked study, catalog, comparison, and SVG exports also expose a direct route for the exact context being preserved.
- Generated export completion announcements include the exported record count and the exact catalog or comparison scope, alongside data-status counts, so a download remains identifiable when filenames are not visible.
- Print actions keep the active study, catalog, comparison, or Method context in both the keyboard announcement and the synchronized completion label.
- Print-friendly atlas output with a Print sheet action for turning the active study into a readable research sheet; the status definition, schema/unit provenance, and reproducible direct route remain included even when the interactive disclosure is collapsed.
- Print-ready comparison sheets that preserve the active full-collection or focused comparison, visible provenance context, charts, the complete comparison table, and a reproducible route.
- A Print view action for the active catalog scope, preserving visible records, filter/sort chips, schema-backed status guidance, and the direct route on a compact research sheet.
- A Print guide action for the Method view, preserving its context note, direct route, research key, data-status evidence labels, and dataset dictionary as a readable reference sheet.
- Study, comparison, and Method print surfaces expose those reproducible routes as native links, so a researcher can reopen or copy the exact view before printing.
- Active catalog, study, comparison, and Method views keep their direct route visible on screen, so each reproducible hash link is discoverable before a share, citation, or print action.
- Each visible catalog, study, comparison, and Method route also has a one-click Copy link action that copies the full URL, announces success, and reveals a focused readonly manual-copy field when clipboard access is unavailable; the controls disappear from print output.
- A Method view with an accessible research key for interpreting derived area, ratio, radius, volume, and profile readings.
- A schema-driven Method evidence key that pairs each data-status label with its definition and live record count, including custom statuses.
- A Method data dictionary that explains the stable identity, context, geometry, rhythm, interpretation, provenance, and optional-estimate fields behind the JSON/CSV records, with direct links to both artifacts.
- The Method view keeps the current study and active Atlas scope in context with a study-aware deep link, a visible scope label, live status/provenance counts, scope-aware sharing and citations, and a dynamic return-to-study action, or returns to the filtered Atlas catalog when the current study is outside the active view.
- Branded `og.png` social preview card wired to Open Graph and X metadata.
- A repository-relative `site.webmanifest` gives compatible browsers a standalone Geometry Atlas identity, education/reference categories, and one-tap shortcuts to Atlas, Compare, and Method without adding a build step or server dependency.
- The branded 404 keeps favicon, manifest, app-capable metadata, and Apple touch-icon discovery rooted at the published project path, so missing-path recovery retains the Atlas identity on GitHub Pages project URLs.
- A device-aware System/Light/Dark theme control follows the operating-system color preference by default, lets visitors cycle to explicit light or dark modes and back to System, persists that choice locally, synchronizes changes across open Atlas tabs, updates every browser theme-color surface, and keeps the interactive and no-script reading surfaces aligned and legible in forced-colors and print contexts; media-aware light/dark metadata also keeps browser chrome coherent before scripts run.
- The branded GitHub Pages 404 recovery surface honors the same stored preference when its bootstrap runs and follows the system color scheme in its CSS-only fallback.
- A network-first [`sw.js`](sw.js) offline shell keeps the Atlas root, data artifacts, and branded 404 recovery page available after a successful visit, serving the app shell only for Atlas-root navigations and the recovery page for missing paths while preferring fresh network content when connectivity returns; the Pages deploy stamps the cache name with the GitHub commit SHA so each published revision retires the previous offline shell predictably, while local checkouts retain the stable v2 cache name.
- An accessible connection notice announces offline mode and the return to connectivity without competing with the drawing or print surfaces; the restored state uses the Atlas’s positive teal treatment before it fades away.
- The 180px Apple touch icon plus standard 192px and 512px raster install icons are derived from the established favicon and included in the offline shell and curated Pages artifact; the 192px and 512px icons are also declared in the web manifest alongside a safe-zone maskable SVG icon for launchers that apply adaptive shapes.
- Browsers that expose an install prompt receive a capability-gated Install Atlas action with live acceptance, dismissal, and installed-state feedback; unsupported browsers keep the header uncluttered.
- Already-open tabs surface a newer offline-shell version after an existing service-worker controller updates, with a route-preserving Refresh Atlas action instead of silently leaving the tab on an older shell.
- Repository-relative `robots.txt` and `sitemap.xml` crawl templates stamped to the final public Pages URL during deployment.
- A branded, project-root-aware `404.html` recovery page for missing GitHub Pages paths, with direct routes to the Atlas, Method guide, static collection, JSON, CSV, and schema artifacts.
- A GitHub Actions workflow at `.github/workflows/pages.yml` with static, accessibility, local-fragment, HTML-resource, 404-reference, and geometry-schema validation on pull requests and before GitHub Pages deployment.
- The Pages deploy job assembles a curated `_site` artifact containing only the public atlas files before stamping absolute metadata, so repository instructions, CI configuration, and regeneration scripts are not published; if a repository-level `CNAME` is present, the custom-domain file is preserved in that artifact. Before upload, [`scripts/verify-pages-artifact.py`](scripts/verify-pages-artifact.py) re-parses the final JSON, CSV, and JSON Schema bundle and checks its row order, direct routes, status values, and absolute schema URLs.
- Responsive layout, keyboard focus states, forced-colors affordances, view-change focus management, semantic comparison readings, skip navigation, live status feedback, and a no-script study index with reference, provenance, and interpretive context.
- Forced-colors mode maps meter tracks, fills, chart guides, and the generated SVG drawing instrument to system colors so quantitative and geometric readings remain legible in high-contrast themes.
- Search, filter, and manual-copy fields keep an explicit keyboard focus ring after their custom visual treatment replaces the browser outline, including in forced-colors mode.
- A `prefers-contrast: more` layer strengthens muted text, boundaries, meters, selected-study markers, the drawing instrument, and focus rings across the Atlas and branded 404 recovery page, including a light-system fallback when no script can apply a stored theme.
- Compact catalog actions keep JSON and CSV format labels visible at tablet widths, then add short Share and Cite labels at phone widths so identical glyphs remain distinguishable.
- The full-atlas JSON and CSV downloads keep compact JSON/CSV labels at tablet and phone widths, with a visible Done state during export feedback, while their accessible names and live status channels remain explicit.
- The full-atlas header names its generated formats directly as Download JSON and Download CSV, so the two export paths stay distinguishable at desktop widths as well as compact layouts.
- Active-study Share, Cite, JSON, CSV, and Print actions keep compact visible labels at phone widths, while their full accessible names, blocked-download or manual-copy-fallback Unavailable states, and live feedback remain intact.
- Phone-width study, catalog, and comparison actions switch their compact visible label to Done after a successful share, citation, download, or print action, and expose an Unavailable state when a print dialog is blocked; comparison actions retain Edit, Share, Cite, and Print labels before activation.
- Static JSON, CSV, and Schema links keep compact format labels at tablet and phone widths, so raw artifacts remain distinguishable from generated downloads.
- The header wraps before tablet data controls become crowded, while fragment targets, view sections, the sticky catalog, active-study reveal, and comparison table headings share the larger responsive offset below the multi-row header.
- At the narrowest phone widths, header artifact controls tighten their spacing and padding without reducing their compact format labels or touch-target heights.
- The desktop catalog panel stays below the sticky site header while visitors scan a long study list, without changing its static mobile flow.
- The comparison table reveals a live visual cue only when its columns overflow, updating from “More columns →” to edge-aware directions as touch or keyboard scrolling moves through the data.
- The comparison table keeps horizontal touch overscroll inside its data region, so a sideways scan does not pull the surrounding page along with it.
- At phone widths, the drawing toolbar gives its scale readout a full row and wraps the export, reset, and zoom controls so the instrument remains usable without horizontal overflow.
- The drawing toolbar labels its ratio as an illustrative diagram reference, keeping the schematic studies distinct from measured survey output.

### Keyboard shortcuts

When the Atlas view is active, press `/` to focus study search, `Esc` to clear a focused search or close an open disclosure,
`J` / `K` to move through the visible studies and reveal the newly focused study heading (or hear a recovery hint when filters leave none visible), `1` / `2` / `3` to switch between plan, elevation,
and section, `I` / `O` to switch inside/outside, `+` / `-` to zoom in/out, and `R` to reset zoom. These shortcuts
work from the page or from a matching Atlas control that advertises the same shortcut; text fields,
links, disclosure summaries, and unrelated buttons retain their native keyboard behavior.
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

The sitemap includes the landing page, the static collection index, and the published JSON, CSV, and JSON Schema artifacts, so the research surface is discoverable without JavaScript.

The workflow keeps pull-request validation read-only; Pages write and OIDC permissions are scoped to the non-pull-request deploy job.

If you use a GitHub Pages custom domain, keep its `CNAME` file at the repository root. The deploy job carries it into the curated public artifact without rewriting its value.

The Pages workflow pins validation to Node.js 22 so syntax and data checks do not depend on the runner's preinstalled version.

The committed tree already includes the Pages workflow, `.nojekyll`, `favicon.svg`, `site.webmanifest`, `sw.js`, `robots.txt`, `sitemap.xml`, the social preview, the generated `static.html` collection index, and the data artifacts required by the site.

The committed public artifact includes a correctly sized 180px icons/atlas-180.png Apple touch icon plus 192px icons/atlas-192.png and 512px icons/atlas-512.png, so install prompts and home-screen shortcuts have dependable raster artwork alongside the SVG favicon and the safe-zone icons/atlas-maskable.svg launcher mark.

## Add real churches

The six current records point to real named churches, while their geometry values remain explicitly schematic, illustrative proportions—not measured surveys of those buildings. To expand the atlas, edit [`data/geometry.js`](data/geometry.js) and add another object using the same fields. Replace the values with measured plans, sections, heights, modules, and radii only when you have them.

After editing the source, regenerate the static artifacts with:

```bash
node scripts/sync-geometry-json.js
```

Use `node scripts/sync-geometry-json.js --check` to verify that the committed JSON, CSV, JSON Schema, no-JavaScript index, and standalone static collection are current without changing files.

Each record should include:

```js
{
  id: "unique-id",
  index: "07",
  name: "Display name",
  shortName: "Short display name",
  churchName: "Actual building name",
  typology: "Basilica",
  place: "Region or location",
  era: "Date or period",
  emphasis: "Processional axis",
  status: "schematic", // use a value declared in CHURCH_GEOMETRY_SCHEMA.statusValues
  source: "Survey, archive, publication, or official reference page",
  sourceUrl: "https://example.org/source-page",
  sourceNote: "Name the real reference building and state whether the geometry is measured or schematic.",
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

The schema metadata is exported with the downloadable JSON as `CHURCH_GEOMETRY_SCHEMA`, including the definitions for each allowed data status and the collection-level `note`. Those same definitions and the note drive the visible filter/comparison guidance, Method warning, no-JavaScript fallback, and accessible study labels, with comparison counts following the focused selection when one is active, so the interface and exports use one provenance vocabulary. Each generated JSON export also includes a `schemaUrl` and a `provenance` object with its scope, record count, status counts, and those schema-backed definitions; each record carries a required `sourceUrl` for its named reference building. Live exports resolve the schema URL against the page origin. The committed [`data/geometry.json`](data/geometry.json) and [`data/geometry.csv`](data/geometry.csv) artifacts are generated from the same source and checked in CI so they cannot drift from [`data/geometry.js`](data/geometry.js), then receive the final absolute schema URL during Pages deployment. The Pages workflow also compares the browser’s reading-profile formulas and basis note with the generator used for CSV and no-JavaScript output, so an interactive score cannot silently diverge from a published record. Keep `status: "schematic"` when dimensions are inferred or illustrative, and include a source/provenance note for measured records.

## Test locally

The project has no build step. Check JavaScript syntax, serve the files, and test the atlas in a browser:

```bash
node --check app.js
node --check data/geometry.js
node --check sw.js
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

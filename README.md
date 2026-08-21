# Sacred Geometry Atlas

An interactive, static GitHub Pages site for exploring the geometry of church interiors and exteriors.
It is designed as a visual field atlas: choose a study, switch between plan/elevation/section, focus
on a geometry layer, compare proportions, and share a direct link to any study.

## What is included

- Six representative church typologies with schematic proportional studies.
- Interactive plan, elevation, and section drawings.
- Outside / inside surface switch.
- Geometry layer focus for isolating envelope, rhythm, axis, or measured dimensions.
- Zoom and reset controls for the SVG drawing instrument.
- Derived readings for bounding area, section ratio, module ratio, radial reach, estimated volume, and four proportion profiles.
- Search, typology, location, and measured/schematic status filtering.
- Visible filter chips with one-click clearing for each active catalog filter or the full filter set.
- Previous/next study controls that follow the active filter set, including touch-sized buttons.
- Copyable citations that include the active study, provenance, drawing state, and shareable route.
- Sorting by curated order, height, span, length-to-span ratio, symmetry, or name.
- Multi-study comparison with side-by-side schematic envelopes and proportional charts.
- Section-aware navigation that brings Atlas, Compare, and Method views into place.
- Shareable study and catalog views: hash routes such as `#atlas/gothic/section/interior/axis`, focused comparisons such as `#compare/basilica,gothic`, and bookmarkable catalog query/filter/sort state; browser history restores the selected context.
- Downloadable full-atlas JSON and filtered catalog-view JSON, plus a committed [`data/geometry.json`](data/geometry.json) artifact for static and no-script use.
- Exportable SVG files for the active drawing, preserving the selected surface, view, vector geometry, and layer focus.
- Print-friendly atlas output with a Print sheet action for turning the active study into a readable research sheet.
- Branded `og.png` social preview card wired to Open Graph and X metadata.
- A GitHub Actions workflow at `.github/workflows/pages.yml` with static validation before GitHub Pages deployment.
- Responsive layout, keyboard focus states, view-change focus management, semantic comparison readings, skip navigation, live status feedback, and a useful no-script study index.

### Keyboard shortcuts

When the Atlas view is active, press `J` / `K` to move through the visible studies, `1` / `2` / `3`
to switch between plan, elevation, and section, `I` / `O` to switch inside/outside, and `R` to reset zoom.

## Run locally

From this folder, run any simple static server, for example:

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000>.

## Publish on GitHub Pages

1. Create an empty repository on GitHub.
2. From this folder, initialize and push the project:

```bash
git init
git add index.html styles.css app.js data .github .nojekyll .gitignore og.png README.md
git commit -m "Build Sacred Geometry Atlas"
git branch -M main
git remote add origin https://github.com/YOUR-ACCOUNT/YOUR-REPOSITORY.git
git push -u origin main
```

3. In the repository, open **Settings → Pages** and set the source to **GitHub Actions** if GitHub has not enabled it automatically.
4. Push to `main` or run the **Deploy static site to GitHub Pages** workflow manually.

The included `og.png` is referenced with a same-site relative path so it works from a repository subpath. If a social crawler requires an absolute image URL, replace the `og:image` and `twitter:image` values in `index.html` with the final GitHub Pages URL after publishing.

## Add real churches

The current values are explicitly schematic, illustrative proportions—not a measured survey of every church. To expand the atlas, edit [`data/geometry.js`](data/geometry.js) and add another object using the same fields. Replace the values with measured plans, sections, heights, modules, and radii when you have them.

Each record should include:

```js
{
  id: "unique-id",
  index: "07",
  name: "Display name",
  churchName: "Actual building name, or a clearly labelled representative study",
  typology: "Basilica",
  place: "Region or location",
  era: "Date or period",
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
  details: [],
  exteriorNote: "...",
  interiorNote: "..."
}
```

The schema metadata is exported with the downloadable JSON as `CHURCH_GEOMETRY_SCHEMA`. The committed [`data/geometry.json`](data/geometry.json) is generated from the same source and checked in CI so it cannot drift from [`data/geometry.js`](data/geometry.js). Keep `status: "schematic"` when dimensions are inferred or illustrative, and include a source/provenance note for measured records.

## Test locally

The project has no build step. Check JavaScript syntax, serve the files, and test the atlas in a browser:

```bash
node --check app.js
node --check data/geometry.js
node -e "JSON.parse(require('fs').readFileSync('data/geometry.json', 'utf8'))"
python3 -m http.server 8000
```

The site has no build step and keeps all navigation client-side with hash URLs, so it works on a
repository subpath without special server rewrites. The Pages workflow repeats the syntax, required-file,
social-metadata, and social-card dimension checks before publishing.

The browser QA checklist is: test desktop and approximately 390px phone width; verify no horizontal overflow; test every study in plan/elevation/section and outside/inside modes; test filters, sorting, zoom, layer focus, comparison, method navigation, citation copying, JSON export, SVG drawing export, and print output; and check for console errors.

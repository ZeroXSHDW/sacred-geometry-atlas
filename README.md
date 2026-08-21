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
- Sorting by curated order, height, span, length-to-span ratio, symmetry, or name.
- Multi-study comparison with side-by-side schematic envelopes and proportional charts.
- Shareable hash routes such as `#atlas/gothic`, plus Compare and Method views.
- Downloadable JSON data from the site.
- A GitHub Actions workflow at `.github/workflows/pages.yml` for automatic GitHub Pages deployment.
- Responsive layout, keyboard focus states, skip navigation, live status feedback, and a no-script message.

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
git add index.html styles.css app.js data .github .nojekyll .gitignore README.md
git commit -m "Build Sacred Geometry Atlas"
git branch -M main
git remote add origin https://github.com/YOUR-ACCOUNT/YOUR-REPOSITORY.git
git push -u origin main
```

3. In the repository, open **Settings → Pages** and set the source to **GitHub Actions** if GitHub has not enabled it automatically.
4. Push to `main` or run the **Deploy static site to GitHub Pages** workflow manually.

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

The schema metadata is exported with the downloadable JSON as `CHURCH_GEOMETRY_SCHEMA`. Keep `status: "schematic"` when dimensions are inferred or illustrative, and include a source/provenance note for measured records.

## Test locally

The project has no build step. Check JavaScript syntax, serve the files, and test the atlas in a browser:

```bash
node --check app.js
node --check data/geometry.js
python3 -m http.server 8000
```

The site has no build step and keeps all navigation client-side with hash URLs, so it works on a
repository subpath without special server rewrites.

The browser QA checklist is: test desktop and approximately 390px phone width; verify no horizontal overflow; test every study in plan/elevation/section and outside/inside modes; test filters, sorting, zoom, layer focus, comparison, method navigation, and JSON export; and check for console errors.

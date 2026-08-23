# Research acquisition layer

This folder is the evidence boundary for the next Atlas phase. A real photograph, a 3D model, a laser scan, a plan, or a historical source is recorded separately from the Atlas interpretation.

## Images

[`image-manifest.json`](image-manifest.json) records one downloaded real reference image for each of the 24 churches. The local thumbnails are visual anchors only: they are not to be treated as scaled drawings, LiDAR, point clouds, or measured surveys. Each record keeps an image URL, source page, rights page, and a rights warning.

Run the acquisition command from the project root with:

```bash
node scripts/fetch-research-assets.js
```

The default acquisition uses Wikipedia article thumbnails, which generally resolve to Wikimedia Commons. One Commons fallback is used for San Giorgio Maggiore. Always verify the rights page before publishing, redistributing, or modifying an image. Images with unverified rights remain research-only.

## Scan and model register

[`scan-manifest.json`](scan-manifest.json) records the strongest public interior/exterior survey, LiDAR, photogrammetry, and 3D-model lead located for each church. Its status is deliberately conservative: a paper describing a scan is not the same thing as an available point cloud, and a viewable model is not automatically a scale-controlled survey. The register records candidate download pages and contact-access datasets without silently mirroring large, restricted, or rights-unclear files.

[`model-metadata.json`](model-metadata.json) captures public Sketchfab API metadata for five model leads: vertex/face counts, author, license, timestamps, and the platform's downloadability flag. These topology counts are real model data, but they are not metric dimensions until scale and control are established.

[`data-probes.json`](data-probes.json) records endpoint reachability and advertised file sizes without downloading large or contact-restricted assets. The Saint Paul's archive is a reachable 2.11 GB public candidate; the probe does not treat reachability as proof of license, scale, or redistribution rights.

If a raw candidate is acquired locally, [`acquired-assets.json`](acquired-assets.json) records its relative path, byte size, SHA-256, source, and evidence limits; [`research/raw/`](raw/) remains ignored because the archive is too large and its redistribution terms are not verified.

The current image pass downloads 24 real thumbnails, but it does not yet claim a complete metric 3D dataset for the collection. A church can therefore have a real image and a source-linked schematic drawing while still being marked `reference-only` or `survey-documented` in the scan register.

## Math sheet and validation

[`annotated-atlas.html`](annotated-atlas.html) places each real image beside a normalized math panel. The panel is not registered to the photograph; it explains the current inputs and labels the evidence boundary. The formulas and interpretation rules are documented in [`analysis-method.md`](analysis-method.md).

Regenerate and validate the layer from the project root with:

```bash
node scripts/analyze-geometry.js
node scripts/build-research-atlas.js
node scripts/register-acquired-assets.js
node scripts/validate-research-data.js
```

## Measurement evidence levels

- `reference-dimension`: a published dimension from a cited institutional or scholarly source.
- `scan-derived`: a measurement extracted from a registered point cloud, mesh, orthophoto, or photogrammetric model with documented scale/control.
- `image-derived`: a ratio or pixel relationship from a real photograph; never a metric building measurement without scale/control.
- `schematic`: an Atlas interpretation, not a survey result.

Mathematical pattern matching can test hypotheses about axes, modules, circles, grids, and ratios. It cannot by itself identify a historical builder. Builder attribution must remain tied to documentary, epigraphic, archival, or institutional evidence; the geometry analysis is a separate inference layer.

# Reusable continuation prompt

You are continuing the Sacred Geometry Atlas from the checked-out repository root.

Use only the 24 named churches already present in `data/geometry.js` and `research/scan-manifest.json`. Keep the real building identity, downloaded image provenance, survey provenance, geometric calculations, and documentary constructor evidence as separate layers.

For each church, search authoritative institutional, scholarly, heritage, museum, university, Open Heritage 3D, Zenodo, DOI, and government sources for the highest-quality public interior and exterior data available. Prefer raw terrestrial LiDAR, laser scans, registered point clouds, E57/LAS/LAZ/PLY/OBJ/GLB meshes, orthophotos, photogrammetry image sets, measured plans, sections, and elevations. Download only files exposed through ordinary public endpoints and within the available disk budget. Do not bypass contact access, paywalls, robots, authentication, license restrictions, or platform download protections.

For every acquisition:

1. Record the exact source page, direct file URL, access date, advertised size, license/reuse statement, local path, byte size, and SHA-256.
2. Verify the archive before extraction; list members and preserve the raw file locally under ignored `research/raw/` storage.
3. Extract reproducible measurements with a script. Record file format, point/vertex/face counts, bounds, principal axes, robust bounds, units, coordinate reference system, camera/control metadata, and parser assumptions.
4. Separate metric measurements from native model/reconstruction units. Never convert a model to metres by matching a photograph, a guessed axis, or a published dimension without a verified control correspondence.
5. Treat a dense depth map, point cloud, mesh, image, published dimension, and schematic Atlas input as different evidence levels. Keep raw outliers and robust summaries visible.
6. Compare measured proportions with length/span/height, modules, bays, circles, axes, symmetry, simple fractions, √2, √3, and φ. Report the formula and residual; call a ratio a hypothesis, not proof of intentional sacred geometry.
7. Never identify a historical architect, mason, carpenter, engineer, or construction team from geometry alone. Use documentary/archival/epigraphic/institutional sources for names and state when construction labor remains unknown.
8. Update the appropriate manifest/register/script, regenerate `research/geometry-analysis.json` and `research/annotated-atlas.html`, and keep the real image beside the math with a clear “not registered to the photograph” or “survey overlay” label as appropriate.
9. Run all relevant validation commands and report any blocked, rights-unclear, incomplete, unscaled, or contact-only record instead of silently substituting a generic model.

Current acquired benchmark: St Paul’s has the public UBC photogrammetry archive plus a public Zenodo rough interior/crypt GLB. Its raw and robust native-coordinate measurements are in `research/st-pauls-colmap.json` and `research/asset-measurements.json`; its published City of London dimensions are reference control only. Continue outward from this evidence boundary and preserve the distinction between photogrammetry, LiDAR, published dimensions, and schematic interpretation.

#!/usr/bin/env node

"use strict";

const fs = require("fs");
const path = require("path");

const projectRoot = path.resolve(__dirname, "..");
const imageManifest = require(path.join(projectRoot, "research", "image-manifest.json"));
const scanManifest = require(path.join(projectRoot, "research", "scan-manifest.json"));
const geometryAnalysis = require(path.join(projectRoot, "research", "geometry-analysis.json"));
const constructorEvidence = require(path.join(projectRoot, "research", "constructor-evidence.json"));
const modelMetadata = require(path.join(projectRoot, "research", "model-metadata.json"));
const assetMeasurements = require(path.join(projectRoot, "research", "asset-measurements.json"));
const colmapMeasurementPath = path.join(projectRoot, "research", "st-pauls-colmap.json");
const colmapMeasurement = fs.existsSync(colmapMeasurementPath) ? require(colmapMeasurementPath) : null;
const outputPath = path.join(projectRoot, "research", "annotated-atlas.html");

const escapeHtml = (value) => String(value ?? "")
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#39;");
const byId = (records) => new Map(records.map((record) => [record.id, record]));
const images = byId(imageManifest.records);
const scans = byId(scanManifest.records);
const constructors = byId(constructorEvidence.records);
const models = new Map(modelMetadata.records.map((record) => [record.churchId, record]));
const interiorMesh = assetMeasurements.records.find((record) => record.path === "st-pauls/st-pauls-zenodo-interior.glb");

const formatNumber = (value) => typeof value === "number" ? value.toFixed(3).replace(/0+$/, "").replace(/\.$/, "") : "—";
const formatInteger = (value) => Number.isFinite(value) ? Number(value).toLocaleString("en-US") : "—";
const sourceLink = (url, label = "source") => url ? `<a href="${escapeHtml(url)}">${escapeHtml(label)}</a>` : "—";
const evidenceLabel = (value) => value === "reference-dimension" ? "published dimension" : value;

const diagramSvg = (record) => {
  const length = record.geometryInputs.length;
  const span = record.geometryInputs.span;
  const ratio = record.ratios.lengthToSpan || 1;
  const width = 220;
  const height = Math.max(26, Math.min(104, width / ratio));
  const x = 35;
  const y = 65 - height / 2;
  const moduleCount = Math.max(1, Math.min(12, Math.round(record.moduleChecks.lengthToModule || 1)));
  const moduleWidth = width / moduleCount;
  const moduleLines = Array.from({ length: moduleCount - 1 }, (_, index) => {
    const lineX = x + moduleWidth * (index + 1);
    return `<line x1="${lineX.toFixed(1)}" y1="${(y + 4).toFixed(1)}" x2="${lineX.toFixed(1)}" y2="${(y + height - 4).toFixed(1)}" class="module" />`;
  }).join("");
  const radius = Math.max(8, Math.min(38, (record.geometryInputs.radius / span) * 42));
  return `<svg viewBox="0 0 300 150" role="img" aria-label="Schematic ratio diagram for ${escapeHtml(record.name)}; normalized from Atlas inputs and not a survey overlay.">
    <text x="35" y="18" class="diagram-note">NORMALIZED SCHEMATIC · NOT SURVEYED</text>
    <rect x="${x}" y="${y.toFixed(1)}" width="${width}" height="${height.toFixed(1)}" class="envelope" />
    ${moduleLines}
    <line x1="${x}" y1="${(y + height + 16).toFixed(1)}" x2="${x + width}" y2="${(y + height + 16).toFixed(1)}" class="dimension" />
    <text x="${x + width / 2}" y="${(y + height + 30).toFixed(1)}" text-anchor="middle" class="label">L = ${formatNumber(length)} m</text>
    <line x1="${x - 16}" y1="${y}" x2="${x - 16}" y2="${y + height}" class="dimension" />
    <text x="${x - 21}" y="${(y + height / 2).toFixed(1)}" transform="rotate(-90 ${x - 21} ${(y + height / 2).toFixed(1)})" text-anchor="middle" class="label">W = ${formatNumber(span)} m</text>
    <circle cx="${x + width - 18}" cy="${(y + height / 2).toFixed(1)}" r="${radius.toFixed(1)}" class="radius" />
    <text x="35" y="142" class="diagram-note">module divisions and radial reach are interpretive</text>
  </svg>`;
};

const cardHtml = (record) => {
  const image = images.get(record.id);
  const scan = scans.get(record.id);
  const builder = constructors.get(record.id);
  const model = models.get(record.id);
  const roles = (builder.roles || []).map((role) => `<li><span>${escapeHtml(role.role)}:</span> ${escapeHtml(role.name)} (${sourceLink(role.sourceUrl, "evidence")})</li>`).join("");
  const evidence = Object.entries(record.currentGeometryEvidence)
    .map(([field, value]) => `<span class="evidence-chip ${value}">${escapeHtml(field)}: ${escapeHtml(evidenceLabel(value))}</span>`)
    .join("");
  const acquiredScene = record.id === "st-pauls" && colmapMeasurement ? `<p class="acquired-note"><strong>Acquired inside/out evidence:</strong> ${formatInteger(colmapMeasurement.sparse?.imageCount)} calibrated images · ${formatInteger(colmapMeasurement.sparse?.point3DCount)} sparse 3D points · ${formatInteger(colmapMeasurement.denseDepthMaps?.mapCount)} dense depth maps · ${formatInteger(colmapMeasurement.denseDepthMaps?.totalValidPositiveValueCount)} positive depth values read${interiorMesh ? ` · ${formatInteger(interiorMesh.pointCount)}-vertex / ${formatInteger(interiorMesh.faceCount)}-face interior/crypt GLB mesh` : ""}. The robust sparse native-coordinate principal-axis ratios are ${colmapMeasurement.mathReadings?.nativeSparseRobustAxisExtentRatios?.map(formatNumber).join(" : ") || "—"}; these are unscaled photogrammetry/model statistics, not metric LiDAR or constructor attribution. ${sourceLink("st-pauls-colmap.json", "scene measurement")}</p>` : "";
  return `<article class="card" id="${escapeHtml(record.id)}">
    <div class="card-heading">
      <p class="eyebrow">${escapeHtml(record.index)} · ${escapeHtml(record.typology)} · ${escapeHtml(record.place)}</p>
      <h2>${escapeHtml(record.name)}</h2>
      <p class="tagline">${escapeHtml(scan.scanStatus)} · ${escapeHtml(builder.documentaryStatus)}</p>
    </div>
    <div class="visual-grid">
      <figure class="photo">
        <img src="images/${escapeHtml(record.id)}.jpg" alt="Real reference image of ${escapeHtml(record.name)}" loading="lazy" />
        <figcaption>Real reference image · ${sourceLink(image?.sourcePage, "source page")} · ${sourceLink(image?.rightsPage, "rights page")}</figcaption>
      </figure>
      <figure class="math-figure">
        ${diagramSvg(record)}
        <figcaption>Math panel uses the Atlas geometry inputs; it is not registered to the photograph.</figcaption>
      </figure>
    </div>
    <div class="math-grid">
      <div><span>L × W</span><strong>${formatNumber(record.geometryInputs.length)} × ${formatNumber(record.geometryInputs.span)} m</strong></div>
      <div><span>H / W</span><strong>${formatNumber(record.ratios.heightToSpan)}</strong></div>
      <div><span>L / W</span><strong>${formatNumber(record.ratios.lengthToSpan)}</strong></div>
      <div><span>L / module</span><strong>${formatNumber(record.ratios.lengthToModule)}</strong></div>
      <div><span>floor area</span><strong>${formatNumber(record.derivedReadings.floorArea)} m²</strong></div>
      <div><span>radial reach / W</span><strong>${formatNumber(record.ratios.radiusToSpan)}</strong></div>
    </div>
    <div class="evidence-row">${evidence}</div>
    <p class="scan-note"><strong>Scan/model lead:</strong> ${escapeHtml(scan.coverage)} ${sourceLink(scan.sources?.[0]?.url, "open lead")}</p>
    ${model ? `<p class="model-note"><strong>Public 3D metadata:</strong> ${formatNumber(model.vertexCount)} vertices · ${formatNumber(model.faceCount)} faces · ${escapeHtml(model.license?.label || "license not stated in API metadata")} · raw download flag: ${model.isDownloadable ? "yes" : "no"}. These counts are topology metadata, not metric dimensions. ${sourceLink(model.apiUrl, "API record")}</p>` : ""}
    ${acquiredScene}
    <p class="builder-note"><strong>Documentary attribution:</strong> ${builder.roles?.length ? "" : "No named designer or builder is established in this current source set."} ${roles ? `<ul>${roles}</ul>` : ""}<br /><strong>Construction team:</strong> ${escapeHtml(builder.constructionTeam)} Geometry conclusion: <em>not determined by geometry.</em></p>
  </article>`;
};

const cards = geometryAnalysis.records.map(cardHtml).join("\n");
const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Sacred Geometry Atlas · real images and math</title>
  <style>
    :root { color-scheme: light; --ink:#1d2525; --muted:#5f6b68; --line:#d9e0dc; --paper:#f7f9f6; --card:#fff; --accent:#8b5e34; --teal:#126b63; }
    * { box-sizing:border-box; }
    body { margin:0; background:var(--paper); color:var(--ink); font:16px/1.5 Georgia,serif; }
    main { width:min(1200px,calc(100% - 32px)); margin:0 auto; padding:44px 0 80px; }
    h1,h2 { line-height:1.08; font-weight:600; letter-spacing:-.02em; }
    h1 { font-size:clamp(2rem,4vw,4rem); max-width:850px; margin:.2rem 0 1rem; }
    h2 { font-size:clamp(1.3rem,2vw,2rem); margin:.2rem 0; }
    p { max-width:80ch; }
    a { color:var(--teal); }
    .intro { background:#183c38; color:#f5faf6; padding:clamp(24px,5vw,56px); border-radius:24px; margin-bottom:32px; }
    .intro a { color:#c4eee4; }
    .eyebrow,.tagline,.diagram-note,figcaption,.math-grid span { font-family:ui-sans-serif,system-ui,sans-serif; text-transform:uppercase; letter-spacing:.08em; font-size:.72rem; }
    .eyebrow { color:var(--teal); margin:0 0 .35rem; }
    .tagline { color:var(--muted); margin:.5rem 0 0; }
    .cards { display:grid; gap:28px; }
    .card { background:var(--card); border:1px solid var(--line); border-radius:20px; overflow:hidden; box-shadow:0 12px 30px rgba(20,40,35,.06); }
    .card-heading { padding:24px 26px 16px; }
    .visual-grid { display:grid; grid-template-columns:minmax(0,1.15fr) minmax(300px,.85fr); gap:18px; padding:0 26px; align-items:stretch; }
    figure { margin:0; }
    .photo { background:#eff2ee; border-radius:14px; overflow:hidden; display:flex; flex-direction:column; }
    .photo img { width:100%; height:310px; object-fit:cover; display:block; }
    figcaption { color:var(--muted); padding:10px 12px 12px; font-size:.65rem; text-transform:none; letter-spacing:0; }
    .math-figure { border:1px solid var(--line); border-radius:14px; background:#f5f8f5; display:flex; flex-direction:column; justify-content:center; }
    .math-figure svg { width:100%; min-height:220px; padding:12px; }
    svg .envelope { fill:#dceae1; stroke:var(--teal); stroke-width:2; }
    svg .module { stroke:#8b5e34; stroke-width:1.25; stroke-dasharray:3 3; }
    svg .dimension { stroke:#8b5e34; stroke-width:1.2; }
    svg .radius { fill:none; stroke:#8b5e34; stroke-width:1.5; stroke-dasharray:4 3; }
    svg .label { fill:var(--ink); font:11px ui-sans-serif,system-ui,sans-serif; }
    svg .diagram-note { fill:var(--muted); font:8px ui-sans-serif,system-ui,sans-serif; letter-spacing:1px; }
    .math-grid { display:grid; grid-template-columns:repeat(6,1fr); gap:1px; margin:18px 26px 0; border-top:1px solid var(--line); border-bottom:1px solid var(--line); }
    .math-grid div { padding:12px 8px; border-right:1px solid var(--line); }
    .math-grid div:last-child { border-right:0; }
    .math-grid span { display:block; color:var(--muted); text-transform:none; letter-spacing:0; }
    .math-grid strong { display:block; margin-top:4px; font:600 1rem ui-sans-serif,system-ui,sans-serif; color:var(--teal); }
    .evidence-row { display:flex; flex-wrap:wrap; gap:7px; padding:16px 26px 0; }
    .evidence-chip { border:1px solid var(--line); border-radius:99px; padding:4px 9px; font:12px ui-sans-serif,system-ui,sans-serif; }
    .evidence-chip.reference-dimension { border-color:#b2875a; background:#fcf7ef; }
    .evidence-chip.schematic { background:#f3f5f3; color:var(--muted); }
    .scan-note,.model-note,.acquired-note,.builder-note { padding:0 26px; max-width:none; color:#394541; }
    .model-note { font:13px/1.45 ui-sans-serif,system-ui,sans-serif; color:var(--muted); }
    .acquired-note { margin-top:0; font:13px/1.5 ui-sans-serif,system-ui,sans-serif; color:#285b54; background:#f0f8f4; border-top:1px solid var(--line); border-bottom:1px solid var(--line); padding-top:14px; padding-bottom:14px; }
    .builder-note { padding-bottom:22px; }
    .builder-note ul { margin:.35rem 0 .35rem 1.2rem; padding:0; }
    .builder-note span { font-weight:600; }
    .footnote { color:var(--muted); font:14px/1.55 ui-sans-serif,system-ui,sans-serif; }
    @media (max-width: 800px) { .visual-grid { grid-template-columns:1fr; } .math-grid { grid-template-columns:repeat(3,1fr); } .math-grid div:nth-child(3) { border-right:0; } .math-grid div:nth-child(-n+3) { border-bottom:1px solid var(--line); } }
    @media (max-width: 480px) { main { width:min(100% - 18px,1200px); padding-top:18px; } .card-heading,.visual-grid,.scan-note,.model-note,.acquired-note,.builder-note,.evidence-row { padding-left:14px; padding-right:14px; } .math-grid { margin-left:14px; margin-right:14px; grid-template-columns:repeat(2,1fr); } .math-grid div:nth-child(3) { border-right:1px solid var(--line); } .math-grid div:nth-child(2n) { border-right:0; } .math-grid div:nth-child(-n+4) { border-bottom:1px solid var(--line); } }
  </style>
</head>
<body>
  <main>
    <section class="intro">
      <p class="eyebrow" style="color:#9cd8ce">Evidence-aware research atlas · 24 churches</p>
      <h1>Real images, transparent ratios, and the limits of geometric attribution.</h1>
      <p>Each sheet pairs a downloaded real reference image with a normalized math panel. The formulas use the current Atlas inputs and visibly preserve whether each field is a published dimension or a schematic comparison value. The diagram is not registered to the photograph; it is a visual explanation of the math. The St Paul's sheet also reports the locally acquired photogrammetry reconstruction separately from the published reference dimensions.</p>
      <p class="footnote" style="color:#c7ded8">Read the underlying <a href="image-manifest.json">image manifest</a>, <a href="scan-manifest.json">scan/model register</a>, <a href="measurement-register.json">measurement register</a>, <a href="geometry-analysis.json">geometry analysis</a>, <a href="constructor-evidence.json">constructor evidence</a>, and <a href="st-pauls-colmap.json">St Paul's measurement record</a>.</p>
    </section>
    <section class="cards" aria-label="Church research sheets">
      ${cards}
    </section>
  </main>
</body>
</html>
`;
fs.writeFileSync(outputPath, html.replace(/[ \t]+$/gm, ""));
console.log(`Annotated research atlas written: ${path.relative(projectRoot, outputPath)}.`);

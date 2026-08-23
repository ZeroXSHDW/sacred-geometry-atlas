#!/usr/bin/env node

"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const projectRoot = path.resolve(__dirname, "..");
const sourcePath = path.join(projectRoot, "data", "geometry.js");
const outputPath = path.join(projectRoot, "data", "geometry.json");
const csvOutputPath = path.join(projectRoot, "data", "geometry.csv");
const schemaOutputPath = path.join(projectRoot, "data", "geometry.schema.json");
const schemaUrl = "data/geometry.schema.json";
const htmlPath = path.join(projectRoot, "index.html");
const staticHtmlPath = path.join(projectRoot, "static.html");
const noScriptStart = "        <!-- geometry-noscript:start -->";
const noScriptEnd = "        <!-- geometry-noscript:end -->";
const context = { window: {} };

vm.runInNewContext(fs.readFileSync(sourcePath, "utf8"), context, { filename: sourcePath });

const payload = {
  title: "Sacred Geometry Atlas",
  schema: context.window.CHURCH_GEOMETRY_SCHEMA,
  schemaUrl,
  studies: context.window.CHURCH_GEOMETRY
};

if (!payload.schema || !Array.isArray(payload.studies)) {
  throw new Error("data/geometry.js did not expose the atlas schema and study collection");
}

const rendered = `${JSON.stringify(payload, null, 2)}\n`;
const isCheck = process.argv.includes("--check");

const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;"
}[character]));
const numberWords = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];
const countLabel = (count) => numberWords[count] || String(count);
const studyStatus = (study) => study.status || "schematic";
const statusDisplayName = (status) => String(status ?? "")
  .trim()
  .split(/[\s_-]+/)
  .filter(Boolean)
  .map((word) => word[0].toUpperCase() + word.slice(1))
  .join(" ") || "Unknown";
const axisDisplayLabel = (value) => {
  const axis = String(value ?? "").trim();
  return /axis$/i.test(axis) ? axis : `${axis} axis`;
};
const positiveEstimate = (value) => Number.isFinite(value) && value > 0 ? value : null;
const fixed = (value, digits = 1) => Number(value).toFixed(digits);
const readingProfileScores = (study) => {
  const ratio = study.length / study.span;
  const radiality = { central: 100, baroque: 84, basilica: 48, gothic: 42, stave: 36, modern: 28 }[study.type] || 40;
  return [
    ["linearity", Math.round(Math.min(100, Math.max(0, ((ratio - 1) / 3.5) * 100)))],
    ["verticality", Math.round(Math.min(100, Math.max(0, (study.height / study.span / 1.2) * 100)))],
    ["radiality", radiality],
    ["repetition", Math.round(Math.min(100, (study.bayCount / 8) * 100))]
  ];
};
const readingProfileBasis = "linearity = length ÷ span · verticality = height ÷ span · radiality = typology cue · repetition = bay count";
const readingProfileNote = "Interpretive proportional tendencies, not empirical measurements.";
const readingProfileExportContext = () => `${readingProfileBasis}; ${readingProfileNote}`;
const studySource = (study) => study.source || "Unattributed proportional model";
const studySourceNote = (study) => study.sourceNote || "provenance not supplied";
const studySourceUrl = (study) => study.sourceUrl || "";
const statusDefinition = (study) => {
  const definitions = payload.schema.statusDefinitions || {};
  return definitions[studyStatus(study)] || "";
};
const csvCell = (value) => {
  const text = String(value ?? "");
  const safeText = typeof value === "string" && /^\s*[=+\-@]/u.test(text)
    ? `'${text}`
    : text;
  return `"${safeText.replace(/"/g, '""')}"`;
};

function staticCsv() {
  const unit = payload.schema.unitSymbol || "m";
  const headers = [
    "ID", "Study", "Typology", "Index", "Place", "Era", "Axis", "Status", "Status definition", "Reference", "Source", "Source note", "Source URL",
    `Length (${unit})`, `Span (${unit})`, "Length / span", `Height (${unit})`, "Height / span",
    "Bay count", `Module (${unit})`, `Radius (${unit})`, `Floor area estimate (${unit}²)`, "Floor area basis", `Volume estimate (${unit}³)`, "Volume basis", "Symmetry index", "Scope", "Route", "Schema version", "Units", "Schema URL", "Linearity profile (0–100)", "Verticality profile (0–100)", "Radiality profile (0–100)", "Repetition profile (0–100)", "Reading profile basis"
  ];
  const rows = payload.studies.map((study) => {
    const floorArea = positiveEstimate(study.floorAreaEstimate);
    const volume = positiveEstimate(study.volumeEstimate);
    const readingProfile = Object.fromEntries(readingProfileScores(study));
    const volumeBasis = volume !== null
      ? study.volumeBasis || (studyStatus(study) === "measured" ? "source-supported estimate" : "schematic estimate")
      : "No estimate supplied";
    return [
      study.id,
      study.shortName || study.name,
      study.typology,
      study.index,
      study.place,
      study.era,
      study.axis,
      studyStatus(study),
      statusDefinition(study),
      study.churchName || study.name,
      studySource(study),
      studySourceNote(study),
      studySourceUrl(study),
      fixed(study.length),
      fixed(study.span),
      fixed(study.length / study.span, 2),
      fixed(study.height),
      fixed(study.height / study.span, 2),
      study.bayCount,
      fixed(study.module),
      fixed(study.radius),
      floorArea !== null ? fixed(floorArea, 0) : "",
      floorArea !== null ? "supplied floor-area estimate" : "length × span fallback",
      volume !== null ? fixed(volume, 0) : "",
      volumeBasis,
      fixed(study.symmetry, 2),
      "full collection",
      `#atlas/${encodeURIComponent(study.id)}/plan/exterior/all`,
      payload.schema.version || "",
      payload.schema.units || "",
      schemaUrl,
      readingProfile.linearity,
      readingProfile.verticality,
      readingProfile.radiality,
      readingProfile.repetition,
      readingProfileExportContext()
    ];
  });
  return `\uFEFF${[headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\n")}\n`;
}

function schemaDocument() {
  const statusValues = Array.isArray(payload.schema.statusValues)
    ? payload.schema.statusValues.filter((status) => typeof status === "string" && status.trim())
    : [];
  const statusDefinitionProperties = Object.fromEntries(statusValues.map((status) => [status, { type: "string", minLength: 1 }]));
  const requiredTextFields = ["id", "index", "name", "shortName", "typology", "place", "era", "emphasis", "type", "churchName", "source", "sourceUrl", "sourceNote", "envelope", "axis", "surfaceNote", "exteriorNote", "interiorNote"];
  const textProperties = Object.fromEntries(requiredTextFields.map((field) => [field, { type: "string", minLength: 1 }]));
  return {
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "$id": "./geometry.schema.json",
    "title": "Sacred Geometry Atlas geometry dataset",
    "description": "Machine-readable contract for the Sacred Geometry Atlas JSON collection, including schema metadata and proportional church geometry studies.",
    "type": "object",
    "additionalProperties": false,
    "required": ["title", "schema", "schemaUrl", "studies"],
    "properties": {
      "title": { "const": "Sacred Geometry Atlas" },
      "schemaUrl": { "const": schemaUrl },
      "schema": {
        "type": "object",
        "additionalProperties": false,
        "required": ["version", "units", "unitSymbol", "statusValues", "statusDefinitions", "note"],
        "properties": {
          "version": { "type": "string", "minLength": 1, "description": "Version of the published geometry data contract." },
          "units": { "type": "string", "minLength": 1, "description": "Human-readable unit system used by linear dimensions and derived readings." },
          "unitSymbol": { "type": "string", "minLength": 1, "description": "Display symbol for the schema unit system, such as m or ft." },
          "statusValues": {
            "type": "array",
            "minItems": 1,
            "uniqueItems": true,
            "items": { "type": "string", "minLength": 1, "enum": statusValues }
          },
          "statusDefinitions": {
            "type": "object",
            "additionalProperties": false,
            "required": statusValues,
            "properties": statusDefinitionProperties
          },
          "note": { "type": "string", "minLength": 1, "description": "Collection-level evidence and provenance note." }
        }
      },
      "studies": {
        "type": "array",
        "items": { "$ref": "#/$defs/study" }
      }
    },
    "$defs": {
      "study": {
        "type": "object",
        "additionalProperties": false,
        "required": [...requiredTextFields, "status", "length", "span", "height", "bayCount", "module", "radius", "symmetry", "details"],
        "properties": {
          ...textProperties,
          "sourceUrl": { "type": "string", "format": "uri", "description": "Canonical source page for the named reference building or source note." },
          "status": { "type": "string", "minLength": 1, "enum": statusValues, "description": "Schema-defined evidence label for the study record." },
          "length": { "type": "number", "exclusiveMinimum": 0, "description": "Overall longitudinal dimension in the schema unit." },
          "span": { "type": "number", "exclusiveMinimum": 0, "description": "Overall cross-width dimension in the schema unit." },
          "height": { "type": "number", "exclusiveMinimum": 0, "description": "Overall vertical dimension in the schema unit." },
          "bayCount": { "type": "integer", "exclusiveMinimum": 0, "description": "Number of notional repeated bays or frames." },
          "module": { "type": "number", "exclusiveMinimum": 0, "description": "Notional repeated bay or frame module in the schema unit." },
          "radius": { "type": "number", "exclusiveMinimum": 0, "description": "Primary curved reach in the schema unit." },
          "symmetry": { "type": "number", "minimum": 0, "maximum": 1, "description": "Normalized 0–1 reading of plan balance; 0 is valid for an intentionally asymmetric study." },
          "floorAreaEstimate": { "type": "number", "exclusiveMinimum": 0, "description": "Optional supplied floor-area estimate in the schema unit squared; when absent, the interface identifies its length × span fallback." },
          "volumeEstimate": { "type": "number", "exclusiveMinimum": 0, "description": "Optional estimated volume in the schema unit cubed." },
          "volumeBasis": { "type": "string", "minLength": 1, "description": "Calculation or source basis for the optional volume estimate." },
          "details": {
            "type": "array",
            "minItems": 1,
            "items": {
              "type": "array",
              "minItems": 2,
              "maxItems": 2,
              "items": { "type": "string", "minLength": 1 }
            }
          }
        }
      }
    }
  };
}

function noScriptFallback() {
  const hasStudies = payload.studies.length > 0;
  const collectionCount = countLabel(payload.studies.length);
  const counts = payload.studies.reduce((statusCounts, study) => {
    const status = studyStatus(study);
    statusCounts[status] = (statusCounts[status] || 0) + 1;
    return statusCounts;
  }, {});
  const schematicCount = counts.schematic || 0;
  const measuredCount = counts.measured || 0;
  const statusDefinitions = payload.schema.statusDefinitions || {};
  const schemaStatuses = Array.isArray(payload.schema.statusValues)
    ? payload.schema.statusValues.filter((status) => typeof status === "string" && status.trim())
    : [];
  const activeStatuses = [...new Set([...schemaStatuses, ...Object.keys(counts)])].filter((status) => counts[status] > 0);
  const statusSummary = activeStatuses
    .map((status) => `${counts[status]} ${statusDisplayName(status).toLowerCase()}`)
    .join(" · ");
  const provenanceLabel = activeStatuses.length
    ? activeStatuses.map((status) => statusDisplayName(status).toLowerCase()).join(" and ")
    : "unlabelled";
  const customStatuses = activeStatuses.filter((status) => !["schematic", "measured"].includes(status));
  const statusDefinitionSummary = activeStatuses
    .map((status) => `${statusDisplayName(status)} = ${statusDefinitions[status] || "Data status is not documented."}`)
    .join(" ");
  const statusKeyStatuses = [...new Set([...schemaStatuses, ...Object.keys(counts)])];
  const statusKey = statusKeyStatuses.length
    ? [
        '        <section class="noscript-status-key" aria-labelledby="noscript-status-key-heading">',
        '          <p class="noscript-status-key-kicker">Evidence labels</p>',
        '          <h2 id="noscript-status-key-heading">Data status key</h2>',
        `          <p class="noscript-status-key-intro">The published schema defines ${statusKeyStatuses.length} data ${statusKeyStatuses.length === 1 ? "status" : "statuses"}; each record carries one label and a provenance note.</p>`,
        '          <dl class="noscript-status-key-grid">',
        ...statusKeyStatuses.map((status) => `            <div><dt><span class="noscript-status-key-label" data-status="${escapeHtml(status)}">${escapeHtml(statusDisplayName(status))}</span> <code>${escapeHtml(status)}</code></dt><dd>${escapeHtml(statusDefinitions[status] || "Data status is not documented.")}<span class="noscript-status-key-count">${counts[status] || 0} ${counts[status] === 1 ? "record" : "records"}</span></dd></div>`),
        '          </dl>',
        '        </section>'
      ].join("\n")
    : '        <p class="noscript-status-key-empty">No data-status definitions are published for this collection.</p>';
  const unitName = payload.schema.units || "unspecified";
  const unitSymbol = payload.schema.unitSymbol || "m";
  const schemaNote = `Schema ${payload.schema.version || "unspecified"} · units: ${payload.schema.units || "unspecified"}`;
  const collectionProvenanceNote = typeof payload.schema.note === "string" && payload.schema.note.trim()
    ? payload.schema.note.trim()
    : "The current collection is a schematic proportional study, not a measured survey or a claim about every church.";
  const note = !hasStudies
    ? `The collection is currently empty. ${schemaNote}. Enable JavaScript for interactive drawings, comparison, filters, and downloadable exports.`
    : customStatuses.length
    ? `The collection uses ${statusSummary} records. ${statusDefinitionSummary} ${schemaNote}. Enable JavaScript for interactive drawings, comparison, filters, and downloadable exports.`
    : schematicCount && measuredCount
    ? `The collection mixes schematic and measured records (${statusSummary}). Schematic = ${statusDefinitions.schematic || "illustrative proportions"} Measured = ${statusDefinitions.measured || "source-supported dimensions"} ${schemaNote}. Enable JavaScript for interactive drawings, comparison, filters, and downloadable exports.`
    : measuredCount
      ? `The records are labeled measured and use source-supported dimensions. Counts: ${statusSummary}. ${schemaNote}. Enable JavaScript for interactive drawings, comparison, filters, and downloadable exports.`
      : `The records are labeled schematic. ${collectionProvenanceNote} ${schemaNote}. Enable JavaScript for interactive drawings, comparison, filters, and downloadable exports.`;
  const list = payload.studies.map((study) => {
    const dimensions = [study.length, study.span, study.height].join(" × ") + ` ${unitSymbol}`;
    const studyRoute = `#atlas/${encodeURIComponent(study.id)}/plan/exterior/all`;
    const studyMetaId = `atlas-meta-${encodeURIComponent(study.id)}`;
    const studyDerivedId = `atlas-derived-${encodeURIComponent(study.id)}`;
    const studyProvenanceId = `atlas-provenance-${encodeURIComponent(study.id)}`;
    const studyReadingId = `atlas-reading-${encodeURIComponent(study.id)}`;
    const floorArea = positiveEstimate(study.floorAreaEstimate);
    const volume = positiveEstimate(study.volumeEstimate);
    const volumeBasis = volume !== null
      ? study.volumeBasis || (studyStatus(study) === "measured" ? "source-supported estimate" : "schematic estimate")
      : "No estimate supplied";
    const readingProfile = readingProfileScores(study)
      .map(([label, score]) => `${label} ${score}`)
      .join(" · ");
    const readings = [
      `${study.bayCount} bays`,
      `module ${study.module} ${unitSymbol}`,
      `radius ${study.radius} ${unitSymbol}`,
      `length / span ${fixed(study.length / study.span, 2)}`,
      `height / span ${fixed(study.height / study.span, 2)}`,
      `symmetry ${fixed(study.symmetry, 2)}`,
      floorArea !== null ? `floor area ${Number(floorArea).toLocaleString("en-US")} ${unitSymbol}² (supplied floor-area estimate)` : "floor area not supplied (length × span fallback)",
      volume !== null ? `volume ${Number(volume).toLocaleString("en-US")} ${unitSymbol}³ (${volumeBasis})` : `volume not supplied (${volumeBasis})`,
      `reading profile (interpretive 0–100): ${readingProfile}. ${readingProfileNote} Basis: ${readingProfileBasis}.`
    ].filter(Boolean).join(" · ");
    const reading = study.surfaceNote || study.exteriorNote || study.interiorNote || "No interpretive reading supplied.";
    const source = study.source || "Provenance not supplied";
    const sourceUrl = studySourceUrl(study);
    const sourceNote = study.sourceNote || "Provenance note not supplied";
    const statusLabel = statusDisplayName(studyStatus(study)).toLowerCase();
    const statusDefinitionText = statusDefinitions[studyStatus(study)] || "Data status is not documented.";
    const interactiveRoute = `./${studyRoute}`;
    const interactiveLabel = `Open study ${study.index}, ${study.name} in the interactive Atlas; JavaScript required`;
    const sourceMarkup = sourceUrl
      ? `<a class="noscript-source-link" href="${escapeHtml(sourceUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(source)} <span aria-hidden="true">↗</span></a>`
      : escapeHtml(source);
    return `          <li id="${escapeHtml(studyRoute.slice(1))}" tabindex="-1"><span class="noscript-number" aria-hidden="true">${escapeHtml(study.index)}</span><span><strong><a class="noscript-study-link" href="${escapeHtml(studyRoute)}" aria-label="Jump to the static record for study ${escapeHtml(study.index)}, ${escapeHtml(study.name)}; interactive drawings require JavaScript" aria-describedby="${escapeHtml(studyMetaId)} ${escapeHtml(studyDerivedId)} ${escapeHtml(studyProvenanceId)} ${escapeHtml(studyReadingId)}">${escapeHtml(study.name)}</a></strong><span class="noscript-record-actions"><a class="noscript-interactive-link" href="${escapeHtml(interactiveRoute)}" aria-label="${escapeHtml(interactiveLabel)}">Open interactive view <span aria-hidden="true">↗</span></a></span><small id="${escapeHtml(studyMetaId)}">${escapeHtml(study.typology)} · ${escapeHtml(study.place)} · ${escapeHtml(study.era)} · ${escapeHtml(study.emphasis)} · Axis: ${escapeHtml(axisDisplayLabel(study.axis))} · ${escapeHtml(statusLabel)} (${escapeHtml(statusDefinitionText)}) · ${escapeHtml(dimensions)} · Reference: ${escapeHtml(study.churchName || study.name)}</small><span class="noscript-derived" id="${escapeHtml(studyDerivedId)}">Readings: ${escapeHtml(readings)}</span><span class="noscript-provenance" id="${escapeHtml(studyProvenanceId)}">Provenance: ${sourceMarkup} · ${escapeHtml(sourceNote)}</span><span class="noscript-reading" id="${escapeHtml(studyReadingId)}">Reading: ${escapeHtml(reading)}</span></span></li>`;
  }).join("\n");
  const intro = hasStudies
    ? `${escapeHtml(collectionCount[0].toUpperCase() + collectionCount.slice(1))} named churches anchor ${escapeHtml(provenanceLabel)} geometry ${payload.studies.length === 1 ? "study" : "studies"}, expressed through plans, sections, modules, axes, and enclosing forms. Dimensions are shown as length × span × height in ${escapeHtml(unitName)}. ${escapeHtml(schemaNote)}.`
    : `No studies are currently available in the church geometry collection. ${escapeHtml(schemaNote)}.`;
  const collection = hasStudies
    ? [
        "        <ol class=\"noscript-list\">",
        list,
        "        </ol>"
      ].join("\n")
    : '        <p class="noscript-empty">No study records are currently available.</p>';
  return [
    `        <p class="noscript-intro">${intro}</p>`,
    collection,
    statusKey,
    `        <p class="noscript-note">${escapeHtml(note)}</p>`
  ].join("\n");
}

function renderNoScriptIndex(source) {
  const start = source.indexOf(noScriptStart);
  const end = source.indexOf(noScriptEnd, start + noScriptStart.length);
  if (start < 0 || end < 0 || end < start) {
    throw new Error("index.html is missing the generated no-script fallback markers");
  }
  return `${source.slice(0, start + noScriptStart.length)}\n${noScriptFallback()}\n${source.slice(end)}`;
}

function staticFallbackDocument(source) {
  const renderedSource = renderNoScriptIndex(source);
  const start = renderedSource.indexOf("<noscript>");
  const end = renderedSource.indexOf("</noscript>", start + "<noscript>".length);
  if (start < 0 || end < 0 || end < start) {
    throw new Error("index.html is missing its no-script fallback block");
  }
  const noScriptContent = renderedSource.slice(start + "<noscript>".length, end).trim();
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" media="(prefers-color-scheme: dark)" content="#111817" />
    <meta name="theme-color" media="(prefers-color-scheme: light)" content="#f4f6f1" />
    <meta name="color-scheme" content="light dark" />
    <meta name="description" content="The static, no-JavaScript collection index for the Sacred Geometry Atlas." />
    <meta name="robots" content="index, follow" />
    <link rel="canonical" href="static.html" />
    <link rel="icon" href="favicon.svg" type="image/svg+xml" />
    <link rel="manifest" href="site.webmanifest" />
    <link rel="apple-touch-icon" sizes="180x180" href="icons/atlas-180.png" />
    <meta name="application-name" content="Sacred Geometry Atlas" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-title" content="Geometry Atlas" />
    <link rel="alternate" type="application/json" title="Sacred Geometry Atlas dataset" href="data/geometry.json" />
    <link rel="alternate" type="text/csv" title="Sacred Geometry Atlas dataset as CSV" href="data/geometry.csv" />
    <link rel="alternate" type="application/schema+json" title="Sacred Geometry Atlas data schema" href="data/geometry.schema.json" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="Sacred Geometry Atlas" />
    <meta property="og:title" content="Static collection · Sacred Geometry Atlas" />
    <meta property="og:description" content="A script-free, research-ready index of the Sacred Geometry Atlas collection." />
    <meta property="og:url" content="static.html" />
    <meta property="og:image" content="og.png" />
    <meta property="og:image:alt" content="Sacred Geometry Atlas" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="Static collection · Sacred Geometry Atlas" />
    <meta name="twitter:description" content="A script-free, research-ready index of the Sacred Geometry Atlas collection." />
    <meta name="twitter:image" content="og.png" />
    <meta name="twitter:image:alt" content="Sacred Geometry Atlas" />
    <title>Static collection · Sacred Geometry Atlas</title>
    <link rel="stylesheet" href="styles.css" />
  </head>
  <body class="static-fallback-page">
    <header class="site-header static-fallback-header">
      <a class="brand" href="#noscript-heading" aria-label="Return to the static collection index">
        <span class="brand-mark" aria-hidden="true">✳</span>
        <span>
          <span class="brand-name">Sacred Geometry</span>
          <span class="brand-subtitle">Static collection index</span>
        </span>
      </a>
      <nav class="main-nav" aria-label="Static collection navigation">
        <a class="nav-button" href="./">Interactive atlas</a>
        <a class="nav-button is-active" href="#noscript-heading" aria-current="page">Collection</a>
        <a class="nav-button" href="#noscript-method-heading">Reading key</a>
        <a class="nav-button" href="data/geometry.json">JSON</a>
        <a class="nav-button" href="data/geometry.csv">CSV</a>
        <a class="nav-button" href="data/geometry.schema.json">Schema</a>
      </nav>
    </header>
    ${noScriptContent}
    <footer class="site-footer">
      <div class="site-footer-identity">
        <p><span class="footer-mark" aria-hidden="true">✳</span> Sacred Geometry Atlas</p>
        <p>Static collection index · GitHub Pages ready</p>
      </div>
      <nav class="site-footer-links" aria-label="Atlas resources">
        <a href="./">Interactive atlas</a>
        <a href="data/geometry.json">JSON</a>
        <a href="data/geometry.csv">CSV</a>
        <a href="data/geometry.schema.json">Schema</a>
      </nav>
    </footer>
  </body>
</html>
`;
}

if (require.main === module) {
  const currentHtml = fs.readFileSync(htmlPath, "utf8");
  const renderedHtml = renderNoScriptIndex(currentHtml);
  const renderedStaticHtml = staticFallbackDocument(currentHtml);
  const renderedCsv = staticCsv();
  const renderedSchema = `${JSON.stringify(schemaDocument(), null, 2)}\n`;

  if (isCheck) {
    const current = fs.readFileSync(outputPath, "utf8");
    const currentCsv = fs.readFileSync(csvOutputPath, "utf8");
    const currentSchema = fs.readFileSync(schemaOutputPath, "utf8");
    const currentStaticHtml = fs.readFileSync(staticHtmlPath, "utf8");
    if (current !== rendered || currentCsv !== renderedCsv || currentSchema !== renderedSchema || currentHtml !== renderedHtml || currentStaticHtml !== renderedStaticHtml) {
      console.error("Static data artifacts are out of sync; run node scripts/sync-geometry-json.js");
      process.exitCode = 1;
    } else {
      console.log(`Geometry JSON, CSV, schema, no-script index, and static collection are in sync: ${payload.studies.length} studies.`);
    }
  } else {
    fs.writeFileSync(outputPath, rendered);
    fs.writeFileSync(csvOutputPath, renderedCsv);
    fs.writeFileSync(schemaOutputPath, renderedSchema);
    fs.writeFileSync(htmlPath, renderedHtml);
    fs.writeFileSync(staticHtmlPath, renderedStaticHtml);
    console.log(`Wrote data/geometry.json, data/geometry.csv, data/geometry.schema.json, no-script index, and static.html from data/geometry.js: ${payload.studies.length} studies.`);
  }
}

module.exports = {
  csvCell,
  readingProfileScores,
  readingProfileBasis,
  readingProfileNote,
  readingProfileExportContext
};

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
const studySource = (study) => study.source || "Unattributed proportional model";
const studySourceNote = (study) => study.sourceNote || "provenance not supplied";
const statusDefinition = (study) => {
  const definitions = payload.schema.statusDefinitions || {};
  return definitions[studyStatus(study)] || "";
};
const csvCell = (value) => {
  const text = String(value ?? "");
  const safeText = typeof value === "string" && /^[\t\r\n ]*[=+\-@]/.test(text)
    ? `'${text}`
    : text;
  return `"${safeText.replace(/"/g, '""')}"`;
};

function staticCsv() {
  const unit = payload.schema.unitSymbol || "m";
  const headers = [
    "ID", "Study", "Typology", "Place", "Era", "Axis", "Status", "Status definition", "Reference", "Source", "Source note",
    `Length (${unit})`, `Span (${unit})`, "Length / span", `Height (${unit})`, "Height / span",
    "Bay count", `Module (${unit})`, `Radius (${unit})`, `Floor area estimate (${unit}²)`, `Volume estimate (${unit}³)`, "Volume basis", "Symmetry index", "Scope", "Route", "Schema version", "Units", "Schema URL"
  ];
  const rows = payload.studies.map((study) => {
    const floorArea = positiveEstimate(study.floorAreaEstimate);
    const volume = positiveEstimate(study.volumeEstimate);
    const volumeBasis = volume !== null
      ? study.volumeBasis || (studyStatus(study) === "measured" ? "source-supported estimate" : "schematic estimate")
      : "No estimate supplied";
    return [
      study.id,
      study.shortName || study.name,
      study.typology,
      study.place,
      study.era,
      study.axis,
      studyStatus(study),
      statusDefinition(study),
      study.churchName || study.name,
      studySource(study),
      studySourceNote(study),
      fixed(study.length),
      fixed(study.span),
      fixed(study.length / study.span, 2),
      fixed(study.height),
      fixed(study.height / study.span, 2),
      study.bayCount,
      fixed(study.module),
      fixed(study.radius),
      floorArea !== null ? fixed(floorArea, 0) : "",
      volume !== null ? fixed(volume, 0) : "",
      volumeBasis,
      fixed(study.symmetry, 2),
      "full collection",
      `#atlas/${encodeURIComponent(study.id)}/plan/exterior/all`,
      payload.schema.version || "",
      payload.schema.units || "",
      schemaUrl
    ];
  });
  return `\uFEFF${[headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\n")}\n`;
}

function schemaDocument() {
  const statusValues = Array.isArray(payload.schema.statusValues)
    ? payload.schema.statusValues.filter((status) => typeof status === "string" && status.trim())
    : [];
  const statusDefinitionProperties = Object.fromEntries(statusValues.map((status) => [status, { type: "string", minLength: 1 }]));
  const requiredTextFields = ["id", "index", "name", "shortName", "typology", "place", "era", "emphasis", "type", "churchName", "source", "sourceNote", "envelope", "axis", "surfaceNote", "exteriorNote", "interiorNote"];
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
          "version": { "type": "string", "minLength": 1 },
          "units": { "type": "string", "minLength": 1 },
          "unitSymbol": { "type": "string", "minLength": 1 },
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
          "note": { "type": "string", "minLength": 1 }
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
          "status": { "type": "string", "minLength": 1, "enum": statusValues },
          "length": { "type": "number", "exclusiveMinimum": 0 },
          "span": { "type": "number", "exclusiveMinimum": 0 },
          "height": { "type": "number", "exclusiveMinimum": 0 },
          "bayCount": { "type": "integer", "exclusiveMinimum": 0 },
          "module": { "type": "number", "exclusiveMinimum": 0 },
          "radius": { "type": "number", "exclusiveMinimum": 0 },
          "symmetry": { "type": "number", "minimum": 0, "maximum": 1 },
          "floorAreaEstimate": { "type": "number", "exclusiveMinimum": 0 },
          "volumeEstimate": { "type": "number", "exclusiveMinimum": 0 },
          "volumeBasis": { "type": "string", "minLength": 1 },
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
    const floorArea = positiveEstimate(study.floorAreaEstimate);
    const volume = positiveEstimate(study.volumeEstimate);
    const readings = [
      `${study.bayCount} bays`,
      `module ${study.module} ${unitSymbol}`,
      `radius ${study.radius} ${unitSymbol}`,
      `length / span ${fixed(study.length / study.span, 2)}`,
      `height / span ${fixed(study.height / study.span, 2)}`,
      `symmetry ${fixed(study.symmetry, 2)}`,
      floorArea !== null ? `floor area ${Number(floorArea).toLocaleString("en-US")} ${unitSymbol}²` : "",
      volume !== null ? `volume ${Number(volume).toLocaleString("en-US")} ${unitSymbol}³` : ""
    ].filter(Boolean).join(" · ");
    const reading = study.surfaceNote || study.exteriorNote || study.interiorNote || "No interpretive reading supplied.";
    const source = study.source || "Provenance not supplied";
    const sourceNote = study.sourceNote || "Provenance note not supplied";
    const statusLabel = statusDisplayName(studyStatus(study)).toLowerCase();
    return `          <li id="${escapeHtml(studyRoute.slice(1))}" tabindex="-1"><span class="noscript-number" aria-hidden="true">${escapeHtml(study.index)}</span><span><strong><a class="noscript-study-link" href="${escapeHtml(studyRoute)}" aria-label="Jump to the static record for ${escapeHtml(study.name)}; interactive drawings require JavaScript" aria-describedby="${escapeHtml(studyMetaId)}">${escapeHtml(study.name)}</a></strong><small id="${escapeHtml(studyMetaId)}">${escapeHtml(study.typology)} · ${escapeHtml(study.place)} · ${escapeHtml(study.era)} · ${escapeHtml(study.emphasis)} · Axis: ${escapeHtml(axisDisplayLabel(study.axis))} · ${escapeHtml(statusLabel)} · ${escapeHtml(dimensions)} · Reference: ${escapeHtml(study.churchName || study.name)}</small><span class="noscript-derived">Readings: ${escapeHtml(readings)}</span><span class="noscript-provenance">Provenance: ${escapeHtml(source)} · ${escapeHtml(sourceNote)}</span><span class="noscript-reading">Reading: ${escapeHtml(reading)}</span></span></li>`;
  }).join("\n");
  const intro = hasStudies
    ? `${escapeHtml(collectionCount[0].toUpperCase() + collectionCount.slice(1))} ${escapeHtml(provenanceLabel)} ${payload.studies.length === 1 ? "study" : "studies"} of church geometry, expressed through plans, sections, modules, axes, and enclosing forms. Dimensions are shown as length × span × height in ${escapeHtml(unitName)}. ${escapeHtml(schemaNote)}.`
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

const currentHtml = fs.readFileSync(htmlPath, "utf8");
const renderedHtml = renderNoScriptIndex(currentHtml);
const renderedCsv = staticCsv();
const renderedSchema = `${JSON.stringify(schemaDocument(), null, 2)}\n`;

if (isCheck) {
  const current = fs.readFileSync(outputPath, "utf8");
  const currentCsv = fs.readFileSync(csvOutputPath, "utf8");
  const currentSchema = fs.readFileSync(schemaOutputPath, "utf8");
  if (current !== rendered || currentCsv !== renderedCsv || currentSchema !== renderedSchema || currentHtml !== renderedHtml) {
    console.error("Static data artifacts are out of sync; run node scripts/sync-geometry-json.js");
    process.exitCode = 1;
  } else {
    console.log(`Geometry JSON, CSV, schema, and no-script index are in sync: ${payload.studies.length} studies.`);
  }
} else {
  fs.writeFileSync(outputPath, rendered);
  fs.writeFileSync(csvOutputPath, renderedCsv);
  fs.writeFileSync(schemaOutputPath, renderedSchema);
  fs.writeFileSync(htmlPath, renderedHtml);
  console.log(`Wrote data/geometry.json, data/geometry.csv, data/geometry.schema.json, and the no-script index from data/geometry.js: ${payload.studies.length} studies.`);
}

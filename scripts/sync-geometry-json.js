#!/usr/bin/env node

"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const projectRoot = path.resolve(__dirname, "..");
const sourcePath = path.join(projectRoot, "data", "geometry.js");
const outputPath = path.join(projectRoot, "data", "geometry.json");
const htmlPath = path.join(projectRoot, "index.html");
const noScriptStart = "        <!-- geometry-noscript:start -->";
const noScriptEnd = "        <!-- geometry-noscript:end -->";
const context = { window: {} };

vm.runInNewContext(fs.readFileSync(sourcePath, "utf8"), context, { filename: sourcePath });

const payload = {
  title: "Sacred Geometry Atlas",
  schema: context.window.CHURCH_GEOMETRY_SCHEMA,
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

function noScriptFallback() {
  const collectionCount = countLabel(payload.studies.length);
  const counts = payload.studies.reduce((statusCounts, study) => {
    const status = studyStatus(study);
    statusCounts[status] = (statusCounts[status] || 0) + 1;
    return statusCounts;
  }, {});
  const schematicCount = counts.schematic || 0;
  const measuredCount = counts.measured || 0;
  const provenanceLabel = schematicCount && measuredCount
    ? "schematic and measured"
    : measuredCount
      ? "measured"
      : "schematic";
  const statusSummary = Object.entries(counts)
    .filter(([, count]) => count > 0)
    .map(([status, count]) => `${count} ${status}`)
    .join(" · ");
  const statusDefinitions = payload.schema.statusDefinitions || {};
  const schemaNote = `Schema ${payload.schema.version || "unspecified"} · units: ${payload.schema.units || "unspecified"}`;
  const note = schematicCount && measuredCount
    ? `The collection mixes schematic and measured records (${statusSummary}). Schematic = ${statusDefinitions.schematic || "illustrative proportions"} Measured = ${statusDefinitions.measured || "source-supported dimensions"} ${schemaNote}. Enable JavaScript for interactive drawings, comparison, filters, and downloadable exports.`
    : measuredCount
      ? `The records are labeled measured and use source-supported dimensions. Counts: ${statusSummary}. ${schemaNote}. Enable JavaScript for interactive drawings, comparison, filters, and downloadable exports.`
      : `The records are labeled schematic and use the Sacred Geometry Atlas proportional model; they are not a measured survey. ${schemaNote}. Enable JavaScript for interactive drawings, comparison, filters, and downloadable exports.`;
  const list = payload.studies.map((study) => {
    const dimensions = [study.length, study.span, study.height].join(" × ") + " m";
    const reading = study.surfaceNote || study.exteriorNote || study.interiorNote || "No interpretive reading supplied.";
    const source = study.source || "Provenance not supplied";
    const sourceNote = study.sourceNote || "Provenance note not supplied";
    return `          <li><span class="noscript-number" aria-hidden="true">${escapeHtml(study.index)}</span><span><strong>${escapeHtml(study.name)}</strong><small>${escapeHtml(study.typology)} · ${escapeHtml(study.place)} · ${escapeHtml(study.era)} · ${escapeHtml(study.emphasis)} · Axis: ${escapeHtml(study.axis)} · ${escapeHtml(studyStatus(study))} · ${escapeHtml(dimensions)} · Reference: ${escapeHtml(study.churchName || study.name)}</small><span class="noscript-provenance">Provenance: ${escapeHtml(source)} · ${escapeHtml(sourceNote)}</span><span class="noscript-reading">Reading: ${escapeHtml(reading)}</span></span></li>`;
  }).join("\n");
  return [
    `        <p class="noscript-intro">${escapeHtml(collectionCount[0].toUpperCase() + collectionCount.slice(1))} ${escapeHtml(provenanceLabel)} ${payload.studies.length === 1 ? "study" : "studies"} of church geometry, expressed through plans, sections, modules, axes, and enclosing forms. Dimensions are shown as length × span × height in meters. ${escapeHtml(schemaNote)}.</p>`,
    "        <ol class=\"noscript-list\">",
    list,
    "        </ol>",
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

if (isCheck) {
  const current = fs.readFileSync(outputPath, "utf8");
  if (current !== rendered || currentHtml !== renderedHtml) {
    console.error("Static data artifacts are out of sync; run node scripts/sync-geometry-json.js");
    process.exitCode = 1;
  } else {
    console.log(`Geometry JSON and no-script index are in sync: ${payload.studies.length} studies.`);
  }
} else {
  fs.writeFileSync(outputPath, rendered);
  fs.writeFileSync(htmlPath, renderedHtml);
  console.log(`Wrote data/geometry.json and the no-script index from data/geometry.js: ${payload.studies.length} studies.`);
}

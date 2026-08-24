#!/usr/bin/env node

"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const projectRoot = path.resolve(__dirname, "..");
const sourcePath = path.join(projectRoot, "data", "geometry.js");
const context = { window: {} };

vm.runInNewContext(fs.readFileSync(sourcePath, "utf8"), context, { filename: sourcePath });

const schema = context.window.CHURCH_GEOMETRY_SCHEMA;
const studies = context.window.CHURCH_GEOMETRY;
const errors = [];
const requiredTextFields = [
  "id", "index", "name", "shortName", "typology", "place", "era", "emphasis", "type",
  "churchName", "source", "sourceUrl", "sourceNote", "envelope", "axis", "surfaceNote",
  "exteriorNote", "interiorNote"
];
const requiredNumericFields = ["length", "span", "height", "bayCount", "module", "radius", "symmetry"];
const placeholderPattern = /placeholder|archetype|unnamed|unattributed proportional model|sacred geometry atlas proportional model|longitudinal basilica|high gothic|northern europe/i;

const addError = (message) => errors.push(message);
const isAbsoluteHttpUrl = (value) => {
  if (typeof value !== "string" || !value.trim()) return false;
  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:";
  } catch (error) {
    return false;
  }
};

if (!schema || !Array.isArray(studies)) {
  addError("data/geometry.js must expose CHURCH_GEOMETRY_SCHEMA and CHURCH_GEOMETRY");
} else {
  if (studies.length !== 99) addError(`Expected exactly 99 real reference studies; found ${studies.length}`);
  const ids = new Set();
  const indexes = new Set();

  studies.forEach((study, position) => {
    const label = study && (study.id || study.name) || `record ${position + 1}`;
    for (const field of requiredTextFields) {
      if (!study || typeof study[field] !== "string" || !study[field].trim()) {
        addError(`${label} is missing required text field ${field}`);
      }
    }
    if (study && ids.has(study.id)) addError(`Duplicate study id: ${study.id}`);
    if (study && indexes.has(study.index)) addError(`Duplicate study index: ${study.index}`);
    if (study) {
      ids.add(study.id);
      indexes.add(study.index);
      if (!/^\d{2}$/.test(study.index) || Number(study.index) !== position + 1) {
        addError(`${label} must use the sequential two-digit index ${String(position + 1).padStart(2, "0")}`);
      }
      if (!isAbsoluteHttpUrl(study.sourceUrl)) addError(`${label} must use an absolute http(s) sourceUrl`);
      if (/example\.(com|org|net)|example\.test/i.test(String(study.sourceUrl))) {
        addError(`${label} uses a placeholder source URL`);
      }
      const identity = [study.name, study.shortName, study.churchName, study.place, study.source].join(" | ");
      if (placeholderPattern.test(identity)) addError(`${label} contains a placeholder identity or source claim`);
      if (!/^Real reference building:/i.test(String(study.sourceNote).trim())) {
        addError(`${label} sourceNote must identify the real reference building`);
      }
      if (!/\batlas\b/i.test(String(study.sourceNote)) || !/\bschematic\b/i.test(String(study.sourceNote))) {
        addError(`${label} sourceNote must separate source facts from the Atlas's schematic interpretation`);
      }
      if (study.status === "schematic" && ["floorAreaEstimate", "volumeEstimate", "volumeBasis"].some((field) => study[field] !== undefined)) {
        addError(`${label} is schematic and must not claim an unsupported area or volume estimate`);
      }
      for (const field of requiredNumericFields) {
        if (!Number.isFinite(study[field]) || (field === "symmetry" ? study[field] < 0 || study[field] > 1 : study[field] <= 0)) {
          addError(`${label} has invalid numeric field ${field}`);
        }
      }
      if (!Number.isInteger(study.bayCount)) addError(`${label} must use an integer bayCount`);
    }
  });
}

if (errors.length) {
  console.error(errors.map((error) => `- ${error}`).join("\n"));
  process.exitCode = 1;
} else {
  console.log(`Geometry provenance validation passed: ${studies.length} real reference studies; unique IDs and indexes; source URLs, source notes, and schematic claims verified.`);
}

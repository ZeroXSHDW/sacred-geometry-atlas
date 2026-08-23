#!/usr/bin/env node

"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const projectRoot = path.resolve(__dirname, "..");
const geometryPath = path.join(projectRoot, "data", "geometry.js");
const measurementPath = path.join(projectRoot, "research", "measurement-register.json");
const outputPath = path.join(projectRoot, "research", "geometry-analysis.json");

const context = { window: {} };
vm.runInNewContext(fs.readFileSync(geometryPath, "utf8"), context, { filename: geometryPath });
const studies = context.window.CHURCH_GEOMETRY;
if (!Array.isArray(studies) || studies.length !== 24) throw new Error("Expected 24 geometry studies");

const measurementRegister = JSON.parse(fs.readFileSync(measurementPath, "utf8"));
const measurementById = new Map(measurementRegister.records.map((record) => [record.id, record]));
const requiredFields = ["length", "span", "height", "radius", "module", "bayCount"];
const constants = [
  { name: "1:1", value: 1 },
  { name: "3:2", value: 1.5 },
  { name: "φ", value: (1 + Math.sqrt(5)) / 2 },
  { name: "√2", value: Math.sqrt(2) },
  { name: "√3", value: Math.sqrt(3) },
  { name: "2:1", value: 2 },
  { name: "3:1", value: 3 },
  { name: "4:1", value: 4 }
];

const round = (value, places = 6) => Number(value.toFixed(places));
const relativeError = (observed, expected) => Math.abs(observed - expected) / Math.abs(expected);
const gcd = (a, b) => {
  let left = Math.abs(a);
  let right = Math.abs(b);
  while (right > 1e-12) [left, right] = [right, left % right];
  return left || 1;
};
const nearestFraction = (value, maxDenominator = 24) => {
  let best = { numerator: Math.round(value), denominator: 1, error: Math.abs(value - Math.round(value)) };
  for (let denominator = 1; denominator <= maxDenominator; denominator += 1) {
    const numerator = Math.round(value * denominator);
    const error = Math.abs(value - numerator / denominator);
    if (error < best.error) best = { numerator, denominator, error };
  }
  const divisor = gcd(best.numerator, best.denominator);
  return {
    numerator: best.numerator / divisor,
    denominator: best.denominator / divisor,
    value: round(best.numerator / best.denominator),
    absoluteError: round(best.error)
  };
};
const candidateConstants = (observed) => constants
  .map((constant) => ({
    name: constant.name,
    target: constant.value,
    relativeError: round(relativeError(observed, constant.value)),
    withinFivePercent: relativeError(observed, constant.value) <= 0.05
  }))
  .sort((a, b) => a.relativeError - b.relativeError)
  .slice(0, 3);

const ratio = (a, b) => (a > 0 && b > 0 ? round(a / b) : null);

const analyze = (study) => {
  const registered = measurementById.get(study.id);
  if (!registered) throw new Error(`Missing measurement-register record: ${study.id}`);
  const currentEvidence = { ...measurementRegister.defaultCurrentGeometryEvidence, ...(registered.currentGeometryEvidence || {}) };
  const ratios = {
    lengthToSpan: ratio(study.length, study.span),
    heightToSpan: ratio(study.height, study.span),
    radiusToSpan: ratio(study.radius, study.span),
    moduleToSpan: ratio(study.module, study.span),
    lengthToModule: ratio(study.length, study.module)
  };
  const ratioPatterns = Object.entries(ratios).map(([name, observed]) => ({
    name,
    observed,
    simpleFraction: nearestFraction(observed),
    nearestConstants: candidateConstants(observed)
  }));
  const moduleCount = study.module > 0 ? study.length / study.module : null;
  const bayModuleCoverage = study.length > 0 ? (study.bayCount * study.module) / study.length : null;
  const measuredOrPublished = Object.values(currentEvidence).filter((value) => value !== "schematic");
  return {
    id: study.id,
    index: study.index,
    name: study.name,
    typology: study.typology,
    place: study.place,
    currentGeometryEvidence: currentEvidence,
    geometryInputs: {
      length: study.length,
      span: study.span,
      height: study.height,
      radius: study.radius,
      module: study.module,
      bayCount: study.bayCount,
      units: "m for dimensions; count for bayCount"
    },
    publishedMeasurements: registered.publishedMeasurements || [],
    ratios,
    ratioPatterns,
    moduleChecks: {
      lengthToModule: moduleCount === null ? null : round(moduleCount),
      lengthToModuleNearestInteger: moduleCount === null ? null : Math.round(moduleCount),
      lengthToModuleIntegerResidual: moduleCount === null ? null : round(Math.abs(moduleCount - Math.round(moduleCount))),
      bayModuleCoverage: bayModuleCoverage === null ? null : round(bayModuleCoverage),
      bayModuleCoverageNote: "This tests the supplied Atlas module against the supplied bay count; it does not establish the historical construction grid."
    },
    derivedReadings: {
      floorArea: round(study.length * study.span),
      envelopeVolume: round(study.length * study.span * study.height),
      sectionRatio: ratio(study.height, study.span),
      radialReachRatio: ratio(study.radius, study.span)
    },
    constructorFinding: {
      result: "not-determined-by-geometry",
      confidence: "not-applicable",
      explanation: "Ratios, symmetry, modules, and curve fits can test a geometric hypothesis but cannot identify the historical designer, mason, carpenter, engineer, or construction team. Attribution must come from documentary, archival, epigraphic, or institutional evidence.",
      geometryEvidenceFields: measuredOrPublished,
      documentaryEvidenceRequired: true
    },
    interpretation: study.status === "schematic"
      ? "Pattern calculations are exploratory because the Atlas inputs are schematic; do not report these ratios as surveyed dimensions."
      : "Pattern calculations combine the stated data status with the cited evidence register; inspect each field before treating a ratio as metric."
  };
};

const records = studies.map(analyze);
const evidenceCounts = {};
for (const record of records) {
  for (const evidence of Object.values(record.currentGeometryEvidence)) evidenceCounts[evidence] = (evidenceCounts[evidence] || 0) + 1;
}
const output = {
  title: "Sacred Geometry Atlas geometry analysis",
  generatedBy: "scripts/analyze-geometry.js",
  asOf: "2026-08-23",
  units: "meters",
  method: {
    purpose: "Calculate transparent ratios and simple geometric comparisons from the current Atlas inputs.",
    constantsCompared: constants,
    fractionDenominatorLimit: 24,
    toleranceForWithinFivePercent: 0.05,
    warning: "A close ratio is a candidate pattern, not proof of design intent or authorship. Schematic inputs remain schematic outputs."
  },
  summary: {
    recordCount: records.length,
    evidenceFieldCounts: evidenceCounts,
    constructorAttribution: "not-determined-by-geometry"
  },
  records
};
fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);
console.log(`Geometry analysis written for ${records.length} studies: ${path.relative(projectRoot, outputPath)}.`);

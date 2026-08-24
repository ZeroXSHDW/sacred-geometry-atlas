#!/usr/bin/env node

"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const projectRoot = path.resolve(__dirname, "..");
const geometryPath = path.join(projectRoot, "data", "geometry.js");
const additionsPath = path.join(projectRoot, "data", "expanded-churches.json");
const markerStart = "/* expanded studies:start */";
const markerEnd = "/* expanded studies:end */";

const profiles = {
  basilica: {
    type: "basilica",
    axis: "Longitudinal",
    typology: "Basilica",
    emphasis: "Processional axis",
    envelope: "Basilica + transept",
    length: 90,
    span: 32,
    height: 28,
    radius: 16,
    symmetry: 0.92,
    figure: "rectangle + transept",
    rhythm: "nave bays",
    enclosure: "vaulted basilica"
  },
  gothic: {
    type: "gothic",
    axis: "Longitudinal",
    typology: "Gothic",
    emphasis: "Vertical proportion",
    envelope: "Cross + pointed apse",
    length: 120,
    span: 34,
    height: 45,
    radius: 17,
    symmetry: 0.94,
    figure: "cross + pointed apse",
    rhythm: "pointed bays",
    enclosure: "nave + aisles"
  },
  central: {
    type: "central",
    axis: "Radial",
    typology: "Central plan",
    emphasis: "Radial balance",
    envelope: "Square + dome",
    length: 42,
    span: 36,
    height: 30,
    radius: 18,
    symmetry: 0.95,
    figure: "square + dome",
    rhythm: "radial bays",
    enclosure: "central dome"
  },
  baroque: {
    type: "baroque",
    axis: "Compressed axis",
    typology: "Baroque",
    emphasis: "Spatial tension",
    envelope: "Ellipse + dome",
    length: 44,
    span: 28,
    height: 30,
    radius: 14,
    symmetry: 0.88,
    figure: "ellipse + dome",
    rhythm: "radial bays",
    enclosure: "curved nave"
  },
  modern: {
    type: "modern",
    axis: "Offset axis",
    typology: "Modern",
    emphasis: "Monolithic light",
    envelope: "Folded shell + opening",
    length: 50,
    span: 32,
    height: 36,
    radius: 16,
    symmetry: 0.82,
    figure: "folded shell",
    rhythm: "structural frames",
    enclosure: "expressive shell"
  }
};

const round = (value, digits = 1) => Number(value.toFixed(digits));
const withoutGeneratedBlock = (source) => {
  const start = source.indexOf(markerStart);
  if (start < 0) return source;
  const end = source.indexOf(markerEnd, start + markerStart.length);
  if (end < 0) throw new Error("geometry.js has an incomplete expanded-studies marker block");
  return source.slice(0, start).replace(/\s+$/, "\n");
};

const source = fs.readFileSync(geometryPath, "utf8");
const baseSource = withoutGeneratedBlock(source);
const context = { window: {} };
vm.runInNewContext(baseSource, context, { filename: geometryPath });
const existing = context.window.CHURCH_GEOMETRY;
if (!Array.isArray(existing)) throw new Error("geometry.js did not expose CHURCH_GEOMETRY");

const additions = JSON.parse(fs.readFileSync(additionsPath, "utf8"));
if (!Array.isArray(additions) || !additions.length) throw new Error("expanded-churches.json must contain records");
const existingIds = new Set(existing.map((study) => study.id));
const additionIds = new Set();

const generated = additions.map((item, offset) => {
  if (!item || typeof item !== "object") throw new Error(`Expanded record ${offset + 1} is not an object`);
  if (!item.id || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item.id)) throw new Error(`Invalid expanded church id: ${item.id}`);
  if (existingIds.has(item.id) || additionIds.has(item.id)) throw new Error(`Duplicate expanded church id: ${item.id}`);
  additionIds.add(item.id);
  const profile = profiles[item.profile];
  if (!profile) throw new Error(`Unknown geometry profile ${item.profile} for ${item.id}`);
  if (!Number.isFinite(item.factor) || item.factor <= 0) throw new Error(`Invalid scale factor for ${item.id}`);
  if (!Number.isInteger(item.bays) || item.bays <= 0) throw new Error(`Invalid bay count for ${item.id}`);
  const length = round(profile.length * item.factor);
  const span = round(profile.span * item.factor);
  const height = round(profile.height * item.factor);
  const radius = round(profile.radius * item.factor);
  const axis = item.axis || profile.axis;
  const emphasis = item.emphasis || profile.emphasis;
  const envelope = item.envelope || profile.envelope;
  const symmetry = Number.isFinite(item.symmetry) ? item.symmetry : profile.symmetry;
  const rhythm = item.rhythm || profile.rhythm;
  const figure = item.figure || profile.figure;
  const enclosure = item.enclosure || profile.enclosure;
  return {
    id: item.id,
    index: String(existing.length + offset + 1).padStart(2, "0"),
    name: item.name,
    shortName: item.shortName || item.name,
    typology: item.typology || profile.typology,
    place: item.place,
    era: item.era,
    emphasis,
    type: profile.type,
    churchName: item.churchName || item.name,
    status: "schematic",
    source: item.source || `Wikipedia · ${item.name}`,
    sourceUrl: item.sourceUrl,
    sourceNote: `Real reference building: the linked reference page identifies ${item.name} in ${item.place}; the Atlas dimensions, module, radius, and geometric readings are schematic, not a measured survey.`,
    envelope,
    axis,
    length,
    span,
    height,
    bayCount: item.bays,
    module: round(length / item.bays),
    radius,
    symmetry,
    surfaceNote: `The ${figure} reading uses the real building as a visual anchor; ${rhythm} turn its documented form into an exploratory proportional study.`,
    exteriorNote: `The exterior is abstracted as ${envelope.toLowerCase()}, keeping the building's recognizable mass while preserving the Atlas's schematic evidence boundary.`,
    interiorNote: `Inside, the study follows the ${axis.toLowerCase()} and ${rhythm}; these geometry values are interpretive inputs, not a measured plan.`,
    details: [
      ["primary figure", figure],
      ["structural rhythm", `${item.bays} ${rhythm}`],
      ["dominant axis", axis.toLowerCase()],
      ["enclosure", enclosure]
    ]
  };
});

const rendered = `${baseSource.trimEnd()}\n\n${markerStart}\nwindow.CHURCH_GEOMETRY.push(...${JSON.stringify(generated, null, 2)});\n${markerEnd}\n`;
fs.writeFileSync(geometryPath, rendered);
console.log(`Appended ${generated.length} real reference churches to data/geometry.js (${existing.length + generated.length} total studies).`);

#!/usr/bin/env node

"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const projectRoot = path.resolve(__dirname, "..");
const sourcePath = path.join(projectRoot, "data", "geometry.js");
const outputPath = path.join(projectRoot, "data", "geometry.json");
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

if (isCheck) {
  const current = fs.readFileSync(outputPath, "utf8");
  if (current !== rendered) {
    console.error("data/geometry.json is out of sync; run node scripts/sync-geometry-json.js");
    process.exitCode = 1;
  } else {
    console.log(`Geometry JSON is in sync: ${payload.studies.length} studies.`);
  }
} else {
  fs.writeFileSync(outputPath, rendered);
  console.log(`Wrote data/geometry.json from data/geometry.js: ${payload.studies.length} studies.`);
}

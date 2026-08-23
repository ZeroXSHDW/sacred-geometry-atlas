#!/usr/bin/env node

"use strict";

const fs = require("fs");
const crypto = require("crypto");
const path = require("path");

const root = path.resolve(__dirname, "..");
const rawRoot = path.join(root, "research", "raw");
const outputPath = path.join(root, "research", "acquired-assets.json");
const sourceByPath = {
  "research/raw/st-pauls/st_pauls_cathedral.tar.gz": {
    churchId: "st-pauls",
    sourceUrl: "https://www.cs.ubc.ca/research/kmyi_data/imw2020/TestData/st_pauls_cathedral.tar.gz",
    sourcePage: "https://www.cs.ubc.ca/~kmyi/imw2020/data.html",
    licenseStatus: "verify dataset terms before redistribution",
    scaleStatus: "photogrammetric ground truth; metric scale must be verified before building measurement"
  }
};

function sha256(filePath) {
  const hash = crypto.createHash("sha256");
  const handle = fs.openSync(filePath, "r");
  const buffer = Buffer.allocUnsafe(1024 * 1024);
  try {
    let bytesRead;
    do {
      bytesRead = fs.readSync(handle, buffer, 0, buffer.length, null);
      if (bytesRead) hash.update(buffer.subarray(0, bytesRead));
    } while (bytesRead);
  } finally {
    fs.closeSync(handle);
  }
  return hash.digest("hex");
}

function main() {
  if (!fs.existsSync(rawRoot)) throw new Error(`Raw asset root is missing: ${rawRoot}`);
  const records = [];
  const walk = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) walk(entryPath);
      else if (entry.isFile()) {
        const relativePath = path.relative(root, entryPath).split(path.sep).join("/");
        const source = sourceByPath[relativePath] || {};
        records.push({
          path: relativePath,
          churchId: source.churchId || null,
          sourceUrl: source.sourceUrl || null,
          sourcePage: source.sourcePage || null,
          sizeBytes: fs.statSync(entryPath).size,
          sha256: sha256(entryPath),
          acquiredAt: new Date().toISOString(),
          licenseStatus: source.licenseStatus || "unknown; verify source rights",
          scaleStatus: source.scaleStatus || "unknown-until-control-is-verified"
        });
      }
    }
  };
  walk(rawRoot);
  fs.writeFileSync(outputPath, `${JSON.stringify({
    title: "Sacred Geometry Atlas acquired raw assets",
    generatedBy: "scripts/register-acquired-assets.js",
    note: "Hashes and sizes prove local acquisition only; they do not prove metric scale or redistribution permission.",
    records
  }, null, 2)}\n`);
  console.log(`Registered ${records.length} acquired raw assets at ${path.relative(root, outputPath)}.`);
}

main();

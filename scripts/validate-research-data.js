#!/usr/bin/env node

"use strict";

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const readJson = (relativePath) => JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
const imageManifest = readJson("research/image-manifest.json");
const scanManifest = readJson("research/scan-manifest.json");
const measurementRegister = readJson("research/measurement-register.json");
const analysis = readJson("research/geometry-analysis.json");
const constructorEvidence = readJson("research/constructor-evidence.json");
const modelMetadata = readJson("research/model-metadata.json");
const dataProbes = readJson("research/data-probes.json");
const assetMeasurements = readJson("research/asset-measurements.json");
const acquiredAssets = readJson("research/acquired-assets.json");
const colmapMeasurements = readJson("research/st-pauls-colmap.json");
const expectedIds = new Set(measurementRegister.records.map((record) => record.id));
const expectedCount = 24;
const fail = (message) => { throw new Error(message); };

for (const [label, manifest] of [
  ["image manifest", imageManifest],
  ["scan manifest", scanManifest],
  ["measurement register", measurementRegister],
  ["geometry analysis", analysis],
  ["constructor evidence", constructorEvidence]
]) {
  const records = manifest.records;
  if (!Array.isArray(records) || records.length !== expectedCount) fail(`${label} must contain ${expectedCount} records`);
  const ids = new Set(records.map((record) => record.id));
  if (ids.size !== expectedCount || [...ids].some((id) => !expectedIds.has(id))) fail(`${label} IDs do not match the 24-study measurement register`);
}

if (!Array.isArray(modelMetadata.records) || modelMetadata.records.length !== 5) fail("model metadata must contain the five public Sketchfab leads");
for (const record of modelMetadata.records) {
  if (!expectedIds.has(record.churchId) || record.metadataStatus !== "retrieved" || !/^https?:\/\//i.test(record.apiUrl || "")) fail(`3D model metadata is incomplete for ${record.churchId}`);
  if (!Number.isInteger(record.vertexCount) || record.vertexCount <= 0 || !Number.isInteger(record.faceCount) || record.faceCount <= 0) fail(`3D model topology counts are invalid for ${record.churchId}`);
  if (typeof record.isDownloadable !== "boolean") fail(`3D model downloadability is missing for ${record.churchId}`);
  if (record.license && !/^https?:\/\//i.test(record.license.url || "")) fail(`3D model license URL is invalid for ${record.churchId}`);
}

if (!Array.isArray(dataProbes.records) || dataProbes.records.length < 8) fail("data probes must retain the registered endpoint checks");
const stPaulsProbe = dataProbes.records.find((record) => record.churchId === "st-pauls" && record.kind === "photogrammetry-archive");
if (!stPaulsProbe || stPaulsProbe.status !== "reachable" || stPaulsProbe.contentLength < 2000000000) fail("Saint Paul's public archive probe is missing its reachable size evidence");
const stPaulsInteriorProbe = dataProbes.records.find((record) => record.churchId === "st-pauls" && record.kind === "interior-model-glb");
if (!stPaulsInteriorProbe || stPaulsInteriorProbe.status !== "reachable" || stPaulsInteriorProbe.contentLength !== 90509728) fail("Saint Paul's interior GLB endpoint probe is missing its reachable size evidence");
if (!Array.isArray(assetMeasurements.records)) fail("asset measurement output is missing its records array");
if (!Array.isArray(acquiredAssets.records)) fail("acquired asset register is missing its records array");
const acquiredArchive = acquiredAssets.records.find((record) => record.path === "research/raw/st-pauls/st_pauls_cathedral.tar.gz");
if (!acquiredArchive || acquiredArchive.sizeBytes !== 2113573479 || acquiredArchive.sha256 !== "4e5054c0b03a5f4ef7033bb4b937e0fd4d48b066a1066085df0eb189e0a7fdae") fail("Saint Paul's local archive hash/size evidence is incomplete or stale");
if (colmapMeasurements.churchId !== "st-pauls" || colmapMeasurements.sparse?.cameraCount !== 615 || colmapMeasurements.sparse?.imageCount !== 615 || colmapMeasurements.sparse?.point3DCount !== 98872 || colmapMeasurements.denseDepthMaps?.mapCount !== 615) fail("Saint Paul's COLMAP measurement record is incomplete");
const acquiredInteriorModel = acquiredAssets.records.find((record) => record.path === "research/raw/st-pauls/st-pauls-zenodo-interior.glb");
const measuredInteriorModel = assetMeasurements.records.find((record) => record.path === "st-pauls/st-pauls-zenodo-interior.glb");
if (!acquiredInteriorModel || acquiredInteriorModel.sizeBytes !== 90509728 || acquiredInteriorModel.sha256 !== "2c7665282a7a1295f76b50fb6764d959b4bf6fed1a6443197c8fad0493ba3362") fail("Saint Paul's interior GLB acquisition evidence is incomplete or stale");
if (!measuredInteriorModel || measuredInteriorModel.measurementStatus !== "bounds-read" || measuredInteriorModel.pointCount !== 1837701 || measuredInteriorModel.faceCount !== 2500000) fail("Saint Paul's interior GLB measurement output is incomplete");
const stPaulsScan = scanManifest.records.find((record) => record.id === "st-pauls");
if (!stPaulsScan?.rawData?.downloaded || stPaulsScan.rawData.archiveSha256 !== acquiredArchive.sha256 || stPaulsScan.rawData.interiorModelSha256 !== acquiredInteriorModel.sha256) fail("Saint Paul's scan manifest is not linked to the verified local acquisitions");

for (const record of imageManifest.records) {
  if (!record.imagePath || !record.downloadStatus.startsWith("downloaded-thumbnail")) fail(`Image was not acquired for ${record.id}`);
  if (!/^https?:\/\//i.test(record.sourcePage || "") || !/^https?:\/\//i.test(record.rightsPage || "")) fail(`Image provenance links are incomplete for ${record.id}`);
  if (!fs.existsSync(path.join(root, record.imagePath))) fail(`Image file is missing for ${record.id}: ${record.imagePath}`);
}

for (const record of scanManifest.records) {
  if (!record.scanStatus || !record.coverage || !Array.isArray(record.sources) || !record.sources.length) fail(`Scan evidence is incomplete for ${record.id}`);
  for (const source of record.sources) if (!/^https?:\/\//i.test(source.url || "")) fail(`Scan source URL is invalid for ${record.id}`);
}

for (const record of measurementRegister.records) {
  for (const measurement of record.publishedMeasurements || []) {
    if (!Number.isFinite(measurement.value) || measurement.value <= 0 || !/^https?:\/\//i.test(measurement.sourceUrl || "")) fail(`Published measurement is invalid for ${record.id}`);
  }
}

for (const record of analysis.records) {
  if (record.constructorFinding?.result !== "not-determined-by-geometry") fail(`Constructor conclusion is overclaimed for ${record.id}`);
  if (record.interpretation?.includes("surveyed dimensions") === false) fail(`Analysis boundary is missing for ${record.id}`);
}

for (const record of constructorEvidence.records) {
  if (!record.constructionTeam || !record.documentaryStatus || !/^https?:\/\//i.test(record.sourceUrl || "")) fail(`Constructor evidence is incomplete for ${record.id}`);
  for (const role of record.roles || []) if (!role.name || !/^https?:\/\//i.test(role.sourceUrl || "")) fail(`Constructor role evidence is incomplete for ${record.id}`);
}

console.log(`Research validation passed: ${expectedCount} images, scan/model records, measurement records, analyses, and attribution records.`);

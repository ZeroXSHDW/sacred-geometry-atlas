#!/usr/bin/env node

"use strict";

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const manifestPath = path.join(root, "research", "scan-manifest.json");
const outputPath = path.join(root, "research", "model-metadata.json");
const userAgent = "SacredGeometryAtlas/1.0 (3D model metadata research)";
const sketchfabModelId = /sketchfab\.com\/3d-models\/[^/]+-([a-f0-9]{32})/i;

const scanManifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const leads = [];
for (const record of scanManifest.records) {
  for (const source of record.sources || []) {
    const match = String(source.url || "").match(sketchfabModelId);
    if (match) leads.push({ churchId: record.id, source, uid: match[1] });
  }
}

const uniqueLeads = [...new Map(leads.map((lead) => [lead.uid, lead])).values()];
const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function main() {
  const records = [];
  for (const lead of uniqueLeads) {
    const apiUrl = `https://api.sketchfab.com/v3/models/${lead.uid}`;
    let record = {
      churchId: lead.churchId,
      uid: lead.uid,
      viewerUrl: lead.source.url,
      apiUrl,
      metadataStatus: "error"
    };
    try {
      const response = await fetch(apiUrl, { headers: { "User-Agent": userAgent } });
      if (!response.ok) throw new Error(`Sketchfab API returned ${response.status}`);
      const model = await response.json();
      const hasLicense = Boolean(model.license && (model.license.url || model.license.label || model.license.fullName));
      record = {
        churchId: lead.churchId,
        uid: model.uid,
        name: model.name,
        viewerUrl: model.viewerUrl || lead.source.url,
        apiUrl,
        author: model.user?.displayName || model.user?.username || null,
        authorProfile: model.user?.profileUrl || null,
        license: hasLicense ? {
          label: model.license.label || null,
          fullName: model.license.fullName || null,
          url: model.license.url || null,
          requirements: model.license.requirements || null,
          slug: model.license.slug || null
        } : null,
        faceCount: Number.isFinite(model.faceCount) ? model.faceCount : null,
        vertexCount: Number.isFinite(model.vertexCount) ? model.vertexCount : null,
        textureCount: Number.isFinite(model.textureCount) ? model.textureCount : null,
        materialCount: Number.isFinite(model.materialCount) ? model.materialCount : null,
        animationCount: Number.isFinite(model.animationCount) ? model.animationCount : null,
        isDownloadable: Boolean(model.isDownloadable),
        isProtected: Boolean(model.isProtected),
        createdAt: model.createdAt || null,
        updatedAt: model.updatedAt || null,
        metadataStatus: "retrieved",
        measurementBoundary: "Topology counts and model metadata are not metric building measurements; scale/control must be verified before geometry extraction."
      };
    } catch (error) {
      record.error = error.message;
    }
    records.push(record);
    await sleep(250);
  }
  const output = {
    title: "Sketchfab public model metadata for Sacred Geometry Atlas leads",
    generatedBy: "scripts/fetch-model-metadata.js",
    retrievedAt: new Date().toISOString(),
    note: "This file records public API metadata. It does not bypass download controls or claim that a downloadable model is a scale-controlled survey.",
    records
  };
  fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);
  const retrieved = records.filter((record) => record.metadataStatus === "retrieved").length;
  console.log(`3D model metadata retrieved: ${retrieved}/${records.length}; output at ${path.relative(root, outputPath)}.`);
  if (retrieved !== records.length) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});

#!/usr/bin/env node

"use strict";

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const outputPath = path.join(root, "research", "data-probes.json");
const userAgent = "SacredGeometryAtlas/1.0 (research data access probe)";

const candidates = [
  {
    churchId: "st-pauls",
    kind: "photogrammetry-archive",
    url: "https://www.cs.ubc.ca/research/kmyi_data/imw2020/TestData/st_pauls_cathedral.tar.gz",
    sourcePage: "https://www.cs.ubc.ca/~kmyi/imw2020/data.html",
    note: "Public 2.0G test sequence with images and ground truth; not LiDAR."
  },
  {
    churchId: "st-pauls",
    kind: "published-dimension-control",
    url: "https://www.cityoflondon.gov.uk/assets/Services-Environment/ed-htb34-protected-views-spd.pdf",
    sourcePage: "https://www.cityoflondon.gov.uk/assets/Services-Environment/ed-htb34-protected-views-spd.pdf",
    note: "Government PDF with the visually verified St Paul's dimension table and section drawing."
  },
  {
    churchId: "st-pauls",
    kind: "interior-model-glb",
    url: "https://zenodo.org/api/records/10242150/files/21e41040c4ca45c7b134aa768b5c993b.glb/content",
    sourcePage: "https://zenodo.org/doi/10.5281/zenodo.10242150",
    note: "Public 90.5 MB rough interior/crypt GLB; Zenodo metadata has no license field, so local use remains rights-limited."
  },
  {
    churchId: "speyer",
    kind: "native-reconstruction-model",
    url: "https://3d-repository.hs-mainz.de/sites/default/files/wisski_original/8efb0c48738e42df647d78cefd371504.pln",
    sourcePage: "https://3d-repository.hs-mainz.de/wisski/navigate/60/view",
    license: "CC0 1.0 stated on the model record",
    note: "Source-based historical reconstruction in Archicad native format; not a measured scan."
  },
  {
    churchId: "karlskirche",
    kind: "dataset-record",
    url: "https://doi.org/10.48436/qsq78-f3t07",
    sourcePage: "https://b2find.eudat.eu/dataset/2d71208a-ccc8-5e37-b1cf-d4ae55397ba6",
    license: "CC BY-NC-SA 4.0",
    note: "Dataset record says the mesh is available by contacting the data custodian; this probe does not send contact or bypass access."
  }
];

const modelMetadataPath = path.join(root, "research", "model-metadata.json");
if (fs.existsSync(modelMetadataPath)) {
  const modelMetadata = JSON.parse(fs.readFileSync(modelMetadataPath, "utf8"));
  for (const model of modelMetadata.records) {
    candidates.push({
      churchId: model.churchId,
      kind: "sketchfab-api-metadata",
      url: model.apiUrl,
      sourcePage: model.viewerUrl,
      license: model.license?.fullName || "license not stated in API metadata",
      note: "Public model metadata endpoint; raw mesh downloadability is recorded separately and is not bypassed."
    });
  }
}

async function probe(candidate) {
  const startedAt = new Date().toISOString();
  const method = candidate.kind === "sketchfab-api-metadata" ? "GET" : "HEAD";
  const base = {
    ...candidate,
    probedAt: startedAt,
    method,
    status: "error",
    httpStatus: null,
    contentType: null,
    contentLength: null,
    acceptRanges: null,
    finalUrl: null
  };
  try {
    const response = await fetch(candidate.url, {
      method,
      redirect: "follow",
      headers: { "User-Agent": userAgent },
      signal: AbortSignal.timeout(30000)
    });
    base.httpStatus = response.status;
    base.contentType = response.headers.get("content-type");
    base.contentLength = response.headers.get("content-length") ? Number(response.headers.get("content-length")) : null;
    base.acceptRanges = response.headers.get("accept-ranges");
    base.finalUrl = response.url;
    if (method === "GET") await response.arrayBuffer();
    base.status = response.ok ? "reachable" : "http-error";
  } catch (error) {
    base.error = `${error.name}: ${error.message}`;
  }
  return base;
}

async function main() {
  const records = [];
  for (const candidate of candidates) {
    records.push(await probe(candidate));
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  const output = {
    title: "Sacred Geometry Atlas data access probes",
    generatedBy: "scripts/probe-research-data.js",
    note: "HEAD probes report what the public endpoint exposes at probe time. A reachable URL is not proof of metric scale, license, or permission to redistribute.",
    records
  };
  fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);
  console.log(`Research endpoint probes written: ${records.length} records at ${path.relative(root, outputPath)}.`);
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});

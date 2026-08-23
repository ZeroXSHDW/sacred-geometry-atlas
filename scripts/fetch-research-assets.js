#!/usr/bin/env node

"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const projectRoot = path.resolve(__dirname, "..");
const geometryPath = path.join(projectRoot, "data", "geometry.js");
const researchRoot = path.join(projectRoot, "research");
const imageRoot = path.join(researchRoot, "images");
const manifestPath = path.join(researchRoot, "image-manifest.json");
const wikipediaApi = "https://en.wikipedia.org/w/api.php";
const userAgent = "SacredGeometryAtlas/1.0 (research asset acquisition)";

const wikipediaTitles = {
  basilica: "Basilica of Sant'Apollinare in Classe",
  gothic: "Chartres Cathedral",
  byzantine: "Hosios Loukas",
  baroque: "Sant'Andrea al Quirinale",
  stave: "Borgund Stave Church",
  concrete: "Church of the Light",
  "san-vitale": "Basilica of San Vitale",
  "hagia-sophia": "Hagia Sophia",
  speyer: "Speyer Cathedral",
  durham: "Durham Cathedral",
  santiago: "Santiago de Compostela Cathedral",
  reims: "Reims Cathedral",
  cologne: "Cologne Cathedral",
  monreale: "Monreale Cathedral",
  "saint-denis": "Basilica of Saint-Denis",
  urnes: "Urnes Stave Church",
  kizhi: "Kizhi Pogost",
  "san-giorgio": null,
  redentore: "Il Redentore",
  "st-pauls": "St Paul's Cathedral",
  karlskirche: "Karlskirche",
  ronchamp: "Notre-Dame du Haut",
  brasilia: "Cathedral of Brasília",
  thorncrown: "Thorncrown Chapel"
};

const sanGiorgioFallback = {
  filename: "Basilica_di_San_Giorgio_Maggiore_(Venice).jpg",
  imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/07/Basilica_di_San_Giorgio_Maggiore_%28Venice%29.jpg/1920px-Basilica_di_San_Giorgio_Maggiore_%28Venice%29.jpg?utm_source=it.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
  sourcePage: "https://it.wikipedia.org/wiki/Basilica_di_San_Giorgio_Maggiore",
  rightsPage: "https://commons.wikimedia.org/wiki/File:Basilica_di_San_Giorgio_Maggiore_(Venice).jpg",
  rightsStatus: "Commons source page recorded; verify the file license and attribution before redistribution."
};

const context = { window: {} };
vm.runInNewContext(fs.readFileSync(geometryPath, "utf8"), context, { filename: geometryPath });
const studies = context.window.CHURCH_GEOMETRY;
if (!Array.isArray(studies) || studies.length !== 24) throw new Error("Expected 24 geometry studies before acquiring research assets");

const apiUrl = new URL(wikipediaApi);
apiUrl.search = new URLSearchParams({
  action: "query",
  format: "json",
  origin: "*",
  titles: Object.values(wikipediaTitles).filter(Boolean).join("|"),
  prop: "pageimages|info",
  piprop: "thumbnail|original",
  pithumbsize: "1600",
  inprop: "url"
});

const decodeFilename = (imageUrl) => {
  const filePart = new URL(imageUrl).pathname.split("/").pop();
  return decodeURIComponent(filePart || "").replace(/^\d+px-/, "");
};
const commonsPageFor = (imageUrl) => {
  const filename = decodeFilename(imageUrl);
  return filename ? `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(filename).replace(/%20/g, "_")}` : null;
};
const isCommonsImage = (imageUrl) => /upload\.wikimedia\.org\/wikipedia\/commons\//i.test(imageUrl);
const proxyUrlsFor = (imageUrl) => {
  const sourceUrl = new URL(imageUrl);
  sourceUrl.search = "";
  // Keep Wikimedia's encoded path intact. Weserv's raw query form is the
  // reliable route for Wikimedia filenames containing encoded punctuation;
  // retain an encoded-query fallback for servers that parse query values more
  // strictly.
  return [
    `https://images.weserv.nl/?url=${sourceUrl.href}`,
    `https://images.weserv.nl/?url=${encodeURIComponent(sourceUrl.href)}`
  ];
};
const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function download(url, destination) {
  const response = await fetch(url, { headers: { "User-Agent": userAgent } });
  if (!response.ok) throw new Error(`Image request failed (${response.status}): ${url}`);
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.startsWith("image/")) throw new Error(`Image request returned ${contentType || "unknown content"}: ${url}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  fs.writeFileSync(destination, bytes);
  return { bytes: bytes.length, contentType };
}

async function main() {
  fs.mkdirSync(imageRoot, { recursive: true });
  const apiResponse = await fetch(apiUrl, { headers: { "User-Agent": userAgent } });
  if (!apiResponse.ok) throw new Error(`Wikipedia image API failed: ${apiResponse.status}`);
  const apiPayload = await apiResponse.json();
  const pagesByTitle = new Map(Object.values(apiPayload.query?.pages || {}).map((page) => [page.title, page]));
  const records = [];

  for (const study of studies) {
    const title = wikipediaTitles[study.id];
    const page = title ? pagesByTitle.get(title) : null;
    const image = page?.thumbnail?.source || page?.original?.source || null;
    const fallback = study.id === "san-giorgio" ? sanGiorgioFallback : null;
    const imageUrl = image || fallback?.imageUrl || null;
    const sourcePage = page?.fullurl || fallback?.sourcePage || null;
    const filename = imageUrl ? decodeFilename(imageUrl) : null;
    const rightsPage = fallback?.rightsPage || (isCommonsImage(imageUrl || "") ? commonsPageFor(imageUrl) : sourcePage);
    const rightsStatus = fallback?.rightsStatus || (isCommonsImage(imageUrl || "")
      ? "Wikimedia Commons source page recorded; verify the file license and attribution before redistribution."
      : "Wikipedia article image; license is not inferred here and must be verified before redistribution.");
    const imagePath = `research/images/${study.id}.jpg`;
    const destination = path.join(projectRoot, imagePath);
    let downloadStatus = "not-found";
    let downloadedBytes = 0;
    let contentType = null;
    let downloadUrl = null;
    let downloadTransport = null;
    if (imageUrl) {
      try {
        const info = await download(imageUrl, destination);
        downloadStatus = "downloaded-thumbnail";
        downloadedBytes = info.bytes;
        contentType = info.contentType;
        downloadUrl = imageUrl;
        downloadTransport = "direct source URL";
      } catch (error) {
        if (/upload\.wikimedia\.org|commons\.wikimedia\.org/i.test(imageUrl)) {
          const proxyErrors = [];
          for (const proxyUrl of proxyUrlsFor(imageUrl)) {
            try {
              const info = await download(proxyUrl, destination);
              downloadStatus = "downloaded-thumbnail-via-cache";
              downloadedBytes = info.bytes;
              contentType = info.contentType;
              downloadUrl = proxyUrl;
              downloadTransport = "Weserv cache of the original Wikimedia URL; source URL remains authoritative";
              break;
            } catch (proxyError) {
              proxyErrors.push(proxyError.message);
            }
          }
          if (!downloadUrl) {
            downloadStatus = `error: ${error.message}; cache fallbacks: ${proxyErrors.join(" | ")}`;
          }
        } else {
          downloadStatus = `error: ${error.message}`;
        }
      }
    }
    records.push({
      id: study.id,
      index: study.index,
      name: study.name,
      role: "real reference image; visual evidence only, not a scaled survey",
      imagePath: downloadStatus.startsWith("downloaded-thumbnail") ? imagePath : null,
      imageUrl,
      sourcePage,
      sourceTitle: title || "Wikimedia Commons selected file",
      fileName: filename,
      rightsPage,
      rightsStatus,
      downloadStatus,
      downloadedBytes,
      contentType,
      downloadUrl,
      downloadTransport,
      measurementUse: "orientation and visual correspondence only until a scaled plan, scan, or photogrammetric control is attached"
    });
    await sleep(350);
  }

  const manifest = {
    title: "Sacred Geometry Atlas research image manifest",
    generatedBy: "scripts/fetch-research-assets.js",
    note: "Downloaded thumbnails are real reference photographs or source images. They are not survey measurements. Every rightsPage must be checked before publication or redistribution.",
    sourcePolicy: "Prefer Wikimedia Commons media with an explicit license; retain the source page, creator, and license evidence. Article images without a verified license remain research-only.",
    records
  };
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  const downloaded = records.filter((record) => record.downloadStatus.startsWith("downloaded-thumbnail")).length;
  console.log(`Research image acquisition complete: ${downloaded}/${records.length} thumbnails downloaded; manifest at ${path.relative(projectRoot, manifestPath)}.`);
  if (downloaded !== records.length) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});

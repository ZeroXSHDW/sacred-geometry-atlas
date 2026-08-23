const CACHE_NAME = "sacred-geometry-atlas-v2";
const SHELL_PATHS = [
  "./",
  "index.html",
  "404.html",
  "app.js",
  "styles.css",
  "favicon.svg",
  "site.webmanifest",
  "icons/atlas-192.png",
  "icons/atlas-512.png",
  "data/geometry.js",
  "data/geometry.json",
  "data/geometry.csv",
  "data/geometry.schema.json"
];

function shellUrls() {
  return SHELL_PATHS.map((path) => new URL(path, self.registration.scope).href);
}

async function cacheResponse(request, response) {
  if (response && response.ok) {
    const cache = await caches.open(CACHE_NAME);
    await cache.put(request, response.clone());
  }
  return response;
}

async function networkFirst(request) {
  try {
    return await cacheResponse(request, await fetch(request));
  } catch (error) {
    const cached = await caches.match(request);
    if (cached) return cached;
    if (request.mode === "navigate") {
      return (await caches.match(new URL("index.html", self.registration.scope).href)) || Response.error();
    }
    return Response.error();
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(shellUrls());
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const cacheKeys = await caches.keys();
    await Promise.all(cacheKeys
      .filter((key) => key.startsWith("sacred-geometry-atlas-") && key !== CACHE_NAME)
      .map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;
  event.respondWith(networkFirst(request));
});

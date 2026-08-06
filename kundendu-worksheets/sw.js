/* Service worker for Kundendu's Learn & Play.
   Precaches the app shell; caches line-art SVGs and fonts as they are used,
   so the app keeps working fully offline after the first visit. */

const VERSION = "kws-v3";
const SHELL_CACHE = VERSION + "-shell";
const RUNTIME_CACHE = VERSION + "-runtime";

const SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png",
  "./icons/apple-touch-icon.png"
];

const RUNTIME_HOSTS = [
  "cdn.jsdelivr.net",
  "fonts.googleapis.com",
  "fonts.gstatic.com"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => !k.startsWith(VERSION)).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);

  // App shell: network-first so updates arrive, cache fallback so offline works.
  if (url.origin === self.location.origin) {
    event.respondWith(
      fetch(request)
        .then(response => {
          const copy = response.clone();
          caches.open(SHELL_CACHE).then(cache => cache.put(request, copy));
          return response;
        })
        .catch(() =>
          caches.match(request).then(hit => hit || (request.mode === "navigate" ? caches.match("./index.html") : Response.error()))
        )
    );
    return;
  }

  // Line art + fonts: cache-first with background refresh.
  if (RUNTIME_HOSTS.includes(url.hostname)) {
    event.respondWith(
      caches.open(RUNTIME_CACHE).then(cache =>
        cache.match(request).then(hit => {
          const refresh = fetch(request)
            .then(response => {
              if (response.ok || response.type === "opaque") cache.put(request, response.clone());
              return response;
            })
            .catch(() => hit);
          return hit || refresh;
        })
      )
    );
  }
});

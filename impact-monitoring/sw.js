// Minimal app-shell cache. The app is always-online by design (build brief §6.2);
// this only makes installs feel instant — data never lives here.
const CACHE = "ca-mne-shell-v13";
const SHELL = [
  "./",
  "index.html",
  "css/styles.css",
  "dot-persona.md",
  "img/dot.svg",
  "img/ca-wide.svg",
  "img/ca-stacked.svg",
  "img/ca-tight.svg",
  "js/app.js",
  "js/ui.js",
  "js/config.js",
  "js/store.js",
  "js/gemini.js",
  "js/supabase.js",
  "js/views/auth.js",
  "js/views/home.js",
  "js/views/setup.js",
  "js/views/track.js",
  "js/views/report.js",
  "js/views/settings.js",
  "manifest.webmanifest",
  "icon.svg",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET" || !e.request.url.startsWith(self.location.origin)) return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy));
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});

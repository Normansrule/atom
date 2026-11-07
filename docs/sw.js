/* Atom's service worker: the website works with no connection at all, so a
   Chromebook cart or an iPad in a classroom keeps working when the Wi-Fi
   does not. Everything the site needs is kept in one cache named for the
   release; a new release replaces the whole set on its next load. The
   version below is checked against VERSION by scripts/smoke.mjs, so a
   release cannot ship with a stale cache name. */
var VERSION = "1.6.0";
var CACHE = "atom-" + VERSION;
var CORE = [
  "./", "index.html", "404.html", "teachers.html", "manifest.webmanifest",
  "assets/site.css", "assets/atom-labs.css",
  "assets/atom-data.js", "assets/atom-engines.js", "assets/atom-ptable.js", "assets/atom-labs.js", "assets/site.js",
  "assets/fonts/archivo-var.woff2",
  "assets/favicon-64.png", "assets/apple-touch-icon.png", "assets/icon-192.png", "assets/icon-512.png"
];

self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(CORE); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k.indexOf("atom-") === 0 && k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
/* the pages and code come from the cache first (they are versioned together,
   so a cached copy is never half of one release and half of another); the
   pictures, the recordings, and the app are kept once they have been seen */
self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(caches.match(req, { ignoreSearch: true }).then(function (hit) {
    if (hit) return hit;
    return fetch(req).then(function (res) {
      if (res && res.ok && res.type === "basic") { var copy = res.clone(); caches.open(CACHE).then(function (c) { c.put(req, copy); }); }
      return res;
    }).catch(function () {
      if (req.mode === "navigate") return caches.match("index.html");
      return Response.error();
    });
  }));
});

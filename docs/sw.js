/* Atom's service worker: the website works with no connection at all, so a
   Chromebook cart or an iPad in a classroom keeps working when the Wi-Fi
   does not. Everything the site needs is kept in one cache named for the
   release and for the exact files in it (BUILD is a hash of them, written by
   scripts/stamp_sw.py and checked by scripts/smoke.mjs), so a corrected
   file always reaches a returning reader. The language files are not in the
   list: the page says which language it is in and only those are kept. */
var VERSION = "2.0.0";
var BUILD = "6ce8d5a6";
var CACHE = "atom-site-" + VERSION + "-" + BUILD;
var CORE = [
  "./", "index.html", "404.html", "teachers.html", "handout.html", "manifest.webmanifest",
  "assets/site.css", "assets/atom-labs.css",
  "assets/atom-i18n.js",
  "assets/atom-data.js", "assets/atom-engines.js", "assets/atom-ptable.js", "assets/atom-labs.js", "assets/site.js",
  "assets/fonts/archivo-var.woff2",
  "assets/favicon-64.png", "assets/apple-touch-icon.png", "assets/icon-192.png", "assets/icon-512.png",
  "media/app-dark.jpg", "media/app-light.png"
];
var PACK = /\/assets\/i18n\/[a-z]{2,3}(\.[a-z]+)?\.js$/;

/* fetched past the browser's own cache: a file kept from the last release for a few
   minutes must not be filed under this one's name */
function fresh(u) { return new Request(u, { cache: "reload" }); }

self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(CORE.map(fresh)); }).then(function () {
    /* a first visit starts working offline at once; a later release waits until the reader
       agrees (the page asks) or every tab has closed, so no open page loses its files */
    if (!self.registration.active) return self.skipWaiting();
  }));
});
self.addEventListener("message", function (e) {
  var d = e.data;
  if (d === "atom:update") { self.skipWaiting(); return; }
  if (d && d.atom === "packs" && Array.isArray(d.urls)) {
    var urls = d.urls.filter(function (u) { try { var x = new URL(u, self.registration.scope); return x.origin === self.location.origin && PACK.test(x.pathname); } catch (err) { return false; } });
    if (urls.length) e.waitUntil(caches.open(CACHE).then(function (c) {
      return Promise.all(urls.map(function (u) { return c.match(u).then(function (hit) { return hit || c.add(fresh(new URL(u, self.registration.scope).href)); }); }));
    }).catch(function () {}));
  }
});
self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    /* this site's own caches only: the new prefix, and the names releases before 2.0 used (atom-1.7.0) */
    return Promise.all(keys.filter(function (k) { return k !== CACHE && (k.indexOf("atom-site-") === 0 || /^atom-\d+\.\d+\.\d+$/.test(k)); }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
/* the pages and code come from this release's cache first (they are versioned
   together, so a cached copy is never half of one release and half of
   another); the pictures, the recordings, the language files, and the app are
   kept once they have been seen */
self.addEventListener("fetch", function (e) {
  var req = e.request, url;
  try { url = new URL(req.url); } catch (err) { return; }
  if (req.method !== "GET" || url.origin !== self.location.origin) return;
  e.respondWith(caches.open(CACHE).then(function (c) {
    return c.match(req, { ignoreSearch: true }).then(function (hit) {
      if (hit) return hit;
      return fetch(req).then(function (res) {
        if (res && res.ok && res.type === "basic" && !res.redirected) { var copy = res.clone(); e.waitUntil(c.put(req, copy).catch(function () {})); }
        return res;
      });
    });
  }, function () { return fetch(req); }).catch(function () {
    /* offline and never kept: send a page request to the table at its own address, where the links resolve */
    if (req.mode === "navigate") {
      var home = self.registration.scope;
      return url.pathname === new URL(home).pathname ? Response.error() : Response.redirect(home, 302);
    }
    return Response.error();
  }));
});

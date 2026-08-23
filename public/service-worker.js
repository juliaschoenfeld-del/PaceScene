const CACHE = "pacescene-v1";
const ASSETS = ["./","index.html","styles.css","app.js","manifest.json","icon.svg","privacy.html","terms.html"];
self.addEventListener("install", e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS))));
self.addEventListener("activate", e => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", e => {
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request).then(resp => {
    const clone = resp.clone();
    caches.open(CACHE).then(c => c.put(e.request, clone));
    return resp;
  }).catch(() => caches.match("index.html"))));
});

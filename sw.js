const CACHE = "ascension-v4";
const FICHIERS = ["index.html", "style.css", "app.js", "icon-192.png", "icon-512.png"];

self.addEventListener("install", function(e){
    self.skipWaiting();
    e.waitUntil(caches.open(CACHE).then(function(c){ return c.addAll(FICHIERS); }));
});

self.addEventListener("activate", function(e){
    e.waitUntil(
        caches.keys().then(function(cles){
            return Promise.all(cles.map(function(cle){
                if (cle !== CACHE){ return caches.delete(cle); }
            }));
        }).then(function(){ return self.clients.claim(); })
    );
});

self.addEventListener("fetch", function(e){
    if (new URL(e.request.url).origin !== self.location.origin){ return; }
    e.respondWith(caches.match(e.request).then(function(r){ return r || fetch(e.request); }));
});

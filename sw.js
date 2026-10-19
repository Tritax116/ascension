const CACHE = "ascension-v5";
const FICHIERS = [
    "index.html",
    "style.css",
    "app.js",
    "icon-192.png",
    "icon-512.png",
    "fonts/morhefa-400.woff2",
    "fonts/morhefa-500.woff2",
    "fonts/morhefa-700.woff2"
];

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
    if (e.request.method !== "GET"){ return; }
    if (new URL(e.request.url).origin !== self.location.origin){ return; }
    if (e.request.url.indexOf("/.netlify/functions/") !== -1){ return; }

    e.respondWith(
        fetch(e.request)
            .then(function(reponse){
                const copie = reponse.clone();
                caches.open(CACHE).then(function(c){ c.put(e.request, copie); });
                return reponse;
            })
            .catch(function(){
                return caches.match(e.request);
            })
    );
});
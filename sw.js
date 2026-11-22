const CACHE = "ascension-v13";
const FICHIERS = [
    "index.html",
    "style.css",
    "app.js",
    "icon-192.png",
    "icon-512.png",
    "fonts/morhefa-400.woff2",
    "fonts/morhefa-500.woff2",
    "fonts/morhefa-700.woff2",
    "exercices.js",
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
    const url = new URL(e.request.url);
    if (url.hostname === "cdnjs.cloudflare.com"){
        // Leaflet : cache d'abord, pour que la carte marche sans reseau
        e.respondWith(
            caches.match(e.request).then(function(deja){
                return deja || fetch(e.request).then(function(reponse){
                    const copie = reponse.clone();
                    caches.open(CACHE).then(function(c){ c.put(e.request, copie); });
                    return reponse;
                });
            })
        );
        return;
    }
    if (url.origin !== self.location.origin){ return; }
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

// Toucher la notification de repos ramene l'app au premier plan.
self.addEventListener("notificationclick", function(e){
    e.notification.close();
    e.waitUntil(
        self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(function(liste){
            for (let i = 0; i < liste.length; i++){
                if ("focus" in liste[i]){ return liste[i].focus(); }
            }
            return self.clients.openWindow("./");
        })
    );
});

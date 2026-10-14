# Ascension

App fitness/santé gamifiée — musculation, course, mobilité, nutrition et hydratation,
avec un système de progression RPG (rangs à divisions, quêtes journalières, badges, avatar évolutif).

**En ligne :** https://roaring-monstera-33669a.netlify.app/

## Pile technique

- HTML / CSS / JavaScript **vanilla** — aucun framework, aucune étape de build
- Données stockées en **localStorage** (pas de backend, pas de base de données)
- **PWA** installable (manifest + service worker)
- [Leaflet](https://leafletjs.com/) + OpenStreetMap pour le suivi GPS des courses
- Une fonction serverless Netlify qui sert de proxy vers [Open Food Facts](https://world.openfoodfacts.org/)

## Fichiers

| Fichier | Rôle |
|---|---|
| `index.html` | Toute la structure : 5 onglets, écran de séance, muscle map SVG (34 zones) |
| `style.css` | Thème sombre kaki, tokens CSS, bottom tab bar |
| `app.js` | Toute la logique : rangs, XP, quêtes, GPS, mobilité, nutrition, badges |
| `manifest.json` | Configuration PWA |
| `sw.js` | Service worker (cache `ascension-v4`) |
| `netlify/functions/food.js` | Proxy Open Food Facts (User-Agent + filtrage par pertinence) |
| `avatar-pixel-0..4.png` | Les 5 stades de l'avatar (un par palier de rang) |
| `icon-192.png`, `icon-512.png` | Icônes PWA |

## Lancer en local

Depuis le dossier du projet :

```
python -m http.server 8000
```

Puis ouvrir http://localhost:8000

⚠️ La recherche nutrition ne fonctionne **pas** en local : elle appelle
`/.netlify/functions/food`, qui n'existe que sur Netlify. Pour la tester en local,
il faut la CLI Netlify (`netlify dev`).

## Déploiement

Push sur la branche `main` → Netlify déploie automatiquement.

## Structure des données (localStorage, clé `etat`)

```
etat = {
  xp, streak, bestStreak, lastActiveDate, dernierRang,
  poids,
  history:     { "AAAA-MM-JJ": { presence, full } },
  muscu:       [ { nom, poids, reps, muscle, date } ],
  course:      [ { distance, duree, allure, date, trace, favori } ],
  seances:     [ { date, duree, volume, series } ],
  mobilite:    [ { date, score } ],
  hydratation: { date, objectif, prises: [ { ml, heure } ] },
  nutrition:   { objectif, repas: [ { nom, kcal, prot, gluc, lip, date } ] },
  quete:       { date, penalite, faite, objectifs: [ { nom, cible, actuel } ] },
  badges:      { "<id>": true }
}
```

## Historique

Sources perdues le 13/10/2026, reconstituées depuis le déploiement Netlify.
D'où ce dépôt Git. Ne plus jamais travailler sans.

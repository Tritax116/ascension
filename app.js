if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js");
}
let suiviId = null;
let dernierePosition = null;
let distanceCourse = 0;
let debutCourse = null;
let carte = null;
let ligneTrace = null;
let pointsTrace = [];
let marqueur = null;
let enPause = false;
let pauseDebut = null;
let filtreMuscle = null;
let verrouEcran = null;
let seanceEnCours = JSON.parse(localStorage.getItem("seanceEnCours")) || null;
let finRepos = 0;
const PAS_REPOS = 15;
const REPOS_MIN = 15;
const REPOS_MAX = 600;
let totalRepos = 0;
let contexteAudio = null;
let dialogueResolve = null;
let historiqueComplet = false;
let reposExos = JSON.parse(localStorage.getItem("reposExos")) || {};
let exosRecents = JSON.parse(localStorage.getItem("exosRecents")) || [];
let exosPerso = JSON.parse(localStorage.getItem("exosPerso")) || [];
for (let i = 0; i < exosPerso.length; i++) {
    EXERCICES.push(exosPerso[i]);
}
let filtresSelecteur = { muscle: null, materiel: null };
let modeCarte = "volume";
const FOURCHETTES = { force: { min: 4, max: 6 }, masse: { min: 8, max: 12 }, forme: { min: 12, max: 15 } };
// Fonctions mises en pause : passe a true pour les remettre (onglet + Profil + badges).
const MODULES_ACTIFS = { course: false, nutrition: false };
const ORDRE_JOURS = [1, 2, 3, 4, 5, 6, 0];
const NOMS_JOURS_COURTS = { 1: "Lun", 2: "Mar", 3: "Mer", 4: "Jeu", 5: "Ven", 6: "Sam", 0: "Dim" };
const NOMS_JOURS_LONGS = { 1: "lundi", 2: "mardi", 3: "mercredi", 4: "jeudi", 5: "vendredi", 6: "samedi", 0: "dimanche" };
let onboardingEtat = { objectif: "masse", jours: [1, 2, 3, 5] };
let dernierResume = null;
let minuteurFinRepos = null;
let notifRepos = { exo: "", prochaine: "" };
const NOTIF_TAG = "repos-ascension";
const DIVISIONS_FORCE = ["III", "II", "I"];

// Defis du jour : pool pondere (poids = frequence). seance:true = propose les jours d'entrainement.
const DEFIS = [
    { id: "series15", nom: "Valide 15 séries aujourd'hui", poids: 3, xp: 25, seance: true, test: function(j) { return j.series >= 15; } },
    { id: "volume6000", nom: "Dépasse 6 000 kg de volume aujourd'hui", poids: 3, xp: 30, seance: true, test: function(j) { return j.volume >= 6000; } },
    { id: "muscles3", nom: "Travaille 3 groupes musculaires différents", poids: 2, xp: 35, seance: true, test: function(j) { return j.muscles >= 3; } },
    { id: "court", nom: "Termine ta séance en moins de 60 minutes", poids: 2, xp: 25, seance: true, test: function(j) { return j.seances >= 1 && j.dureeMin <= 60; } },
    { id: "echauffement", nom: "Fais au moins une série d'échauffement", poids: 2, xp: 20, seance: true, test: function(j) { return j.echauffements >= 1; } },
    { id: "record", nom: "Bats un record de charge", poids: 2, xp: 50, seance: true, test: function(j) { return j.records >= 1; } },
    { id: "montee", nom: "Fais monter un rang de force", poids: 1, xp: 80, seance: true, test: function(j) { return j.montees >= 1; } },
    { id: "eau-matin", nom: "Bois 1 L d'eau avant midi", poids: 3, xp: 20, seance: false, test: function(j) { return j.eauAvantMidi >= 1000; } },
    { id: "eau-complete", nom: "Atteins ton objectif d'eau", poids: 2, xp: 20, seance: false, test: function(j) { return j.eauTotale >= j.eauObjectif; } }
];

// Village : un batiment se debloque par paliers de seances terminees (pas un par seance).
const BATIMENTS = [
    { nom: "Tente", seances: 0, hauteur: 10, mur: "#8C6B4A", toit: "#B4B389" },
    { nom: "Forge", seances: 3, hauteur: 16, mur: "#5A5B45", toit: "#BF6F58" },
    { nom: "Salle d'entraînement", seances: 8, hauteur: 18, mur: "#6E6D48", toit: "#8E9A62" },
    { nom: "Tour de guet", seances: 15, hauteur: 34, mur: "#7A7A66", toit: "#B0B0B0" },
    { nom: "Temple", seances: 25, hauteur: 22, mur: "#8E8C78", toit: "#F2C744" },
    { nom: "Marché", seances: 40, hauteur: 14, mur: "#8C6B4A", toit: "#C99A55" },
    { nom: "Bibliothèque", seances: 60, hauteur: 24, mur: "#5D6D8A", toit: "#5DBEBE" },
    { nom: "Dojo", seances: 90, hauteur: 20, mur: "#6E4A4A", toit: "#BF6F58" },
    { nom: "Citadelle", seances: 130, hauteur: 42, mur: "#4F4A6A", toit: "#A78BFA" }
];
const NB_SERIES_PROGRAMME = 3;

const COULEURS_CARTE = { rouge: "#BF6F58", ambre: "#D9A25A", vert: "#8E9A62", terne: "#4A5035" };

const LEGENDES_CARTE = {
    volume: [["#3A3B2E", "Non travaillé"], ["#A67C52", "Bronze"], ["#B0B0B0", "Argent"], ["#F2C744", "Or"], ["#5DBEBE", "Platine"], ["#A78BFA", "Diamant"]],
    recup: [["#3A3B2E", "Jamais travaillé"], [COULEURS_CARTE.rouge, "Travaillé il y a 0-1 j : en récup"], [COULEURS_CARTE.ambre, "2 j : presque prêt"], [COULEURS_CARTE.vert, "3 j et plus : prêt"]],
    force: [["#3A3B2E", "Pas encore de donnée"], ["#A67C52", "Bronze"], ["#B0B0B0", "Argent"], ["#F2C744", "Or"], ["#5DBEBE", "Platine"], ["#A78BFA", "Diamant"]],
    delaisse: [["#3A3B2E", "Jamais travaillé"], [COULEURS_CARTE.rouge, "7 j et plus : délaissé"], [COULEURS_CARTE.ambre, "4 à 6 j"], [COULEURS_CARTE.terne, "Récent"]]
};

// Programmes : 5 exercices max par seance. Le jour est donne par le planning
// de Kylian (etat.planning), pas par ces listes. Modifiables ici.
const JOURS_SPLIT4_DEFAUT = [1, 2, 3, 5];
const PROGRAMMES_SPLIT4 = [
    { nom: "Jambes", exercices: ["hack-squat", "bulgarian-squat", "leg-extension", "leg-curl-assis", "mollets-debout"] },
    { nom: "Dos", exercices: ["tractions-assistees", "pulldown-serre", "rowing-cable", "rowing-haltere", "face-pull"] },
    { nom: "Pecs + triceps", exercices: ["developpe-incline", "chest-press", "pec-fly", "pushdown", "extension-nuque"] },
    { nom: "Épaules + bras", exercices: ["developpe-epaules", "elevations-lat", "rear-delt", "curl-ez", "curl-marteau"] }
];
const PROGRAMMES_FULLBODY = [
    { nom: "Full body A", exercices: ["hack-squat", "developpe-incline", "rowing-cable", "elevations-lat", "pushdown"] },
    { nom: "Full body B", exercices: ["presse-cuisses", "chest-press", "pulldown-serre", "face-pull", "curl-halteres"] },
    { nom: "Full body C", exercices: ["bulgarian-squat", "developpe-epaules", "rowing-haltere", "pec-fly", "leg-curl-assis"] }
];

// Rang de force : 1RM estime / poids du corps, compare a des seuils. Seuils = [Argent, Or, Platine, Diamant].
// SOURCE : Strength Level, hommes, "Entire Community", ligne 80 kg de poids de corps (consultee le 22/11/2026),
// https://strengthlevel.com/strength-standards/<exercice>/kg
// Correspondance : Argent = niveau Novice, Or = Intermediate, Platine = Advanced, Diamant = Elite
// (Bronze = en dessous de Novice). Ratio = 1RM / 80 kg. Le bareme varie un peu avec le poids de corps.
// Les muscles SANS source (mollets, trapezes, avant-bras, abdos, obliques, lombaires) restent des estimations.
const NOMS_RANGS_FORCE = ["Bronze", "Argent", "Or", "Platine", "Diamant"];
const COULEURS_RANG = { Bronze: "#A67C52", Argent: "#B0B0B0", Or: "#F2C744", Platine: "#5DBEBE", Diamant: "#A78BFA" };

// Exercices qui ont leur propre bareme public (prioritaire sur le muscle).
const STANDARDS_EXO = {
    "squat-barre": [1.26, 1.65, 2.10, 2.58],
    "developpe-couche": [0.94, 1.23, 1.55, 1.89],
    "souleve-terre": [1.49, 1.94, 2.45, 2.99],
    "developpe-militaire": [0.58, 0.78, 1.01, 1.26],
    "rowing-barre": [0.83, 1.10, 1.43, 1.76],
    "presse-cuisses": [2.03, 2.88, 3.86, 4.94],
    "rdl": [1.15, 1.56, 2.04, 2.54],
    "curl-ez": [0.44, 0.58, 0.75, 0.94],
    "barre-au-front": [0.38, 0.54, 0.74, 0.95],
    "hip-thrust": [1.20, 1.86, 2.66, 3.56],
    "developpe-incline": [0.36, 0.49, 0.63, 0.78],   // par haltere
    "pulldown-serre": [0.80, 1.06, 1.35, 1.66],
    "pulldown-large": [0.80, 1.06, 1.35, 1.66]
};

// Pour les autres exercices : seuils du mouvement de reference du muscle x coefficient (COEF_EXO).
const STANDARDS_FORCE = {
    quadriceps: [1.26, 1.65, 2.10, 2.58],     // squat
    ischios: [1.15, 1.56, 2.04, 2.54],        // soulevé de terre roumain
    fessiers: [1.20, 1.86, 2.66, 3.56],       // hip thrust
    pectoraux: [0.94, 1.23, 1.55, 1.89],      // développé couché
    dorsaux: [0.83, 1.10, 1.43, 1.76],        // rowing barre
    epaules: [0.58, 0.78, 1.01, 1.26],        // développé épaules
    biceps: [0.44, 0.58, 0.75, 0.94],         // curl barre EZ
    triceps: [0.38, 0.54, 0.74, 0.95],        // extension triceps allongé
    // ---- sans source : estimations ----
    mollets: [0.75, 1.25, 1.75, 2.25],
    trapezes: [0.5, 1.0, 1.5, 2.0],
    "avant-bras": [0.15, 0.3, 0.45, 0.6],
    abdos: [0.2, 0.4, 0.6, 0.8],
    obliques: [0.2, 0.4, 0.6, 0.8],
    lombaires: [0.5, 0.9, 1.3, 1.7]
};

// Mouvement de reference de chaque muscle (sert a calibrer les coefficients avec mes donnees).
const EXO_REFERENCE = {
    quadriceps: "squat-barre",
    ischios: "rdl",
    pectoraux: "developpe-couche",
    dorsaux: "rowing-barre",
    epaules: "developpe-militaire",
    biceps: "curl-ez",
    triceps: "barre-au-front"
};
// Coefficient de charge, pour les exercices SANS bareme propre (voir STANDARDS_EXO) :
// combien de fois la charge du mouvement de reference du muscle on deplace sur cet exercice.
// Plus il est grand, plus il faut charger pour le meme rang. Un exercice ABSENT des deux tables
// (STANDARDS_EXO et COEF_EXO) n'est pas classe. ATTENTION : un exercice present dans STANDARDS_EXO
// ne doit PAS etre ici (son coefficient serait ignore).
// Convention haltères : le poids saisi est celui d'UN haltère (comme dans le programme de Kylian).
// Chiffres poses a vue de nez le 22/11/2026, a recalibrer avec mes propres donnees.
const COEF_EXO = {
    // Quadriceps (reference : squat barre)
    "hack-squat": 1.2,
    "leg-extension": 0.5,
    "bulgarian-squat": 0.3,          // par haltere
    // Ischios (reference : RDL)
    "leg-curl-assis": 0.45,
    // Mollets
    "mollets-debout": 1,
    // Pectoraux (reference : developpe couche)
    "chest-press": 1,
    "pec-fly": 0.5,
    // Dorsaux (reference : rowing barre)
    "rowing-cable": 0.9,
    "rowing-haltere": 0.4,           // par haltere
    // Trapezes
    "face-pull": 0.5,
    // Epaules (reference : developpe militaire barre)
    "developpe-epaules": 0.4,        // par haltere : ~0,4 de la barre
    "elevations-lat": 0.15,          // par haltere
    "rear-delt": 0.2,
    // Biceps (reference : curl barre EZ)
    "curl-marteau": 0.4,             // par haltere
    // Triceps (reference : barre au front)
    "pushdown": 1,
    "extension-nuque": 0.5
};




const nomsRangs = ["Bronze", "Argent", "Or", "Platine", "Diamant"];

function pad(n) {
    if (n < 10) {
        return "0" + n;
    }
    return "" + n;
}

function formaterDuree(minutes) {
    const totalSec = Math.round(minutes * 60);
    if (totalSec < 60) {
        return totalSec + " s";
    }
    const h = Math.floor(totalSec / 3600);
    const min = Math.floor((totalSec % 3600) / 60);
    if (h > 0) {
        return h + " h " + pad(min);
    }
    return min + " min";
}

function todayStr() {
    const d = new Date();
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
}

function addDays(dateStr, delta) {
    const morceaux = dateStr.split("-");
    const m = Number(morceaux[1]);
    const y = Number(morceaux[0]);
    const j = Number(morceaux[2]);
    const dt = new Date(y, m - 1, j);
    dt.setDate(dt.getDate() + delta);
    return dt.getFullYear() + "-" + pad(dt.getMonth() + 1) + "-" + pad(dt.getDate());
}

// "2026-11-14" -> "sam. 14 nov." (avec l'annee si ce n'est pas l'annee en cours)
// ---------- Defi du jour (tirage au sort deterministe par date) ----------
function graineJour(texte) {
    let h = 2166136261;
    for (let i = 0; i < texte.length; i++) {
        h ^= texte.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return h >>> 0;
}

function aleatoireSeede(graine) {
    let etatAlea = graine;
    return function() {
        etatAlea = (etatAlea + 0x6D2B79F5) | 0;
        let t = Math.imul(etatAlea ^ (etatAlea >>> 15), 1 | etatAlea);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function genererDefiDuJour() {
    const aujourdhui = todayStr();
    if (etat.defi && etat.defi.date === aujourdhui) {
        return;
    }
    const entrainement = jourEntrainement();
    const eligibles = DEFIS.filter(function(d) {
        return d.seance === entrainement;
    });
    let total = 0;
    for (let i = 0; i < eligibles.length; i++) {
        total += eligibles[i].poids;
    }
    let tirage = aleatoireSeede(graineJour(aujourdhui))() * total;
    let choisi = eligibles[eligibles.length - 1];
    for (let i = 0; i < eligibles.length; i++) {
        tirage -= eligibles[i].poids;
        if (tirage < 0) {
            choisi = eligibles[i];
            break;
        }
    }
    etat.defi = { date: aujourdhui, id: choisi.id, fait: false };
    save();
}

function statsJourDefi() {
    const aujourdhui = todayStr();
    const stats = { seances: 0, series: 0, volume: 0, records: 0, montees: 0, echauffements: 0, muscles: 0, dureeMin: Infinity, eauAvantMidi: 0, eauTotale: 0, eauObjectif: etat.hydratation ? etat.hydratation.objectif : Infinity };
    const muscles = {};
    for (let i = 0; i < etat.seances.length; i++) {
        const s = etat.seances[i];
        if (s.date !== aujourdhui) {
            continue;
        }
        stats.seances++;
        stats.series += s.series.length;
        stats.volume += s.volume;
        stats.records += s.records || 0;
        stats.montees += s.montees || 0;
        stats.echauffements += s.echauffements || 0;
        stats.dureeMin = Math.min(stats.dureeMin, s.duree);
        for (let j = 0; j < s.series.length; j++) {
            muscles[s.series[j].muscle] = true;
        }
    }
    stats.muscles = Object.keys(muscles).length;
    if (etat.hydratation && etat.hydratation.date === aujourdhui) {
        for (let i = 0; i < etat.hydratation.prises.length; i++) {
            const prise = etat.hydratation.prises[i];
            stats.eauTotale += prise.ml;
            if (prise.heure && prise.heure < "12:00:00") {
                stats.eauAvantMidi += prise.ml;
            }
        }
    }
    return stats;
}

function majDefiAuto() {
    if (!etat.defi || etat.defi.fait) {
        return;
    }
    const defi = DEFIS.filter(function(d) {
        return d.id === etat.defi.id;
    })[0];
    if (defi && defi.test(statsJourDefi())) {
        etat.defi.fait = true;
        etat.xp += defi.xp;
        save();
        celebrer("⚡ Défi relevé : +" + defi.xp + " XP");
        fanfare();
    }
}

function renderDefi() {
    const bloc = document.getElementById("defi-du-jour");
    if (!etat.defi) {
        bloc.hidden = true;
        return;
    }
    const defi = DEFIS.filter(function(d) {
        return d.id === etat.defi.id;
    })[0];
    bloc.hidden = !defi;
    if (!defi) {
        return;
    }
    document.getElementById("defi-nom").textContent = defi.nom;
    document.getElementById("defi-etat").textContent = etat.defi.fait ? "✓ Relevé · +" + defi.xp + " XP gagnés" : "+" + defi.xp + " XP à gagner";
    bloc.classList.toggle("releve", !!etat.defi.fait);
}

// ---------- Physique : un avatar qui s'etoffe avec le niveau de chaque groupe ----------
function niveauMuscleAvatar(muscle) {
    return nomsRangs.indexOf(rangMuscle(muscle).nom);
}

function renderPhysique() {
    const conteneur = document.getElementById("physique");
    const epaules = Math.max(niveauMuscleAvatar("epaules"), niveauMuscleAvatar("trapezes"));
    const torse = Math.round((niveauMuscleAvatar("pectoraux") + niveauMuscleAvatar("dorsaux")) / 2);
    const bras = Math.round((niveauMuscleAvatar("biceps") + niveauMuscleAvatar("triceps")) / 2);
    const jambes = Math.round((niveauMuscleAvatar("quadriceps") + niveauMuscleAvatar("ischios") + niveauMuscleAvatar("mollets")) / 3);
    const abdos = niveauMuscleAvatar("abdos");
    const peau = "#D9A77A";
    const ombre = "#B88860";
    const demiEpaules = 7 + epaules;
    const demiTorse = 5 + torse;
    const largeurBras = 3 + bras;
    const largeurJambe = 4 + jambes;
    let rects = "";
    function r(x, y, w, h, couleur) {
        rects += '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" fill="' + couleur + '"/>';
    }
    r(20, 3, 8, 8, peau);                         // tete
    r(20, 3, 8, 2, "#3A2A1E");                    // cheveux
    r(22, 11, 4, 2, ombre);                       // cou
    r(24 - demiEpaules, 13, demiEpaules * 2, 4, peau);                 // epaules
    r(24 - demiTorse - 1, 17, demiTorse * 2 + 2, 9, peau);             // poitrine
    r(24 - demiTorse + 1, 26, demiTorse * 2 - 2, 8, peau);             // taille
    r(24 - 1, 18, 2, 14, ombre);                  // ligne centrale
    if (abdos >= 1) {
        for (let i = 0; i < Math.min(abdos + 1, 4); i++) {
            r(22, 26 + i * 2, 4, 1, ombre);
        }
    }
    r(24 - demiEpaules - largeurBras, 13, largeurBras, 16, peau);      // bras gauche
    r(24 + demiEpaules, 13, largeurBras, 16, peau);                    // bras droit
    r(24 - demiEpaules - largeurBras, 29, largeurBras, 3, ombre);      // mains
    r(24 + demiEpaules, 29, largeurBras, 3, ombre);
    r(24 - demiTorse + 1, 34, demiTorse * 2 - 2, 6, "#6E6D48");        // short
    r(24 - largeurJambe - 1, 40, largeurJambe, 16, peau);              // jambe gauche
    r(25, 40, largeurJambe, 16, peau);                                 // jambe droite
    r(24 - largeurJambe - 2, 56, largeurJambe + 2, 4, "#2C2D22");      // chaussures
    r(24, 56, largeurJambe + 2, 4, "#2C2D22");
    conteneur.innerHTML = '<svg class="physique-svg" viewBox="0 0 48 62" shape-rendering="crispEdges" aria-label="Ton physique">' + rects + '</svg>';
    document.getElementById("physique-texte").textContent = "Épaules " + (epaules + 1) + "/5 · Torse " + (torse + 1) + "/5 · Bras " + (bras + 1) + "/5 · Jambes " + (jambes + 1) + "/5";
}

// ---------- Village isometrique ----------
function renderVillage() {
    const conteneur = document.getElementById("village");
    const nbSeances = etat.seances.length;
    const demiL = 36;
    const demiH = 18;
    const origineX = 150;
    const origineY = 44;
    const ordre = [];
    for (let i = 0; i < BATIMENTS.length; i++) {
        ordre.push(i);
    }
    ordre.sort(function(a, b) {
        const sa = (a % 3) + Math.floor(a / 3);
        const sb = (b % 3) + Math.floor(b / 3);
        return sa - sb || (a % 3) - (b % 3);
    });
    let dessin = "";
    for (let k = 0; k < ordre.length; k++) {
        const i = ordre[k];
        const colonne = i % 3;
        const ligne = Math.floor(i / 3);
        const cx = origineX + (colonne - ligne) * demiL;
        const cy = origineY + (colonne + ligne) * demiH + demiH;
        const b = BATIMENTS[i];
        const debloque = nbSeances >= b.seances;
        dessin += '<polygon points="' + cx + ',' + (cy - demiH) + ' ' + (cx + demiL) + ',' + cy + ' ' + cx + ',' + (cy + demiH) + ' ' + (cx - demiL) + ',' + cy + '" fill="#1F2118" stroke="' + (debloque ? "#3A3D2B" : "#2C2D22") + '" stroke-width="1"' + (debloque ? "" : ' stroke-dasharray="3 3"') + '/>';
        if (!debloque) {
            dessin += '<text x="' + cx + '" y="' + (cy + 4) + '" text-anchor="middle" class="village-cadenas">🔒</text>';
            continue;
        }
        const a = demiL * 0.62;
        const bb = demiH * 0.62;
        const h = b.hauteur;
        const haut = cy - h;
        const sommet = haut - 14;
        dessin += '<polygon points="' + (cx - a) + ',' + haut + ' ' + cx + ',' + (haut + bb) + ' ' + cx + ',' + (cy + bb) + ' ' + (cx - a) + ',' + cy + '" fill="' + b.mur + '"/>';
        dessin += '<polygon points="' + (cx - a) + ',' + haut + ' ' + cx + ',' + (haut + bb) + ' ' + cx + ',' + (cy + bb) + ' ' + (cx - a) + ',' + cy + '" fill="#000" fill-opacity="0.28"/>';
        dessin += '<polygon points="' + cx + ',' + (haut + bb) + ' ' + (cx + a) + ',' + haut + ' ' + (cx + a) + ',' + cy + ' ' + cx + ',' + (cy + bb) + '" fill="' + b.mur + '"/>';
        dessin += '<polygon points="' + (cx - a) + ',' + haut + ' ' + cx + ',' + (haut + bb) + ' ' + cx + ',' + sommet + '" fill="' + b.toit + '"/>';
        dessin += '<polygon points="' + cx + ',' + (haut + bb) + ' ' + (cx + a) + ',' + haut + ' ' + cx + ',' + sommet + '" fill="' + b.toit + '" fill-opacity="0.75"/>';
        dessin += '<polygon points="' + (cx - a) + ',' + haut + ' ' + cx + ',' + (haut - bb) + ' ' + (cx + a) + ',' + haut + ' ' + cx + ',' + sommet + '" fill="' + b.toit + '" fill-opacity="0.55"/>';
    }
    conteneur.innerHTML = '<svg class="village-svg" viewBox="0 0 300 200" aria-label="Ton village">' + dessin + '</svg>';
    let debloques = 0;
    let prochain = null;
    for (let i = 0; i < BATIMENTS.length; i++) {
        if (nbSeances >= BATIMENTS[i].seances) {
            debloques++;
        } else if (!prochain) {
            prochain = BATIMENTS[i];
        }
    }
    document.getElementById("village-texte").textContent = debloques + " bâtiment" + (debloques > 1 ? "s" : "") + " sur " + BATIMENTS.length + (prochain ? " · Prochain : " + prochain.nom + " à " + prochain.seances + " séances (" + nbSeances + "/" + prochain.seances + ")" : " · Village complet !");
}

// ---------- Calibration des coefficients avec mes propres donnees ----------
function nbSeancesAvec(idExo) {
    let n = 0;
    for (let i = 0; i < etat.seances.length; i++) {
        if (etat.seances[i].series.some(function(x) { return x.id === idExo; })) {
            n++;
        }
    }
    return n;
}

function calibrationSuggeree() {
    const resultats = [];
    for (const id in COEF_EXO) {
        if (STANDARDS_EXO[id]) {
            continue;
        }
        const ex = trouverExercice(id);
        const reference = ex ? EXO_REFERENCE[ex.muscle] : null;
        if (!reference || reference === id || nbSeancesAvec(id) < 3 || nbSeancesAvec(reference) < 3) {
            continue;
        }
        const rmExo = meilleur1RM(id);
        const rmRef = meilleur1RM(reference);
        if (!(rmExo > 0 && rmRef > 0)) {
            continue;
        }
        resultats.push({ id: id, nom: ex.nom, reference: trouverExercice(reference).nom, defaut: COEF_EXO[id], mesure: Math.round(rmExo / rmRef * 100) / 100, actuel: coefExo(id) });
    }
    return resultats;
}

function renderCalibration() {
    const liste = document.getElementById("calibration-liste");
    liste.innerHTML = "";
    const suggestions = calibrationSuggeree();
    for (let i = 0; i < suggestions.length; i++) {
        const x = suggestions[i];
        const li = document.createElement("li");
        li.textContent = x.nom + " : coefficient " + x.actuel + " (défaut " + x.defaut + ") → mesuré " + x.mesure + " par rapport à " + x.reference;
        liste.appendChild(li);
    }
    document.getElementById("btn-calibrer").hidden = suggestions.length === 0;
    const nbPerso = Object.keys(etat.coefsPerso).length;
    document.getElementById("btn-calibrer-reset").hidden = nbPerso === 0;
    document.getElementById("calibration-info").textContent = suggestions.length === 0
        ? "Pas encore assez de données : il faut au moins 3 séances avec l'exercice ET avec son mouvement de référence (squat, développé couché, rowing barre, curl EZ…)."
        : "Ces rapports viennent de tes propres séances. Les appliquer aligne le rang de ces exercices sur celui de leur mouvement de référence.";
}

function appliquerCalibration() {
    const suggestions = calibrationSuggeree();
    for (let i = 0; i < suggestions.length; i++) {
        etat.coefsPerso[suggestions[i].id] = suggestions[i].mesure;
    }
    save();
    render();
}

function reinitialiserCalibration() {
    etat.coefsPerso = {};
    save();
    render();
}

function formaterDate(dateStr) {
    const morceaux = dateStr.split("-");
    const date = new Date(Number(morceaux[0]), Number(morceaux[1]) - 1, Number(morceaux[2]));
    const options = { weekday: "short", day: "numeric", month: "short" };
    if (date.getFullYear() !== new Date().getFullYear()) {
        options.year = "numeric";
    }
    return date.toLocaleDateString("fr-FR", options);
}

function courtDate(dateStr) {
    return dateStr.slice(8) + "/" + dateStr.slice(5, 7);
}

function lundiDeLaSemaine() {
    const d = new Date();
    const jour = d.getDay();
    const retard = jour === 0 ? 6 : jour - 1;
    return addDays(todayStr(), -retard);
}

const OBJECTIF_SEMAINE = { seances: 3, series: 24, volume: 10000 };

function statsSemaine() {
    const lundi = lundiDeLaSemaine();
    const seances = etat.seances || [];
    let nbSeances = 0;
    let nbSeries = 0;
    let volume = 0;
    for (let i = 0; i < seances.length; i++) {
        const s = seances[i];
        if (s.date >= lundi) {
            nbSeances++;
            nbSeries += s.series.length;
            volume += s.volume;
        }
    }
    return { seances: nbSeances, series: nbSeries, volume: volume };
}

function renderAnneaux() {
    const stats = statsSemaine();
    const anneaux = document.querySelectorAll("#anneaux-semaine .sem-ring");
    for (let i = 0; i < anneaux.length; i++) {
        const cle = anneaux[i].dataset.cle;
        const valeur = stats[cle];
        const objectif = OBJECTIF_SEMAINE[cle];
        const part = Math.min(valeur / objectif, 1);
        const circ = 2 * Math.PI * 26;
        const arc = anneaux[i].querySelector(".sem-ring-val");
        arc.style.strokeDasharray = (part * circ) + " " + circ;
        anneaux[i].classList.toggle("complet", valeur >= objectif);
        anneaux[i].querySelector(".sem-ring-chiffre").textContent = cle === "volume" ? Math.round(valeur / 100) / 10 + "k" : valeur;
        anneaux[i].querySelector(".sem-ring-objectif").textContent = "/ " + (cle === "volume" ? objectif / 1000 + "k" : objectif);
    }
}


let etat = JSON.parse(localStorage.getItem("etat")) || { xp: 0, streak: 0, bestStreak: 0, lastActiveDate: null, history: {}, muscu: [], course: [] };
const badges = [
    { id: "muscu10", nom: "10 exercices de muscu", type: "muscu", cible: 10, xp: 150 },
    { id: "courses5", nom: "5 courses", type: "course", cible: 5, xp: 200 },
    { id: "streak7", nom: "Streak de 7 jours", type: "streak", cible: 7, xp: 100 },
    { id: "streak30", nom: "Streak de 30 jours", type: "streak", cible: 30, xp: 500 },
];
if (!etat.badges) etat.badges = {};
if (!etat.muscu) etat.muscu = [];
if (!etat.course) etat.course = [];
if (!etat.history) etat.history = {};
if (etat.poids === undefined) etat.poids = 70;
if (!etat.seances) etat.seances = [];
if (!etat.nutrition) etat.nutrition = { objectif: 2200, repas: [] };
if (!etat.notesExos) etat.notesExos = {};
if (!etat.coefsPerso) etat.coefsPerso = {};
// La section Mobilite n'existe plus : on purge ses anciennes donnees.
if (etat.mobilite) {
    delete etat.mobilite;
}
for (let i = 0; i < etat.course.length; i++) {
    if (etat.course[i].trace && etat.course[i].trace.length > 300) {
        etat.course[i].trace = simplifierTrace(etat.course[i].trace, 300);
    }
}
let rangs = [
    { nom: "Bronze", division: "III", seuil: 0, couleur: "#A67C52" },
    { nom: "Bronze", division: "II", seuil: 100, couleur: "#A67C52" },
    { nom: "Bronze", division: "I", seuil: 250, couleur: "#A67C52" },
    { nom: "Argent", division: "III", seuil: 450, couleur: "#B0B0B0" },
    { nom: "Argent", division: "II", seuil: 700, couleur: "#B0B0B0" },
    { nom: "Argent", division: "I", seuil: 1000, couleur: "#B0B0B0" },
    { nom: "Or", division: "III", seuil: 1400, couleur: "#F2C744" },
    { nom: "Or", division: "II", seuil: 1900, couleur: "#F2C744" },
    { nom: "Or", division: "I", seuil: 2500, couleur: "#F2C744" },
    { nom: "Platine", division: "III", seuil: 3200, couleur: "#5DBEBE" },
    { nom: "Platine", division: "II", seuil: 4000, couleur: "#5DBEBE" },
    { nom: "Platine", division: "I", seuil: 5000, couleur: "#5DBEBE" },
    { nom: "Diamant", division: "III", seuil: 6200, couleur: "#A78BFA" },
    { nom: "Diamant", division: "II", seuil: 7600, couleur: "#A78BFA" },
    { nom: "Diamant", division: "I", seuil: 9200, couleur: "#A78BFA" },
];

function importerDonnees(fichier) {
    const lecteur = new FileReader();
    lecteur.onload = function () {
        let donnees = null;
        try {
            donnees = JSON.parse(lecteur.result);
        } catch (erreur) {
            informer("Ce fichier n'est pas une sauvegarde valide.");
            return;
        }
        if (!donnees || donnees.application !== "Ascension" || !donnees.etat) {
            informer("Ce fichier n'est pas une sauvegarde Ascension.");
            return;
        }
        const date = donnees.exporteLe ? donnees.exporteLe.slice(0, 10) : "date inconnue";
        confirmer("Remplacer toutes tes données actuelles par la sauvegarde du " + date + " ?", "Remplacer").then(function (ok) {
            if (!ok) {
                return;
            }
            localStorage.setItem("etat", JSON.stringify(donnees.etat));
            localStorage.setItem("exosPerso", JSON.stringify(donnees.exercicesPerso || []));
            if (donnees.seanceEnCours) {
                localStorage.setItem("seanceEnCours", JSON.stringify(donnees.seanceEnCours));
            } else {
                localStorage.removeItem("seanceEnCours");
            }
            location.reload();
        });
    };
    lecteur.readAsText(fichier);
}

function renderRappelSauvegarde() {
    const bloc = document.getElementById("rappel-sauvegarde");
    let jours = null;
    if (etat.derniereSauvegarde) {
        jours = joursEntre(etat.derniereSauvegarde, todayStr());
    }
    const afficher = etat.seances.length > 0 && (jours === null || jours >= 14);
    bloc.hidden = !afficher;
    if (afficher) {
        document.getElementById("rappel-sauvegarde-texte").textContent = jours === null
            ? "Tu n'as encore jamais sauvegardé tes données : elles ne vivent que sur ce téléphone."
            : "Ta dernière sauvegarde date de " + jours + " jours.";
    }
    document.getElementById("profil-sauvegarde").textContent = etat.derniereSauvegarde
        ? "Dernière sauvegarde : " + formaterDate(etat.derniereSauvegarde)
        : "Aucune sauvegarde pour l'instant.";
}

function exporterDonnees() {
    etat.derniereSauvegarde = todayStr();
    save();
    const sauvegarde = {
        application: "Ascension",
        version: 1,
        exporteLe: new Date().toISOString(),
        etat: etat,
        exercicesPerso: exosPerso,
        seanceEnCours: seanceEnCours
    };
    const contenu = JSON.stringify(sauvegarde, null, 2);
    const blob = new Blob([contenu], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const lien = document.createElement("a");
    lien.href = url;
    lien.download = "ascension-" + todayStr() + ".json";
    document.body.appendChild(lien);
    lien.click();
    lien.remove();
    URL.revokeObjectURL(url);
    renderRappelSauvegarde();
}

function save() {
    try {
        localStorage.setItem("etat", JSON.stringify(etat));
    } catch (erreur) {
        informer("Stockage plein : exporte tes données (Profil), puis supprime d'anciennes courses.");
    }
}

const citations = [
    "Stay hard?", "La discipline, c'est la liberté"];


function markPresence() {
    const hoy = todayStr();
    const rang = getRang();
    if (etat.history[hoy] && etat.history[hoy].presence)
        return;
    etat.history[hoy] = { presence: true };
    etat.xp += 10;
    const ayer = addDays(hoy, -1);
    if (etat.lastActiveDate === ayer) {
        etat.streak += 1;
    }
    else {
        etat.streak = 1;
        if (etat.lastActiveDate) {
            const jours = joursEntre(etat.lastActiveDate, hoy);
            if (jours >= 7) {
                if (rang.index > 0) {
                    etat.xp = rangs[rang.index - 1].seuil;
                }
            }
        }
    }
    if (etat.streak > etat.bestStreak) {
        etat.bestStreak = etat.streak;
    }
    etat.lastActiveDate = hoy;
    render();
    save();
}

const boutonsOnglets = document.querySelectorAll(".onglet");
for (let i = 0; i < boutonsOnglets.length; i++) {
    boutonsOnglets[i].addEventListener("click", function () {
        changerPage(boutonsOnglets[i].dataset.page);
    });

}

document.getElementById("btn-presence").addEventListener("click", markPresence);
document.getElementById("btn-start-course").addEventListener("click", demarrerCourse);
document.getElementById("btn-pause-course").addEventListener("click", togglePause);
document.getElementById("btn-stop-course").addEventListener("click", terminerCourse);
document.getElementById("btn-hydra").addEventListener("click", logHydratation);
document.getElementById("input-poids-perso").addEventListener("change", setPoids);
document.getElementById("btn-demarrer-seance").addEventListener("click", demarrerSeance);
document.getElementById("btn-abandonner-seance").addEventListener("click", abandonnerSeance);
document.getElementById("btn-ajouter-exo").addEventListener("click", ouvrirSelecteur);
document.getElementById("btn-fermer-selecteur").addEventListener("click", fermerSelecteur);
document.getElementById("btn-terminer-seance").addEventListener("click", terminerSeance);
document.getElementById("btn-nutri-chercher").addEventListener("click", chercherAliment);
const champRecherche = document.getElementById("selecteur-recherche");
const boutonVider = document.getElementById("btn-vider-recherche");

champRecherche.addEventListener("input", function() {
    renderSelecteur(champRecherche.value);
    boutonVider.hidden = champRecherche.value === "";
});

boutonVider.addEventListener("click", function() {
    champRecherche.value = "";
    boutonVider.hidden = true;
    renderSelecteur();
    champRecherche.focus();
});
document.getElementById("btn-header-profil").addEventListener("click", function () {
    changerPage("profil");
});
document.getElementById("btn-retour-profil").addEventListener("click", function () {
    changerPage("accueil");
});
document.getElementById("btn-export").addEventListener("click", exporterDonnees);
document.getElementById("btn-calibrer").addEventListener("click", appliquerCalibration);
document.getElementById("btn-calibrer-reset").addEventListener("click", reinitialiserCalibration);
document.getElementById("btn-sauvegarder-maintenant").addEventListener("click", exporterDonnees);
document.getElementById("option-notifs").addEventListener("change", function (evenement) {
    etat.notifRepos = evenement.target.checked;
    save();
    if (etat.notifRepos) {
        demanderNotifications();
    }
    renderOptionsNotifs();
});
document.getElementById("btn-import").addEventListener("click", function () {
    document.getElementById("input-import").click();
});
document.getElementById("input-import").addEventListener("change", function (evenement) {
    const fichier = evenement.target.files[0];
    evenement.target.value = "";
    if (fichier) {
        importerDonnees(fichier);
    }
});
document.getElementById("onb-suivant-1").addEventListener("click", function () {
    const poids = Number(String(document.getElementById("onb-poids").value).replace(",", "."));
    if (!(poids >= 30 && poids <= 300)) {
        informer("Entre un poids entre 30 et 300 kg.");
        return;
    }
    etapeOnboarding(2);
});
document.getElementById("onb-suivant-2").addEventListener("click", function () {
    etapeOnboarding(3);
});
document.getElementById("onb-retour-2").addEventListener("click", function () {
    etapeOnboarding(1);
});
document.getElementById("onb-retour-3").addEventListener("click", function () {
    etapeOnboarding(2);
});
document.getElementById("onb-terminer").addEventListener("click", terminerOnboarding);
document.getElementById("onb-passer").addEventListener("click", passerOnboarding);
document.getElementById("btn-onboarding").addEventListener("click", ouvrirOnboarding);
const puccesObjectif = document.querySelectorAll(".onb-objectif");
for (let i = 0; i < puccesObjectif.length; i++) {
    puccesObjectif[i].addEventListener("click", function () {
        onboardingEtat.objectif = puccesObjectif[i].dataset.objectif;
        etapeOnboarding(1);
    });
}
document.getElementById("prog-exo").addEventListener("change", renderProgression);
document.getElementById("resume-partager").addEventListener("click", partagerResume);
document.getElementById("resume-telecharger").addEventListener("click", telechargerResume);
document.getElementById("resume-fermer").addEventListener("click", function () {
    document.getElementById("resume-seance").hidden = true;
});
document.getElementById("btn-histo-voir-tout").addEventListener("click", function () {
    historiqueComplet = !historiqueComplet;
    renderSeances();
});
document.getElementById("repos-moins").addEventListener("click", function () {
    ajusterRepos(-15);
});
document.getElementById("repos-plus").addEventListener("click", function () {
    ajusterRepos(15);
});
document.getElementById("repos-passer").addEventListener("click", passerRepos);
document.getElementById("btn-sortir-seance").addEventListener("click", function () {
    changerPage("muscu");
});
document.getElementById("dialogue-ok").addEventListener("click", function () {
    const champ = document.getElementById("dialogue-champ");
    fermerDialogue(champ.hidden ? true : champ.value);
});
document.getElementById("dialogue-annuler").addEventListener("click", function () {
    fermerDialogue(null);
});
document.getElementById("dialogue").addEventListener("click", function (evenement) {
    if (evenement.target.id === "dialogue") {
        fermerDialogue(null);
    }
});
document.addEventListener("keydown", function (evenement) {
    if (document.getElementById("dialogue").hidden) {
        return;
    }
    if (evenement.key === "Escape") {
        fermerDialogue(null);
    } else if (evenement.key === "Enter") {
        document.getElementById("dialogue-ok").click();
    }
});
const boutonsVue = document.querySelectorAll(".vue-muscle");

for (let i = 0; i < boutonsVue.length; i++) {
    boutonsVue[i].addEventListener("click", function () {
        changerVueMuscle(boutonsVue[i].dataset.vue);
    });
}
genererQueteDuJour();
genererDefiDuJour();
genererHydratationDuJour();
majEtatCourse(false);
document.getElementById("input-poids-perso").value = etat.poids;
render();




function citationsAleatoire() {
    const i = Math.floor(Math.random() * citations.length);
    return citations[i];
}

function valeurBadge(type) {
    if (type === "muscu") return etat.muscu.length;
    if (type === "course") return etat.course.length;
    if (type === "streak") return etat.bestStreak;
    return 0;
}

function render() {
    ;
    const hoy = todayStr();
    const rang = getRang();
    const rangActuel = rang.nom + " " + rang.division;
    if (etat.dernierRang && etat.dernierRang !== rangActuel) {
        celebrer("Nouveau rang : " + rangActuel + " !");
        fanfare();
    }
    etat.dernierRang = rangActuel;
    const stageAvatar = nomsRangs.indexOf(rang.nom);
    const dejaFait = (etat.history[hoy] && etat.history[hoy].presence) || seanceEnCours || besoinOnboarding();
    document.getElementById("lock-screen").hidden = dejaFait;
    document.getElementById("dashboard").hidden = !dejaFait;
    const prochain = xpProchainStade();
    if (prochain) {
        document.getElementById("avatar-next").textContent = "Encore : " + prochain.xp + " XP avant " + prochain.nom;
    } else {
        document.getElementById("avatar-next").textContent = "Stade maximal atteint";
    }
    remplirBadgeRang(document.getElementById("level-badge"), rang, 30);
    document.getElementById("level-badge").style.color = rang.couleur;
    document.getElementById("quote").textContent = citationsAleatoire();
    document.getElementById("xp-fill").style.width = rang.pourcentage + "%";
    document.getElementById("xp-fill").style.backgroundColor = rang.couleur;
    document.getElementById("avatar").innerHTML = '<img src="avatar-pixel-' + stageAvatar + '.png" alt="avatar">'; document.getElementById("fiche-classe").textContent = "Classe : " + calculerClasse();
    document.getElementById("fiche-titre").textContent = "Titre : " + calculerTitre();
    document.getElementById("message-coach").textContent = messageCoach();
    renderProfilProgramme();
    renderRappelSauvegarde();
    renderRangsForce();
    renderOptionsNotifs();
    majDefiAuto();
    renderDefi();
    renderPhysique();
    renderVillage();
    renderCalibration();
    if (dejaFait && besoinOnboarding() && document.getElementById("onboarding").hidden) {
        ouvrirOnboarding();
    }
    renderCourse();
    renderMuscu();
    majQueteAuto();
    renderQuete();
    renderHydratation();
    colorerMuscles();
    verifierBadges();
    renderBadges();
    renderSeance();
    renderSeances();
    rappelHydratation();
    renderModules();
    renderCalendrierModules();
    renderNutrition();
    renderStreak();
}
setInterval(majDureeSeance, 1000);
function getLevel(xp) {
    if (xp >= 1000) {
        return "⚡ Kratos Ragnarök";
    }
    if (xp >= 600) {
        return "👹 Doomfist";
    }
    if (xp >= 300) {
        return "🛡️ Titan";
    }
    if (xp >= 100) {
        return "⚔️ Guerrier";
    }
    else {
        return "Recrue";
    }
}

function xpProgress(xp) {
    if (xp >= 1000) {
        return 100;
    }
    if (xp >= 600) {
        return (xp - 600) / (1000 - 600) * 100;
    }
    if (xp >= 300) {
        return (xp - 300) / (600 - 300) * 100;
    }
    if (xp >= 100) {
        return (xp - 100) / (300 - 100) * 100;
    }
    return (xp - 0) / (100 - 0) * 100;
}

etat.muscu = etat.muscu.filter(x => x.nom !== "" && x.poids !== "" && x.reps !== "");
save();
render();

function renderMuscu() {
    renderAnneaux();
    renderProchaineSeance();
    document.getElementById("bloc-filtre-muscle").hidden = !filtreMuscle;
    if (filtreMuscle) {
        document.getElementById("filtre-titre").textContent = "Exercices — " + filtreMuscle;
    }
    const liste = document.getElementById("liste-exercice");
    liste.innerHTML = "";
    const parDate = {};
    for (let i = 0; i < etat.muscu.length; i++) {
        if (filtreMuscle && etat.muscu[i].muscle !== filtreMuscle) {
            continue;
        }
        const d = etat.muscu[i].date;
        if (!parDate[d]) {
            parDate[d] = [];
        }
        parDate[d].push(i);
    }
    for (const date in parDate) {
        const titre = document.createElement("li");
        titre.textContent = date;
        titre.className = "seance-date";
        liste.appendChild(titre);
        for (let j = 0; j < parDate[date].length; j++) {
            const idx = parDate[date][j];
            const item = etat.muscu[idx];
            const ligne = document.createElement("li");
            ligne.textContent = item.nom + " - " + item.poids + "kg x " + item.reps + " (" + (item.muscle || "non défini") + ") ";
            const btnSuppr = document.createElement("button");
            btnSuppr.textContent = "✕";
            btnSuppr.className = "btn-suppr";
            btnSuppr.setAttribute("aria-label", "Supprimer l'exercice")
            btnSuppr.addEventListener("click", function () {
                supprimerExercice(idx);
            });
            ligne.appendChild(btnSuppr);
            liste.appendChild(ligne);
        }
    }
}


function distanceKm(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function demarrerCourse() {
    distanceCourse = 0;
    dernierePosition = null;
    debutCourse = Date.now();
    initCarte();
    carte.invalidateSize();
    pointsTrace = [];
    if (ligneTrace) {
        carte.removeLayer(ligneTrace);
        ligneTrace = null;
    }
    suiviId = lancerSuivi();
    intervalId = setInterval(mettreAJourTemps, 1000);
    majEtatCourse(true);
}

function lancerSuivi() {
    return navigator.geolocation.watchPosition(
        traiterPosition,
        erreurPosition,
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
}

function erreurPosition(err) {
    document.getElementById("course-etat").textContent = "⚠ GPS : " + err.message;
}

function initCarte() {
    if (carte) return;
    carte = L.map("carte-course").setView([48.8566, 2.3522], 13);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap"
    }).addTo(carte);
}

function mettreAJourTemps() {
    const ecoule = Date.now() - debutCourse;
    const secondesTotal = Math.floor(ecoule / 1000);
    const minutes = Math.floor(secondesTotal / 60);
    const secondes = secondesTotal % 60;
    document.getElementById("course-temps").textContent = "Temps : " + pad(minutes) + ":" + pad(secondes);
    if (distanceCourse > 0) {
        const minutesTotal = ecoule / 1000 / 60;
        const allure = minutesTotal / distanceCourse;
        const alMin = Math.floor(allure);
        const alSec = Math.floor((allure - alMin) * 60);
        document.getElementById("course-allure").textContent = "Allure : " + alMin + ":" + pad(alSec) + " /km";
    }
}

function togglePause() {
    if (!enPause) {
        enPause = true;
        navigator.geolocation.clearWatch(suiviId);
        clearInterval(intervalId);
        pauseDebut = Date.now();
        document.getElementById("btn-pause-course").textContent = "reprendre";
    }
    else {
        enPause = false;
        debutCourse += (Date.now() - pauseDebut);
        dernierePosition = null;
        suiviId = lancerSuivi();
        intervalId = setInterval(mettreAJourTemps, 1000);
        document.getElementById("btn-pause-course").textContent = "Pause";
    }
}

// Le trace GPS complet remplirait vite localStorage : on garde 300 points au plus.
function simplifierTrace(points, max) {
    if (points.length <= max) {
        return points.slice();
    }
    const pas = points.length / max;
    const resultat = [];
    for (let i = 0; i < max; i++) {
        resultat.push(points[Math.floor(i * pas)]);
    }
    resultat.push(points[points.length - 1]);
    return resultat;
}

function terminerCourse() {
    navigator.geolocation.clearWatch(suiviId);
    clearInterval(intervalId);
    const dureeMinutes = (Date.now() - debutCourse) / 1000 / 60;
    if (distanceCourse < 0.1) {
        informer("Course trop courte (moins de 100 m) : elle n'est pas enregistrée.");
    } else {
        etat.course.push({
            distance: distanceCourse,
            duree: dureeMinutes,
            date: todayStr(),
            allure: dureeMinutes / distanceCourse,
            trace: simplifierTrace(pointsTrace, 300)
        });
        etat.xp += Math.min(80, Math.max(15, distanceCourse * 10));
    }
    document.getElementById("course-temps").textContent = "Temps : 00:00";
    document.getElementById("course-allure").textContent = "Allure : -- /km";
    document.getElementById("course-distance").textContent = "Distance : 0.00 km";
    render();
    save();
    majEtatCourse(false);
}

function renderCourse() {
    let listeCourses = document.getElementById("liste-courses");
    listeCourses.innerHTML = "";
    if (etat.course.length === 0) {
        listeCourses.innerHTML = "<li>Aucune course encore. Lance ta première sortie !</li>";
        return;
    }
    const indices = [];
    for (let i = 0; i < etat.course.length; i++) { indices.push(i); }
    indices.sort(function (a, b) { return (etat.course[b].favori ? 1 : 0) - (etat.course[a].favori ? 1 : 0); });
    for (let k = 0; k < indices.length; k++) {
        const i = indices[k];
        const c = etat.course[i];
        const ligne = document.createElement("li");
        ligne.textContent = (c.favori ? "★ " : "") + c.distance.toFixed(2) + " km - " + formaterDuree(c.duree) + " - " + c.date + " ";
        const btnFav = document.createElement("button");
        btnFav.textContent = c.favori ? "★" : "☆";
        btnFav.className = "btn-suppr";
        btnFav.addEventListener("click", function () { toggleFavori(i); });
        ligne.appendChild(btnFav);
        if (c.trace && c.trace.length > 0) {
            const btnVoir = document.createElement("button");
            btnVoir.textContent = "Voir";
            btnVoir.className = "btn-suppr";
            btnVoir.addEventListener("click", function () { voirParcours(i); });
            ligne.appendChild(btnVoir);
        }
        listeCourses.appendChild(ligne);
    }
}

function toggleFavori(i) {
    etat.course[i].favori = !etat.course[i].favori;
    save();
    renderCourse();
}

function voirParcours(i) {
    const c = etat.course[i];
    if (!c.trace || c.trace.length === 0) { return; }
    initCarte();
    carte.invalidateSize();
    if (ligneTrace) { carte.removeLayer(ligneTrace); }
    ligneTrace = L.polyline(c.trace, { color: "#5DBEBE", weight: 5 }).addTo(carte);
    carte.fitBounds(ligneTrace.getBounds());
    document.getElementById("carte-course").scrollIntoView({ behavior: "smooth" });
}

function getRang() {
    let rangActuel = rangs[0];
    for (let i = 0; i < rangs.length; i++) {
        if (etat.xp >= rangs[i].seuil) {
            rangActuel = rangs[i];
        }
    }
    let index = rangs.indexOf(rangActuel);
    let seuilSuivant;
    if (index < rangs.length - 1) {
        seuilSuivant = rangs[index + 1].seuil;
    }
    else {
        seuilSuivant = rangActuel.seuil + 2000;
    }
    let pourcentage = (etat.xp - rangActuel.seuil) / (seuilSuivant - rangActuel.seuil) * 100;
    return { nom: rangActuel.nom, division: rangActuel.division, couleur: rangActuel.couleur, pourcentage: pourcentage, index: index };
}

function joursEntre(date1, date2) {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    const diffMs = d2 - d1;
    return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

function teinteAvatar(hex, delta) {
    const n = parseInt(hex.slice(1), 16);
    const r = Math.max(0, Math.min(255, ((n >> 16) & 255) + delta));
    const g = Math.max(0, Math.min(255, ((n >> 8) & 255) + delta));
    const b = Math.max(0, Math.min(255, (n & 255) + delta));
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}
function avatarSVG(stage, couleur) {
    const params = [
        { shoulder: 34, waist: 29, armW: 13, armOff: 40, armH: 62 },
        { shoulder: 41, waist: 31, armW: 17, armOff: 47, armH: 66 },
        { shoulder: 49, waist: 33, armW: 21, armOff: 55, armH: 70 },
        { shoulder: 57, waist: 35, armW: 25, armOff: 63, armH: 74 },
        { shoulder: 66, waist: 37, armW: 30, armOff: 72, armH: 78 }
    ];
    const p = params[stage];
    const cx = 100;
    const torsoPath = "M " + (cx - p.shoulder) + ",98 Q " + cx + ",76 " + (cx + p.shoulder) + ",98 L " + (cx + p.waist) + ",205 L " + (cx - p.waist) + ",205 Z";
    const clair = teinteAvatar(couleur, 35);
    const fonce = teinteAvatar(couleur, -45);
    return '<svg viewBox="0 0 200 220" xmlns="http://www.w3.org/2000/svg">' +
        '<defs><linearGradient id="avatarGrad" x1="0" y1="0" x2="0" y2="1">' +
        '<stop offset="0" stop-color="' + clair + '"/>' +
        '<stop offset="1" stop-color="' + fonce + '"/>' +
        '</linearGradient></defs>' +
        '<ellipse cx="100" cy="210" rx="46" ry="7" fill="rgba(0,0,0,0.45)"/>' +
        '<circle cx="100" cy="45" r="26" fill="url(#avatarGrad)"/>' +
        '<rect x="86" y="64" width="28" height="24" fill="url(#avatarGrad)"/>' +
        '<rect x="' + (cx - p.armOff - p.armW / 2) + '" y="96" width="' + p.armW + '" height="' + p.armH + '" rx="' + (p.armW / 2) + '" fill="url(#avatarGrad)"/>' +
        '<rect x="' + (cx + p.armOff - p.armW / 2) + '" y="96" width="' + p.armW + '" height="' + p.armH + '" rx="' + (p.armW / 2) + '" fill="url(#avatarGrad)"/>' +
        '<path d="' + torsoPath + '" fill="url(#avatarGrad)"/>' +
        '</svg>';
}

function changerPage(nom) {
    const pages = document.querySelectorAll(".page");
    for (let i = 0; i < pages.length; i++) {
        pages[i].classList.remove("actif");
    }
    document.getElementById("page-" + nom).classList.add("actif");
    document.body.classList.toggle("en-seance", nom === "seance");
    const onglets = document.querySelectorAll(".onglet");
    for (let i = 0; i < onglets.length; i++) {
        onglets[i].classList.remove("actif");
    }
    const boutonActif = document.querySelector('.onglet[data-page="' + nom + '"]');
    if (boutonActif) {
        boutonActif.classList.add("actif");
    }
}

function volumeMuscle(muscle) {
    let total = 0;
    for (let i = 0; i < etat.muscu.length; i++) {
        if (etat.muscu[i].muscle === muscle) {
            total += Number(etat.muscu[i].poids) * Number(etat.muscu[i].reps);
        }

    }
    return total;
}

function rangMuscle(muscle) {
    const volume = volumeMuscle(muscle);
    const xpEquivalent = volume / 20;
    let rangActuel = rangs[0];
    for (let i = 0; i < rangs.length; i++) {
        if (xpEquivalent >= rangs[i].seuil) {
            rangActuel = rangs[i];
        }
    }
    return rangActuel;
}

// Nombre de jours depuis la derniere fois qu'un muscle a ete travaille (null = jamais).
function joursDepuisMuscle(muscle) {
    let derniere = null;
    for (let i = 0; i < etat.muscu.length; i++) {
        if (etat.muscu[i].muscle === muscle && (derniere === null || etat.muscu[i].date > derniere)) {
            derniere = etat.muscu[i].date;
        }
    }
    return derniere === null ? null : joursEntre(derniere, todayStr());
}

function couleurMuscle(nom) {
    if (modeCarte === "volume") {
        return volumeMuscle(nom) === 0 ? "" : rangMuscle(nom).couleur;
    }
    if (modeCarte === "force") {
        const rangF = meilleurRangForceMuscle(nom);
        return rangF ? rangF.couleur : "";
    }
    const jours = joursDepuisMuscle(nom);
    if (jours === null) {
        return "";
    }
    if (modeCarte === "recup") {
        if (jours <= 1) {
            return COULEURS_CARTE.rouge;
        }
        return jours === 2 ? COULEURS_CARTE.ambre : COULEURS_CARTE.vert;
    }
    if (jours >= 7) {
        return COULEURS_CARTE.rouge;
    }
    return jours >= 4 ? COULEURS_CARTE.ambre : COULEURS_CARTE.terne;
}

function colorerMuscles() {
    const zones = document.querySelectorAll("[data-muscle]");
    for (let i = 0; i < zones.length; i++) {
        zones[i].style.fill = couleurMuscle(zones[i].dataset.muscle);
    }
    const legende = document.getElementById("legende-muscles");
    legende.innerHTML = "";
    const entrees = LEGENDES_CARTE[modeCarte];
    for (let i = 0; i < entrees.length; i++) {
        const ligne = document.createElement("span");
        const pastille = document.createElement("i");
        pastille.style.background = entrees[i][0];
        ligne.appendChild(pastille);
        ligne.appendChild(document.createTextNode(" " + entrees[i][1]));
        legende.appendChild(ligne);
    }
}

function changerModeCarte(mode) {
    modeCarte = mode;
    const boutons = document.querySelectorAll(".mode-carte");
    for (let i = 0; i < boutons.length; i++) {
        boutons[i].classList.toggle("on", boutons[i].dataset.mode === mode);
    }
    colorerMuscles();
}

const boutonsModeCarte = document.querySelectorAll(".mode-carte");
for (let i = 0; i < boutonsModeCarte.length; i++) {
    boutonsModeCarte[i].addEventListener("click", function() {
        changerModeCarte(boutonsModeCarte[i].dataset.mode);
    });
}

function changerVueMuscle(vue) {
    const vues = document.querySelectorAll(".view");
    for (let i = 0; i < vues.length; i++) {
        vues[i].classList.remove("on");
    }
    document.getElementById("vue-" + vue).classList.add("on");
    const boutons = document.querySelectorAll(".vue-muscle");
    for (let i = 0; i < boutons.length; i++) {
        boutons[i].classList.remove("on");
    }
    document.querySelector('.vue-muscle[data-vue="' + vue + '"]').classList.add("on");
}

function afficherDetailMuscle(muscle, e) {
    const bulle = document.getElementById("detail-muscle");
    bulle.hidden = false;
    bulle.style.left = e.clientX + "px";
    bulle.style.top = e.clientY + "px";
    document.getElementById("detail-nom").textContent = muscle;
    const rang = rangMuscle(muscle);
    const rangF = meilleurRangForceMuscle(muscle);
    document.getElementById("detail-rang").textContent = "Volume : " + rang.nom + " " + rang.division + (rangF ? " · Force : " + libelleRang(rangF) : "");
    const liste = document.getElementById("detail-exos");
    liste.innerHTML = "";

    const prs = {};
    for (let i = 0; i < etat.muscu.length; i++) {
        if (etat.muscu[i].muscle === muscle) {
            const nom = etat.muscu[i].nom;
            const poids = Number(etat.muscu[i].poids);
            if (prs[nom] === undefined || poids > prs[nom]) {
                prs[nom] = poids;
            }
        }
    }

    for (const nom in prs) {
        const ligne = document.createElement("li");
        ligne.textContent = nom + " — PR : " + prs[nom] + " kg";
        liste.appendChild(ligne);
    }

    filtreMuscle = muscle;
    renderMuscu();
}


const zonesMuscle = document.querySelectorAll("[data-muscle]");
for (let i = 0; i < zonesMuscle.length; i++) {
    zonesMuscle[i].addEventListener("click", function (e) {
        afficherDetailMuscle(zonesMuscle[i].dataset.muscle, e);
    });
}

document.getElementById("btn-effacer-filtre").addEventListener("click", function () {
    filtreMuscle = null;
    renderMuscu();
});

document.getElementById("btn-retour-muscle").addEventListener("click", function () {
    document.getElementById("detail-muscle").hidden = true;
});

function jourEntrainement() {
    const jour = new Date().getDay();
    return listeProgrammes().some(function(p) {
        return p.jour === jour;
    });
}

function genererQueteDuJour() {
    const ancienne = etat.quete;
    const aujourdhui = todayStr();
    if (ancienne && ancienne.date === aujourdhui && ancienne.objectifs[0] && ancienne.objectifs[0].cle) {
        return;
    }
    let penalite = false;
    if (ancienne) {
        penalite = ancienne.date === aujourdhui ? !!ancienne.penalite : !ancienne.faite;
    }
    const objectifs = [];
    if (jourEntrainement()) {
        objectifs.push({ cle: "seance", nom: "Séance du jour", cible: 1, actuel: 0 });
        objectifs.push({ cle: "series", nom: "Séries validées", cible: penalite ? 15 : 10, actuel: 0 });
    }
    objectifs.push({ cle: "eau", nom: "Hydratation", cible: Math.round(etat.poids * 33), actuel: 0, unite: " ml" });
    etat.quete = {
        date: aujourdhui,
        penalite: penalite,
        objectifs: objectifs,
        faite: !!(ancienne && ancienne.date === aujourdhui && ancienne.faite)
    };
    save();
}

// Les objectifs se remplissent tout seuls a partir de ce que l'app a vraiment enregistre.
function majQueteAuto() {
    const quete = etat.quete;
    if (!quete) {
        return;
    }
    const aujourdhui = todayStr();
    let nbSeances = 0;
    let nbSeries = 0;
    for (let i = 0; i < etat.seances.length; i++) {
        if (etat.seances[i].date === aujourdhui) {
            nbSeances++;
            nbSeries += etat.seances[i].series.length;
        }
    }
    let eau = 0;
    if (etat.hydratation && etat.hydratation.date === aujourdhui) {
        for (let i = 0; i < etat.hydratation.prises.length; i++) {
            eau += etat.hydratation.prises[i].ml;
        }
    }
    let toutFait = true;
    for (let i = 0; i < quete.objectifs.length; i++) {
        const objectif = quete.objectifs[i];
        let valeur = 0;
        if (objectif.cle === "seance") {
            valeur = nbSeances;
        } else if (objectif.cle === "series") {
            valeur = nbSeries;
        } else if (objectif.cle === "eau") {
            valeur = eau;
            if (etat.hydratation && etat.hydratation.objectif) {
                objectif.cible = etat.hydratation.objectif;
            }
        }
        objectif.actuel = Math.min(valeur, objectif.cible);
        if (objectif.actuel < objectif.cible) {
            toutFait = false;
        }
    }
    if (toutFait && !quete.faite) {
        quete.faite = true;
        etat.xp += 30;
        save();
        celebrer("Quête du jour complétée ! +30xp");
        fanfare();
    }
}

function renderQuete() {
    const liste = document.getElementById("quete-objectifs");
    liste.innerHTML = "";
    if (etat.quete.penalite) {
        document.getElementById("quete-penalite").textContent = "Quête de rachat — hier est passé, les objectifs sont renforcés aujourd'hui.";
    } else {
        document.getElementById("quete-penalite").textContent = "";
    }
    for (let i = 0; i < etat.quete.objectifs.length; i++) {
        const obj = etat.quete.objectifs[i];
        const ligne = document.createElement("li");

        const label = document.createElement("div");
        label.textContent = (obj.cle === "eau" ? "💧 Eau : " : obj.nom + " ") + obj.actuel + " / " + obj.cible + (obj.unite || "");

        const barre = document.createElement("div");
        barre.className = "quete-barre";
        const remplissage = document.createElement("div");
        remplissage.className = "quete-fill";
        remplissage.style.width = (obj.actuel / obj.cible * 100) + "%";
        barre.appendChild(remplissage);

        ligne.appendChild(label);
        if (obj.cle !== "eau") {
            // la jauge d'eau est deja dans la carte Hydratation juste en dessous
            ligne.appendChild(barre);
        }
        liste.appendChild(ligne);
    }
    if (etat.quete.faite) {
        document.getElementById("streak-alerte").textContent = "";
    } else {
        document.getElementById("streak-alerte").textContent = "Quête du jour en cours — ton streak compte sur toi.";
    }
}

function tempsRestantQuete() {
    const maintenant = new Date();
    const minuit = new Date(maintenant.getFullYear(), maintenant.getMonth(), maintenant.getDate() + 1, 0, 0, 0);
    const restant = minuit - maintenant;
    const secondesTotal = Math.floor(restant / 1000);
    const heures = Math.floor(secondesTotal / 3600);
    const minutes = Math.floor((secondesTotal % 3600) / 60);
    const secondes = secondesTotal % 60;
    document.getElementById("quete-timer").textContent = "Temps restant : " + pad(heures) + ":" + pad(minutes) + ":" + pad(secondes);
}

setInterval(tempsRestantQuete, 1000);

function genererHydratationDuJour() {
    if (etat.hydratation && etat.hydratation.date === todayStr()) {
        return;
    }
    etat.hydratation = {
        date: todayStr(),
        objectif: Math.round(etat.poids * 33),
        prises: []
    };
    save();
}

function renderHydratation() {
    let total = 0;
    for (let i = 0; i < etat.hydratation.prises.length; i++) {
        total += etat.hydratation.prises[i].ml;
    }
    document.getElementById("hydra-texte").textContent = total + " / " + etat.hydratation.objectif + " ml";
    document.getElementById("hydra-fill").style.width = (total / etat.hydratation.objectif * 100) + "%";
    const liste = document.getElementById("hydra-historique");
    liste.innerHTML = "";
    for (let i = 0; i < etat.hydratation.prises.length; i++) {
        const p = etat.hydratation.prises[i];
        const ligne = document.createElement("li");
        const spanHeure = document.createElement("span");
        spanHeure.textContent = p.heure;
        const spanMl = document.createElement("span");
        spanMl.textContent = p.ml + " ml";
        ligne.appendChild(spanHeure);
        ligne.appendChild(spanMl);
        liste.appendChild(ligne);
    }
}

function logHydratation() {
    const d = new Date();
    const heure = pad(d.getHours()) + ":" + pad(d.getMinutes()) + ":" + pad(d.getSeconds());
    etat.hydratation.prises.push({ ml: 300, heure: heure });
    save();
    render();
}

function besoinOnboarding() {
    return !etat.onboardingFait && etat.seances.length === 0 && !etat.poidsDefini;
}

function renderProfilProgramme() {
    const programmes = listeProgrammes();
    const objectifs = { force: "Force", masse: "Masse", forme: "Forme" };
    const lignes = [];
    for (let i = 0; i < programmes.length; i++) {
        lignes.push(NOMS_JOURS_COURTS[programmes[i].jour] + " : " + programmes[i].nom);
    }
    document.getElementById("profil-programme").textContent = "Objectif : " + (objectifs[etat.objectif] || "Masse") + " · " + lignes.join(" · ");
}

function ouvrirOnboarding() {
    onboardingEtat.objectif = etat.objectif || "masse";
    onboardingEtat.jours = etat.planning ? etat.planning.jours.slice() : JOURS_SPLIT4_DEFAUT.slice();
    document.getElementById("onb-poids").value = etat.poidsDefini ? etat.poids : "";
    document.getElementById("onboarding").hidden = false;
    etapeOnboarding(1);
}

function etapeOnboarding(numero) {
    for (let k = 1; k <= 3; k++) {
        document.getElementById("onb-etape-" + k).hidden = k !== numero;
    }
    if (numero === 1) {
        const puces = document.querySelectorAll(".onb-objectif");
        for (let i = 0; i < puces.length; i++) {
            puces[i].classList.toggle("actif", puces[i].dataset.objectif === onboardingEtat.objectif);
        }
    } else if (numero === 2) {
        const conteneur = document.getElementById("onb-jours");
        conteneur.innerHTML = "";
        for (let i = 0; i < ORDRE_JOURS.length; i++) {
            const jour = ORDRE_JOURS[i];
            const puce = document.createElement("button");
            puce.className = "filtre-puce" + (onboardingEtat.jours.indexOf(jour) !== -1 ? " actif" : "");
            puce.textContent = NOMS_JOURS_COURTS[jour];
            puce.addEventListener("click", function() {
                const position = onboardingEtat.jours.indexOf(jour);
                if (position === -1) {
                    onboardingEtat.jours.push(jour);
                } else {
                    onboardingEtat.jours.splice(position, 1);
                }
                etapeOnboarding(2);
            });
            conteneur.appendChild(puce);
        }
        const nombre = onboardingEtat.jours.length;
        document.getElementById("onb-jours-info").textContent = nombre + " jour" + (nombre > 1 ? "s" : "") + " choisi" + (nombre > 1 ? "s" : "") + " (entre 2 et 6)";
        document.getElementById("onb-suivant-2").disabled = nombre < 2 || nombre > 6;
    } else {
        const liste = document.getElementById("onb-programme");
        liste.innerHTML = "";
        const programmes = construireProgrammes(typePourJours(onboardingEtat.jours.length), onboardingEtat.jours);
        for (let i = 0; i < programmes.length; i++) {
            const ligne = document.createElement("li");
            ligne.textContent = NOMS_JOURS_LONGS[programmes[i].jour] + " · " + programmes[i].nom + " (" + programmes[i].exercices.length + " exercices)";
            liste.appendChild(ligne);
        }
    }
}

function terminerOnboarding() {
    const poids = Number(String(document.getElementById("onb-poids").value).replace(",", "."));
    if (!(poids >= 30 && poids <= 300)) {
        informer("Entre un poids entre 30 et 300 kg.");
        etapeOnboarding(1);
        return;
    }
    etat.poids = poids;
    etat.poidsDefini = true;
    etat.hydratation.objectif = Math.round(poids * 33);
    etat.objectif = onboardingEtat.objectif;
    etat.planning = { jours: onboardingEtat.jours.slice(), type: typePourJours(onboardingEtat.jours.length) };
    etat.onboardingFait = true;
    if (!etat.quete || !etat.quete.faite) {
        etat.quete = null;
        genererQueteDuJour();
    }
    document.getElementById("onboarding").hidden = true;
    save();
    markPresence();
    render();
}

function passerOnboarding() {
    etat.onboardingFait = true;
    document.getElementById("onboarding").hidden = true;
    save();
    render();
}

// Cache les onglets des modules mis en pause (voir MODULES_ACTIFS).
function appliquerModulesActifs() {
    for (const module in MODULES_ACTIFS) {
        if (!MODULES_ACTIFS[module]) {
            const onglet = document.querySelector('.onglet[data-page="' + module + '"]');
            if (onglet) {
                onglet.hidden = true;
            }
        }
    }
}
appliquerModulesActifs();

// Demande au navigateur de ne pas effacer les donnees quand il manque de place.
if (navigator.storage && navigator.storage.persist) {
    navigator.storage.persist();
}

function appliquerPoids(poids) {
    if (!(poids >= 30 && poids <= 300)) {
        informer("Entre un poids entre 30 et 300 kg.");
        return;
    }
    etat.poids = poids;
    etat.poidsDefini = true;
    etat.hydratation.objectif = Math.round(poids * 33);
    save();
    render();
}

function setPoids() {
    appliquerPoids(Number(String(document.getElementById("input-poids-perso").value).replace(",", ".")));
}

function xpProchainStade() {
    const rang = getRang();
    for (let i = rang.index + 1; i < rangs.length; i++) {
        if (rangs[i].nom !== rang.nom && rangs[i].seuil > etat.xp) {
            return { nom: rangs[i].nom, xp: rangs[i].seuil - etat.xp };
        }
    }
    return null;
}


function supprimerExercice(i) {
    etat.muscu.splice(i, 1);
    save();
    render();
}

function majEtatCourse(enCourse) {
    if (enCourse) {
        document.getElementById("course-etat").textContent = "● En cours";
        document.getElementById("btn-start-course").hidden = true;
        document.getElementById("btn-pause-course").hidden = false;
        document.getElementById("btn-stop-course").hidden = false;
    }
    else {
        document.getElementById("course-etat").textContent = "Prêt";
        document.getElementById("btn-start-course").hidden = false;
        document.getElementById("btn-pause-course").hidden = true;
        document.getElementById("btn-stop-course").hidden = true;
    }
}

function ouvrirDialogue(message, options) {
    if (dialogueResolve) {
        return Promise.resolve(null);
    }
    options = options || {};
    const champ = document.getElementById("dialogue-champ");
    document.getElementById("dialogue-message").textContent = message;
    champ.hidden = !options.champ;
    champ.value = options.valeur !== undefined ? options.valeur : "";
    document.getElementById("dialogue-ok").textContent = options.ok || "OK";
    document.getElementById("dialogue-annuler").hidden = options.annuler === false;
    document.getElementById("dialogue").hidden = false;
    if (options.champ) {
        champ.focus();
        champ.select();
    } else {
        document.getElementById("dialogue-ok").focus();
    }
    return new Promise(function(resolve) {
        dialogueResolve = resolve;
    });
}

function fermerDialogue(valeur) {
    document.getElementById("dialogue").hidden = true;
    const resolve = dialogueResolve;
    dialogueResolve = null;
    if (resolve) {
        resolve(valeur);
    }
}

function confirmer(message, libelleOk) {
    return ouvrirDialogue(message, { ok: libelleOk || "Confirmer" }).then(function(reponse) {
        return reponse !== null;
    });
}

function informer(message) {
    return ouvrirDialogue(message, { annuler: false });
}

function demanderNombre(message, valeur) {
    return ouvrirDialogue(message, { champ: true, valeur: valeur }).then(function(reponse) {
        if (reponse === null) {
            return null;
        }
        return Number(String(reponse).replace(",", "."));
    });
}

function celebrer(message) {
    document.getElementById("celebration-message").textContent = message;
    document.getElementById("celebration").hidden = false;
    setTimeout(function () {
        document.getElementById("celebration").hidden = true;
    }, 2000);
}


function calculerClasse() {
    if (etat.muscu.length > etat.course.length) return "Bruiser";
    if (etat.course.length > etat.muscu.length) return "Rôdeur";
    return "Hybride";
}
function calculerTitre() {
    if (etat.bestStreak >= 30) return "Sans faille";
    if (etat.bestStreak >= 7) return "Assidu";
    return "Recrue";
}

function verifierBadges() {
    for (let i = 0; i < badges.length; i++) {
        const badge = badges[i];
        if (!etat.badges[badge.id] && valeurBadge(badge.type) >= badge.cible) {
            etat.badges[badge.id] = true;
            etat.xp += badge.xp;
            celebrer("Badge : " + badge.nom + " ! +" + badge.xp + " XP");
        }
    }
}

function renderBadges() {
    const liste = document.getElementById("liste-badges");
    liste.innerHTML = "";
    for (let i = 0; i < badges.length; i++) {
        const b = badges[i];
        if (b.type === "course" && !MODULES_ACTIFS.course) {
            continue;
        }
        const ligne = document.createElement("li");
        if (etat.badges[b.id]) {
            ligne.textContent = "✅ " + b.nom + " (" + b.xp + " XP)";
        } else {
            ligne.textContent = "🔒 " + b.nom + " -- " + valeurBadge(b.type) + " / " + b.cible;
        }
        liste.appendChild(ligne);
    }
}

function messageCoach() {
    if (etat.quete && etat.quete.faite) return "Quête du jour bouclée. Tu tiens ton rang.";
    if (etat.streak >= 7) return "Streak de " + etat.streak + " jours. La discipline devient une habitude.";
    if (etat.streak === 0) return "Nouveau départ. Aujourd'hui ! tu reprends le contrôle.";
    return "Ta quête t'attend. Ne la laisse pas la journée filer.";
}
function fermerSelecteur(){
    document.getElementById("selecteur-exercice").hidden = true;
}

function normaliser(texte) {
    return texte 
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function ajouterRangeeFiltres(conteneur, cle, noms) {
    const rangee = document.createElement("div");
    rangee.className = "filtres-rangee";
    for (const valeur in noms) {
        const puce = document.createElement("button");
        puce.className = "filtre-puce" + (filtresSelecteur[cle] === valeur ? " actif" : "");
        puce.textContent = noms[valeur];
        puce.addEventListener("click", function() {
            filtresSelecteur[cle] = filtresSelecteur[cle] === valeur ? null : valeur;
            renderSelecteur();
        });
        rangee.appendChild(puce);
    }
    conteneur.appendChild(rangee);
}

function renderFiltresSelecteur() {
    const conteneur = document.getElementById("selecteur-filtres");
    conteneur.innerHTML = "";
    ajouterRangeeFiltres(conteneur, "muscle", NOMS_MUSCLES);
    ajouterRangeeFiltres(conteneur, "materiel", NOMS_MATERIEL);
}

function noterRecent(idExo) {
    exosRecents = exosRecents.filter(function(id) { return id !== idExo; });
    exosRecents.unshift(idExo);
    exosRecents = exosRecents.slice(0, 6);
    localStorage.setItem("exosRecents", JSON.stringify(exosRecents));
}

function renderSelecteur(recherche) {
    const liste = document.getElementById("selecteur-liste");
    liste.innerHTML = "";
    if (recherche === undefined) {
        recherche = document.getElementById("selecteur-recherche").value;
    }
    renderFiltresSelecteur();

    const terme = normaliser(recherche || "");
    const filtre = filtresSelecteur.muscle || filtresSelecteur.materiel;
    if (terme !== "" || filtre) {
        const resultats = EXERCICES.filter(function(e) {
            if (filtresSelecteur.muscle && e.muscle !== filtresSelecteur.muscle) {
                return false;
            }
            if (filtresSelecteur.materiel && e.materiel !== filtresSelecteur.materiel) {
                return false;
            }
            const texte = e.nom + " " + NOMS_MUSCLES[e.muscle] + " " + NOMS_MATERIEL[e.materiel];
            return normaliser(texte).includes(terme);
        });
        if (resultats.length === 0) {
            const vide = document.createElement("li");
            vide.className = "selecteur-section";
            vide.textContent = "Aucun résultat";
            liste.appendChild(vide);
            return;
        }
        ajouterSection(liste, "Résultats", resultats);
        return;
    }

    const recents = [];
    for (let i = 0; i < exosRecents.length; i++) {
        const ex = trouverExercice(exosRecents[i]);
        if (ex) {
            recents.push(ex);
        }
    }
    const favoris = EXERCICES.filter(function(e){ return e.favori; });
    const autres = EXERCICES.filter(function(e){ return !e.favori; });

    ajouterSection(liste, "Récents", recents);
    ajouterSection(liste, "Favoris", favoris);
    ajouterSection(liste, "Tous les exercices", autres);
}

function ajouterSection(liste, titre, exercices) {
    if (exercices.length === 0) {
        return;
    }
    const entete = document.createElement("li");
    entete.className = "selecteur-section";
    entete.textContent = titre;
    liste.appendChild(entete);

    for (let i = 0; i < exercices.length; i++) {
        const ex = exercices[i];
        
        const ligne = document.createElement("li");
        ligne.className = "exo-ligne";

        const nom = document.createElement("span");
        nom.className = "exo-nom";
        nom.textContent = ex.nom;

        const meta = document.createElement("span");
        meta.className = "exo-meta";
        meta.textContent = NOMS_MUSCLES[ex.muscle] + " · " + NOMS_MATERIEL[ex.materiel];

        ligne.appendChild(nom);
        ligne.appendChild(meta);
        ligne.addEventListener("click", function() {

            choisirExercice(ex);
        });
        liste.appendChild(ligne);
    }
}

function remplirListe(select, noms) {
    select.innerHTML = "";
    for (const cle in noms) {
        const option = document.createElement("option");
        option.value = cle;
        option.textContent = noms[cle];
        select.appendChild(option);
    }
}

function afficherFormCreerExo(afficher) {
    document.getElementById("form-creer-exo").hidden = !afficher;
    document.getElementById("btn-creer-exo").hidden = afficher;
    if (afficher) {
        remplirListe(document.getElementById("creer-exo-muscle"), NOMS_MUSCLES);
        remplirListe(document.getElementById("creer-exo-materiel"), NOMS_MATERIEL);
        document.getElementById("creer-exo-nom").value = document.getElementById("selecteur-recherche").value;
        document.getElementById("creer-exo-nom").focus();
    }
}

function creerExercicePerso(evenement) {
    evenement.preventDefault();
    const nom = document.getElementById("creer-exo-nom").value.trim();
    if (nom === "") {
        return;
    }
    const ex = {
        id: "perso-" + normaliser(nom).replace(/[^a-z0-9]+/g, "-") + "-" + Date.now().toString(36),
        nom: nom,
        muscle: document.getElementById("creer-exo-muscle").value,
        materiel: document.getElementById("creer-exo-materiel").value
    };
    exosPerso.push(ex);
    EXERCICES.push(ex);
    localStorage.setItem("exosPerso", JSON.stringify(exosPerso));
    afficherFormCreerExo(false);
    choisirExercice(ex);
}

document.getElementById("btn-creer-exo").addEventListener("click", function() {
    afficherFormCreerExo(true);
});
document.getElementById("btn-annuler-creer-exo").addEventListener("click", function() {
    afficherFormCreerExo(false);
});
document.getElementById("form-creer-exo").addEventListener("submit", creerExercicePerso);

function ouvrirSelecteur(){
    afficherFormCreerExo(false);
    document.getElementById("selecteur-recherche").value ="";
    filtresSelecteur = { muscle: null, materiel: null };
    renderSelecteur();
    document.getElementById("selecteur-exercice").hidden = false;
    document.getElementById("btn-vider-recherche").hidden = true;
}

function renderStreak() {
    const conteneur = document.getElementById("streak-semaine");
    conteneur.innerHTML = "";
    const lettres = ["D", "L", "M", "M", "J", "V", "S"];

    for (let i = 6; i >= 0; i--) {
        const date = addDays(todayStr(), -i);

        const jour = document.createElement("div");
        jour.className = "streak-jour";
        if (i === 0) {
            jour.classList.add("aujourdhui");
        }

        const point = document.createElement("span");
        point.className = "streak-point";
        if (etat.history[date] && etat.history[date].presence) {
            point.classList.add("rempli");
        }

        const morceaux = date.split("-");
        const d = new Date(Number(morceaux[0]), Number(morceaux[1]) - 1, Number(morceaux[2]));

        const lettre = document.createElement("span");
        lettre.className = "streak-lettre";
        lettre.textContent = lettres[d.getDay()];

        jour.appendChild(point);
        jour.appendChild(lettre);
        conteneur.appendChild(jour);
    }
}
function demarrerSeance() {
    if (seanceEnCours) {
        changerPage("seance");
        return;
    }
    seanceEnCours = {
        debut: Date.now(),
        exercices: []
    };
    sauverSeance();
    garderEcranAllume();
    demanderNotifications();
    changerPage("seance");
}

function choisirExercice(ex) {
    noterRecent(ex.id);
    seanceEnCours.exercices.push({
        id: ex.id,
        nom: ex.nom,
        muscle: ex.muscle,
        series: []
    });
    fermerSelecteur();
    renderSeance();
    ajouterSerieExo(seanceEnCours.exercices.length - 1);
}

function creerSerie(exo) {
    // La derniere serie de travail de cette seance prime sur celle de la seance d'avant.
    let modele = null;
    for (let k = exo.series.length - 1; k >= 0; k--) {
        if (!exo.series[k].echauffement) {
            modele = exo.series[k];
            break;
        }
    }
    if (!modele) {
        modele = seriesPrecedentes(exo.id)[0];
    }
    return {
        kg: modele ? String(modele.poids !== undefined ? modele.poids : modele.kg) : "",
        reps: modele ? String(modele.reps) : "",
        fait: false
    };
}

function ajouterEchauffement(indexExo) {
    const exo = seanceEnCours.exercices[indexExo];
    let nbEchauffements = 0;
    while (nbEchauffements < exo.series.length && exo.series[nbEchauffements].echauffement) {
        nbEchauffements++;
    }
    const premiere = exo.series[nbEchauffements];
    let kg = "";
    if (premiere && Number(premiere.kg) > 0) {
        kg = String(Math.round(Number(premiere.kg) * 0.5 / 2.5) * 2.5);
    }
    exo.series.splice(nbEchauffements, 0, { kg: kg, reps: "10", fait: false, echauffement: true });
    renderSeance();
}

function deplacerExercice(indexExo, sens) {
    const cible = indexExo + sens;
    if (cible < 0 || cible >= seanceEnCours.exercices.length) {
        return;
    }
    const exo = seanceEnCours.exercices[indexExo];
    seanceEnCours.exercices[indexExo] = seanceEnCours.exercices[cible];
    seanceEnCours.exercices[cible] = exo;
    renderSeance();
}

function basculerSuperset(indexExo) {
    const exo = seanceEnCours.exercices[indexExo];
    exo.superset = !exo.superset;
    renderSeance();
}

function creerBoutonAction(texte, libelle, action, actif, desactive) {
    const bouton = document.createElement("button");
    bouton.className = "btn-action-exo" + (actif ? " actif" : "");
    bouton.textContent = texte;
    bouton.setAttribute("aria-label", libelle);
    bouton.disabled = !!desactive;
    bouton.addEventListener("click", action);
    return bouton;
}

function ajouterSerieExo(indexExo) {
    const exo = seanceEnCours.exercices[indexExo];
    exo.series.push(creerSerie(exo));
    renderSeance();
}

// Formule d'Epley, fiable jusqu'a ~12 reps. Arrondie au 0,5 kg.
function estimer1RM(poids, reps) {
    poids = Number(poids);
    reps = Number(reps);
    if (!(poids > 0) || !(reps >= 1) || reps > 12) {
        return 0;
    }
    return Math.round(poids * (1 + reps / 30) * 2) / 2;
}

function meilleur1RM(idExo) {
    let meilleur = 0;
    for (let i = 0; i < etat.seances.length; i++) {
        const series = etat.seances[i].series;
        for (let j = 0; j < series.length; j++) {
            if (series[j].id === idExo) {
                meilleur = Math.max(meilleur, estimer1RM(series[j].poids, series[j].reps));
            }
        }
    }
    return meilleur;
}

// Rang de force d'un exercice a partir d'un 1RM estime. null si non classable.
// 15 bornes (5 rangs x 3 divisions) : chaque rang est coupe en 3 parts egales.
// Coefficient utilise : celui calibre avec mes donnees s'il existe, sinon la valeur par defaut.
function coefExo(idExo) {
    return (etat.coefsPerso && etat.coefsPerso[idExo]) || COEF_EXO[idExo];
}

function bornesForce(seuils) {
    const departs = [0].concat(seuils);
    const bornes = [];
    for (let k = 0; k < departs.length; k++) {
        const debut = departs[k];
        const fin = k < departs.length - 1 ? departs[k + 1] : debut * 1.25;
        for (let d = 0; d < 3; d++) {
            bornes.push(debut + (fin - debut) * d / 3);
        }
    }
    return bornes;
}

// Medaille : anneau a la couleur du rang, un sommet (clin d'oeil a "Ascension"), 1 a 3 points = division.
function medailleHTML(couleur, division, taille) {
    const allumes = { III: 1, II: 2, I: 3 }[division] || 1;
    let points = "";
    for (let i = 0; i < 3; i++) {
        points += '<circle cx="' + (24 + i * 8) + '" cy="51" r="2.3" fill="' + (i < allumes ? couleur : "#3A3B2E") + '"/>';
    }
    return '<svg class="medaille" viewBox="0 0 64 64" width="' + taille + '" height="' + taille + '" aria-hidden="true">' +
        '<circle cx="32" cy="32" r="29" fill="#14150F" stroke="' + couleur + '" stroke-width="4"/>' +
        '<circle cx="32" cy="32" r="23" fill="none" stroke="' + couleur + '" stroke-opacity="0.35" stroke-width="1.5"/>' +
        '<polygon points="13,43 27,18 34,31 39,23 51,43" fill="' + couleur + '"/>' +
        '<polygon points="27,18 31,26 27,24 23,26" fill="#F2F1E8"/>' + points + '</svg>';
}

function remplirBadgeRang(element, rang, taille) {
    element.innerHTML = medailleHTML(rang.couleur, rang.division, taille);
    const texte = document.createElement("span");
    texte.textContent = rang.nom + " " + rang.division;
    element.appendChild(texte);
}

function dessinerMedaille(c, x, y, r, couleur, division) {
    const echelle = r / 29;
    const allumes = { III: 1, II: 2, I: 3 }[division] || 1;
    c.save();
    c.translate(x - 32 * echelle, y - 32 * echelle);
    c.scale(echelle, echelle);
    c.beginPath();
    c.arc(32, 32, 29, 0, Math.PI * 2);
    c.fillStyle = "#14150F";
    c.fill();
    c.lineWidth = 4;
    c.strokeStyle = couleur;
    c.stroke();
    c.beginPath();
    c.moveTo(13, 43);
    c.lineTo(27, 18);
    c.lineTo(34, 31);
    c.lineTo(39, 23);
    c.lineTo(51, 43);
    c.closePath();
    c.fillStyle = couleur;
    c.fill();
    c.beginPath();
    c.moveTo(27, 18);
    c.lineTo(31, 26);
    c.lineTo(27, 24);
    c.lineTo(23, 26);
    c.closePath();
    c.fillStyle = "#F2F1E8";
    c.fill();
    for (let i = 0; i < 3; i++) {
        c.beginPath();
        c.arc(24 + i * 8, 51, 2.3, 0, Math.PI * 2);
        c.fillStyle = i < allumes ? couleur : "#3A3B2E";
        c.fill();
    }
    c.restore();
}

function libelleRang(rang) {
    return rang.nom + " " + rang.division;
}

// Rang de force d'un exercice a partir d'un 1RM estime. null si l'exercice n'est pas classable.
function rangForce(idExo, rm) {
    const ex = trouverExercice(idExo);
    if (!ex || !(rm > 0) || !(etat.poids > 0)) {
        return null;
    }
    const direct = STANDARDS_EXO[idExo];
    const seuils = direct || STANDARDS_FORCE[ex.muscle];
    const facteur = direct ? 1 : coefExo(idExo);
    if (!seuils || !facteur) {
        return null;
    }
    const ratio = rm / etat.poids / facteur;
    const bornes = bornesForce(seuils);
    let niveau = 0;
    for (let i = 0; i < bornes.length; i++) {
        if (ratio >= bornes[i]) {
            niveau = i;
        }
    }
    const nom = NOMS_RANGS_FORCE[Math.floor(niveau / 3)];
    const resultat = {
        index: Math.floor(niveau / 3),
        niveau: niveau,
        nom: nom,
        division: DIVISIONS_FORCE[niveau % 3],
        couleur: COULEURS_RANG[nom],
        ratio: ratio,
        suivant: null,
        progression: 1
    };
    if (niveau < bornes.length - 1) {
        const prochain = niveau + 1;
        const nomSuivant = NOMS_RANGS_FORCE[Math.floor(prochain / 3)];
        resultat.suivant = {
            nom: nomSuivant,
            division: DIVISIONS_FORCE[prochain % 3],
            couleur: COULEURS_RANG[nomSuivant],
            rm: bornes[prochain] * etat.poids * facteur
        };
        resultat.progression = (ratio - bornes[niveau]) / (bornes[prochain] - bornes[niveau]);
    }
    return resultat;
}

// Meilleur rang de force atteint sur un muscle (tous exercices confondus).
// Meilleur rang de force atteint sur un muscle (tous exercices classes confondus).
function meilleurRangForceMuscle(muscle) {
    let meilleur = null;
    for (let i = 0; i < etat.seances.length; i++) {
        const series = etat.seances[i].series;
        for (let j = 0; j < series.length; j++) {
            const x = series[j];
            if (x.muscle !== muscle || !x.id) {
                continue;
            }
            const rang = rangForce(x.id, estimer1RM(x.poids, x.reps));
            if (rang && (!meilleur || rang.niveau > meilleur.niveau)) {
                meilleur = rang;
            }
        }
    }
    return meilleur;
}

// Une serie qui vient d'etre validee fait-elle monter le rang de force de l'exercice ?
function detecterMonteeForce(exo, serie) {
    const apres = rangForce(exo.id, estimer1RM(serie.kg, serie.reps));
    if (!apres) {
        return null;
    }
    let rmAvant = meilleur1RM(exo.id);
    for (let k = 0; k < exo.series.length; k++) {
        const autre = exo.series[k];
        if (autre !== serie && autre.fait && !autre.echauffement) {
            rmAvant = Math.max(rmAvant, estimer1RM(autre.kg, autre.reps));
        }
    }
    const avant = rangForce(exo.id, rmAvant);
    if (!avant || apres.niveau <= avant.niveau) {
        return null;
    }
    return apres;
}

// Vue d'ensemble : un rang par exercice classe, avec la jauge vers le suivant.
function renderRangsForce() {
    const liste = document.getElementById("rangs-force");
    liste.innerHTML = "";
    const meilleurs = {};
    const noms = {};
    for (let i = 0; i < etat.seances.length; i++) {
        const series = etat.seances[i].series;
        for (let j = 0; j < series.length; j++) {
            const x = series[j];
            if (!x.id) {
                continue;
            }
            noms[x.id] = x.nom;
            meilleurs[x.id] = Math.max(meilleurs[x.id] || 0, estimer1RM(x.poids, x.reps));
        }
    }
    const lignes = [];
    let nonClasses = 0;
    for (const id in meilleurs) {
        const rang = rangForce(id, meilleurs[id]);
        if (rang) {
            lignes.push({ id: id, nom: noms[id], rm: meilleurs[id], rang: rang });
        } else {
            nonClasses++;
        }
    }
    lignes.sort(function(a, b) {
        return b.rang.niveau - a.rang.niveau;
    });
    for (let i = 0; i < lignes.length; i++) {
        const l = lignes[i];
        const li = document.createElement("li");
        li.className = "rang-force-ligne";
        const entete = document.createElement("div");
        entete.className = "rang-force-entete";
        const nom = document.createElement("span");
        nom.textContent = l.nom;
        const badge = document.createElement("span");
        badge.className = "rang-force-badge";
        remplirBadgeRang(badge, l.rang, 24);
        badge.style.color = l.rang.couleur;
        entete.appendChild(nom);
        entete.appendChild(badge);
        const barre = document.createElement("div");
        barre.className = "quete-barre";
        const remplissage = document.createElement("div");
        remplissage.className = "quete-fill";
        remplissage.style.width = Math.round(Math.max(0, Math.min(1, l.rang.progression)) * 100) + "%";
        remplissage.style.backgroundColor = l.rang.couleur;
        barre.appendChild(remplissage);
        const detail = document.createElement("p");
        detail.className = "aide-texte";
        if (l.rang.suivant) {
            const manque = Math.ceil((l.rang.suivant.rm - l.rm) * 2) / 2;
            detail.textContent = "1RM ≈ " + Math.round(l.rm * 10) / 10 + " kg · " + libelleRang(l.rang.suivant) + " à " + Math.ceil(l.rang.suivant.rm * 2) / 2 + " kg (+" + manque + " kg)";
        } else {
            detail.textContent = "1RM ≈ " + Math.round(l.rm * 10) / 10 + " kg · rang maximal";
        }
        li.appendChild(entete);
        li.appendChild(barre);
        li.appendChild(detail);
        liste.appendChild(li);
    }
    if (lignes.length === 0) {
        const vide = document.createElement("li");
        vide.className = "aide-texte";
        vide.textContent = "Fais une séance avec un exercice classé (squat, développé, rowing, curl…) pour voir ton rang.";
        liste.appendChild(vide);
    } else if (nonClasses > 0) {
        const note = document.createElement("li");
        note.className = "aide-texte";
        note.textContent = nonClasses + " exercice" + (nonClasses > 1 ? "s" : "") + " non classé" + (nonClasses > 1 ? "s" : "") + " (pas de barème fiable).";
        liste.appendChild(note);
    }
}

// Double progression : meme charge jusqu'au haut de la fourchette sur toutes
// les series lourdes, puis on monte. Renvoie null s'il n'y a pas d'historique.
function fourchetteReps() {
    return FOURCHETTES[etat.objectif] || FOURCHETTES.masse;
}

function suggestionCharge(idExo) {
    const precedentes = seriesPrecedentes(idExo);
    if (precedentes.length === 0) {
        return null;
    }
    const fourchette = fourchetteReps();
    let poids = 0;
    for (let i = 0; i < precedentes.length; i++) {
        poids = Math.max(poids, Number(precedentes[i].poids));
    }
    const lourdes = precedentes.filter(function(s) { return Number(s.poids) === poids; });
    let repsMin = Infinity;
    for (let i = 0; i < lourdes.length; i++) {
        repsMin = Math.min(repsMin, Number(lourdes[i].reps));
    }
    const exo = trouverExercice(idExo);
    const pas = exo && exo.materiel === "barre" ? 2.5 : 2;

    if (poids === 0) {
        const cible = Math.min(repsMin + 1, 99);
        return { poids: 0, reps: cible, raison: "Poids du corps : vise " + cible + " reps (tu as fait " + repsMin + " au pire)" };
    }
    if (repsMin >= fourchette.max) {
        return { poids: poids + pas, reps: fourchette.min, raison: "Toutes tes séries à " + repsMin + " reps à " + poids + " kg : on monte de " + pas + " kg" };
    }
    const cible = Math.min(repsMin + 1, fourchette.max);
    return { poids: poids, reps: cible, raison: "Même charge : vise " + cible + " reps (tu as fait " + repsMin + " au pire)" };
}

function appliquerSuggestion(indexExo, suggestion) {
    const exo = seanceEnCours.exercices[indexExo];
    if (exo.series.length === 0) {
        exo.series.push({ kg: "", reps: "", fait: false });
    }
    for (let i = 0; i < exo.series.length; i++) {
        if (!exo.series[i].fait && !exo.series[i].echauffement) {
            exo.series[i].kg = String(suggestion.poids);
            exo.series[i].reps = String(suggestion.reps);
        }
    }
    renderSeance();
}

// Repos : choix de Kylian pour l'exercice, sinon selon le materiel.
function reposPour(idExo) {
    if (reposExos[idExo]) {
        return reposExos[idExo];
    }
    const exo = trouverExercice(idExo);
    if (exo && exo.materiel === "barre") {
        return 120;
    }
    if (exo && exo.materiel === "corps") {
        return 60;
    }
    return 90;
}

function changerReposExo(idExo, delta) {
    reposExos[idExo] = Math.min(REPOS_MAX, Math.max(REPOS_MIN, reposPour(idExo) + delta));
    localStorage.setItem("reposExos", JSON.stringify(reposExos));
    renderSeance();
}

// Indice du programme propose : celui d'aujourd'hui s'il n'est pas deja fait,
// sinon le prochain jour d'entrainement de la semaine.
function typePourJours(nombre) {
    return nombre <= 3 ? "fullbody" : "split4";
}

// Construit les programmes pour un type et des jours donnes (lundi d'abord).
function construireProgrammes(type, joursChoisis) {
    const jours = joursChoisis.slice().sort(function(a, b) {
        return (a || 7) - (b || 7);
    });
    const base = type === "fullbody" ? PROGRAMMES_FULLBODY : PROGRAMMES_SPLIT4;
    const nombre = type === "fullbody" ? jours.length : Math.min(jours.length, base.length);
    const liste = [];
    for (let i = 0; i < nombre; i++) {
        const modele = base[i % base.length];
        liste.push({ nom: modele.nom, jour: jours[i], exercices: modele.exercices });
    }
    return liste;
}

function listeProgrammes() {
    if (etat.planning && etat.planning.jours && etat.planning.jours.length) {
        return construireProgrammes(etat.planning.type, etat.planning.jours);
    }
    return construireProgrammes("split4", JOURS_SPLIT4_DEFAUT);
}

function prochainProgramme() {
    const programmes = listeProgrammes();
    const aujourdhui = new Date().getDay();
    const dejaFaitAujourdhui = etat.seances.some(function(s) { return s.date === todayStr(); });
    for (let decalage = dejaFaitAujourdhui ? 1 : 0; decalage < 8; decalage++) {
        const jour = (aujourdhui + decalage) % 7;
        for (let i = 0; i < programmes.length; i++) {
            if (programmes[i].jour === jour) {
                return { index: i, aujourdhui: decalage === 0 };
            }
        }
    }
    return { index: 0, aujourdhui: false };
}

function demarrerProgramme(index) {
    if (seanceEnCours) {
        changerPage("seance");
        return;
    }
    const programme = listeProgrammes()[index];
    const exercices = [];
    for (let i = 0; i < programme.exercices.length; i++) {
        const ex = trouverExercice(programme.exercices[i]);
        if (!ex) {
            continue;
        }
        const exo = { id: ex.id, nom: ex.nom, muscle: ex.muscle, series: [] };
        const suggestion = suggestionCharge(ex.id);
        for (let k = 0; k < NB_SERIES_PROGRAMME; k++) {
            const serie = creerSerie(exo);
            if (suggestion) {
                serie.kg = String(suggestion.poids);
                serie.reps = String(suggestion.reps);
            }
            exo.series.push(serie);
        }
        exercices.push(exo);
        noterRecent(ex.id);
    }
    seanceEnCours = { debut: Date.now(), exercices: exercices };
    sauverSeance();
    garderEcranAllume();
    demanderNotifications();
    renderSeance();
    changerPage("seance");
}

function refaireSeance(index) {
    if (seanceEnCours) {
        informer("Termine ou abandonne ta séance en cours avant d'en refaire une.");
        return;
    }
    const exercices = [];
    const parId = {};
    const series = etat.seances[index].series;
    for (let i = 0; i < series.length; i++) {
        const s = series[i];
        if (!s.id) {
            continue;
        }
        if (!parId[s.id]) {
            parId[s.id] = { id: s.id, nom: s.nom, muscle: s.muscle, series: [] };
            exercices.push(parId[s.id]);
        }
        parId[s.id].series.push({ kg: String(s.poids), reps: String(s.reps), fait: false });
    }
    if (exercices.length === 0) {
        informer("Cette séance n'a pas de détail à refaire.");
        return;
    }
    seanceEnCours = { debut: Date.now(), exercices: exercices };
    sauverSeance();
    garderEcranAllume();
    demanderNotifications();
    renderSeance();
    changerPage("seance");
}

function renderProchaineSeance() {
    const programmes = listeProgrammes();
    const proposition = prochainProgramme();
    const programme = programmes[proposition.index];
    const quand = proposition.aujourdhui ? "Aujourd'hui" : "Prochaine : " + NOMS_JOURS_LONGS[programme.jour];
    const cibles = ["prochaine-seance", "prochaine-seance-accueil"];
    for (let i = 0; i < cibles.length; i++) {
        const bloc = document.getElementById(cibles[i]);
        if (!bloc) {
            continue;
        }
        bloc.innerHTML = "";
        const texte = document.createElement("span");
        texte.className = "prochaine-texte";
        texte.textContent = quand + " · " + programme.nom + " (" + programme.exercices.length + " exercices)";
        const bouton = document.createElement("button");
        bouton.className = "btn-secondaire";
        bouton.textContent = seanceEnCours ? "Reprendre" : "Démarrer";
        bouton.addEventListener("click", function() {
            demarrerProgramme(proposition.index);
        });
        bloc.appendChild(texte);
        bloc.appendChild(bouton);
        if (cibles[i] === "prochaine-seance") {
            const autres = document.createElement("div");
            autres.className = "prochaine-autres";
            for (let k = 0; k < programmes.length; k++) {
                const puce = document.createElement("button");
                puce.className = "filtre-puce" + (k === proposition.index ? " actif" : "");
                puce.textContent = programmes[k].nom;
                puce.addEventListener("click", function() {
                    demarrerProgramme(k);
                });
                autres.appendChild(puce);
            }
            bloc.appendChild(autres);
        }
    }
}

function supprimerSerie(indexExo, indexSerie) {
    confirmer("Supprimer la série " + (indexSerie + 1) + " ?", "Supprimer").then(function(ok) {
        if (!ok) {
            return;
        }
        seanceEnCours.exercices[indexExo].series.splice(indexSerie, 1);
        renderSeance();
    });
}

function supprimerExercice(indexExo) {
    const exo = seanceEnCours.exercices[indexExo];
    confirmer("Retirer " + exo.nom + " de la séance ?", "Retirer").then(function(ok) {
        if (!ok) {
            return;
        }
        seanceEnCours.exercices.splice(indexExo, 1);
        renderSeance();
    });
}

function abandonnerSeance() {
    seanceEnCours = null;
    finRepos = 0;
    clearTimeout(minuteurFinRepos);
    fermerNotificationRepos();
    relacherEcran();
    sauverSeance();
    majBarreRepos();
    changerPage("muscu");
}

function meilleurPoids(idExo) {
    let meilleur = 0;
    for (let i = 0; i < etat.seances.length; i++) {
        const series = etat.seances[i].series;
        for (let j = 0; j < series.length; j++) {
            if (series[j].id === idExo && series[j].poids > meilleur) {
                meilleur = series[j].poids;
            }
        }
    }
    return meilleur;
}

function renderSeance() {
    if (!seanceEnCours) {
        return;
    }
    sauverSeance();
    const liste = document.getElementById("seance-liste");
    liste.innerHTML = "";
    let volume = 0;
    let nbSeries = 0;
    const nbExos = seanceEnCours.exercices.length;

    for (let i = 0; i < nbExos; i++) {
        const exo = seanceEnCours.exercices[i];
        const fiche = trouverExercice(exo.id);

        const bloc = document.createElement("li");
        bloc.className = "seance-exo";
        if (exo.superset && i < nbExos - 1) {
            bloc.classList.add("superset-debut");
        }
        if (i > 0 && seanceEnCours.exercices[i - 1].superset) {
            bloc.classList.add("superset-suite");
        }

        const tete = document.createElement("div");
        tete.className = "seance-exo-tete";

        const titre = document.createElement("div");
        titre.className = "seance-exo-nom";
        titre.textContent = exo.nom;
        if (fiche && fiche.materiel === "halteres") {
            const unite = document.createElement("span");
            unite.className = "seance-exo-unite";
            unite.textContent = " · kg par haltère";
            titre.appendChild(unite);
        }

        const btnSuppr = document.createElement("button");
        btnSuppr.className = "btn-suppr";
        btnSuppr.textContent = "✕";
        btnSuppr.setAttribute("aria-label", "Retirer l'exercice");
        btnSuppr.addEventListener("click", function() {
            supprimerExercice(i);
        });

        const repos = document.createElement("div");
        repos.className = "repos-exo";
        const moins = document.createElement("button");
        moins.textContent = "−";
        moins.setAttribute("aria-label", "Repos moins 15 secondes");
        moins.addEventListener("click", function() {
            changerReposExo(exo.id, -PAS_REPOS);
        });
        const valeurRepos = document.createElement("span");
        valeurRepos.textContent = "⏱ " + reposPour(exo.id) + " s";
        const plus = document.createElement("button");
        plus.textContent = "+";
        plus.setAttribute("aria-label", "Repos plus 15 secondes");
        plus.addEventListener("click", function() {
            changerReposExo(exo.id, PAS_REPOS);
        });
        repos.appendChild(moins);
        repos.appendChild(valeurRepos);
        repos.appendChild(plus);

        tete.appendChild(titre);
        tete.appendChild(repos);
        tete.appendChild(btnSuppr);
        bloc.appendChild(tete);

        if (exo.superset && i < nbExos - 1) {
            const lien = document.createElement("div");
            lien.className = "superset-etiquette";
            lien.textContent = "⛓ Superset avec " + seanceEnCours.exercices[i + 1].nom + " : pas de repos entre les deux";
            bloc.appendChild(lien);
        }

        // Actions principales ; le reste est range sous "Plus"
        const actions = document.createElement("div");
        actions.className = "seance-exo-actions";
        if (fiche && fiche.consigne) {
            actions.appendChild(creerBoutonAction("ℹ Technique", "Afficher la consigne d'exécution", function() {
                exo.consigneOuverte = !exo.consigneOuverte;
                renderSeance();
            }, exo.consigneOuverte, false));
        }
        actions.appendChild(creerBoutonAction("+ Échauffement", "Ajouter une série d'échauffement", function() {
            ajouterEchauffement(i);
        }, false, false));
        actions.appendChild(creerBoutonAction(exo.optionsOuvertes ? "⋯ Moins" : "⋯ Plus", "Plus d'options pour cet exercice", function() {
            exo.optionsOuvertes = !exo.optionsOuvertes;
            renderSeance();
        }, exo.optionsOuvertes, false));
        bloc.appendChild(actions);

        if (exo.optionsOuvertes) {
            const plusActions = document.createElement("div");
            plusActions.className = "seance-exo-actions";
            plusActions.appendChild(creerBoutonAction("↑", "Monter l'exercice", function() {
                deplacerExercice(i, -1);
            }, false, i === 0));
            plusActions.appendChild(creerBoutonAction("↓", "Descendre l'exercice", function() {
                deplacerExercice(i, 1);
            }, false, i === nbExos - 1));
            if (i < nbExos - 1) {
                plusActions.appendChild(creerBoutonAction("⛓ Superset", "Lier avec l'exercice suivant", function() {
                    basculerSuperset(i);
                }, exo.superset, false));
            }
            bloc.appendChild(plusActions);
        }

        if (exo.consigneOuverte && fiche && fiche.consigne) {
            const consigne = document.createElement("p");
            consigne.className = "seance-exo-consigne";
            consigne.textContent = fiche.consigne;
            bloc.appendChild(consigne);
        }

        const texteNote = exo.note !== undefined ? exo.note : (etat.notesExos[exo.id] || "");
        if (exo.optionsOuvertes || texteNote !== "") {
            const note = document.createElement("input");
            note.type = "text";
            note.className = "seance-exo-note";
            note.placeholder = "Note (réglage de la machine, sensation…)";
            note.setAttribute("autocomplete", "off");
            note.maxLength = 120;
            note.value = texteNote;
            note.addEventListener("input", function() {
                exo.note = note.value;
                etat.notesExos[exo.id] = note.value;
                sauverSeance();
                save();
            });
            bloc.appendChild(note);
        }

        const suggestion = suggestionCharge(exo.id);
        const rm = meilleur1RM(exo.id);
        const rangF = rangForce(exo.id, rm);
        if (suggestion || rangF) {
            const aide = document.createElement("div");
            aide.className = "seance-exo-aide";
            const texte = document.createElement("span");
            let ligneAide = "";
            if (suggestion) {
                ligneAide = "💡 " + suggestion.poids + " kg × " + suggestion.reps + " · " + suggestion.raison;
            }
            if (rm) {
                ligneAide += (ligneAide ? " · " : "") + "1RM ≈ " + rm + " kg";
            }
            if (rangF) {
                ligneAide += " · Force : " + libelleRang(rangF);
                if (rangF.suivant) {
                    const manque = Math.ceil((rangF.suivant.rm - rm) * 2) / 2;
                    ligneAide += " → " + libelleRang(rangF.suivant) + " à 1RM " + Math.ceil(rangF.suivant.rm * 2) / 2 + " kg (+" + manque + " kg)";
                }
            }
            texte.textContent = ligneAide;
            aide.appendChild(texte);
            if (suggestion) {
                const appliquer = document.createElement("button");
                appliquer.className = "btn-tertiaire";
                appliquer.textContent = "Appliquer";
                appliquer.addEventListener("click", function() {
                    appliquerSuggestion(i, suggestion);
                });
                aide.appendChild(appliquer);
            }
            bloc.appendChild(aide);
        }

        if (exo.series.length > 0) {
            const entete = document.createElement("div");
            entete.className = "serie-entete";
            const titres = ["Série", "Préc.", "kg", "Reps", ""];
            for (let k = 0; k < titres.length; k++) {
                const cellule = document.createElement("span");
                cellule.textContent = titres[k];
                entete.appendChild(cellule);
            }
            bloc.appendChild(entete);
        }
        const precedentes = seriesPrecedentes(exo.id);
        let numTravail = 0;

        for (let j = 0; j < exo.series.length; j++) {
            const serie = exo.series[j];
            const estEchauffement = !!serie.echauffement;
            const indexTravail = numTravail;
            if (!estEchauffement) {
                numTravail++;
            }
            if (serie.fait && !estEchauffement) {
                volume += Number(serie.kg) * Number(serie.reps);
                nbSeries++;
            }

            const ligne = document.createElement("div");
            ligne.className = "serie-ligne" + (estEchauffement ? " echauffement" : "");

            const numero = document.createElement("button");
            numero.className = "serie-num";
            numero.textContent = estEchauffement ? "É" : indexTravail + 1;
            numero.setAttribute("aria-label", (estEchauffement ? "Échauffement" : "Série " + (indexTravail + 1)) + " : maintiens pour supprimer");
            let minuteurAppui = null;
            numero.addEventListener("pointerdown", function() {
                minuteurAppui = setTimeout(function() {
                    minuteurAppui = null;
                    if (navigator.vibrate) {
                        navigator.vibrate(30);
                    }
                    supprimerSerie(i, j);
                }, 600);
            });
            const annulerAppui = function() {
                clearTimeout(minuteurAppui);
                minuteurAppui = null;
            };
            numero.addEventListener("pointerup", annulerAppui);
            numero.addEventListener("pointerleave", annulerAppui);
            numero.addEventListener("pointercancel", annulerAppui);
            numero.addEventListener("contextmenu", function(evenement) {
                evenement.preventDefault();
            });

            const precedent = document.createElement("span");
            precedent.className = "serie-precedent";
            const avant = estEchauffement ? null : precedentes[indexTravail];
            precedent.textContent = avant ? avant.poids + "×" + avant.reps : "–";

            const champKg = document.createElement("input");
            // Texte + clavier decimal : la virgule (62,5) est acceptee partout
            champKg.type = "text";
            champKg.inputMode = "decimal";
            champKg.setAttribute("autocomplete", "off");
            champKg.value = serie.kg;
            champKg.addEventListener("input", function() {
                serie.kg = champKg.value.replace(",", ".");
                serie.touche = true;
                sauverSeance();
            });

            const champReps = document.createElement("input");
            champReps.type = "number";
            champReps.inputMode = "numeric";
            champReps.value = serie.reps;
            champReps.addEventListener("input", function() {
                serie.reps = champReps.value;
                serie.touche = true;
                sauverSeance();
            });

            const valider = document.createElement("button");
            valider.className = "serie-valider";
            valider.textContent = "✓";
            if (serie.fait) {
                ligne.classList.add("fait");
            }
            valider.addEventListener("click", function() {
                if (!serie.fait && !serieValide(serie)) {
                    ligne.classList.add("invalide");
                    setTimeout(function() {
                        ligne.classList.remove("invalide");
                    }, 1200);
                    return;
                }
                serie.fait = !serie.fait;
                serie.pr = false;
                if (serie.fait) {
                    if (!estEchauffement) {
                        // Les series de travail suivantes non modifiees a la main reprennent kg x reps.
                        for (let k = j + 1; k < exo.series.length; k++) {
                            const suivante = exo.series[k];
                            if (!suivante.fait && !suivante.touche && !suivante.echauffement) {
                                suivante.kg = serie.kg;
                                suivante.reps = serie.reps;
                            }
                        }
                    }
                    seanceEnCours.fin = Date.now();
                    // Echauffement : repos court. Superset : pas de repos avant l'exercice lie.
                    let secondes = reposPour(exo.id);
                    if (estEchauffement) {
                        secondes = 30;
                    } else if (exo.superset && i < nbExos - 1) {
                        secondes = 0;
                    }
                    preparerAudio();
                    if (secondes > 0) {
                        finRepos = Date.now() + secondes * 1000;
                        totalRepos = secondes;
                        notifRepos.exo = exo.nom;
                        notifRepos.prochaine = prochaineSerieTexte(i, j);
                        programmerFinRepos();
                        notifierRepos();
                    } else {
                        finRepos = 0;
                        clearTimeout(minuteurFinRepos);
                        fermerNotificationRepos();
                    }

                    if (!estEchauffement) {
                        let record = meilleurPoids(exo.id);
                        for (let k = 0; k < exo.series.length; k++) {
                            const autre = exo.series[k];
                            if (autre !== serie && autre.fait && !autre.echauffement && Number(autre.kg) > record) {
                                record = Number(autre.kg);
                            }
                        }
                        const messages = [];
                        if (record > 0 && Number(serie.kg) > record) {
                            serie.pr = true;
                            messages.push("🏆 Record ! " + exo.nom + " : " + serie.kg + " kg");
                        }
                        const montee = detecterMonteeForce(exo, serie);
                        if (montee) {
                            messages.push("⬆ " + exo.nom + " : " + libelleRang(montee));
                        }
                        if (messages.length > 0) {
                            celebrer(messages.join(" · "));
                            fanfare();
                        }
                    }
                } else {
                    finRepos = 0;
                    clearTimeout(minuteurFinRepos);
                    fermerNotificationRepos();
                }
                renderSeance();
            });

            ligne.appendChild(numero);
            ligne.appendChild(precedent);
            ligne.appendChild(champKg);
            ligne.appendChild(champReps);
            ligne.appendChild(valider);
            bloc.appendChild(ligne);
        }

        const btn = document.createElement("button");
        btn.className = "btn-tertiaire btn-ajouter-serie";
        btn.textContent = "+ Ajouter une série";
        btn.addEventListener("click", function() {
            ajouterSerieExo(i);
        });
        bloc.appendChild(btn);

        liste.appendChild(bloc);
    }
    document.getElementById("seance-volume").textContent = Math.round(volume) + " kg";
    document.getElementById("seance-series").textContent = nbSeries + (nbSeries > 1 ? " séries" : " série");
    majBarreRepos();
}

// ---------- Notifications de repos ----------
function notificationsDisponibles() {
    return "Notification" in window && "serviceWorker" in navigator;
}

function notificationsActives() {
    return notificationsDisponibles() && Notification.permission === "granted" && etat.notifRepos !== false;
}

// A appeler depuis un geste de l'utilisateur (demarrer une seance, case du Profil).
function demanderNotifications() {
    if (notificationsDisponibles() && etat.notifRepos !== false && Notification.permission === "default") {
        Notification.requestPermission().then(renderOptionsNotifs).catch(function() {});
    }
}

function afficherNotification(titre, options) {
    if (!notificationsActives()) {
        return;
    }
    navigator.serviceWorker.ready.then(function(registration) {
        registration.showNotification(titre, options);
    }).catch(function() {});
}

function fermerNotificationRepos() {
    if (!notificationsDisponibles()) {
        return;
    }
    navigator.serviceWorker.getRegistration().then(function(registration) {
        if (!registration) {
            return;
        }
        registration.getNotifications({ tag: NOTIF_TAG }).then(function(liste) {
            for (let i = 0; i < liste.length; i++) {
                liste[i].close();
            }
        });
    }).catch(function() {});
}

function heureTexte(ms) {
    const d = new Date(ms);
    return pad(d.getHours()) + ":" + pad(d.getMinutes()) + ":" + pad(d.getSeconds());
}

function libelleSerie(exo, indexSerie) {
    const serie = exo.series[indexSerie];
    const kg = serie.kg !== "" ? serie.kg : "?";
    const reps = serie.reps !== "" ? serie.reps : "?";
    if (serie.echauffement) {
        return "échauffement · " + kg + " kg × " + reps;
    }
    let numero = 0;
    let total = 0;
    for (let j = 0; j < exo.series.length; j++) {
        if (!exo.series[j].echauffement) {
            total++;
            if (j <= indexSerie) {
                numero++;
            }
        }
    }
    return "série " + numero + "/" + total + " · " + kg + " kg × " + reps;
}

// Ce qu'il reste a faire apres la serie qui vient d'etre validee.
function prochaineSerieTexte(indexExo, indexSerie) {
    const exercices = seanceEnCours.exercices;
    const exo = exercices[indexExo];
    for (let k = indexSerie + 1; k < exo.series.length; k++) {
        if (!exo.series[k].fait) {
            return exo.nom + " · " + libelleSerie(exo, k);
        }
    }
    for (let e = indexExo + 1; e < exercices.length; e++) {
        for (let k = 0; k < exercices[e].series.length; k++) {
            if (!exercices[e].series[k].fait) {
                return exercices[e].nom + " · " + libelleSerie(exercices[e], k);
            }
        }
    }
    return "";
}

// Notification "repos en cours" : seulement quand l'app est en arriere-plan.
function notifierRepos() {
    if (!document.hidden || finRepos === 0) {
        return;
    }
    const restant = Math.max(0, Math.round((finRepos - Date.now()) / 1000));
    afficherNotification("Repos " + pad(Math.floor(restant / 60)) + ":" + pad(restant % 60) + " · " + notifRepos.exo, {
        body: (notifRepos.prochaine ? "Prochaine : " + notifRepos.prochaine : "Dernière série faite : termine ta séance !") + "\nFin du repos à " + heureTexte(finRepos),
        tag: NOTIF_TAG,
        silent: true,
        renotify: false,
        icon: "icon-192.png",
        badge: "icon-192.png",
        timestamp: finRepos
    });
}

function programmerFinRepos() {
    clearTimeout(minuteurFinRepos);
    if (finRepos > 0) {
        minuteurFinRepos = setTimeout(finDuRepos, Math.max(0, finRepos - Date.now()));
    }
}

// Fin du repos : vibration + son dans l'app, notification (avec vibration) si l'app est en arriere-plan.
function finDuRepos() {
    if (finRepos === 0) {
        return;
    }
    finRepos = 0;
    clearTimeout(minuteurFinRepos);
    if (navigator.vibrate) {
        navigator.vibrate([200, 100, 200, 100, 400]);
    }
    bip();
    if (document.hidden) {
        afficherNotification("Repos terminé 💪", {
            body: notifRepos.prochaine ? "C'est reparti : " + notifRepos.prochaine : "Repos terminé : termine ta séance !",
            tag: NOTIF_TAG,
            renotify: true,
            silent: false,
            vibrate: [200, 100, 200, 100, 400],
            icon: "icon-192.png",
            badge: "icon-192.png"
        });
    } else {
        fermerNotificationRepos();
    }
    majBarreRepos();
}

function renderOptionsNotifs() {
    const case_ = document.getElementById("option-notifs");
    const etatTexte = document.getElementById("notifs-etat");
    case_.checked = etat.notifRepos !== false;
    if (!notificationsDisponibles()) {
        etatTexte.textContent = "Ce navigateur ne gère pas les notifications.";
    } else if (Notification.permission === "denied") {
        etatTexte.textContent = "Bloquées dans les réglages du navigateur : autorise-les pour recevoir la fin du repos.";
    } else if (Notification.permission === "granted") {
        etatTexte.textContent = "Actives : tu reçois le détail du repos et un signal à la fin quand l'app est en arrière-plan.";
    } else {
        etatTexte.textContent = "L'autorisation te sera demandée au démarrage d'une séance.";
    }
}

function majDureeSeance() {
    if (!seanceEnCours) {
        document.getElementById("barre-repos").hidden = true;
        return;
    }
    const ecoule = Date.now() - seanceEnCours.debut;
    const totalSec = Math.floor(ecoule / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    document.getElementById("seance-duree").textContent = pad(min) + ":" + pad(sec);
    majBarreRepos();
}

function majBarreRepos() {
    const barre = document.getElementById("barre-repos");
    if (finRepos === 0 || !seanceEnCours) {
        barre.hidden = true;
        return;
    }
    const restant = Math.ceil((finRepos - Date.now()) / 1000);
    if (restant > 0) {
        barre.hidden = false;
        document.getElementById("barre-repos-temps").textContent = pad(Math.floor(restant / 60)) + ":" + pad(restant % 60);
        const part = totalRepos > 0 ? Math.min(restant / totalRepos, 1) : 0;
        document.getElementById("barre-repos-fill").style.width = (part * 100) + "%";
    } else {
        finDuRepos();
    }
}

function ajusterRepos(deltaSecondes) {
    if (finRepos === 0) {
        return;
    }
    finRepos += deltaSecondes * 1000;
    totalRepos = Math.max(totalRepos + deltaSecondes, 1);
    programmerFinRepos();
    notifierRepos();
    majBarreRepos();
}

function passerRepos() {
    finRepos = 0;
    clearTimeout(minuteurFinRepos);
    fermerNotificationRepos();
    majBarreRepos();
}

// Son de fin de repos : la vibration web n'existe pas sur iPhone.
function preparerAudio() {
    try {
        if (!contexteAudio && (window.AudioContext || window.webkitAudioContext)) {
            contexteAudio = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (contexteAudio && contexteAudio.state === "suspended") {
            contexteAudio.resume();
        }
    } catch (erreur) {
        contexteAudio = null;
    }
}

// Petit jingle de victoire (record, montee de rang, quete) + vibration.
function fanfare() {
    if (navigator.vibrate) {
        navigator.vibrate([80, 40, 80, 40, 240]);
    }
    if (!contexteAudio) {
        return;
    }
    try {
        const notes = [523.25, 659.25, 783.99, 1046.5];
        for (let i = 0; i < notes.length; i++) {
            const oscillateur = contexteAudio.createOscillator();
            const volume = contexteAudio.createGain();
            oscillateur.type = "triangle";
            oscillateur.frequency.value = notes[i];
            volume.gain.value = 0.12;
            oscillateur.connect(volume);
            volume.connect(contexteAudio.destination);
            const debut = contexteAudio.currentTime + i * 0.12;
            oscillateur.start(debut);
            oscillateur.stop(debut + 0.2);
        }
    } catch (erreur) {
    }
}

function bip() {
    if (!contexteAudio) {
        return;
    }
    try {
        for (let i = 0; i < 2; i++) {
            const oscillateur = contexteAudio.createOscillator();
            const volume = contexteAudio.createGain();
            oscillateur.frequency.value = 880;
            volume.gain.value = 0.15;
            oscillateur.connect(volume);
            volume.connect(contexteAudio.destination);
            const debut = contexteAudio.currentTime + i * 0.25;
            oscillateur.start(debut);
            oscillateur.stop(debut + 0.15);
        }
    } catch (erreur) {
    }
}

function serieValide(serie) {
    const kg = Number(serie.kg);
    const reps = Number(serie.reps);
    const kgOk = serie.kg !== "" && kg >= 0 && kg <= 600;
    const repsOk = Number.isInteger(reps) && reps >= 1 && reps <= 100;
    return kgOk && repsOk;
}

function terminerSeance() {
    if (!seanceEnCours) {
        return;
    }

    const series = [];
    let volume = 0;
    const recordsParExo = {};

    for (let i = 0; i < seanceEnCours.exercices.length; i++) {
        const exo = seanceEnCours.exercices[i];
        for (let j = 0; j < exo.series.length; j++) {
            const s = exo.series[j];
            if (s.fait && !s.echauffement) {
                if (s.pr) {
                    recordsParExo[exo.nom] = Math.max(recordsParExo[exo.nom] || 0, Number(s.kg));
                }
                series.push({
                    id: exo.id,
                    nom: exo.nom,
                    muscle: exo.muscle,
                    poids: Number(s.kg),
                    reps: Number(s.reps)
                });
                volume += Number(s.kg) * Number(s.reps);
            }
        }
    }

    if (series.length === 0) {
        informer("Valide au moins une série de travail avec ✓ avant de terminer.");
        return;
    }

    const records = [];
    for (const nom in recordsParExo) {
        records.push({ nom: nom, kg: recordsParExo[nom] });
    }

    // Montees de rang de force : rang avant la seance (historique) contre rang apres.
    const montees = [];
    let gainMontees = 0;
    const exosVus = {};
    for (let i = 0; i < seanceEnCours.exercices.length; i++) {
        const exo = seanceEnCours.exercices[i];
        if (exosVus[exo.id]) {
            continue;
        }
        exosVus[exo.id] = true;
        let rmSeance = 0;
        for (let j = 0; j < exo.series.length; j++) {
            if (exo.series[j].fait && !exo.series[j].echauffement) {
                rmSeance = Math.max(rmSeance, estimer1RM(exo.series[j].kg, exo.series[j].reps));
            }
        }
        const rmAvant = meilleur1RM(exo.id);
        const avant = rangForce(exo.id, rmAvant);
        const apres = rangForce(exo.id, Math.max(rmAvant, rmSeance));
        if (avant && apres && apres.niveau > avant.niveau) {
            montees.push({ nom: exo.nom, de: libelleRang(avant), vers: libelleRang(apres) });
            gainMontees += apres.index > avant.index ? 40 : 15;
        }
    }

    const fin = seanceEnCours.fin || Date.now();
    const duree = (fin - seanceEnCours.debut) / 60000;
    const musclesDistincts = {};
    for (let i = 0; i < series.length; i++) {
        musclesDistincts[series[i].muscle] = true;
    }
    let echauffements = 0;
    for (let i = 0; i < seanceEnCours.exercices.length; i++) {
        for (let j = 0; j < seanceEnCours.exercices[i].series.length; j++) {
            const x = seanceEnCours.exercices[i].series[j];
            if (x.echauffement && x.fait) {
                echauffements++;
            }
        }
    }
    etat.seances.push({
        date: todayStr(),
        duree: duree,
        volume: Math.round(volume),
        series: series,
        records: records.length,
        montees: montees.length,
        echauffements: echauffements,
        muscles: Object.keys(musclesDistincts).length
    });
    for (let i = 0; i < series.length; i++) {
        const s = series[i];
        etat.muscu.push({ id: s.id, nom: s.nom, poids: s.poids, reps: s.reps, muscle: s.muscle, date: todayStr() });
    }
    etat.xp += 40 + records.length * 15 + gainMontees;
    seanceEnCours = null;
    finRepos = 0;
    clearTimeout(minuteurFinRepos);
    fermerNotificationRepos();
    relacherEcran();
    sauverSeance();
    majBarreRepos();
    save();
    render();
    changerPage("muscu");
    afficherResume({ duree: duree, volume: Math.round(volume), nbSeries: series.length, records: records, montees: montees });
}

// ---------- Resume de fin de seance, partageable en image ----------
function afficherResume(donnees) {
    const rang = getRang();
    dernierResume = {
        dateTexte: new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }),
        dureeTexte: formaterDuree(donnees.duree),
        volume: donnees.volume,
        nbSeries: donnees.nbSeries,
        records: donnees.records,
        montees: donnees.montees || [],
        rang: rang.nom + " " + rang.division,
        divisionRang: rang.division,
        couleurRang: rang.couleur,
        xp: etat.xp
    };
    dessinerResume(document.getElementById("resume-canvas"), dernierResume);
    document.getElementById("resume-seance").hidden = false;
}

function dessinerResume(canvas, r) {
    const c = canvas.getContext("2d");
    const largeur = canvas.width;
    const hauteur = canvas.height;
    c.fillStyle = "#12130E";
    c.fillRect(0, 0, largeur, hauteur);
    c.strokeStyle = "#3A3D2B";
    c.lineWidth = 4;
    c.strokeRect(40, 40, largeur - 80, hauteur - 80);
    c.textAlign = "center";

    c.fillStyle = "#B9C48A";
    c.font = "bold 64px Georgia, serif";
    c.fillText("ASCENSION", largeur / 2, 190);
    c.fillStyle = "#A9A58F";
    c.font = "36px system-ui, sans-serif";
    c.fillText(r.dateTexte, largeur / 2, 250);
    c.fillStyle = "#E7E3D3";
    c.font = "bold 86px Georgia, serif";
    c.fillText("Séance terminée", largeur / 2, 420);

    const stats = [[r.dureeTexte, "durée"], [r.volume + " kg", "volume"], [String(r.nbSeries), r.nbSeries > 1 ? "séries" : "série"]];
    for (let i = 0; i < stats.length; i++) {
        const x = largeur / 2 + (i - 1) * 320;
        c.fillStyle = "#C8C58D";
        c.font = "bold 76px system-ui, sans-serif";
        c.fillText(stats[i][0], x, 640);
        c.fillStyle = "#A9A58F";
        c.font = "34px system-ui, sans-serif";
        c.fillText(stats[i][1], x, 700);
    }

    if (r.records.length > 0) {
        c.fillStyle = "#F2C744";
        c.font = "bold 46px system-ui, sans-serif";
        c.fillText("🏆 " + (r.records.length > 1 ? r.records.length + " records" : "1 record"), largeur / 2, 850);
        c.fillStyle = "#E7E3D3";
        c.font = "40px system-ui, sans-serif";
        for (let i = 0; i < Math.min(r.records.length, 3); i++) {
            let nom = r.records[i].nom;
            if (nom.length > 26) {
                nom = nom.slice(0, 25) + "…";
            }
            c.fillText(nom + " — " + r.records[i].kg + " kg", largeur / 2, 930 + i * 66);
        }
    } else {
        c.fillStyle = "#A9A58F";
        c.font = "italic 42px Georgia, serif";
        c.fillText("Une séance de plus dans le sac.", largeur / 2, 880);
    }

    if (r.montees.length > 0) {
        c.fillStyle = "#8FAE6B";
        c.font = "bold 38px system-ui, sans-serif";
        for (let i = 0; i < Math.min(r.montees.length, 2); i++) {
            let nom = r.montees[i].nom;
            if (nom.length > 18) {
                nom = nom.slice(0, 17) + "…";
            }
            c.fillText("⬆ " + nom + " : " + r.montees[i].vers, largeur / 2, 1075 + i * 56);
        }
    }

    dessinerMedaille(c, largeur / 2 - 290, 1172, 56, r.couleurRang, r.divisionRang);
    c.fillStyle = r.couleurRang;
    c.font = "bold 66px Georgia, serif";
    c.fillText(r.rang, largeur / 2 + 40, 1190);
    c.fillStyle = "#A9A58F";
    c.font = "34px system-ui, sans-serif";
    c.fillText(r.xp + " XP", largeur / 2, 1250);
}

function telechargerBlob(blob) {
    const lien = document.createElement("a");
    lien.href = URL.createObjectURL(blob);
    lien.download = "ascension-seance.png";
    document.body.appendChild(lien);
    lien.click();
    lien.remove();
    setTimeout(function() {
        URL.revokeObjectURL(lien.href);
    }, 1000);
}

function partagerResume() {
    document.getElementById("resume-canvas").toBlob(function(blob) {
        if (!blob) {
            return;
        }
        const fichier = new File([blob], "ascension-seance.png", { type: "image/png" });
        if (navigator.canShare && navigator.canShare({ files: [fichier] })) {
            navigator.share({ files: [fichier], title: "Ma séance sur Ascension" }).catch(function() {});
        } else {
            telechargerBlob(blob);
        }
    }, "image/png");
}

function telechargerResume() {
    document.getElementById("resume-canvas").toBlob(function(blob) {
        if (blob) {
            telechargerBlob(blob);
        }
    }, "image/png");
}

function sauverSeance() {
    if (seanceEnCours) {
        localStorage.setItem("seanceEnCours", JSON.stringify(seanceEnCours));
    } else {
        localStorage.removeItem("seanceEnCours");
    }
}

function seriesPrecedentes(idExo) {
    for (let i = etat.seances.length - 1; i >= 0; i--) {
        const trouvees = [];
        const series = etat.seances[i].series;
        for (let j = 0; j < series.length; j++) {
            if (series[j].id === idExo) {
                trouvees.push(series[j]);
            }
        }
        if (trouvees.length > 0) {
            return trouvees;
        }
    }
    return [];
}

async function garderEcranAllume() {
    if (!("wakeLock" in navigator) || verrouEcran) {
        return;
    }
    try {
        verrouEcran = await navigator.wakeLock.request("screen");
        verrouEcran.addEventListener("release", function() {
            verrouEcran = null;
        });
    } catch (erreur) {
        verrouEcran = null;
    }
}

function relacherEcran() {
    if (verrouEcran) {
        verrouEcran.release();
        verrouEcran = null;
    }
}

if (seanceEnCours) {
    garderEcranAllume();
    renderSeance();
    changerPage("seance");
}

document.addEventListener("visibilitychange", function() {
    if (document.visibilityState === "visible") {
        fermerNotificationRepos();
        if (seanceEnCours) {
            garderEcranAllume();
            majBarreRepos();
        }
    } else {
        notifierRepos();
    }
});


// ---------- Progression par exercice ----------
function pointsProgression(idExo) {
    const points = [];
    for (let i = 0; i < etat.seances.length; i++) {
        const series = etat.seances[i].series;
        let meilleurRM = 0;
        let maxPoids = 0;
        for (let j = 0; j < series.length; j++) {
            if (series[j].id === idExo) {
                meilleurRM = Math.max(meilleurRM, estimer1RM(series[j].poids, series[j].reps));
                maxPoids = Math.max(maxPoids, Number(series[j].poids));
            }
        }
        if (meilleurRM > 0 || maxPoids > 0) {
            points.push({ date: etat.seances[i].date, valeur: meilleurRM || maxPoids });
        }
    }
    return points;
}

function renderProgression() {
    const select = document.getElementById("prog-exo");
    const compte = {};
    const noms = {};
    for (let i = 0; i < etat.seances.length; i++) {
        const series = etat.seances[i].series;
        const vus = {};
        for (let j = 0; j < series.length; j++) {
            const id = series[j].id;
            if (id && !vus[id]) {
                vus[id] = true;
                compte[id] = (compte[id] || 0) + 1;
                noms[id] = series[j].nom;
            }
        }
    }
    const ids = Object.keys(compte).sort(function(a, b) {
        return compte[b] - compte[a];
    });
    const courant = select.value;
    select.innerHTML = "";
    for (let i = 0; i < ids.length; i++) {
        const option = document.createElement("option");
        option.value = ids[i];
        option.textContent = noms[ids[i]] + " (" + compte[ids[i]] + ")";
        select.appendChild(option);
    }
    if (ids.indexOf(courant) !== -1) {
        select.value = courant;
    }
    const graphique = document.getElementById("prog-graphique");
    const texte = document.getElementById("prog-texte");
    graphique.innerHTML = "";
    select.hidden = ids.length === 0;
    if (ids.length === 0) {
        texte.textContent = "Termine une séance pour voir ta progression.";
        return;
    }
    const points = pointsProgression(select.value);
    if (points.length < 2) {
        texte.textContent = "Il faut au moins 2 séances avec cet exercice pour tracer la courbe.";
        return;
    }
    const L = 320;
    const H = 150;
    const marge = 28;
    let min = Infinity;
    let max = -Infinity;
    for (let i = 0; i < points.length; i++) {
        min = Math.min(min, points[i].valeur);
        max = Math.max(max, points[i].valeur);
    }
    if (max === min) {
        max = min + 1;
    }
    const SVG_NS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("viewBox", "0 0 " + L + " " + (H + 22));
    svg.setAttribute("class", "prog-svg");
    const coords = [];
    for (let i = 0; i < points.length; i++) {
        const x = marge + (L - 2 * marge) * i / (points.length - 1);
        const y = 14 + (H - 28) * (1 - (points[i].valeur - min) / (max - min));
        coords.push(x.toFixed(1) + "," + y.toFixed(1));
    }
    const ligne = document.createElementNS(SVG_NS, "polyline");
    ligne.setAttribute("points", coords.join(" "));
    ligne.setAttribute("class", "prog-ligne");
    svg.appendChild(ligne);
    for (let i = 0; i < coords.length; i++) {
        const xy = coords[i].split(",");
        const point = document.createElementNS(SVG_NS, "circle");
        point.setAttribute("cx", xy[0]);
        point.setAttribute("cy", xy[1]);
        point.setAttribute("r", 4);
        point.setAttribute("class", "prog-point");
        svg.appendChild(point);
    }
    const etiquettes = [
        [marge, H + 16, courtDate(points[0].date), "start"],
        [L - marge, H + 16, courtDate(points[points.length - 1].date), "end"],
        [4, 12, String(Math.round(max)), "start"],
        [4, H - 12, String(Math.round(min)), "start"]
    ];
    for (let i = 0; i < etiquettes.length; i++) {
        const t = document.createElementNS(SVG_NS, "text");
        t.setAttribute("x", etiquettes[i][0]);
        t.setAttribute("y", etiquettes[i][1]);
        t.setAttribute("text-anchor", etiquettes[i][3]);
        t.setAttribute("class", "prog-label");
        t.textContent = etiquettes[i][2];
        svg.appendChild(t);
    }
    graphique.appendChild(svg);
    const gain = Math.round((points[points.length - 1].valeur - points[0].valeur) * 10) / 10;
    texte.textContent = "1RM estimé : " + Math.round(points[points.length - 1].valeur * 10) / 10 + " kg (" + (gain >= 0 ? "+" : "") + gain + " kg depuis le " + formaterDate(points[0].date) + ").";
}

function renderSeances() {
    const liste = document.getElementById("seances-historique");
    liste.innerHTML = "";
    let affichees = 0;
    for (let i = etat.seances.length - 1; i >= 0; i--) {
        if (!historiqueComplet && affichees >= 5) {
            break;
        }
        affichees++;
        const s = etat.seances[i];
        const li = document.createElement("li");
        li.className = "seance-histo";
        const texte = document.createElement("span");
        texte.textContent = formaterDate(s.date) + " — " + formaterDuree(s.duree) + " — " + s.volume + " kg — " + s.series.length + (s.series.length > 1 ? " séries" : " série");
        const refaire = document.createElement("button");
        refaire.className = "btn-tertiaire";
        refaire.textContent = "Refaire";
        refaire.addEventListener("click", function() {
            refaireSeance(i);
        });
        li.appendChild(texte);
        li.appendChild(refaire);
        liste.appendChild(li);
    }
    const voirTout = document.getElementById("btn-histo-voir-tout");
    renderProgression();
    voirTout.hidden = etat.seances.length <= 5;
    voirTout.textContent = historiqueComplet ? "Voir moins" : "Voir tout (" + etat.seances.length + ")";
}

function rappelHydratation() {
    const el = document.getElementById("rappel-hydra");
    let total = 0;
    for (let i = 0; i < etat.hydratation.prises.length; i++) {
        total += etat.hydratation.prises[i].ml;
    }
    if (total < etat.hydratation.objectif / 2) {
        el.textContent = "💧 Tu es en retard sur ton hydratation — pense à boire !";
    } else {
        el.textContent = "";
    }
}

function renderModules() {
    const conteneur = document.getElementById("modules-progression");
    conteneur.innerHTML = "";

    let eauTotal = 0;
    for (let i = 0; i < etat.hydratation.prises.length; i++) {
        eauTotal += etat.hydratation.prises[i].ml;
    }
    const modules = [{ nom: "Muscu", pct: etat.seances.length / 5 * 100 }];
    if (MODULES_ACTIFS.course) {
        modules.push({ nom: "Course", pct: etat.course.length / 3 * 100 });
    }
    modules.push({ nom: "Hydratation", pct: eauTotal / etat.hydratation.objectif * 100 });

    const RAYON = 42;
    const CIRCONFERENCE = 2 * Math.PI * RAYON;
    const SVG_NS = "http://www.w3.org/2000/svg";

    for (let i = 0; i < modules.length; i++) {
        const pct = Math.max(0, Math.min(100, modules[i].pct));

        const bloc = document.createElement("div");
        bloc.className = "anneau";

        const cadran = document.createElement("div");
        cadran.className = "anneau-cadran";

        const svg = document.createElementNS(SVG_NS, "svg");
        svg.setAttribute("viewBox", "0 0 100 100");

        const fond = document.createElementNS(SVG_NS, "circle");
        fond.setAttribute("class", "anneau-fond");
        fond.setAttribute("cx", "50");
        fond.setAttribute("cy", "50");
        fond.setAttribute("r", RAYON);

        const jauge = document.createElementNS(SVG_NS, "circle");
        jauge.setAttribute("class", "anneau-jauge");
        jauge.setAttribute("cx", "50");
        jauge.setAttribute("cy", "50");
        jauge.setAttribute("r", RAYON);
        jauge.setAttribute("stroke-dasharray", CIRCONFERENCE);
        jauge.setAttribute("stroke-dashoffset", CIRCONFERENCE * (1 - pct / 100));

        svg.appendChild(fond);
        svg.appendChild(jauge);

        const valeur = document.createElement("span");
        valeur.className = "anneau-pct";
        valeur.textContent = Math.round(pct) + "%";

        cadran.appendChild(svg);
        cadran.appendChild(valeur);

        const nom = document.createElement("span");
        nom.className = "anneau-nom";
        nom.textContent = modules[i].nom;

        bloc.appendChild(cadran);
        bloc.appendChild(nom);
        conteneur.appendChild(bloc);
    }
}

function renderCalendrierModules() {
    const conteneur = document.getElementById("calendrier-modules");
    conteneur.innerHTML = "";
    const modules = [{ nom: "Muscu", data: etat.muscu, couleur: "#8C8B5E" }];
    if (MODULES_ACTIFS.course) {
        modules.push({ nom: "Course", data: etat.course, couleur: "#8C8B5E" });
    }
    for (let m = 0; m < modules.length; m++) {
        const mod = modules[m];
        const rangee = document.createElement("div");
        rangee.className = "cal-rangee";
        const label = document.createElement("span");
        label.className = "cal-label";
        label.textContent = mod.nom;
        rangee.appendChild(label);
        for (let i = 13; i >= 0; i--) {
            const jour = addDays(todayStr(), -i);
            const point = document.createElement("div");
            point.className = "cal-point";
            let actif = false;
            for (let j = 0; j < mod.data.length; j++) {
                if (mod.data[j].date === jour) {
                    actif = true;
                }
            }
            if (actif) {
                point.style.backgroundColor = mod.couleur;
            }
            rangee.appendChild(point);
        }
        conteneur.appendChild(rangee);
    }
}

function traiterPosition(position) {
    if (position.coords.accuracy > 35) {
        return;
    }
    const lat = position.coords.latitude;
    const lon = position.coords.longitude;
    if (dernierePosition) {
        distanceCourse += distanceKm(dernierePosition.lat, dernierePosition.lon, lat, lon);
    }
    dernierePosition = { lat: lat, lon: lon }
    document.getElementById("course-distance").textContent = "Distance : " + distanceCourse.toFixed(2) + " km";
    pointsTrace.push([lat, lon]);

    if (ligneTrace) {
        ligneTrace.setLatLngs(pointsTrace);
    } else {
        ligneTrace = L.polyline(pointsTrace, { color: "#5DBEBE", weight: 5 }).addTo(carte);
    }

    if (marqueur) {
        marqueur.setLatLng([lat, lon]);
    } else {
        marqueur = L.circleMarker([lat, lon], { radius: 8, color: "#ffffff", fillColor: "#5DBEBE", fillOpacity: 1 }).addTo(carte);
    }

    if (pointsTrace.length === 1) {
        carte.setView([lat, lon], 16);
    } else {
        carte.panTo([lat, lon]);
    }
}

function renderNutrition() {
    const repasJour = etat.nutrition.repas.filter(function (r) { return r.date === todayStr(); });
    let kcal = 0, prot = 0, gluc = 0, lip = 0;
    for (let i = 0; i < repasJour.length; i++) {
        kcal += repasJour[i].kcal;
        prot += repasJour[i].prot;
        gluc += repasJour[i].gluc;
        lip += repasJour[i].lip;
    }
    const objectif = etat.nutrition.objectif;
    const restant = Math.max(0, objectif - kcal);
    document.getElementById("nutri-calories").textContent = Math.round(kcal) + " / " + objectif + " kcal — reste " + Math.round(restant);
    document.getElementById("nutri-fill").style.width = Math.min(100, kcal / objectif * 100) + "%";
    document.getElementById("nutri-macros").textContent = "P " + Math.round(prot) + "g · G " + Math.round(gluc) + "g · L " + Math.round(lip) + "g";
    const liste = document.getElementById("nutri-repas");
    liste.innerHTML = "";
    if (repasJour.length === 0) {
        liste.innerHTML = "<li>Aucun repas aujourd'hui. Ajoute ton premier plat !</li>";
        return;
    }
    for (let i = 0; i < repasJour.length; i++) {
        const li = document.createElement("li");
        li.textContent = repasJour[i].nom + " — " + Math.round(repasJour[i].kcal) + " kcal";
        liste.appendChild(li);
    }
}

function chercherAliment() {
    const terme = document.getElementById("nutri-input").value;
    if (!terme) return;
    const url = "/.netlify/functions/food?q=" + encodeURIComponent(terme);
    document.getElementById("nutri-resultats").innerHTML = "<li>Recherche...</li>";
    fetch(url)
        .then(function (reponse) { return reponse.json(); })
        .then(function (data) { afficherResultats(data.products); })
        .catch(function (err) {
            document.getElementById("nutri-resultats").innerHTML = "<li>Erreur : " + err.message + "</li>";
            console.log("Erreur nutrition :", err);
        });
}

function afficherResultats(produits) {
    const liste = document.getElementById("nutri-resultats");
    liste.innerHTML = "";
    for (let i = 0; i < produits.length; i++) {
        const p = produits[i];
        const n = p.nutriments || {};
        const kcal = n["energy-kcal_100g"];
        if (!p.product_name || kcal === undefined) { continue; }
        const li = document.createElement("li");
        li.textContent = p.product_name + " — " + Math.round(kcal) + " kcal/100g";
        li.style.cursor = "pointer";
        li.addEventListener("click", function () {
            ajouterRepas(p.product_name, kcal, n.proteins_100g || 0, n.carbohydrates_100g || 0, n.fat_100g || 0);
        });
        liste.appendChild(li);
    }
    if (liste.innerHTML === "") { liste.innerHTML = "<li>Aucun résultat exploitable</li>"; }
}

function ajouterRepas(nom, kcal100, prot100, gluc100, lip100) {
    demanderNombre("Combien de grammes de " + nom + " ?", 100).then(function(grammes) {
        if (!(grammes > 0)) {
            return;
        }
        const facteur = grammes / 100;
        etat.nutrition.repas.push({
            nom: nom,
            kcal: kcal100 * facteur,
            prot: prot100 * facteur,
            gluc: gluc100 * facteur,
            lip: lip100 * facteur,
            date: todayStr()
        });
        document.getElementById("nutri-resultats").innerHTML = "";
        document.getElementById("nutri-input").value = "";
        render();
        save();
    });
}

if (seanceEnCours) {
    renderSeance();
    changerPage("seance");
}
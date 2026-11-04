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
let reposExos = JSON.parse(localStorage.getItem("reposExos")) || {};
let exosRecents = JSON.parse(localStorage.getItem("exosRecents")) || [];
let exosPerso = JSON.parse(localStorage.getItem("exosPerso")) || [];
for (let i = 0; i < exosPerso.length; i++) {
    EXERCICES.push(exosPerso[i]);
}
let filtresSelecteur = { muscle: null, materiel: null };
let modeCarte = "volume";
const FOURCHETTE_REPS = { min: 8, max: 12 };
const NB_SERIES_PROGRAMME = 3;

const COULEURS_CARTE = { rouge: "#BF6F58", ambre: "#D9A25A", vert: "#8E9A62", terne: "#4A5035" };

const LEGENDES_CARTE = {
    volume: [["#3A3B2E", "Non travaillé"], ["#A67C52", "Bronze"], ["#B0B0B0", "Argent"], ["#F2C744", "Or"], ["#5DBEBE", "Platine"], ["#A78BFA", "Diamant"]],
    recup: [["#3A3B2E", "Jamais travaillé"], [COULEURS_CARTE.rouge, "Travaillé il y a 0-1 j : en récup"], [COULEURS_CARTE.ambre, "2 j : presque prêt"], [COULEURS_CARTE.vert, "3 j et plus : prêt"]],
    delaisse: [["#3A3B2E", "Jamais travaillé"], [COULEURS_CARTE.rouge, "7 j et plus : délaissé"], [COULEURS_CARTE.ambre, "4 à 6 j"], [COULEURS_CARTE.terne, "Récent"]]
};

// Programme "Force & Esthetique" : un groupe par seance, 5 exercices max.
// jour : 1 = lundi ... 5 = vendredi (comme Date.getDay()). Modifiable ici.
const PROGRAMMES = [
    { nom: "Jambes", jour: 1, exercices: ["hack-squat", "bulgarian-squat", "leg-extension", "leg-curl-assis", "mollets-debout"] },
    { nom: "Dos", jour: 2, exercices: ["tractions-assistees", "pulldown-serre", "rowing-cable", "rowing-haltere", "face-pull"] },
    { nom: "Pecs + triceps", jour: 3, exercices: ["developpe-incline", "chest-press", "pec-fly", "pushdown", "extension-nuque"] },
    { nom: "Épaules + bras", jour: 5, exercices: ["developpe-epaules", "elevations-lat", "rear-delt", "curl-ez", "curl-marteau"] }
];




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

function exporterDonnees() {
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
}

function save() {
    localStorage.setItem("etat", JSON.stringify(etat));

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
document.getElementById("btn-full-session").addEventListener("click", markFullSession);
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
document.getElementById("btn-toggle-vue").addEventListener("click", toggleVue);
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
const boutonsVue = document.querySelectorAll(".vue-muscle");

for (let i = 0; i < boutonsVue.length; i++) {
    boutonsVue[i].addEventListener("click", function () {
        changerVueMuscle(boutonsVue[i].dataset.vue);
    });
}
genererQueteDuJour();
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
    }
    etat.dernierRang = rangActuel;
    const stageAvatar = nomsRangs.indexOf(rang.nom);
    const dejaFait = (etat.history[hoy] && etat.history[hoy].presence) || seanceEnCours;
    document.getElementById("lock-screen").hidden = dejaFait;
    document.getElementById("dashboard").hidden = !dejaFait;
    const prochain = xpProchainStade();
    if (prochain) {
        document.getElementById("avatar-next").textContent = "Encore : " + prochain.xp + " XP avant " + prochain.nom;
    } else {
        document.getElementById("avatar-next").textContent = "Stade maximal atteint";
    }
    document.getElementById("level-badge").textContent = rang.nom + " " + rang.division;
    document.getElementById("level-badge").style.color = rang.couleur;
    document.getElementById("quote").textContent = citationsAleatoire();
    document.getElementById("xp-fill").style.width = rang.pourcentage + "%";
    document.getElementById("xp-fill").style.backgroundColor = rang.couleur;
    document.getElementById("avatar").innerHTML = '<img src="avatar-pixel-' + stageAvatar + '.png" alt="avatar">'; document.getElementById("fiche-classe").textContent = "Classe : " + calculerClasse();
    document.getElementById("fiche-titre").textContent = "Titre : " + calculerTitre();
    document.getElementById("message-coach").textContent = messageCoach();
    renderCourse();
    renderMuscu();
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

function markFullSession() {
    const hoy = todayStr();
    if (!etat.history[hoy]) {
        etat.history[hoy] = { presence: true };
    }
    if (etat.history[hoy].full) {
        return;
    }
    etat.history[hoy].full = true;
    etat.xp += 25;
    render();
    save();
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

function terminerCourse() {
    navigator.geolocation.clearWatch(suiviId);
    clearInterval(intervalId);
    const dureeMinutes = (Date.now() - debutCourse) / 1000 / 60;
    etat.course.push({
        distance: distanceCourse,
        duree: dureeMinutes,
        date: todayStr(),
        allure: distanceCourse > 0 ? dureeMinutes / distanceCourse : 0,
        trace: pointsTrace.slice()
    });
    let bonusXp = distanceCourse * 10;
    if (bonusXp > 80) {
        bonusXp = 80;
    }
    if (bonusXp < 15) {
        bonusXp = 15;
    }
    etat.xp += bonusXp;
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
    document.getElementById("detail-rang").textContent = rang.nom + " " + rang.division;
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

function genererQueteDuJour() {
    if (etat.quete && etat.quete.date === todayStr()) {
        return;
    }
    let penalite = false;
    if (etat.quete && !etat.quete.faite) {
        penalite = true;
    }
    const cible = penalite ? 150 : 100;
    etat.quete = {
        date: todayStr(),
        penalite: penalite,
        objectifs: [
            { nom: "Pompes", cible: cible, actuel: 0 },
            { nom: "Abdos", cible: cible, actuel: 0 },
            { nom: "Squats", cible: cible, actuel: 0 }
        ]
    };
    save();
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
        label.textContent = obj.nom + " " + obj.actuel + " / " + obj.cible;

        const barre = document.createElement("div");
        barre.className = "quete-barre";
        const remplissage = document.createElement("div");
        remplissage.className = "quete-fill";
        remplissage.style.width = (obj.actuel / obj.cible * 100) + "%";
        barre.appendChild(remplissage);

        const bouton = document.createElement("button");
        bouton.className = "quete-plus";
        bouton.textContent = "+10";
        bouton.addEventListener("click", function () {
            incrementerObjectif(i);
        });

        ligne.appendChild(label);
        ligne.appendChild(barre);
        ligne.appendChild(bouton);
        liste.appendChild(ligne);
    }
    if (etat.quete.faite) {
        document.getElementById("streak-alerte").textContent = "";
    } else {
        document.getElementById("streak-alerte").textContent = "Quête du jour en cours — ton streak compte sur toi.";
    }
}

function incrementerObjectif(i) {
    etat.quete.objectifs[i].actuel += 10;
    if (etat.quete.objectifs[i].actuel > etat.quete.objectifs[i].cible) {
        etat.quete.objectifs[i].actuel = etat.quete.objectifs[i].cible;
    }
    save();
    renderQuete();
    verifierQueteComplete();
}

function verifierQueteComplete() {
    if (etat.quete.faite) {
        return;
    }
    for (let i = 0; i < etat.quete.objectifs.length; i++) {
        if (etat.quete.objectifs[i].actuel < etat.quete.objectifs[i].cible) {
            return;

        }

    }
    etat.quete.faite = true;
    etat.xp += 30;
    celebrer("Quête du jour complétée ! +30xp");
    render();
    save();
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
    renderHydratation();
}

function setPoids() {
    etat.poids = Number(document.getElementById("input-poids-perso").value);
    etat.hydratation.objectif = Math.round(etat.poids * 33);
    save();
    render();
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
    // La derniere serie de cette seance prime sur celle de la seance d'avant.
    let modele = null;
    if (exo.series.length > 0) {
        modele = exo.series[exo.series.length - 1];
    } else {
        modele = seriesPrecedentes(exo.id)[0];
    }

    return {
        kg: modele ? String(modele.poids !== undefined ? modele.poids : modele.kg) : "",
        reps: modele ? String(modele.reps) : "",
        fait: false
    };
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

// Double progression : meme charge jusqu'au haut de la fourchette sur toutes
// les series lourdes, puis on monte. Renvoie null s'il n'y a pas d'historique.
function suggestionCharge(idExo) {
    const precedentes = seriesPrecedentes(idExo);
    if (precedentes.length === 0) {
        return null;
    }
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
    if (repsMin >= FOURCHETTE_REPS.max) {
        return { poids: poids + pas, reps: FOURCHETTE_REPS.min, raison: "Toutes tes séries à " + repsMin + " reps à " + poids + " kg : on monte de " + pas + " kg" };
    }
    const cible = Math.min(repsMin + 1, FOURCHETTE_REPS.max);
    return { poids: poids, reps: cible, raison: "Même charge : vise " + cible + " reps (tu as fait " + repsMin + " au pire)" };
}

function appliquerSuggestion(indexExo, suggestion) {
    const exo = seanceEnCours.exercices[indexExo];
    if (exo.series.length === 0) {
        exo.series.push({ kg: "", reps: "", fait: false });
    }
    for (let i = 0; i < exo.series.length; i++) {
        if (!exo.series[i].fait) {
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
function prochainProgramme() {
    const aujourdhui = new Date().getDay();
    const dejaFaitAujourdhui = etat.seances.some(function(s) { return s.date === todayStr(); });
    for (let decalage = dejaFaitAujourdhui ? 1 : 0; decalage < 8; decalage++) {
        const jour = (aujourdhui + decalage) % 7;
        for (let i = 0; i < PROGRAMMES.length; i++) {
            if (PROGRAMMES[i].jour === jour) {
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
    const programme = PROGRAMMES[index];
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
    renderSeance();
    changerPage("seance");
}

function refaireSeance(index) {
    if (seanceEnCours) {
        alert("Termine ou abandonne ta séance en cours avant d'en refaire une.");
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
        alert("Cette séance n'a pas de détail à refaire.");
        return;
    }
    seanceEnCours = { debut: Date.now(), exercices: exercices };
    sauverSeance();
    garderEcranAllume();
    renderSeance();
    changerPage("seance");
}

function renderProchaineSeance() {
    const proposition = prochainProgramme();
    const programme = PROGRAMMES[proposition.index];
    const jours = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
    const quand = proposition.aujourdhui ? "Aujourd'hui" : "Prochaine : " + jours[programme.jour];
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
            for (let k = 0; k < PROGRAMMES.length; k++) {
                const puce = document.createElement("button");
                puce.className = "filtre-puce" + (k === proposition.index ? " actif" : "");
                puce.textContent = PROGRAMMES[k].nom;
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
    if (!confirm("Supprimer la série " + (indexSerie + 1) + " ?")) {
        return;
    }
    seanceEnCours.exercices[indexExo].series.splice(indexSerie, 1);
    renderSeance();
}

function supprimerExercice(indexExo) {
    const exo = seanceEnCours.exercices[indexExo];
    if (!confirm("Retirer " + exo.nom + " de la séance ?")) {
        return;
    }
    seanceEnCours.exercices.splice(indexExo, 1);
    renderSeance();
}

function abandonnerSeance() {
    seanceEnCours = null;
    finRepos = 0;
    relacherEcran();
    sauverSeance();
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

    for (let i = 0; i < seanceEnCours.exercices.length; i++) {
        const exo = seanceEnCours.exercices[i];

        const bloc = document.createElement("li");
        bloc.className = "seance-exo";

        const tete = document.createElement("div");
        tete.className = "seance-exo-tete";

        const titre = document.createElement("div");
        titre.className = "seance-exo-nom";
        titre.textContent = exo.nom;

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

        const suggestion = suggestionCharge(exo.id);
        if (suggestion) {
            const aide = document.createElement("div");
            aide.className = "seance-exo-aide";
            const texte = document.createElement("span");
            const rm = meilleur1RM(exo.id);
            texte.textContent = "💡 " + suggestion.poids + " kg × " + suggestion.reps + " · " + suggestion.raison + (rm ? " · 1RM ≈ " + rm + " kg" : "");
            const appliquer = document.createElement("button");
            appliquer.className = "btn-tertiaire";
            appliquer.textContent = "Appliquer";
            appliquer.addEventListener("click", function() {
                appliquerSuggestion(i, suggestion);
            });
            aide.appendChild(texte);
            aide.appendChild(appliquer);
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

        for (let j = 0; j < exo.series.length; j++) {
            const serie = exo.series[j];
            if (serie.fait) {
                volume += Number(serie.kg) * Number(serie.reps);
                nbSeries++;
            }

            const ligne = document.createElement("div");
            ligne.className = "serie-ligne";

            const numero = document.createElement("button");
            numero.className = "serie-num";
            numero.textContent = j + 1;
            numero.setAttribute("aria-label", "Supprimer la série " + (j + 1));
            numero.addEventListener("click", function() {
                supprimerSerie(i, j);
            });

            const precedent = document.createElement("span");
            precedent.className = "serie-precedent";
            const avant = precedentes[j];
precedent.textContent = avant ? avant.poids + "×" + avant.reps : "–";

            const champKg = document.createElement("input");
            champKg.type = "number";
            champKg.inputMode = "decimal";
            champKg.value = serie.kg;
            champKg.addEventListener("input", function() {
                serie.kg = champKg.value;
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
                    // Les series suivantes que Kylian n'a pas encore modifiees reprennent kg x reps.
                    for (let k = j + 1; k < exo.series.length; k++) {
                        if (!exo.series[k].fait && !exo.series[k].touche) {
                            exo.series[k].kg = serie.kg;
                            exo.series[k].reps = serie.reps;
                        }
                    }
                    seanceEnCours.fin = Date.now();
                    finRepos = Date.now() + reposPour(exo.id) * 1000;

                    let record = meilleurPoids(exo.id);
                    for (let k = 0; k < exo.series.length; k++) {
                        const autre = exo.series[k];
                        if (autre !== serie && autre.fait && Number(autre.kg) > record) {
                            record = Number(autre.kg);
                        }
                    }
                    if (record > 0 && Number(serie.kg) > record) {
                        serie.pr = true;
                        celebrer("🏆 Record ! " + exo.nom + " : " + serie.kg + " kg");
                    }
                } else {
                    finRepos = 0;
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
}

function majDureeSeance() {
    if (!seanceEnCours) {
        return;
    }
    const ecoule = Date.now() - seanceEnCours.debut;
    const totalSec = Math.floor(ecoule / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    document.getElementById("seance-duree").textContent = pad(min) + ":" + pad(sec);

    const zoneRepos = document.getElementById("seance-repos");
    if (finRepos === 0) {
        zoneRepos.textContent = "";
        return;
    }
    const restant = Math.ceil((finRepos - Date.now()) / 1000);
    if (restant > 0) {
        zoneRepos.textContent = "Repos " + pad(Math.floor(restant / 60)) + ":" + pad(restant % 60);
    } else {
        zoneRepos.textContent = "";
        finRepos = 0;
        if (navigator.vibrate) {
            navigator.vibrate([200, 100, 200]);
        }
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
    let nbRecords = 0;

    for (let i = 0; i < seanceEnCours.exercices.length; i++) {
        const exo = seanceEnCours.exercices[i];
        for (let j = 0; j < exo.series.length; j++) {
            const s = exo.series[j];
            if (s.fait) {
                if (s.pr) {
                    nbRecords++;
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
        alert("Valide au moins une série avec ✓ avant de terminer.");
        return;
    }

    const fin = seanceEnCours.fin || Date.now();
    const duree = (fin - seanceEnCours.debut) / 60000;
    etat.seances.push({
        date: todayStr(),
        duree: duree,
        volume: Math.round(volume),
        series: series
    });
    for (let i = 0; i < series.length; i++) {
        const s = series[i];
        etat.muscu.push({ id: s.id, nom: s.nom, poids: s.poids, reps: s.reps, muscle: s.muscle, date: todayStr() });
    }
    etat.xp += 40 + nbRecords * 15;
    seanceEnCours = null;
    finRepos = 0;
    relacherEcran();
    sauverSeance();
    save();
    render();
    changerPage("muscu");
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
    if (document.visibilityState === "visible" && seanceEnCours) {
        garderEcranAllume();
    }
});


function renderSeances() {
    const liste = document.getElementById("seances-historique");
    liste.innerHTML = "";
    for (let i = etat.seances.length - 1; i >= 0; i--) {
        const s = etat.seances[i];
        const li = document.createElement("li");
        li.className = "seance-histo";
        const texte = document.createElement("span");
        texte.textContent = s.date + " — " + formaterDuree(s.duree) + " — " + s.volume + " kg — " + s.series.length + " séries";
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
}

function toggleVue() {
    const acceuil = document.getElementById("page-accueil");
    acceuil.classList.toggle("mode-liste");
    const btn = document.getElementById("btn-toggle-vue");
    if (acceuil.classList.contains("mode-liste")) {
        btn.textContent = "Vue jeu";
    } else {
        btn.textContent = "Vue simple";
    }
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
    const modules = [
        { nom: "Muscu", pct: etat.seances.length / 5 * 100 },
        { nom: "Course", pct: etat.course.length / 3 * 100 },
        { nom: "Hydratation", pct: eauTotal / etat.hydratation.objectif * 100 }
    ];

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
    const modules = [
        { nom: "Muscu", data: etat.muscu, couleur: "#8C8B5E" },
        { nom: "Course", data: etat.course, couleur: "#8C8B5E" }
    ];
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
    const grammes = parseFloat(prompt("Combien de grammes ?", "100"));
    if (!grammes) { return; }
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
}

if (seanceEnCours) {
    renderSeance();
    changerPage("seance");
}
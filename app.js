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
let seanceEnCours = JSON.parse(localStorage.getItem("seanceEnCours")) || null;
let finRepos = 0;
const DUREES_REPOS = [60, 90, 120, 180];
let dureeRepos = Number(localStorage.getItem("dureeRepos")) || 90;




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
if (!etat.mobilite) etat.mobilite = [];
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
document.getElementById("btn-mesurer-mobilite").addEventListener("click", mesurerMobilite);
document.getElementById("btn-demarrer-seance").addEventListener("click", demarrerSeance);
document.getElementById("btn-abandonner-seance").addEventListener("click", abandonnerSeance);
document.getElementById("btn-ajouter-exo").addEventListener("click", ouvrirSelecteur);
document.getElementById("btn-fermer-selecteur").addEventListener("click", fermerSelecteur);
document.getElementById("btn-terminer-seance").addEventListener("click", terminerSeance);
document.getElementById("btn-toggle-vue").addEventListener("click", toggleVue);
document.getElementById("btn-nutri-chercher").addEventListener("click", chercherAliment);
document.getElementById("btn-echauffement").addEventListener("click", function () {
    afficherRoutine("echauffement");
});
document.getElementById("btn-etirement").addEventListener("click", function () {
    afficherRoutine("etirement");
});
document.getElementById("btn-header-profil").addEventListener("click", function () {
    changerPage("profil");
});
document.getElementById("btn-retour-profil").addEventListener("click", function () {
    changerPage("accueil");
});
const boutonsVue = document.querySelectorAll(".vue-muscle");

for (let i = 0; i < boutonsVue.length; i++) {
    boutonsVue[i].addEventListener("click", function () {
        changerVueMuscle(boutonsVue[i].dataset.vue);
    });
}
const boutonsNote = document.querySelectorAll(".btn-note");
for (let i = 0; i < boutonsNote.length; i++) {
    boutonsNote[i].addEventListener("click", function () {
        const freres = boutonsNote[i].parentElement.querySelectorAll(".btn-note");
        for (let j = 0; j < freres.length; j++) {
            freres[j].classList.remove("actif");
        }
        boutonsNote[i].classList.add("actif");
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
    const dejaFait = etat.history[hoy] && etat.history[hoy].presence;
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
    renderMobilite();
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

function colorerMuscles() {
    const zones = document.querySelectorAll("[data-muscle]");
    for (let i = 0; i < zones.length; i++) {
        const nom = zones[i].dataset.muscle;
        const volume = volumeMuscle(nom);
        if (volume === 0) {
            zones[i].style.fill = "";
        } else {
            zones[i].style.fill = rangMuscle(nom).couleur;
        }
    }
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
        document.getElementById("quete-penalite").textContent = "⚔️ Quête de rachat — tu as raté hier, objectifs renforcés !";
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
        document.getElementById("streak-alerte").textContent = "⚠️ Quête non terminée — streak en danger !";
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

function mesurerMobilite() {
    const s = noteSelectionnee("sel-souplesse");
    const sq = noteSelectionnee("sel-squat");
    const ep = noteSelectionnee("sel-epaules");
    const score = Math.round((s + sq + ep) / 15 * 100);
    etat.mobilite.push({ date: todayStr(), score: score });
    save();
    renderMobilite();
}

function renderMobilite() {
    if (etat.mobilite.length === 0) {
        document.getElementById("mob-score").textContent = "Fais ton premier test pour établir ton score.";
        return;
    }
    const dernier = etat.mobilite[etat.mobilite.length - 1];
    document.getElementById("mob-score").textContent = "Score de mobilité : " + dernier.score + " / 100";
    const graph = document.getElementById("mob-graphique");
    graph.innerHTML = "";
    for (let i = 0; i < etat.mobilite.length; i++) {
        const barre = document.createElement("div");
        barre.className = "mob-barre";
        barre.style.height = etat.mobilite[i].score + "%";
        barre.textContent = etat.mobilite[i].score;
        barre.title = etat.mobilite[i].date + " : " + etat.mobilite[i].score;
        graph.appendChild(barre);
    }
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

function noteSelectionnee(idSelecteur) {
    const actif = document.querySelector("#" + idSelecteur + " .btn-note.actif");
    if (actif) {
        return Number(actif.dataset.note);
    }
    return 0;
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

function renderSelecteur() {
    const liste = document.getElementById("selecteur-liste");
    liste.innerHTML = "";

    const favoris = EXERCICES.filter(function(e){ return e.favori; });
    const autres = EXERCICES.filter(function(e){return !e.favori; });

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

function ouvrirSelecteur(){
    document.getElementById("selecteur-recherche").value ="";
    renderSelecteur();
    document.getElementById("selecteur-exercice").hidden = false;
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
    changerPage("seance");
}

function choisirExercice(ex) {
    seanceEnCours.exercices.push({
        id: ex.id,
        nom: ex.nom,
        muscle: ex.muscle,
        series: []
    });
    fermerSelecteur();
    renderSeance();
}

function ajouterSerieExo(indexExo) {
    seanceEnCours.exercices[indexExo].series.push({
        kg: "",
        reps: "",
        fait: false
    });
    renderSeance();
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

function changerDureeRepos() {
    const position = DUREES_REPOS.indexOf(dureeRepos);
    dureeRepos = DUREES_REPOS[(position + 1) % DUREES_REPOS.length];
    localStorage.setItem("dureeRepos", dureeRepos);
    renderSeance();
}

function abandonnerSeance() {
    seanceEnCours = null;
    finRepos = 0;
    sauverSeance();
    changerPage("muscu");
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

        tete.appendChild(titre);
        tete.appendChild(btnSuppr);
        bloc.appendChild(tete);

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
            precedent.textContent = "–";

            const champKg = document.createElement("input");
            champKg.type = "number";
            champKg.inputMode = "decimal";
            champKg.value = serie.kg;
            champKg.addEventListener("input", function() {
                serie.kg = champKg.value;
                sauverSeance();
            });

            const champReps = document.createElement("input");
            champReps.type = "number";
            champReps.inputMode = "numeric";
            champReps.value = serie.reps;
            champReps.addEventListener("input", function() {
                serie.reps = champReps.value;
                sauverSeance();
            });

            const valider = document.createElement("button");
            valider.className = "serie-valider";
            valider.textContent = "✓";
            if (serie.fait) {
                ligne.classList.add("fait");
            }
            valider.addEventListener("click", function() {
                serie.fait = !serie.fait;
                if (serie.fait) {
                    finRepos = Date.now() + dureeRepos * 1000;
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
    document.getElementById("seance-volume").textContent = volume + " kg";
    document.getElementById("seance-series").textContent = nbSeries + (nbSeries > 1 ? " séries" : " série");
    document.getElementById("btn-duree-repos").textContent = "⏱ " + dureeRepos + " s";
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

function terminerSeance() {
    if (!seanceEnCours) {
        return;
    }

    const series = [];
    let volume = 0;

    for (let i = 0; i < seanceEnCours.exercices.length; i++) {
        const exo = seanceEnCours.exercices[i];
        for (let j = 0; j < exo.series.length; j++) {
            const s = exo.series[j];
            if (s.fait) {
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

    const duree = (Date.now() - seanceEnCours.debut) / 60000;
    etat.seances.push({
        date: todayStr(),
        duree: duree,
        volume: volume,
        series: series
    });
    for (let i = 0; i < series.length; i++) {
        const s = series[i];
        etat.muscu.push({ id: s.id, nom: s.nom, poids: s.poids, reps: s.reps, muscle: s.muscle, date: todayStr() });
    }
    etat.xp += 40;
    seanceEnCours = null;
    finRepos = 0;
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

document.getElementById("btn-duree-repos").addEventListener("click", changerDureeRepos);


function renderSeances() {
    const liste = document.getElementById("seances-historique");
    liste.innerHTML = "";
    for (let i = 0; i < etat.seances.length; i++) {
        const s = etat.seances[i];
        const li = document.createElement("li");
        li.textContent = s.date + " — " + formaterDuree(s.duree) + " — " + s.volume + " kg — " + s.series.length + " séries";
        liste.appendChild(li);
    }
}

const routinesMobilite = {
    echauffement: ["Rotations d'épaules — 30s", "Balancers de jambes — 30s", "Squats au poids du corps — 10 reps", "Cercles de hanches — 30s"],
    etirement: ["Étirement ischios — 30s", "Étirement quadriceps — 30s/jambe", "Étirement épaules — 30s", "Chat-vache — 1 min"]
};

function afficherRoutine(type) {
    const liste = document.getElementById("routine-liste");
    liste.innerHTML = "";
    const routine = routinesMobilite[type];
    for (let i = 0; i < routine.length; i++) {
        const li = document.createElement("li");
        li.textContent = routine[i];
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
    let mobScore = 0;
    if (etat.mobilite.length > 0) {
        mobScore = etat.mobilite[etat.mobilite.length - 1].score;
    }

    const modules = [
        { nom: "Muscu", pct: etat.seances.length / 5 * 100 },
        { nom: "Course", pct: etat.course.length / 3 * 100 },
        { nom: "Hydratation", pct: eauTotal / etat.hydratation.objectif * 100 },
        { nom: "Mobilité", pct: mobScore }
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
        { nom: "Course", data: etat.course, couleur: "#8C8B5E" },
        { nom: "Mobilité", data: etat.mobilite, couleur: "#8C8B5E" }
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
// Ascension — catalogue d'exercices
//
// Chaque entree :
//   id       : identifiant stable. C'est LUI qui sert de cle, jamais le nom.
//              Il ne doit JAMAIS changer, sinon l'historique se casse.
//   nom      : le libelle affiche
//   muscle   : le muscle principal — doit correspondre a un data-muscle de la
//              carte SVG dans index.html, sinon la muscle map ne se colore pas
//   materiel : "barre" | "halteres" | "machine" | "poulie" | "corps"
//   favori   : pre-rempli avec les exercices du programme de Kylian, pour que
//              la recherche soit rapide des le premier jour

const EXERCICES = [

    /* ---------- QUADRICEPS ---------- */
    { id: "squat-barre",        nom: "Squat barre",             muscle: "quadriceps", materiel: "barre",    favori: true },
    { id: "hack-squat",         nom: "Hack squat",              muscle: "quadriceps", materiel: "machine",  favori: true },
    { id: "presse-cuisses",     nom: "Presse à cuisses",        muscle: "quadriceps", materiel: "machine",  favori: true },
    { id: "leg-extension",      nom: "Leg extension",           muscle: "quadriceps", materiel: "machine",  favori: true },
    { id: "bulgarian-squat",    nom: "Squat bulgare",           muscle: "quadriceps", materiel: "halteres", favori: true },
    { id: "fentes-halteres",    nom: "Fentes haltères",         muscle: "quadriceps", materiel: "halteres" },
    { id: "squat-gobelet",      nom: "Squat gobelet",           muscle: "quadriceps", materiel: "halteres" },
    { id: "squat-corps",        nom: "Squat au poids du corps", muscle: "quadriceps", materiel: "corps",    favori: true },
    { id: "step-up",            nom: "Step-up",                 muscle: "quadriceps", materiel: "halteres" },

    /* ---------- ISCHIOS ---------- */
    { id: "souleve-terre",      nom: "Soulevé de terre",        muscle: "ischios",    materiel: "barre",    favori: true },
    { id: "rdl",                nom: "Soulevé de terre roumain", muscle: "ischios",   materiel: "barre" },
    { id: "leg-curl-assis",     nom: "Leg curl assis",          muscle: "ischios",    materiel: "machine",  favori: true },
    { id: "leg-curl-allonge",   nom: "Leg curl allongé",        muscle: "ischios",    materiel: "machine" },
    { id: "good-morning",       nom: "Good morning",            muscle: "ischios",    materiel: "barre" },
    { id: "nordic-curl",        nom: "Nordic curl",             muscle: "ischios",    materiel: "corps" },

    /* ---------- FESSIERS ---------- */
    { id: "hip-thrust",         nom: "Hip thrust",              muscle: "fessiers",   materiel: "barre" },
    { id: "abduction-machine",  nom: "Abduction machine",       muscle: "fessiers",   materiel: "machine" },
    { id: "fentes-marchees",    nom: "Fentes marchées",         muscle: "fessiers",   materiel: "halteres" },
    { id: "pont-fessier",       nom: "Pont fessier au sol",     muscle: "fessiers",   materiel: "corps" },

    /* ---------- MOLLETS ---------- */
    { id: "mollets-debout",     nom: "Mollets debout machine",  muscle: "mollets",    materiel: "machine",  favori: true },
    { id: "mollets-assis",      nom: "Mollets assis",           muscle: "mollets",    materiel: "machine" },
    { id: "mollets-marche",     nom: "Mollets sur marche",      muscle: "mollets",    materiel: "corps" },

    /* ---------- PECTORAUX ---------- */
    { id: "developpe-couche",   nom: "Développé couché",        muscle: "pectoraux",  materiel: "barre",    favori: true },
    { id: "developpe-incline",  nom: "Développé incliné",       muscle: "pectoraux",  materiel: "halteres", favori: true },
    { id: "chest-press",        nom: "Chest press machine",     muscle: "pectoraux",  materiel: "machine",  favori: true },
    { id: "pec-fly",            nom: "Pec fly machine",         muscle: "pectoraux",  materiel: "machine",  favori: true },
    { id: "ecarte-poulie",      nom: "Écarté à la poulie",      muscle: "pectoraux",  materiel: "poulie" },
    { id: "pompes",             nom: "Pompes",                  muscle: "pectoraux",  materiel: "corps",    favori: true },
    { id: "pompes-inclinees",   nom: "Pompes inclinées",        muscle: "pectoraux",  materiel: "corps" },
    { id: "dips-pectoraux",     nom: "Dips pectoraux",          muscle: "pectoraux",  materiel: "corps",    favori: true },

    /* ---------- DORSAUX ---------- */
    { id: "tractions",          nom: "Tractions",               muscle: "dorsaux",    materiel: "corps",    favori: true },
    { id: "tractions-assistees", nom: "Tractions assistées",    muscle: "dorsaux",    materiel: "machine",  favori: true },
    { id: "pulldown-serre",     nom: "Tirage vertical serré",   muscle: "dorsaux",    materiel: "poulie",   favori: true },
    { id: "pulldown-large",     nom: "Tirage vertical large",   muscle: "dorsaux",    materiel: "poulie" },
    { id: "rowing-barre",       nom: "Rowing barre",            muscle: "dorsaux",    materiel: "barre" },
    { id: "rowing-haltere",     nom: "Rowing haltère",          muscle: "dorsaux",    materiel: "halteres" },
    { id: "rowing-cable",       nom: "Rowing câble assis",      muscle: "dorsaux",    materiel: "poulie",   favori: true },
    { id: "pull-over",          nom: "Pull-over poulie",        muscle: "dorsaux",    materiel: "poulie" },
    { id: "rowing-inverse",     nom: "Rowing inversé",          muscle: "dorsaux",    materiel: "corps" },

    /* ---------- TRAPEZES ---------- */
    { id: "shrugs-halteres",    nom: "Shrugs haltères",         muscle: "trapezes",   materiel: "halteres" },
    { id: "shrugs-barre",       nom: "Shrugs barre",            muscle: "trapezes",   materiel: "barre" },
    { id: "face-pull",          nom: "Face pull",               muscle: "trapezes",   materiel: "poulie" },
    { id: "tirage-menton",      nom: "Tirage menton",           muscle: "trapezes",   materiel: "barre" },

    /* ---------- EPAULES ---------- */
    { id: "developpe-militaire", nom: "Développé militaire",    muscle: "epaules",    materiel: "barre" },
    { id: "developpe-epaules",  nom: "Développé épaules",       muscle: "epaules",    materiel: "halteres" },
    { id: "elevations-lat",     nom: "Élévations latérales",    muscle: "epaules",    materiel: "halteres", favori: true },
    { id: "elevations-poulie",  nom: "Élévations latérales poulie", muscle: "epaules", materiel: "poulie" },
    { id: "rear-delt",          nom: "Rear delt machine",       muscle: "epaules",    materiel: "machine",  favori: true },
    { id: "oiseau-halteres",    nom: "Oiseau haltères",         muscle: "epaules",    materiel: "halteres" },
    { id: "pompes-piquees",     nom: "Pompes piquées",          muscle: "epaules",    materiel: "corps" },

    /* ---------- BICEPS ---------- */
    { id: "curl-ez",            nom: "Curl barre EZ",           muscle: "biceps",     materiel: "barre",    favori: true },
    { id: "curl-halteres",      nom: "Curl haltères",           muscle: "biceps",     materiel: "halteres" },
    { id: "curl-marteau",       nom: "Curl marteau",            muscle: "biceps",     materiel: "halteres" },
    { id: "curl-poulie",        nom: "Curl poulie",             muscle: "biceps",     materiel: "poulie" },
    { id: "curl-incline",       nom: "Curl incliné",            muscle: "biceps",     materiel: "halteres" },
    { id: "tractions-supination", nom: "Tractions supination",  muscle: "biceps",     materiel: "corps" },

    /* ---------- TRICEPS ---------- */
    { id: "pushdown",           nom: "Pushdown câble",          muscle: "triceps",    materiel: "poulie",   favori: true },
    { id: "extension-nuque",    nom: "Extension nuque haltère", muscle: "triceps",    materiel: "halteres" },
    { id: "dips",               nom: "Dips",                    muscle: "triceps",    materiel: "corps",    favori: true },
    { id: "barre-au-front",     nom: "Barre au front",          muscle: "triceps",    materiel: "barre" },
    { id: "pompes-diamant",     nom: "Pompes diamant",          muscle: "triceps",    materiel: "corps" },
    { id: "kickback",           nom: "Kickback haltère",        muscle: "triceps",    materiel: "halteres" },

    /* ---------- AVANT-BRAS ---------- */
    { id: "curl-poignets",      nom: "Curl poignets",           muscle: "avant-bras", materiel: "barre" },
    { id: "dead-hang",          nom: "Suspension à la barre",   muscle: "avant-bras", materiel: "corps" },
    { id: "farmer-walk",        nom: "Farmer walk",             muscle: "avant-bras", materiel: "halteres" },

    /* ---------- ABDOS ---------- */
    { id: "crunch",             nom: "Crunch au sol",           muscle: "abdos",      materiel: "corps",    favori: true },
    { id: "releve-jambes",      nom: "Relevé de jambes suspendu", muscle: "abdos",    materiel: "corps" },
    { id: "planche",            nom: "Planche",                 muscle: "abdos",      materiel: "corps",    favori: true },
    { id: "crunch-poulie",      nom: "Crunch à la poulie",      muscle: "abdos",      materiel: "poulie" },
    { id: "roulette",           nom: "Roue abdominale",         muscle: "abdos",      materiel: "corps" },
    { id: "mountain-climbers",  nom: "Mountain climbers",       muscle: "abdos",      materiel: "corps" },

    /* ---------- OBLIQUES ---------- */
    { id: "russian-twist",      nom: "Russian twist",           muscle: "obliques",   materiel: "corps" },
    { id: "planche-laterale",   nom: "Planche latérale",        muscle: "obliques",   materiel: "corps" },
    { id: "rotation-poulie",    nom: "Rotation à la poulie",    muscle: "obliques",   materiel: "poulie" },
    { id: "crunch-oblique",     nom: "Crunch oblique",          muscle: "obliques",   materiel: "corps" },

    /* ---------- LOMBAIRES ---------- */
    { id: "extension-lombaire", nom: "Extension lombaire banc", muscle: "lombaires",  materiel: "corps" },
    { id: "superman",           nom: "Superman au sol",         muscle: "lombaires",  materiel: "corps" }
];

// Libelles affichables des groupes musculaires (les cles viennent du SVG)
const NOMS_MUSCLES = {
    "trapezes": "Trapèzes",
    "epaules": "Épaules",
    "pectoraux": "Pectoraux",
    "biceps": "Biceps",
    "triceps": "Triceps",
    "avant-bras": "Avant-bras",
    "abdos": "Abdos",
    "obliques": "Obliques",
    "dorsaux": "Dorsaux",
    "lombaires": "Lombaires",
    "fessiers": "Fessiers",
    "quadriceps": "Quadriceps",
    "ischios": "Ischio-jambiers",
    "mollets": "Mollets"
};

const NOMS_MATERIEL = {
    "barre": "Barre",
    "halteres": "Haltères",
    "machine": "Machine",
    "poulie": "Poulie",
    "corps": "Poids du corps"
};

// Retrouve un exercice par son id. Renvoie null si l'id est inconnu.
function trouverExercice(id) {
    for (let i = 0; i < EXERCICES.length; i++) {
        if (EXERCICES[i].id === id) {
            return EXERCICES[i];
        }
    }
    return null;
}

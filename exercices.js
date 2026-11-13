// Ascension — catalogue d'exercices
//
// Chaque entree :
//   id       : identifiant stable. C'est LUI qui sert de cle, jamais le nom.
//              Il ne doit JAMAIS changer, sinon l'historique se casse.
//   nom      : le libelle affiche
//   muscle   : le muscle principal — doit correspondre a un data-muscle de la
//              carte SVG dans index.html, sinon la muscle map ne se colore pas
//   materiel : "barre" | "halteres" | "machine" | "poulie" | "corps"
//   consigne : une phrase de technique d'execution (bouton "Technique" en seance)
//   favori   : pre-rempli avec les exercices du programme de Kylian, pour que
//              la recherche soit rapide des le premier jour

const EXERCICES = [

    /* ---------- QUADRICEPS ---------- */
    { id: "squat-barre",        nom: "Squat barre",             muscle: "quadriceps", materiel: "barre",    favori: true, consigne: "Barre sur les trapèzes, pieds largeur d'épaules, descends jusqu'à ce que les cuisses soient parallèles au sol, dos gainé, genoux dans l'axe des pieds." },
    { id: "hack-squat",         nom: "Hack squat",              muscle: "quadriceps", materiel: "machine",  favori: true, consigne: "Dos plaqué au dossier, pieds à largeur d'épaules, descends contrôlé jusqu'à 90° ou plus bas, pousse sans verrouiller les genoux." },
    { id: "presse-cuisses",     nom: "Presse à cuisses",        muscle: "quadriceps", materiel: "machine",  favori: true, consigne: "Dos et bassin collés au siège, descends jusqu'à environ 90° sans décoller le bassin, pousse sans verrouiller les genoux." },
    { id: "leg-extension",      nom: "Leg extension",           muscle: "quadriceps", materiel: "machine",  favori: true, consigne: "Genoux dans l'axe de la machine, tends les jambes en contractant les quadriceps, redescends lentement." },
    { id: "bulgarian-squat",    nom: "Squat bulgare",           muscle: "quadriceps", materiel: "halteres", favori: true, consigne: "Pied arrière sur un banc, buste légèrement penché, descends à la verticale jusqu'à ce que la cuisse avant soit parallèle, pousse sur le talon." },
    { id: "fentes-halteres",    nom: "Fentes haltères",         muscle: "quadriceps", materiel: "halteres", consigne: "Pas long, buste droit, genou arrière près du sol, genou avant dans l'axe du pied, pousse sur le talon pour revenir." },
    { id: "squat-gobelet",      nom: "Squat gobelet",           muscle: "quadriceps", materiel: "halteres", consigne: "Haltère tenu contre la poitrine, coudes vers le bas, descends entre les genoux en gardant le buste droit." },
    { id: "squat-corps",        nom: "Squat au poids du corps", muscle: "quadriceps", materiel: "corps",    favori: true, consigne: "Pieds largeur d'épaules, bras devant, descends en reculant les hanches, talons au sol, remonte en poussant dans le sol." },
    { id: "step-up",            nom: "Step-up",                 muscle: "quadriceps", materiel: "halteres", consigne: "Pose tout le pied sur le banc, monte en poussant avec la jambe d'appui sans t'aider de l'autre, redescends contrôlé." },

    /* ---------- ISCHIOS ---------- */
    { id: "souleve-terre",      nom: "Soulevé de terre",        muscle: "ischios",    materiel: "barre",    favori: true, consigne: "Barre contre les tibias, dos plat, épaules au-dessus de la barre, pousse le sol avec les jambes puis étends les hanches, barre près du corps." },
    { id: "rdl",                nom: "Soulevé de terre roumain", muscle: "ischios",   materiel: "barre", consigne: "Jambes presque tendues, pousse les hanches en arrière, barre qui glisse le long des cuisses, dos plat. Arrête-toi quand la technique se dégrade." },
    { id: "leg-curl-assis",     nom: "Leg curl assis",          muscle: "ischios",    materiel: "machine",  favori: true, consigne: "Dos calé, coussin au-dessus des talons, fléchis les jambes en contractant les ischios, remonte lentement." },
    { id: "leg-curl-allonge",   nom: "Leg curl allongé",        muscle: "ischios",    materiel: "machine", consigne: "Hanches plaquées au banc, ramène les talons vers les fessiers sans décoller le bassin, descends contrôlé." },
    { id: "good-morning",       nom: "Good morning",            muscle: "ischios",    materiel: "barre", consigne: "Barre sur les trapèzes, genoux légèrement fléchis, bascule les hanches en arrière dos plat, remonte en poussant les hanches vers l'avant." },
    { id: "nordic-curl",        nom: "Nordic curl",             muscle: "ischios",    materiel: "corps", consigne: "Genoux au sol, talons bloqués, descends le buste le plus lentement possible en gardant le corps aligné, remonte avec les mains si besoin." },

    /* ---------- FESSIERS ---------- */
    { id: "hip-thrust",         nom: "Hip thrust",              muscle: "fessiers",   materiel: "barre", consigne: "Haut du dos sur un banc, barre sur les hanches, pousse les hanches vers le haut jusqu'à l'alignement, serre les fessiers en haut." },
    { id: "abduction-machine",  nom: "Abduction machine",       muscle: "fessiers",   materiel: "machine", consigne: "Dos calé, écarte les jambes sans à-coups, marque une pause en position ouverte, reviens lentement." },
    { id: "fentes-marchees",    nom: "Fentes marchées",         muscle: "fessiers",   materiel: "halteres", consigne: "Grands pas, buste légèrement penché, pousse sur le talon avant, genou arrière près du sol." },
    { id: "pont-fessier",       nom: "Pont fessier au sol",     muscle: "fessiers",   materiel: "corps", consigne: "Allongé, pieds près des fessiers, monte les hanches en serrant les fessiers, tiens une seconde, redescends." },

    /* ---------- MOLLETS ---------- */
    { id: "mollets-debout",     nom: "Mollets debout machine",  muscle: "mollets",    materiel: "machine",  favori: true, consigne: "Épaules sous les coussins, descends le talon sous le niveau de la plateforme, monte le plus haut possible, pause en haut." },
    { id: "mollets-assis",      nom: "Mollets assis",           muscle: "mollets",    materiel: "machine", consigne: "Genoux à 90° sous les coussins, amplitude complète : étirement en bas, contraction en haut." },
    { id: "mollets-marche",     nom: "Mollets sur marche",      muscle: "mollets",    materiel: "corps", consigne: "Pointe de pied sur une marche, descends le talon puis monte sur la pointe, tiens-toi à un support." },

    /* ---------- PECTORAUX ---------- */
    { id: "developpe-couche",   nom: "Développé couché",        muscle: "pectoraux",  materiel: "barre",    favori: true, consigne: "Omoplates serrées, pieds au sol, descends la barre au milieu des pectoraux, coudes à environ 45° du corps, pousse en ligne droite." },
    { id: "developpe-incline",  nom: "Développé incliné",       muscle: "pectoraux",  materiel: "halteres", favori: true, consigne: "Banc incliné à 30°, haltères au niveau des pectoraux, pousse en rapprochant les haltères, descends jusqu'à sentir l'étirement." },
    { id: "chest-press",        nom: "Chest press machine",     muscle: "pectoraux",  materiel: "machine",  favori: true, consigne: "Dossier réglé pour que les poignées soient au niveau des pectoraux, épaules basses, pousse sans verrouiller les coudes." },
    { id: "pec-fly",            nom: "Pec fly machine",         muscle: "pectoraux",  materiel: "machine",  favori: true, consigne: "Coudes légèrement fléchis, rapproche les bras devant toi en contractant les pectoraux, reviens lentement." },
    { id: "ecarte-poulie",      nom: "Écarté à la poulie",      muscle: "pectoraux",  materiel: "poulie", consigne: "Un pas en avant, coudes légèrement fléchis, ramène les mains devant la poitrine en dessinant un arc, serre les pectoraux." },
    { id: "pompes",             nom: "Pompes",                  muscle: "pectoraux",  materiel: "corps",    favori: true, consigne: "Corps gainé en ligne droite, mains sous les épaules, descends la poitrine près du sol, coudes à 45°." },
    { id: "pompes-inclinees",   nom: "Pompes inclinées",        muscle: "pectoraux",  materiel: "corps", consigne: "Mains sur un banc, corps aligné, descends la poitrine vers le banc, pousse jusqu'aux bras tendus." },
    { id: "dips-pectoraux",     nom: "Dips pectoraux",          muscle: "pectoraux",  materiel: "corps",    favori: true, consigne: "Penche le buste vers l'avant, coudes légèrement écartés, descends jusqu'à l'étirement des pectoraux, remonte sans bloquer les coudes." },

    /* ---------- DORSAUX ---------- */
    { id: "tractions",          nom: "Tractions",               muscle: "dorsaux",    materiel: "corps",    favori: true, consigne: "Prise un peu plus large que les épaules, tire le coude vers la hanche, menton au-dessus de la barre, descends bras tendus." },
    { id: "tractions-assistees", nom: "Tractions assistées",    muscle: "dorsaux",    materiel: "machine",  favori: true, consigne: "Genoux sur le coussin, épaules basses, tire la poitrine vers la barre, descends lentement bras tendus." },
    { id: "pulldown-serre",     nom: "Tirage vertical serré",   muscle: "dorsaux",    materiel: "poulie",   favori: true, consigne: "Buste légèrement incliné, tire la barre vers le haut de la poitrine en menant avec les coudes, remonte contrôlé." },
    { id: "pulldown-large",     nom: "Tirage vertical large",   muscle: "dorsaux",    materiel: "poulie", consigne: "Prise large, poitrine sortie, tire la barre sous le menton en rapprochant les omoplates, remonte lentement." },
    { id: "rowing-barre",       nom: "Rowing barre",            muscle: "dorsaux",    materiel: "barre", consigne: "Buste penché à environ 45°, dos plat, tire la barre vers le nombril, serre les omoplates, descends contrôlé." },
    { id: "rowing-haltere",     nom: "Rowing haltère",          muscle: "dorsaux",    materiel: "halteres", consigne: "Une main et un genou sur le banc, dos plat, tire le coude vers la hanche, ne tourne pas le buste." },
    { id: "rowing-cable",       nom: "Rowing câble assis",      muscle: "dorsaux",    materiel: "poulie",   favori: true, consigne: "Assis, dos droit, tire la poignée vers le ventre en serrant les omoplates, reviens bras tendus sans te pencher." },
    { id: "pull-over",          nom: "Pull-over poulie",        muscle: "dorsaux",    materiel: "poulie", consigne: "Bras presque tendus, tire la barre vers les cuisses en gardant les coudes fixes, sens les dorsaux travailler." },
    { id: "rowing-inverse",     nom: "Rowing inversé",          muscle: "dorsaux",    materiel: "corps", consigne: "Corps aligné sous la barre, tire la poitrine vers la barre, omoplates serrées, redescends contrôlé." },

    /* ---------- TRAPEZES ---------- */
    { id: "shrugs-halteres",    nom: "Shrugs haltères",         muscle: "trapezes",   materiel: "halteres", consigne: "Bras le long du corps, monte les épaules vers les oreilles sans rouler, pause en haut, descends lentement." },
    { id: "shrugs-barre",       nom: "Shrugs barre",            muscle: "trapezes",   materiel: "barre", consigne: "Barre devant les cuisses, hausse les épaules verticalement, pause en haut, sans plier les bras." },
    { id: "face-pull",          nom: "Face pull",               muscle: "trapezes",   materiel: "poulie", consigne: "Poulie à hauteur du visage, tire vers le front en écartant les mains, coudes hauts, serre les omoplates." },
    { id: "tirage-menton",      nom: "Tirage menton",           muscle: "trapezes",   materiel: "barre", consigne: "Prise légèrement plus étroite que les épaules, monte la barre le long du corps jusqu'au bas de la poitrine, coudes plus hauts que les mains." },

    /* ---------- EPAULES ---------- */
    { id: "developpe-militaire", nom: "Développé militaire",    muscle: "epaules",    materiel: "barre", consigne: "Debout, abdos serrés, pousse la barre au-dessus de la tête sans cambrer, la tête passe devant la barre." },
    { id: "developpe-epaules",  nom: "Développé épaules",       muscle: "epaules",    materiel: "halteres", consigne: "Assis, dos calé, pousse les haltères au-dessus de la tête sans claquer en haut, descends à hauteur des oreilles." },
    { id: "elevations-lat",     nom: "Élévations latérales",    muscle: "epaules",    materiel: "halteres", favori: true, consigne: "Légère flexion des coudes, monte les bras sur le côté jusqu'à hauteur d'épaules, descends lentement, sans élan." },
    { id: "elevations-poulie",  nom: "Élévations latérales poulie", muscle: "epaules", materiel: "poulie", consigne: "Poulie basse, bras opposé, monte le bras sur le côté jusqu'aux épaules, descends contrôlé." },
    { id: "rear-delt",          nom: "Rear delt machine",       muscle: "epaules",    materiel: "machine",  favori: true, consigne: "Poitrine contre le dossier, écarte les bras vers l'arrière en menant avec les coudes, serre les omoplates." },
    { id: "oiseau-halteres",    nom: "Oiseau haltères",         muscle: "epaules",    materiel: "halteres", consigne: "Buste penché, dos plat, écarte les bras sur les côtés en gardant les coudes légèrement fléchis." },
    { id: "pompes-piquees",     nom: "Pompes piquées",          muscle: "epaules",    materiel: "corps", consigne: "Hanches hautes en V inversé, descends la tête vers le sol entre les mains, pousse vers le haut." },

    /* ---------- BICEPS ---------- */
    { id: "curl-ez",            nom: "Curl barre EZ",           muscle: "biceps",     materiel: "barre",    favori: true, consigne: "Coudes collés au corps, monte la barre sans balancer le buste, descends lentement bras presque tendus." },
    { id: "curl-halteres",      nom: "Curl haltères",           muscle: "biceps",     materiel: "halteres", consigne: "Coudes fixes, tourne la paume vers le haut en montant, contracte en haut, descends lentement." },
    { id: "curl-marteau",       nom: "Curl marteau",            muscle: "biceps",     materiel: "halteres", consigne: "Paumes face à face, monte l'haltère sans bouger le coude, descends contrôlé." },
    { id: "curl-poulie",        nom: "Curl poulie",             muscle: "biceps",     materiel: "poulie", consigne: "Coudes près du corps, monte la poignée en gardant les poignets neutres, descends lentement." },
    { id: "curl-incline",       nom: "Curl incliné",            muscle: "biceps",     materiel: "halteres", consigne: "Banc incliné, bras pendants derrière le corps pour étirer le biceps, monte sans avancer les coudes." },
    { id: "tractions-supination", nom: "Tractions supination",  muscle: "biceps",     materiel: "corps", consigne: "Paumes vers toi, tire le menton au-dessus de la barre en gardant le corps gainé, descends bras tendus." },

    /* ---------- TRICEPS ---------- */
    { id: "pushdown",           nom: "Pushdown câble",          muscle: "triceps",    materiel: "poulie",   favori: true, consigne: "Coudes collés au corps, pousse la barre ou la corde vers le bas jusqu'à tendre les bras, remonte contrôlé." },
    { id: "extension-nuque",    nom: "Extension nuque haltère", muscle: "triceps",    materiel: "halteres", consigne: "Haltère à deux mains derrière la tête, coudes serrés, tends les bras vers le haut sans les écarter." },
    { id: "dips",               nom: "Dips",                    muscle: "triceps",    materiel: "corps",    favori: true, consigne: "Buste droit, coudes vers l'arrière, descends jusqu'à 90°, remonte sans verrouiller les coudes." },
    { id: "barre-au-front",     nom: "Barre au front",          muscle: "triceps",    materiel: "barre", consigne: "Allongé, coudes fixes pointés vers le plafond, fléchis les avant-bras jusqu'au front puis tends les bras." },
    { id: "pompes-diamant",     nom: "Pompes diamant",          muscle: "triceps",    materiel: "corps", consigne: "Mains proches sous la poitrine, coudes près du corps, descends contrôlé puis pousse jusqu'aux bras tendus." },
    { id: "kickback",           nom: "Kickback haltère",        muscle: "triceps",    materiel: "halteres", consigne: "Buste penché, coude collé au corps, tends l'avant-bras vers l'arrière, contracte en haut." },

    /* ---------- AVANT-BRAS ---------- */
    { id: "curl-poignets",      nom: "Curl poignets",           muscle: "avant-bras", materiel: "barre", consigne: "Avant-bras posés sur les cuisses, paumes vers le haut, fléchis les poignets lentement, amplitude complète." },
    { id: "dead-hang",          nom: "Suspension à la barre",   muscle: "avant-bras", materiel: "corps", consigne: "Suspension prise ferme, épaules actives, tiens le plus longtemps possible sans te balancer." },
    { id: "farmer-walk",        nom: "Farmer walk",             muscle: "avant-bras", materiel: "halteres", consigne: "Haltères lourds, buste droit, épaules basses, marche à pas courts sans te pencher." },

    /* ---------- ABDOS ---------- */
    { id: "crunch",             nom: "Crunch au sol",           muscle: "abdos",      materiel: "corps",    favori: true, consigne: "Bas du dos au sol, enroule les épaules vers le bassin en soufflant, ne tire pas sur la nuque." },
    { id: "releve-jambes",      nom: "Relevé de jambes suspendu", muscle: "abdos",    materiel: "corps", consigne: "Suspendu, monte les jambes en basculant le bassin vers l'avant, descends sans te balancer." },
    { id: "planche",            nom: "Planche",                 muscle: "abdos",      materiel: "corps",    favori: true, consigne: "Coudes sous les épaules, corps aligné, abdos et fessiers serrés, ne creuse pas le dos." },
    { id: "crunch-poulie",      nom: "Crunch à la poulie",      muscle: "abdos",      materiel: "poulie", consigne: "À genoux sous la poulie, enroule le buste vers les genoux en soufflant, bassin immobile." },
    { id: "roulette",           nom: "Roue abdominale",         muscle: "abdos",      materiel: "corps", consigne: "Genoux au sol, bras tendus, roule vers l'avant en gardant le dos plat, reviens en serrant les abdos." },
    { id: "mountain-climbers",  nom: "Mountain climbers",       muscle: "abdos",      materiel: "corps", consigne: "Position de pompe, ramène les genoux vers la poitrine en alternant, hanches basses, rythme régulier." },

    /* ---------- OBLIQUES ---------- */
    { id: "russian-twist",      nom: "Russian twist",           muscle: "obliques",   materiel: "corps", consigne: "Assis penché en arrière, jambes surélevées, tourne le buste de chaque côté en gardant le dos droit." },
    { id: "planche-laterale",   nom: "Planche latérale",        muscle: "obliques",   materiel: "corps", consigne: "Coude sous l'épaule, corps aligné de la tête aux pieds, hanches hautes, tiens la position." },
    { id: "rotation-poulie",    nom: "Rotation à la poulie",    muscle: "obliques",   materiel: "poulie", consigne: "Pieds ancrés, bras tendus, tourne le buste en gardant les hanches stables, reviens contrôlé." },
    { id: "crunch-oblique",     nom: "Crunch oblique",          muscle: "obliques",   materiel: "corps", consigne: "Allongé, ramène un coude vers le genou opposé en enroulant le buste, alterne les côtés." },

    /* ---------- LOMBAIRES ---------- */
    { id: "extension-lombaire", nom: "Extension lombaire banc", muscle: "lombaires",  materiel: "corps", consigne: "Hanches calées sur le banc, descends le buste dos plat puis remonte jusqu'à l'alignement sans cambrer." },
    { id: "superman",           nom: "Superman au sol",         muscle: "lombaires",  materiel: "corps", consigne: "Allongé sur le ventre, monte bras et jambes en même temps, tiens une seconde, redescends doucement." }
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

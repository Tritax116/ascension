// Ascension — proxy vers Open Food Facts
//
// Pourquoi cette fonction existe :
// on ne peut pas appeler Open Food Facts directement depuis le navigateur
// (restrictions CORS selon les endpoints), et passer par une fonction serverless
// permet aussi d'envoyer un User-Agent correct — Open Food Facts bloque ou
// limite fortement les requetes anonymes, et renvoie alors une page HTML
// d'erreur. C'etait la cause du bug : le client recevait du HTML et tentait
// de le lire comme du JSON ("Unexpected token '<'").

const OFF_SEARCH = "https://world.openfoodfacts.org/cgi/search.pl";

// Open Food Facts demande un User-Agent qui identifie l'application.
const USER_AGENT = "Ascension/1.0 (app fitness perso - contact via netlify)";

// On ne demande que les champs utiles : une recherche Open Food Facts complete
// renvoie des centaines de champs par produit et des reponses de plusieurs Mo.
const CHAMPS = [
  "code",
  "product_name",
  "product_name_fr",
  "brands",
  "nutriments"
].join(",");

exports.handler = async function (event) {
  const entetes = {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "public, max-age=600"
  };

  const params = event.queryStringParameters || {};
  const terme = (params.q || "").trim();

  if (terme.length < 2) {
    return {
      statusCode: 400,
      headers: entetes,
      body: JSON.stringify({
        error: "Donne au moins 2 caracteres a chercher.",
        products: []
      })
    };
  }

  const url =
    OFF_SEARCH +
    "?search_terms=" + encodeURIComponent(terme) +
    "&search_simple=1" +
    "&action=process" +
    "&json=1" +
    "&lc=fr" +
    "&page_size=40" +
    "&fields=" + CHAMPS;

  try {
    const reponse = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        "Accept": "application/json"
      }
    });

    const typeContenu = reponse.headers.get("content-type") || "";

    // Le garde-fou qui manquait : on verifie que c'est bien du JSON AVANT
    // d'essayer de le parser. Sinon on renvoie une erreur lisible plutot
    // qu'un plantage de JSON.parse.
    if (!reponse.ok || typeContenu.indexOf("json") === -1) {
      const apercu = (await reponse.text()).slice(0, 150);
      return {
        statusCode: 502,
        headers: entetes,
        body: JSON.stringify({
          error:
            "Open Food Facts a repondu " + reponse.status +
            " en " + (typeContenu || "type inconnu"),
          apercu: apercu,
          products: []
        })
      };
    }

    const data = await reponse.json();
    const bruts = Array.isArray(data.products) ? data.products : [];

    const produits = bruts
      .map(nettoyer)
      .filter(function (p) { return p !== null; })
      .sort(function (a, b) {
        return pertinence(b, terme) - pertinence(a, terme);
      })
      .slice(0, 15);

    return {
      statusCode: 200,
      headers: entetes,
      body: JSON.stringify({ products: produits })
    };

  } catch (err) {
    return {
      statusCode: 502,
      headers: entetes,
      body: JSON.stringify({
        error: "Echec de l'appel a Open Food Facts : " + (err.message || String(err)),
        products: []
      })
    };
  }
};

// Garde uniquement les produits exploitables : un nom ET des calories.
// Sans ce filtre, la liste se remplit de fiches vides ou incompletes
// (Open Food Facts est collaboratif, beaucoup de fiches sont partielles).
function nettoyer(p) {
  const nom = (p.product_name_fr || p.product_name || "").trim();
  const n = p.nutriments || {};
  const kcal = n["energy-kcal_100g"];

  if (!nom) { return null; }
  if (typeof kcal !== "number" || isNaN(kcal)) { return null; }

  return {
    code: p.code || "",
    product_name: nom,
    brands: p.brands || "",
    nutriments: {
      "energy-kcal_100g": kcal,
      proteins_100g: nombre(n.proteins_100g),
      carbohydrates_100g: nombre(n.carbohydrates_100g),
      fat_100g: nombre(n.fat_100g)
    }
  };
}

function nombre(v) {
  const x = Number(v);
  return isNaN(x) ? 0 : x;
}

// Tri par pertinence : c'est ce qui corrige le "banane renvoie fromage blanc".
// La recherche d'Open Food Facts est large et remonte des produits qui ne
// contiennent le terme que dans un champ secondaire ; on reclasse nous-memes
// en fonction du nom affiche.
function pertinence(p, terme) {
  const nom = p.product_name.toLowerCase();
  const t = terme.toLowerCase();

  if (nom === t) { return 4; }
  if (nom.indexOf(t) === 0) { return 3; }
  if (nom.indexOf(" " + t) !== -1) { return 2; }
  if (nom.indexOf(t) !== -1) { return 1; }
  return 0;
}

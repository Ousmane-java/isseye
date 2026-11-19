// Données de démonstration : servent uniquement tant que Supabase n'est pas configuré,
// pour voir la boutique en local. Mêmes contenus que la migration 0004.

import type { RawProduct } from "./catalog-types.ts";
import type { ShippingZone } from "./shipping-types.ts";

const facet = (facetSlug: string, facetName: string, facetPosition: number, slug: string, label: string, position = 0) => ({
  value: { slug, label, position, facet: { slug: facetSlug, name: facetName, position: facetPosition, filterable: true } },
});
const note = (layer: "tete" | "coeur" | "fond", position: number, slug: string, name: string) => ({ layer, position, note: { slug, name } });
const category = { id: "demo-parfums", slug: "parfums", name: "Parfums" };

export const demoProducts: RawProduct[] = [
  {
    id: "demo-luna",
    slug: "luna",
    name: "Luna",
    subtitle: "Eau de parfum · Pour elle",
    description:
      "Luna est une caresse lumineuse : une fleur d'oranger nimbée de poire, posée sur un fond de musc blanc et de vanille. Une signature douce et magnétique, qui accompagne chaque geste.",
    story:
      "Née d'une nuit de pleine lune, Luna capture l'instant où la lumière se pose sur la peau. Un parfum intime, tendre et lumineux, pensé pour être porté près de soi, partout.",
    usage:
      "Vaporisez à 15 cm de la peau, sur les points de pulsation : poignets, cou, creux du coude. Le format Pocket Parfum se glisse dans le sac pour une retouche à tout moment.",
    ingredients: "Alcohol denat., Parfum (Fragrance), Aqua (Water).",
    allergens: "Limonene, Linalool, Coumarin, Citral, Geraniol.",
    badge: "Nouveau",
    featured: true,
    position: 0,
    created_at: "2026-10-01T00:00:00Z",
    category_id: category.id,
    seo_title: "Luna · Eau de parfum pour elle",
    seo_description: "Luna, eau de parfum ISSEYE pour elle : fleur d'oranger, poire, musc blanc et vanille. Format Pocket Parfum 30 ml.",
    category,
    variants: [
      { id: "demo-luna-30", sku: "ISY-LUNA-30", label: "30 ml · Eau de parfum", price: 3500, compare_at_price: null, stock: 50, track_stock: true, allow_backorder: false, low_stock_threshold: 3, active: true, position: 0, prices: [] },
    ],
    media: [{ url: "/images/luna.jpg", alt: "Flacon Luna, eau de parfum ISSEYE pour elle", kind: "image", position: 0, poster_url: null }],
    facets: [
      facet("pour", "Pour", 0, "elle", "Pour elle"),
      facet("famille", "Famille olfactive", 1, "florale", "Florale"),
      facet("famille", "Famille olfactive", 1, "musquee", "Musquée", 5),
      facet("moment", "Moment", 2, "jour", "Jour"),
      facet("saison", "Saison", 3, "printemps-ete", "Printemps · Été"),
      facet("intensite", "Intensité", 4, "moderee", "Modérée", 1),
    ],
    notes: [
      note("tete", 0, "poire", "Poire"),
      note("tete", 1, "bergamote", "Bergamote"),
      note("coeur", 0, "fleur-d-oranger", "Fleur d'oranger"),
      note("coeur", 1, "jasmin", "Jasmin"),
      note("coeur", 2, "rose", "Rose"),
      note("fond", 0, "musc-blanc", "Musc blanc"),
      note("fond", 1, "vanille", "Vanille"),
      note("fond", 2, "santal", "Santal"),
    ],
  },
  {
    id: "demo-noir",
    slug: "noir",
    name: "Noir",
    subtitle: "Eau de parfum · Pour lui",
    description:
      "Noir s'ouvre sur l'éclat du poivre noir et de la bergamote, avant un cœur de lavande et de cuir. Le fond de vétiver, de cèdre et d'ambre laisse un sillage profond et élégant.",
    story:
      "Noir est l'élégance du soir : une silhouette sombre, un regard assuré. Un boisé ambré au caractère affirmé, pour ceux qui laissent une trace sans rien dire.",
    usage: "Vaporisez sur le cou et le torse, à 15 cm de la peau. Le format Pocket Parfum vous suit du matin au soir.",
    ingredients: "Alcohol denat., Parfum (Fragrance), Aqua (Water).",
    allergens: "Limonene, Linalool, Coumarin, Citral.",
    badge: "Nouveau",
    featured: true,
    position: 1,
    created_at: "2026-10-01T00:00:00Z",
    category_id: category.id,
    seo_title: "Noir · Eau de parfum pour lui",
    seo_description: "Noir, eau de parfum ISSEYE pour lui : poivre noir, lavande, cuir, vétiver et ambre. Format Pocket Parfum 30 ml.",
    category,
    variants: [
      { id: "demo-noir-30", sku: "ISY-NOIR-30", label: "30 ml · Eau de parfum", price: 3500, compare_at_price: null, stock: 50, track_stock: true, allow_backorder: false, low_stock_threshold: 3, active: true, position: 0, prices: [] },
    ],
    media: [{ url: "/images/noir.jpg", alt: "Flacon Noir, eau de parfum ISSEYE pour lui", kind: "image", position: 0, poster_url: null }],
    facets: [
      facet("pour", "Pour", 0, "lui", "Pour lui", 1),
      facet("famille", "Famille olfactive", 1, "boisee", "Boisée", 2),
      facet("famille", "Famille olfactive", 1, "orientale", "Orientale", 1),
      facet("moment", "Moment", 2, "soir", "Soir", 1),
      facet("saison", "Saison", 3, "automne-hiver", "Automne · Hiver", 1),
      facet("intensite", "Intensité", 4, "intense", "Intense", 2),
    ],
    notes: [
      note("tete", 0, "poivre-noir", "Poivre noir"),
      note("tete", 1, "bergamote", "Bergamote"),
      note("coeur", 0, "lavande", "Lavande"),
      note("coeur", 1, "cuir", "Cuir"),
      note("fond", 0, "vetiver", "Vétiver"),
      note("fond", 1, "cedre", "Cèdre"),
      note("fond", 2, "ambre", "Ambre"),
    ],
  },
];

export const demoRelations: Record<string, string[]> = { "demo-luna": ["demo-noir"], "demo-noir": ["demo-luna"] };

const customs =
  "Commande expédiée hors Union européenne : prix hors TVA. Les éventuels droits et taxes d'importation sont à la charge de la destinataire.";
const method = (id: string, name: string, eta: string, carrier: string, amount: number, freeAbove: number | null, description: string) => ({
  id,
  name,
  description,
  eta,
  carrier,
  tracking_url_template: null,
  active: true,
  position: 0,
  prices: [{ currency_code: "EUR", amount, free_above: freeAbove }],
});

export const demoShippingZones: ShippingZone[] = [
  {
    id: "demo-fr",
    name: "France métropolitaine",
    countries: ["FR", "MC"],
    tax_mode: "ttc",
    customs_notice: null,
    active: true,
    position: 0,
    methods: [
      method("demo-fr-colissimo", "Colissimo à domicile", "2 à 3 jours ouvrés", "Colissimo", 690, 6000, "Remise contre signature"),
      { ...method("demo-fr-relais", "Point relais", "3 à 5 jours ouvrés", "Mondial Relay", 490, 6000, "Retrait dans le point relais de votre choix"), position: 1 },
    ],
  },
  {
    id: "demo-ue",
    name: "Union européenne",
    countries: ["BE", "LU", "DE", "ES", "IT", "PT", "NL", "AT", "IE"],
    tax_mode: "ttc",
    customs_notice: null,
    active: true,
    position: 1,
    methods: [method("demo-ue-colissimo", "Colissimo International", "4 à 7 jours ouvrés", "Colissimo", 1290, 10000, "Livraison à domicile")],
  },
  {
    id: "demo-af",
    name: "Afrique de l'Ouest et centrale",
    countries: ["SN", "CI", "ML", "BF", "BJ", "TG", "NE", "CM", "GA", "CG"],
    tax_mode: "export",
    customs_notice: customs,
    active: true,
    position: 2,
    methods: [method("demo-af-dhl", "DHL Express", "3 à 6 jours ouvrés", "DHL", 2900, null, "Livraison express à domicile")],
  },
  {
    id: "demo-us",
    name: "États-Unis",
    countries: ["US"],
    tax_mode: "export",
    customs_notice: customs,
    active: true,
    position: 3,
    methods: [method("demo-us-dhl", "DHL Express", "3 à 5 jours ouvrés", "DHL", 2400, null, "Livraison express à domicile")],
  },
];

export const demoFaqs = [
  { id: "q1", topic: "commande", question: "Dois-je créer un compte pour commander ?", answer: "Non. Vous pouvez commander en quelques instants avec votre seule adresse email. Un lien de suivi vous est envoyé après le paiement. Si vous le souhaitez, votre espace cliente retrouve ensuite toutes vos commandes passées avec la même adresse." },
  { id: "q2", topic: "commande", question: "Comment suivre ma commande ?", answer: "Le lien de suivi figure dans l'email de confirmation. Vous pouvez aussi saisir votre numéro de commande et votre email sur la page « Suivre ma commande »." },
  { id: "q3", topic: "commande", question: "Puis-je modifier ou annuler ma commande ?", answer: "Tant qu'elle n'est pas expédiée, écrivez-nous depuis la page Contact en indiquant votre numéro de commande : nous faisons le nécessaire." },
  { id: "q4", topic: "paiement", question: "Quels moyens de paiement acceptez-vous ?", answer: "Cartes bancaires (CB, Visa, Mastercard, American Express), Apple Pay et Google Pay. Le paiement est entièrement sécurisé par Stripe : nous ne voyons jamais vos coordonnées bancaires." },
  { id: "q5", topic: "paiement", question: "Dans quelle devise vais-je payer ?", answer: "Les prix s'affichent et se règlent dans la devise de votre pays : euros en France et en Europe, francs CFA en Afrique de l'Ouest et centrale, dollars aux États-Unis." },
  { id: "q6", topic: "livraison", question: "Où livrez-vous ?", answer: "En France métropolitaine, dans l'Union européenne, en Afrique de l'Ouest et centrale (Sénégal, Côte d'Ivoire, Cameroun, Gabon…) et aux États-Unis." },
  { id: "q7", topic: "livraison", question: "Quels sont les délais et les frais de livraison ?", answer: "Ils dépendent du pays et du mode choisi ; ils sont affichés avant le paiement. La livraison est offerte en France dès 60 € d'achat." },
  { id: "q8", topic: "livraison", question: "Y a-t-il des droits de douane hors Union européenne ?", answer: "Pour les envois hors Union européenne, des droits et taxes d'importation peuvent être demandés par le pays de destination. Ils restent à la charge de la destinataire." },
  { id: "q9", topic: "produits", question: "Que signifie « Pocket Parfum » ?", answer: "C'est notre format signature : un flacon de 30 ml en verre givré, pensé pour vous suivre partout. Même concentration qu'un grand flacon : une eau de parfum." },
  { id: "q10", topic: "produits", question: "Combien de temps tient le parfum ?", answer: "Nos eaux de parfum sont concentrées pour durer plusieurs heures sur la peau, et plus longtemps encore sur les vêtements. La tenue varie selon la peau de chacune." },
  { id: "q11", topic: "produits", question: "Comment conserver mon parfum ?", answer: "À l'abri de la lumière et de la chaleur, flacon bien fermé. Évitez la salle de bain : un tiroir ou une étagère fraîche lui conviennent mieux." },
  { id: "q12", topic: "retours", question: "Puis-je retourner un article ?", answer: "Vous disposez de 14 jours après réception pour nous retourner un article non ouvert, dans son emballage d'origine scellé. Pour des raisons d'hygiène, un parfum ouvert ne peut être ni repris ni échangé." },
];

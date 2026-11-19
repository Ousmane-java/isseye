// Blocs des pages (accueil, La Maison, pages créées dans l'admin).
// Chaque bloc déclare ses champs : l'admin génère le formulaire, le site affiche le rendu.
// Module pur : partagé entre le serveur, l'admin (navigateur) et le site.

export type FieldType = "text" | "textarea" | "markdown" | "lines" | "image" | "link" | "select" | "products" | "items";

export type BlockField = {
  key: string;
  label: string;
  type: FieldType;
  help?: string;
  options?: { value: string; label: string }[];
  /** Champs de chaque élément d'une liste (type « items »). */
  itemFields?: BlockField[];
};

export type BlockDef = {
  type: string;
  name: string;
  description: string;
  fields: BlockField[];
  defaults: Record<string, unknown>;
};

export type Section = { id: string; type: string; visible: boolean; props: Record<string, unknown> };

const tone = (label = "Ambiance") => ({
  key: "tone",
  label,
  type: "select" as const,
  options: [
    { value: "creme", label: "Crème" },
    { value: "lin", label: "Lin" },
    { value: "noir", label: "Noir fumé" },
    { value: "rose", label: "Rose Luna" },
  ],
});
const cta = [
  { key: "ctaLabel", label: "Texte du bouton", type: "text" as const },
  { key: "ctaHref", label: "Lien du bouton", type: "link" as const },
];

export const blockDefs: BlockDef[] = [
  {
    type: "hero",
    name: "Grand visuel d'accueil",
    description: "Plein écran : titre animé ligne par ligne, photo flottante, brume dorée.",
    fields: [
      { key: "eyebrow", label: "Sur-titre", type: "text" },
      { key: "titleLines", label: "Titre (une ligne par ligne affichée)", type: "lines" },
      { key: "accentLine", label: "Ligne en italique dorée (numéro, 1 = première)", type: "text" },
      { key: "text", label: "Texte", type: "textarea" },
      ...cta,
      { key: "secondaryLabel", label: "Second lien (texte)", type: "text" },
      { key: "secondaryHref", label: "Second lien (adresse)", type: "link" },
      { key: "image", label: "Photo", type: "image" },
    ],
    defaults: {
      eyebrow: "Pocket Parfum · Eau de parfum",
      titleLines: ["L'élégance", "à emporter."],
      accentLine: "2",
      text: "Des eaux de parfum concentrées dans un flacon de 30 ml en verre givré, coiffé de bois. Une signature qui vous suit partout, du matin au soir.",
      ctaLabel: "Découvrir les parfums",
      ctaHref: "/boutique",
      secondaryLabel: "La Maison",
      secondaryHref: "/maison",
      image: "/images/flacons.jpg",
    },
  },
  {
    type: "pageHero",
    name: "En-tête de page",
    description: "Titre de page élégant, avec photo facultative.",
    fields: [
      { key: "eyebrow", label: "Sur-titre", type: "text" },
      { key: "title", label: "Titre", type: "text" },
      { key: "text", label: "Texte", type: "textarea" },
      { key: "image", label: "Photo (facultative)", type: "image" },
      tone(),
    ],
    defaults: { eyebrow: "", title: "Titre de la page", text: "", image: "", tone: "lin" },
  },
  {
    type: "marquee",
    name: "Bandeau défilant",
    description: "Mots-clés qui défilent en continu.",
    fields: [{ key: "items", label: "Mots (un par ligne)", type: "lines" }],
    defaults: { items: ["Eau de parfum", "Pocket Parfum 30 ml", "Verre givré", "Bouchon en bois", "L'élégance à emporter"] },
  },
  {
    type: "products",
    name: "Sélection de parfums",
    description: "Grille de produits : mis en avant, tous, ou choisis à la main.",
    fields: [
      { key: "eyebrow", label: "Sur-titre", type: "text" },
      { key: "title", label: "Titre", type: "text" },
      { key: "text", label: "Texte", type: "textarea" },
      {
        key: "mode",
        label: "Produits affichés",
        type: "select",
        options: [
          { value: "featured", label: "Produits mis en avant" },
          { value: "all", label: "Tous les produits" },
          { value: "manual", label: "Choisis à la main" },
        ],
      },
      { key: "productIds", label: "Produits (si choisis à la main)", type: "products" },
      ...cta,
    ],
    defaults: { eyebrow: "La collection", title: "Deux signatures, une même élégance.", text: "", mode: "featured", productIds: [], ctaLabel: "Tous les parfums", ctaHref: "/boutique" },
  },
  {
    type: "split",
    name: "Photo et texte",
    description: "Photo d'un côté, texte de l'autre, avec apparition au défilement.",
    fields: [
      { key: "eyebrow", label: "Sur-titre", type: "text" },
      { key: "title", label: "Titre", type: "text" },
      { key: "text", label: "Texte", type: "markdown" },
      { key: "image", label: "Photo", type: "image" },
      {
        key: "side",
        label: "Position de la photo",
        type: "select",
        options: [
          { value: "left", label: "À gauche" },
          { value: "right", label: "À droite" },
        ],
      },
      tone(),
      ...cta,
    ],
    defaults: { eyebrow: "", title: "Titre", text: "Texte", image: "/images/luna.jpg", side: "left", tone: "creme", ctaLabel: "", ctaHref: "" },
  },
  {
    type: "pocket",
    name: "Signature Pocket Parfum",
    description: "Grande photo et points clés du format, sur fond noir.",
    fields: [
      { key: "eyebrow", label: "Sur-titre", type: "text" },
      { key: "title", label: "Titre", type: "text" },
      { key: "text", label: "Texte", type: "textarea" },
      { key: "image", label: "Photo", type: "image" },
      { key: "points", label: "Points clés (un par ligne)", type: "lines" },
      ...cta,
    ],
    defaults: {
      eyebrow: "Le format signature",
      title: "Pocket Parfum",
      text: "Trente millilitres d'eau de parfum dans un flacon de verre givré, coiffé d'une sphère de bois. Assez précieux pour être offert, assez léger pour vous suivre partout.",
      image: "/images/pocket-coffret.jpg",
      points: ["Eau de parfum : concentration intense", "Flacon de 30 ml en verre givré", "Bouchon en bois naturel", "Étui recyclable · Vegan · Non testé sur les animaux"],
      ctaLabel: "Choisir mon parfum",
      ctaHref: "/boutique",
    },
  },
  {
    type: "manifesto",
    name: "Manifeste",
    description: "Grand texte qui s'illumine mot après mot au défilement.",
    fields: [
      { key: "eyebrow", label: "Sur-titre", type: "text" },
      { key: "text", label: "Texte", type: "textarea" },
    ],
    defaults: {
      eyebrow: "La maison",
      text: "Chez ISSEYE, un parfum n'est pas un accessoire. C'est une signature invisible, une présence qui reste dans la pièce après votre départ. Chaque création se compose note après note, et se porte comme une seconde peau.",
    },
  },
  {
    type: "families",
    name: "Familles olfactives",
    description: "Cartes qui défilent à l'horizontale pendant que la section reste épinglée.",
    fields: [
      { key: "eyebrow", label: "Sur-titre", type: "text" },
      { key: "titleLines", label: "Titre (une ligne par ligne affichée)", type: "lines" },
      {
        key: "cards",
        label: "Cartes",
        type: "items",
        itemFields: [
          { key: "title", label: "Titre", type: "text" },
          { key: "text", label: "Notes", type: "text" },
          { key: "href", label: "Lien", type: "link" },
          { key: "image", label: "Photo (facultative)", type: "image" },
          tone("Couleur de fond"),
        ],
      },
    ],
    defaults: {
      eyebrow: "Familles olfactives",
      titleLines: ["Trouvez", "votre sillage."],
      cards: [
        { title: "Florale", text: "Fleur d'oranger, jasmin, rose", href: "/boutique?famille=florale", image: "", tone: "rose" },
        { title: "Musquée", text: "Musc blanc, vanille, santal", href: "/boutique?famille=musquee", image: "", tone: "lin" },
        { title: "Boisée", text: "Vétiver, cèdre, santal", href: "/boutique?famille=boisee", image: "", tone: "noir" },
        { title: "Orientale", text: "Ambre, cuir, épices", href: "/boutique?famille=orientale", image: "", tone: "creme" },
      ],
    },
  },
  {
    type: "reassurance",
    name: "Engagements",
    description: "Pictogrammes : livraison, paiement sécurisé, emballage…",
    fields: [
      {
        key: "items",
        label: "Engagements",
        type: "items",
        itemFields: [
          {
            key: "icon",
            label: "Pictogramme",
            type: "select",
            options: [
              { value: "truck", label: "Livraison" },
              { value: "lock", label: "Paiement sécurisé" },
              { value: "gift", label: "Cadeau" },
              { value: "leaf", label: "Engagé" },
              { value: "globe", label: "Monde" },
              { value: "sparkles", label: "Qualité" },
            ],
          },
          { key: "title", label: "Titre", type: "text" },
          { key: "text", label: "Texte", type: "text" },
        ],
      },
    ],
    defaults: {
      items: [
        { icon: "truck", title: "Livraison offerte", text: "En France dès 60 € d'achat" },
        { icon: "globe", title: "Livraison internationale", text: "Europe, Afrique, États-Unis" },
        { icon: "lock", title: "Paiement sécurisé", text: "Carte, Apple Pay, Google Pay" },
        { icon: "leaf", title: "Engagée", text: "Vegan · Étui recyclable · Cruelty free" },
      ],
    },
  },
  {
    type: "testimonials",
    name: "Témoignages",
    description: "Citations de clientes (à n'utiliser qu'avec de vrais avis).",
    fields: [
      { key: "eyebrow", label: "Sur-titre", type: "text" },
      {
        key: "items",
        label: "Témoignages",
        type: "items",
        itemFields: [
          { key: "quote", label: "Citation", type: "textarea" },
          { key: "author", label: "Prénom et ville", type: "text" },
        ],
      },
    ],
    defaults: { eyebrow: "Elles en parlent", items: [] },
  },
  {
    type: "faq",
    name: "Questions fréquentes",
    description: "Questions de la FAQ (Admin › FAQ), filtrées par thème.",
    fields: [
      { key: "eyebrow", label: "Sur-titre", type: "text" },
      { key: "title", label: "Titre", type: "text" },
      {
        key: "topic",
        label: "Thème",
        type: "select",
        options: [
          { value: "", label: "Tous les thèmes" },
          { value: "commande", label: "Commande" },
          { value: "paiement", label: "Paiement" },
          { value: "livraison", label: "Livraison" },
          { value: "produits", label: "Produits" },
          { value: "retours", label: "Retours" },
        ],
      },
    ],
    defaults: { eyebrow: "Questions fréquentes", title: "Tout savoir", topic: "" },
  },
  {
    type: "richtext",
    name: "Texte",
    description: "Texte libre mis en forme (titres, listes, liens).",
    fields: [
      { key: "title", label: "Titre", type: "text" },
      { key: "body", label: "Texte", type: "markdown" },
    ],
    defaults: { title: "", body: "" },
  },
  {
    type: "newsletter",
    name: "Inscription newsletter",
    description: "Formulaire d'inscription à la newsletter.",
    fields: [
      { key: "eyebrow", label: "Sur-titre", type: "text" },
      { key: "title", label: "Titre", type: "text" },
      { key: "text", label: "Texte", type: "textarea" },
    ],
    defaults: { eyebrow: "Le cercle ISSEYE", title: "Les nouvelles signatures, avant tout le monde.", text: "Lancements, éditions limitées et invitations : une lettre rare, jamais envahissante." },
  },
  {
    type: "closing",
    name: "Appel final",
    description: "Grand titre doré sur fond noir et bouton.",
    fields: [
      { key: "titleLines", label: "Titre (une ligne par ligne affichée)", type: "lines" },
      { key: "text", label: "Texte", type: "textarea" },
      ...cta,
    ],
    defaults: {
      titleLines: ["Offrez", "une signature."],
      text: "Emballage cadeau et message personnalisé sur demande. Livraison en France, en Europe, en Afrique et aux États-Unis.",
      ctaLabel: "Choisir un parfum",
      ctaHref: "/boutique",
    },
  },
];

export const blockDef = (type: string) => blockDefs.find((b) => b.type === type);

let counter = 0;
export function newSection(type: string, props?: Record<string, unknown>): Section {
  const def = blockDef(type);
  counter += 1;
  return { id: `s${Date.now().toString(36)}${counter}`, type, visible: true, props: structuredClone({ ...(def?.defaults ?? {}), ...(props ?? {}) }) };
}

/** Contenu de départ des pages système, tant que l'admin ne les a pas modifiées. */
export const defaultSections: Record<string, Section[]> = {
  "": [
    { id: "home-hero", type: "hero", visible: true, props: blockDef("hero")!.defaults },
    { id: "home-marquee", type: "marquee", visible: true, props: blockDef("marquee")!.defaults },
    { id: "home-products", type: "products", visible: true, props: blockDef("products")!.defaults },
    { id: "home-pocket", type: "pocket", visible: true, props: blockDef("pocket")!.defaults },
    { id: "home-manifesto", type: "manifesto", visible: true, props: blockDef("manifesto")!.defaults },
    {
      id: "home-luna",
      type: "split",
      visible: true,
      props: {
        eyebrow: "Pour elle",
        title: "Luna",
        text: "Une caresse lumineuse : fleur d'oranger nimbée de poire, posée sur un fond de musc blanc et de vanille. Douce, magnétique, inoubliable.",
        image: "/images/luna.jpg",
        side: "left",
        tone: "rose",
        ctaLabel: "Découvrir Luna",
        ctaHref: "/parfum/luna",
      },
    },
    {
      id: "home-noir",
      type: "split",
      visible: true,
      props: {
        eyebrow: "Pour lui",
        title: "Noir",
        text: "L'éclat du poivre noir, un cœur de lavande et de cuir, un fond de vétiver et d'ambre. L'élégance du soir, en un sillage.",
        image: "/images/noir.jpg",
        side: "right",
        tone: "lin",
        ctaLabel: "Découvrir Noir",
        ctaHref: "/parfum/noir",
      },
    },
    { id: "home-families", type: "families", visible: true, props: blockDef("families")!.defaults },
    { id: "home-reassurance", type: "reassurance", visible: true, props: blockDef("reassurance")!.defaults },
    { id: "home-closing", type: "closing", visible: true, props: blockDef("closing")!.defaults },
  ],
  maison: [
    {
      id: "maison-hero",
      type: "pageHero",
      visible: true,
      props: {
        eyebrow: "La Maison ISSEYE",
        title: "Une signature invisible.",
        text: "ISSEYE est née d'une conviction : un parfum d'exception doit pouvoir se porter partout, tout le temps. Pas dans un tiroir, mais au creux d'un sac, prêt à sublimer chaque instant.",
        image: "/images/pocket.jpg",
        tone: "lin",
      },
    },
    { id: "maison-manifesto", type: "manifesto", visible: true, props: blockDef("manifesto")!.defaults },
    {
      id: "maison-format",
      type: "split",
      visible: true,
      props: {
        eyebrow: "Le format",
        title: "Pocket Parfum",
        text: "Nos eaux de parfum sont présentées dans un flacon de **30 ml** en verre givré, coiffé d'une sphère de bois. Un format pensé pour voyager, offrir, et se retoucher à tout moment, sans rien céder à la concentration : c'est une **eau de parfum**, intense et durable.",
        image: "/images/pocket-coffret.jpg",
        side: "left",
        tone: "creme",
        ctaLabel: "",
        ctaHref: "",
      },
    },
    {
      id: "maison-engagements",
      type: "split",
      visible: true,
      props: {
        eyebrow: "Nos engagements",
        title: "Le luxe, avec conscience.",
        text: "- Formules **vegan**, jamais testées sur les animaux\n- Étuis en carton **recyclable**\n- Expédition soignée depuis la France",
        image: "/images/flacons.jpg",
        side: "right",
        tone: "lin",
        ctaLabel: "",
        ctaHref: "",
      },
    },
    { id: "maison-closing", type: "closing", visible: true, props: { titleLines: ["Trouvez", "votre signature."], text: "Luna pour elle, Noir pour lui.", ctaLabel: "Découvrir les parfums", ctaHref: "/boutique" } },
  ],
};

// Lecture sûre des propriétés d'un bloc (les données viennent de l'admin)
export const str = (props: Record<string, unknown>, key: string) => (typeof props[key] === "string" ? (props[key] as string) : "");
export const list = (props: Record<string, unknown>, key: string) => (Array.isArray(props[key]) ? (props[key] as unknown[]).filter((v): v is string => typeof v === "string") : []);
export const items = (props: Record<string, unknown>, key: string) =>
  Array.isArray(props[key]) ? (props[key] as unknown[]).filter((v): v is Record<string, unknown> => Boolean(v) && typeof v === "object") : [];

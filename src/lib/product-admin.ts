// Fiche produit de l'admin : forme des données échangées entre l'éditeur et le serveur.

export type VariantInput = {
  id?: string;
  label: string;
  sku: string;
  price: string; // saisi en devise de base, ex. « 35 » ou « 35,90 »
  compare_at_price: string;
  stock: number;
  track_stock: boolean;
  allow_backorder: boolean;
  low_stock_threshold: number;
  weight_grams: string;
  active: boolean;
  /** Prix fixés à la main par devise (vide = calcul automatique) */
  prices: { currency_code: string; amount: string; compare: string }[];
};

export type ProductPayload = {
  name: string;
  slug: string;
  subtitle: string;
  description: string;
  story: string;
  usage: string;
  ingredients: string;
  allergens: string;
  category_id: string;
  status: "draft" | "active" | "archived";
  featured: boolean;
  badge: string;
  position: number;
  seo_title: string;
  seo_description: string;
  media: { url: string; alt: string; kind: "image" | "video" }[];
  variants: VariantInput[];
  facetValueIds: string[];
  notes: { tete: string[]; coeur: string[]; fond: string[] };
  relatedIds: string[];
};

export const statusLabels = { draft: "Brouillon", active: "En ligne", archived: "Archivé" } as const;

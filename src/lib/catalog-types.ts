// Types du catalogue partagés par le serveur et le navigateur.

import type { PriceOverride } from "./pricing.ts";

/** Ligne produit telle que lue en base (même forme pour les données de démonstration). */
export type RawProduct = {
  id: string;
  slug: string;
  name: string;
  subtitle: string | null;
  description: string | null;
  story: string | null;
  usage: string | null;
  ingredients: string | null;
  allergens: string | null;
  badge: string | null;
  featured: boolean;
  position: number;
  created_at: string;
  category_id: string | null;
  seo_title: string | null;
  seo_description: string | null;
  category: { id: string; slug: string; name: string } | null;
  variants: RawVariant[];
  media: { url: string; alt: string | null; kind: "image" | "video"; position: number; poster_url: string | null }[];
  facets: { value: { slug: string; label: string; position: number; facet: { slug: string; name: string; position: number; filterable: boolean } } | null }[];
  notes: { layer: "tete" | "coeur" | "fond"; position: number; note: { slug: string; name: string } | null }[];
};

export type RawVariant = {
  id: string;
  sku: string | null;
  label: string | null;
  price: number;
  compare_at_price: number | null;
  stock: number;
  track_stock: boolean;
  allow_backorder: boolean;
  low_stock_threshold: number;
  active: boolean;
  position: number;
  weight_grams?: number | null;
  prices: PriceOverride[];
};

export type Money = { amount: number; code: string; symbol: string; decimals: number };

export type MediaView = { url: string; alt: string; kind: "image" | "video"; poster: string | null };
export type FacetTag = { facet: string; facetName: string; value: string; label: string };

export type VariantView = {
  id: string;
  sku: string | null;
  label: string;
  price: number;
  compareAt: number | null;
  available: boolean;
  /** Quantité maximale ajoutable (stock, ou 10 si le stock n'est pas suivi). */
  maxQty: number;
  /** Rappel « Plus que 2 » quand le stock passe sous le seuil d'alerte. */
  lowStock: number | null;
};

export type ProductSummary = {
  id: string;
  slug: string;
  name: string;
  subtitle: string | null;
  badge: string | null;
  featured: boolean;
  position: number;
  createdAt: string;
  categoryId: string | null;
  categorySlug: string | null;
  media: MediaView[];
  price: number;
  compareAt: number | null;
  /** Plusieurs variantes à des prix différents : « à partir de ». */
  fromPrice: boolean;
  available: boolean;
  facets: FacetTag[];
  defaultVariantId: string | null;
};

export type NoteView = { slug: string; name: string };

export type ProductDetail = ProductSummary & {
  description: string | null;
  story: string | null;
  usage: string | null;
  ingredients: string | null;
  allergens: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  categoryName: string | null;
  variants: VariantView[];
  notes: Record<"tete" | "coeur" | "fond", NoteView[]>;
};

export type ReviewView = { id: string; author: string; rating: number; title: string | null; body: string | null; verified: boolean; reply: string | null; date: string };

export const MAX_QTY = 10;

export const noteLayers = { tete: "Notes de tête", coeur: "Notes de cœur", fond: "Notes de fond" } as const;

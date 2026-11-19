// Panier : types échangés entre le navigateur et le serveur.

import type { Quote } from "./pricing.ts";

export type CartLineInput = { variantId: string; quantity: number };

export type CartLineView = {
  variantId: string;
  productId: string;
  slug: string;
  name: string;
  variantLabel: string;
  image: string | null;
  unitPrice: number;
  compareAt: number | null;
  quantity: number;
  maxQty: number;
  lineTotal: number;
};

export type ShippingOptionView = { id: string; name: string; description: string | null; eta: string | null; amount: number; free: boolean };

export type CartView = {
  lines: CartLineView[];
  currency: { code: string; symbol: string; decimals: number };
  quote: Quote;
  /** Ajustements faits par le serveur (article épuisé, quantité réduite…). */
  notices: string[];
  promo: { code: string; ok: boolean; message: string } | null;
  shipping: {
    /** postal : Colissimo, DHL… · local : livraison au km autour de la boutique · pickup : retrait */
    mode: "postal" | "local" | "pickup";
    /** Distance par la route depuis la boutique (livraison locale) */
    distanceKm: number | null;
    /** Adresse reconnue par la Base Adresse Nationale (France) */
    addressLabel: string | null;
    country: string;
    served: boolean;
    zoneName: string | null;
    taxMode: "ttc" | "export";
    customsNotice: string | null;
    options: ShippingOptionView[];
    selectedId: string | null;
  };
  /** Livraison offerte dès ce montant (mode le moins cher de la zone), pour la jauge du panier. */
  freeShippingFrom: number | null;
  giftWrap: { enabled: boolean; price: number; selected: boolean };
  storeOpen: boolean;
  closedMessage: string;
  pickup: { enabled: boolean; address: string; hours: string; instructions: string };
  /** near : position approximative de la boutique (≈ 1 km), pour classer les suggestions d'adresses */
  local: { enabled: boolean; radiusKm: number; near: { lat: number; lon: number } | null };
};

export type DeliveryChoice = "livraison" | "retrait";
export type AddressInput = { line1: string; postalCode: string; city: string };

export type CartRequest = {
  lines: CartLineInput[];
  delivery?: DeliveryChoice;
  /** Adresse saisie (France) : sert à proposer la livraison locale et à calculer la distance */
  address?: AddressInput | null;
  country?: string;
  methodId?: string | null;
  promoCode?: string | null;
  giftWrap?: boolean;
  email?: string | null;
};

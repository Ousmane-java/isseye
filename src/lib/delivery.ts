// Livraison locale : tarif selon la distance par la route (module pur, testé).

export type LocalTier = { maxKm: number; price: number };

/** Prix de la tranche qui couvre la distance, ou null si l'adresse est hors zone locale. */
export function localPrice(distanceKm: number, tiers: LocalTier[]) {
  const sorted = [...tiers].filter((t) => t.maxKm > 0).sort((a, b) => a.maxKm - b.maxKm);
  return sorted.find((t) => distanceKm <= t.maxKm)?.price ?? null;
}

/** Rayon de la zone locale (dernière tranche), 0 si aucune tranche. */
export function localRadius(tiers: LocalTier[]) {
  return tiers.reduce((max, t) => Math.max(max, t.maxKm), 0);
}

/** Distance à vol d'oiseau en km (secours si le calcul d'itinéraire est indisponible). */
export function haversineKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

/** Facteur route / vol d'oiseau utilisé en secours (prudent, en faveur de la boutique). */
export const ROAD_FACTOR = 1.3;

/** Tranche qui couvre la distance (prix et borne haute), ou null hors zone. */
export function localTier(distanceKm: number, tiers: LocalTier[]) {
  const sorted = [...tiers].filter((t) => t.maxKm > 0).sort((a, b) => a.maxKm - b.maxKm);
  return sorted.find((t) => distanceKm <= t.maxKm) ?? null;
}

/**
 * Adresse de retrait affichée avant l'achat, sans le numéro ni le code postal :
 * « 7 Rue de la Ronde 57050 Metz » → « Rue de la Ronde, Metz ».
 * L'adresse exacte n'est donnée qu'après le paiement (email de confirmation).
 */
export function publicPickupLabel(address: string) {
  const withoutNumber = address.trim().replace(/^\d+\s*(bis|ter|quater|[a-z])?\b\s*,?\s*/i, "");
  return withoutNumber.replace(/,?\s*\d{5}\s*/, ", ").replace(/\s{2,}/g, " ").replace(/,\s*,/g, ",").trim();
}

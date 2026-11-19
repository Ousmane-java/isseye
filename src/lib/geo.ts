import "server-only";
import { haversineKm, ROAD_FACTOR } from "@/lib/delivery";

// Adresses (géocodage de l'IGN Géoplateforme, Base Adresse Nationale ; secours : api-adresse.data.gouv.fr)
// et distances par la route (itinéraire IGN) :
// services publics français, gratuits, sans clé. Résultats gardés en mémoire pour limiter les appels.

export type GeoPoint = { lat: number; lon: number };
export type Geocoded = GeoPoint & { label: string; postcode: string; city: string; score: number };

const geoCache = new Map<string, Geocoded | null>();
const routeCache = new Map<string, number>();

/** Adresse en France → adresse normalisée et coordonnées, ou null si introuvable. */
export async function geocodeFR(address: { line1: string; postalCode?: string; city?: string }): Promise<Geocoded | null> {
  const q = [address.line1, address.postalCode, address.city].filter(Boolean).join(" ").trim();
  if (q.length < 5) return null;
  const key = q.toLowerCase();
  if (geoCache.has(key)) return geoCache.get(key)!;
  try {
    const params = new URLSearchParams({ q, limit: "1", autocomplete: "0" });
    if (address.postalCode && /^\d{5}$/.test(address.postalCode)) params.set("postcode", address.postalCode);
    let res: Response | null = null;
    for (const base of ["https://data.geopf.fr/geocodage/search", "https://api-adresse.data.gouv.fr/search/"]) {
      try {
        res = await fetch(`${base}?${params}`, { signal: AbortSignal.timeout(6000), cache: "no-store" });
        if (res.ok) break;
      } catch {
        res = null;
      }
    }
    if (!res?.ok) return null;
    const json = (await res.json()) as { features?: { geometry: { coordinates: [number, number] }; properties: { label: string; postcode: string; city: string; score: number; type: string } }[] };
    const f = json.features?.[0];
    // Adresse assez précise (rue ou numéro) et suffisamment sûre
    const result = f && f.properties.score >= 0.5 && ["housenumber", "street", "locality"].includes(f.properties.type)
      ? { lat: f.geometry.coordinates[1], lon: f.geometry.coordinates[0], label: f.properties.label, postcode: f.properties.postcode, city: f.properties.city, score: f.properties.score }
      : null;
    geoCache.set(key, result);
    return result;
  } catch {
    return null;
  }
}

/** Distance par la route en km (voiture). Secours : vol d'oiseau × 1,3. */
export async function roadDistanceKm(from: GeoPoint, to: GeoPoint): Promise<number> {
  const key = `${from.lat.toFixed(5)},${from.lon.toFixed(5)}>${to.lat.toFixed(5)},${to.lon.toFixed(5)}`;
  if (routeCache.has(key)) return routeCache.get(key)!;
  let km: number | null = null;
  try {
    const params = new URLSearchParams({
      resource: "bdtopo-osrm",
      profile: "car",
      optimization: "shortest",
      start: `${from.lon},${from.lat}`,
      end: `${to.lon},${to.lat}`,
      distanceUnit: "kilometer",
      getSteps: "false",
      getBbox: "false",
    });
    const res = await fetch(`https://data.geopf.fr/navigation/itineraire?${params}`, { signal: AbortSignal.timeout(6000), cache: "no-store" });
    if (res.ok) {
      const json = (await res.json()) as { distance?: number };
      if (typeof json.distance === "number" && json.distance >= 0) km = json.distance;
    }
  } catch {
    // secours ci-dessous
  }
  km ??= haversineKm(from, to) * ROAD_FACTOR;
  km = Math.round(km * 100) / 100;
  routeCache.set(key, km);
  return km;
}

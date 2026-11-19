import "server-only";
import { cache } from "react";
import { unstable_cache } from "next/cache";

// Cache des lectures du site public (réglages, catalogue, pages, menus, livraison…).
// Les données restent en mémoire entre les visites ; toute modification dans l'admin
// les invalide aussitôt (revalidateSite → étiquette SITE_TAG). Filet de sécurité : 10 minutes.

export const SITE_TAG = "isseye-site";

/**
 * Met en cache une lecture. En cas d'erreur (base injoignable…), rien n'est gardé en cache :
 * la valeur de secours `fallback` est servie et la lecture sera retentée à la visite suivante.
 */
export function siteCache<Args extends unknown[], R>(fn: (...args: Args) => Promise<R>, key: string, fallback?: (...args: Args) => R) {
  const cached = unstable_cache(fn, [key], { tags: [SITE_TAG], revalidate: 600 });
  return cache(async (...args: Args): Promise<R> => {
    try {
      return await cached(...args);
    } catch (err) {
      // Signaux internes de Next.js (rendu dynamique, redirection…) : à laisser passer
      if (!fallback || (err && typeof err === "object" && "digest" in err)) throw err;
      console.error(`[${key}]`, err instanceof Error ? err.message : err);
      return fallback(...args);
    }
  });
}

// Types partagés par les formulaires de l'admin (serveur et navigateur).
export type ActionState = { ok?: string; error?: string } | undefined;

export type MediaItem = { id: string; kind: "image" | "video"; url: string; alt: string | null; width: number | null; height: number | null; folder: string; created_at: string };

/** « Eau de Parfum Luna » → « eau-de-parfum-luna » */
export function slugify(text: string) {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/['’]/g, "-")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

import "server-only";
import { siteCache } from "@/lib/cache";
import { adminDb, isSupabaseConfigured } from "@/lib/supabase";

export type MenuItem = { id: string; label: string; href: string; children?: MenuItem[] };

// Mêmes menus que la migration 0003 : servent tant que la base n'est pas configurée
const defaults: Record<string, MenuItem[]> = {
  header: [
    { id: "m1", label: "Parfums", href: "/boutique" },
    { id: "m2", label: "Pour elle", href: "/boutique?pour=elle" },
    { id: "m3", label: "Pour lui", href: "/boutique?pour=lui" },
    { id: "m4", label: "La Maison", href: "/maison" },
  ],
  footer: [
    {
      id: "f1",
      label: "Boutique",
      href: "/boutique",
      children: [
        { id: "f11", label: "Tous les parfums", href: "/boutique" },
        { id: "f12", label: "Pour elle", href: "/boutique?pour=elle" },
        { id: "f13", label: "Pour lui", href: "/boutique?pour=lui" },
        { id: "f14", label: "La Maison ISSEYE", href: "/maison" },
      ],
    },
    {
      id: "f2",
      label: "Service client",
      href: "/contact",
      children: [
        { id: "f21", label: "Suivre ma commande", href: "/suivi" },
        { id: "f22", label: "Livraison & retours", href: "/livraison-retours" },
        { id: "f23", label: "Questions fréquentes", href: "/faq" },
        { id: "f24", label: "Contact", href: "/contact" },
      ],
    },
    {
      id: "f3",
      label: "Informations",
      href: "/mentions-legales",
      children: [
        { id: "f31", label: "CGV", href: "/cgv" },
        { id: "f32", label: "Mentions légales", href: "/mentions-legales" },
        { id: "f33", label: "Confidentialité", href: "/confidentialite" },
      ],
    },
  ],
};

/** Menu modifiable dans Admin › Menus. */
export const getMenu = siteCache(
  async (slug: "header" | "footer"): Promise<MenuItem[]> => {
    if (!isSupabaseConfigured) return defaults[slug];
    const { data, error } = await adminDb().from("menus").select("items").eq("slug", slug).maybeSingle();
    if (error) throw new Error(error.message);
    return Array.isArray(data?.items) ? (data.items as MenuItem[]) : defaults[slug];
  },
  "menus",
  (slug) => defaults[slug],
);

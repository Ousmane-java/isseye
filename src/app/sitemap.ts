import type { MetadataRoute } from "next";
import { getCategories, getProducts } from "@/lib/catalog";
import { adminDb, isSupabaseConfigured } from "@/lib/supabase";

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, categories] = await Promise.all([getProducts(), getCategories()]);
  let pages = ["maison", "cgv", "mentions-legales", "confidentialite", "livraison-retours"];
  if (isSupabaseConfigured) {
    const { data } = await adminDb().from("pages").select("slug").eq("status", "published").is("deleted_at", null);
    pages = (data ?? []).map((p) => p.slug).filter(Boolean);
  }
  const url = (path: string, priority: number): MetadataRoute.Sitemap[number] => ({ url: `${siteUrl}${path}`, priority, changeFrequency: "weekly" });
  return [
    url("/", 1),
    url("/boutique", 0.9),
    ...products.map((p) => url(`/parfum/${p.slug}`, 0.9)),
    ...categories.map((c) => url(`/boutique/${c.slug}`, 0.7)),
    ...pages.map((slug) => url(`/${slug}`, 0.5)),
    url("/faq", 0.5),
    url("/contact", 0.4),
  ];
}

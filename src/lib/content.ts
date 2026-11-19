import "server-only";
import { cache } from "react";
import { adminDb, isSupabaseConfigured } from "@/lib/supabase";
import { defaultSections, type Section } from "@/lib/blocks";
import { demoFaqs } from "@/lib/demo-data";
import { defaultLegalBody } from "@/lib/legal";
import { getSettings } from "@/lib/settings";
import { siteCache } from "@/lib/cache";

// Contenu éditorial : pages (par blocs ou texte), FAQ, bandeaux et pop-ups.

export type PageRecord = {
  id: string | null;
  slug: string;
  title: string;
  kind: "sections" | "legal";
  sections: Section[];
  body: string;
  seo_title: string | null;
  seo_description: string | null;
  og_image_url: string | null;
  updated_at: string | null;
};

const systemTitles: Record<string, { title: string; kind: "sections" | "legal" }> = {
  "": { title: "Accueil", kind: "sections" },
  maison: { title: "La Maison ISSEYE", kind: "sections" },
  cgv: { title: "Conditions générales de vente", kind: "legal" },
  "mentions-legales": { title: "Mentions légales", kind: "legal" },
  confidentialite: { title: "Politique de confidentialité", kind: "legal" },
  "livraison-retours": { title: "Livraison & retours", kind: "legal" },
};

/** Page publiée. Les pages système gardent un contenu de départ tant qu'elles n'ont pas été rédigées. */
type PageRow = Omit<PageRecord, "sections" | "body"> & { sections: unknown; body: string | null; status?: string; deleted_at?: string | null };

const loadPageRow = siteCache(
  async (slug: string): Promise<PageRow | null> => {
    const { data, error } = await adminDb()
      .from("pages")
      .select("id, slug, title, kind, sections, body, status, deleted_at, seo_title, seo_description, og_image_url, updated_at")
      .eq("slug", slug)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data as PageRow | null;
  },
  "page",
  () => null,
);

export const getPage = cache(async (slug: string): Promise<PageRecord | null> => {
  let row: PageRow | null = null;
  if (isSupabaseConfigured) {
    const data = await loadPageRow(slug);
    if (data && (data.status !== "published" || data.deleted_at)) return null;
    row = data;
  }
  const system = systemTitles[slug];
  if (!row && !system) return null;

  const kind = row?.kind ?? system.kind;
  const sections = Array.isArray(row?.sections) && (row.sections as Section[]).length ? (row.sections as Section[]) : (defaultSections[slug] ?? []);
  let body = row?.body ?? "";
  if (kind === "legal" && !body.trim()) body = defaultLegalBody(slug, await getSettings());
  return {
    id: row?.id ?? null,
    slug,
    title: row?.title ?? system.title,
    kind,
    sections,
    body,
    seo_title: row?.seo_title ?? null,
    seo_description: row?.seo_description ?? null,
    og_image_url: row?.og_image_url ?? null,
    updated_at: row?.updated_at ?? null,
  };
});

export type Faq = { id: string; topic: string; question: string; answer: string };

export const faqTopics: Record<string, string> = {
  commande: "Commande",
  paiement: "Paiement",
  livraison: "Livraison",
  produits: "Nos parfums",
  retours: "Retours",
  general: "Général",
};

const loadFaqs = siteCache(
  async (): Promise<Faq[]> => {
    if (!isSupabaseConfigured) return demoFaqs;
    const { data, error } = await adminDb().from("faqs").select("id, topic, question, answer").eq("active", true).order("topic").order("position");
    if (error) throw new Error(error.message);
    return (data ?? []) as Faq[];
  },
  "faq",
  () => [],
);

export const getFaqs = cache(async (topic?: string): Promise<Faq[]> => {
  const faqs = await loadFaqs();
  return topic ? faqs.filter((f) => f.topic === topic) : faqs;
});

export type Announcement = {
  id: string;
  kind: "bar" | "popup";
  tone: "noir" | "or" | "creme";
  content: { text?: string; title?: string; link_label?: string; link_href?: string; image_url?: string; code?: string; newsletter?: boolean };
  targeting: { delay_s?: number; once_per_days?: number; pages?: string[] };
};

/** Annonces actives et dans leurs dates : un bandeau et une pop-up au plus. */
export const getAnnouncements = cache(async (): Promise<{ bar: Announcement | null; popup: Announcement | null }> => {
  if (!isSupabaseConfigured) {
    return {
      bar: { id: "demo-bar", kind: "bar", tone: "noir", content: { text: "Livraison offerte en France dès 60 € d'achat", link_label: "Découvrir", link_href: "/boutique" }, targeting: {} },
      popup: null,
    };
  }
  // Toutes les annonces actives sont en cache ; les dates de début et de fin sont vérifiées à chaque visite
  const now = new Date().toISOString();
  const list = (await loadAnnouncements()).filter((a) => (!a.starts_at || a.starts_at <= now) && (!a.ends_at || a.ends_at >= now));
  return { bar: list.find((a) => a.kind === "bar") ?? null, popup: list.find((a) => a.kind === "popup") ?? null };
});

const loadAnnouncements = siteCache(
  async () => {
    const { data, error } = await adminDb()
      .from("announcements")
      .select("id, kind, tone, content, targeting, starts_at, ends_at")
      .eq("active", true)
      .order("priority", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as (Announcement & { starts_at: string | null; ends_at: string | null })[];
  },
  "annonces",
  () => [],
);

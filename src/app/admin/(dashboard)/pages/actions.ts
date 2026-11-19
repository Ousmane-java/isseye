"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { audit, requireAdmin, revalidateSite } from "@/lib/admin-auth";
import { adminDb } from "@/lib/supabase";
import { blockDef, type Section } from "@/lib/blocks";
import { slugify, type ActionState } from "@/lib/admin-types";

const reserved = ["admin", "api", "auth", "boutique", "parfum", "panier", "commande", "suivi", "compte", "favoris", "recherche", "contact", "faq"];

/** Nettoie les blocs reçus du navigateur : types connus, propriétés JSON simples. */
function cleanSections(input: unknown): Section[] {
  if (!Array.isArray(input)) return [];
  return input
    .filter((s): s is Section => Boolean(s) && typeof s === "object" && typeof (s as Section).type === "string" && Boolean(blockDef((s as Section).type)))
    .slice(0, 60)
    .map((s) => ({ id: String(s.id).slice(0, 40), type: s.type, visible: s.visible !== false, props: JSON.parse(JSON.stringify(s.props ?? {})) }));
}

export async function createPage(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireAdmin("pages");
  const title = String(fd.get("title") ?? "").trim();
  const kind = fd.get("kind") === "legal" ? "legal" : "sections";
  const slug = slugify(String(fd.get("slug") ?? "") || title);
  if (!title || !slug) return { error: "Titre requis." };
  if (reserved.includes(slug)) return { error: `L'adresse « ${slug} » est réservée par le site.` };
  const { data, error } = await adminDb()
    .from("pages")
    .insert({ title, slug, kind, status: "draft", sections: [], body: "" })
    .select("id")
    .single();
  if (error) return { error: error.code === "23505" ? "Une page utilise déjà cette adresse." : "Création impossible." };
  await audit(user, "create", "page", data.id, `Page créée : ${title}`);
  redirect(`/pages/${data.id}`);
}

type SavePayload = { title: string; slug: string; sections: unknown; body: string; seo_title: string; seo_description: string; og_image_url: string };

export async function savePage(id: string, payload: SavePayload, publish: boolean): Promise<ActionState> {
  const user = await requireAdmin("pages");
  const db = adminDb();
  const { data: page } = await db.from("pages").select("id, slug, system, kind, sections, body").eq("id", id).maybeSingle();
  if (!page) return { error: "Page introuvable." };
  const sections = cleanSections(payload.sections);
  const slug = page.system ? page.slug : slugify(payload.slug);
  if (!page.system && (!slug || reserved.includes(slug))) return { error: "Adresse invalide ou réservée." };

  const common = {
    title: payload.title.trim() || "Sans titre",
    slug,
    seo_title: payload.seo_title.trim() || null,
    seo_description: payload.seo_description.trim() || null,
    og_image_url: payload.og_image_url.trim() || null,
  };
  const update = publish
    ? { ...common, sections, body: payload.body, draft_sections: null, status: "published", published_at: new Date().toISOString() }
    : { ...common, draft_sections: sections };
  const { error } = await db.from("pages").update(update).eq("id", id);
  if (error) return { error: error.code === "23505" ? "Une autre page utilise cette adresse." : "Enregistrement impossible." };
  if (publish) {
    await db.from("page_versions").insert({ page_id: id, sections, body: payload.body, created_by: user.email });
    await audit(user, "publish", "page", id, `Page publiée : ${common.title}`);
    revalidateSite();
  } else {
    await audit(user, "update", "page", id, `Brouillon enregistré : ${common.title}`);
  }
  revalidatePath(`/admin/pages/${id}`);
  return { ok: publish ? "Publié : la page est à jour sur le site." : "Brouillon enregistré (pas encore visible sur le site)." };
}

export async function setPageStatus(id: string, status: "draft" | "published"): Promise<ActionState> {
  const user = await requireAdmin("pages");
  const db = adminDb();
  const { data: page } = await db.from("pages").select("system").eq("id", id).maybeSingle();
  if (page?.system && status === "draft") return { error: "Cette page est indispensable au site et reste en ligne." };
  await db.from("pages").update({ status }).eq("id", id);
  await audit(user, "update", "page", id, status === "published" ? "Page mise en ligne" : "Page retirée du site");
  revalidateSite();
  revalidatePath(`/admin/pages/${id}`);
  return { ok: status === "published" ? "En ligne." : "Retirée du site." };
}

export async function deletePage(id: string): Promise<ActionState> {
  const user = await requireAdmin("pages");
  const db = adminDb();
  const { data: page } = await db.from("pages").select("system, title").eq("id", id).maybeSingle();
  if (!page) return { error: "Page introuvable." };
  if (page.system) return { error: "Cette page est indispensable au site." };
  await db.from("pages").delete().eq("id", id);
  await audit(user, "delete", "page", id, `Page supprimée : ${page.title}`);
  revalidateSite();
  redirect("/pages");
}

export async function getVersion(versionId: string) {
  await requireAdmin("pages");
  const { data } = await adminDb().from("page_versions").select("sections, body").eq("id", versionId).maybeSingle();
  return data as { sections: Section[] | null; body: string | null } | null;
}

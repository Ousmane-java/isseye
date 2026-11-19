"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { audit, requireAdmin, revalidateSite } from "@/lib/admin-auth";
import { adminDb } from "@/lib/supabase";
import { slugify, type ActionState } from "@/lib/admin-types";

const text = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const date = (v: string) => (v ? new Date(v).toISOString() : null);

export async function createCollection(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireAdmin("collections");
  const name = text(fd, "name");
  if (!name) return { error: "Nom requis." };
  const { data, error } = await adminDb().from("collections").insert({ name, slug: slugify(name), kind: "manual" }).select("id").single();
  if (error) return { error: error.code === "23505" ? "Une collection porte déjà cette adresse." : "Création impossible." };
  await audit(user, "create", "collection", data.id, `Collection ${name}`);
  redirect(`/collections/${data.id}`);
}

export async function saveCollection(id: string, _: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireAdmin("collections");
  const name = text(fd, "name");
  const slug = slugify(text(fd, "slug") || name);
  if (!name || !slug) return { error: "Nom requis." };
  const db = adminDb();
  const { error } = await db
    .from("collections")
    .update({
      name,
      slug,
      description: text(fd, "description") || null,
      banner_url: text(fd, "banner_url") || null,
      active: fd.get("active") === "on",
      starts_at: date(text(fd, "starts_at")),
      ends_at: date(text(fd, "ends_at")),
      seo_title: text(fd, "seo_title") || null,
      seo_description: text(fd, "seo_description") || null,
    })
    .eq("id", id);
  if (error) return { error: error.code === "23505" ? "Cette adresse est déjà utilisée (par une collection ou une catégorie)." : "Enregistrement impossible." };
  const ids = fd.getAll("productIds").map(String);
  await db.from("collection_products").delete().eq("collection_id", id);
  if (ids.length) await db.from("collection_products").insert(ids.map((product_id, position) => ({ collection_id: id, product_id, position })));
  await audit(user, "update", "collection", id, `Collection ${name} (${ids.length} produits)`);
  revalidatePath("/admin", "layout");
  revalidateSite();
  return { ok: "Enregistré." };
}

export async function deleteCollection(id: string): Promise<ActionState> {
  const user = await requireAdmin("collections");
  await adminDb().from("collections").delete().eq("id", id);
  await audit(user, "delete", "collection", id, "Collection supprimée");
  revalidateSite();
  redirect("/collections");
}

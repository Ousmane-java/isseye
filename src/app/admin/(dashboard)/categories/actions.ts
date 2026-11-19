"use server";

import { revalidatePath } from "next/cache";
import { audit, requireAdmin, revalidateSite } from "@/lib/admin-auth";
import { adminDb } from "@/lib/supabase";
import { slugify, type ActionState } from "@/lib/admin-types";

const text = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const done = (ok: string): ActionState => {
  revalidatePath("/admin", "layout");
  revalidateSite();
  return { ok };
};

export async function saveCategory(id: string | null, _: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireAdmin("categories");
  const name = text(fd, "name");
  const slug = slugify(text(fd, "slug") || name);
  if (!name || !slug) return { error: "Nom requis." };
  const row = {
    name,
    slug,
    description: text(fd, "description") || null,
    banner_url: text(fd, "banner_url") || null,
    position: Number(text(fd, "position")) || 0,
    active: fd.get("active") === "on",
    seo_title: text(fd, "seo_title") || null,
    seo_description: text(fd, "seo_description") || null,
  };
  const db = adminDb();
  const { error } = id ? await db.from("categories").update(row).eq("id", id) : await db.from("categories").insert(row);
  if (error) return { error: error.code === "23505" ? "Cette adresse est déjà utilisée." : "Enregistrement impossible." };
  await audit(user, id ? "update" : "create", "category", id, `Catégorie ${name}`);
  return done(id ? "Enregistré." : "Catégorie créée.");
}

export async function deleteCategory(id: string): Promise<ActionState> {
  const user = await requireAdmin("categories");
  const db = adminDb();
  const { count } = await db.from("products").select("id", { count: "exact", head: true }).eq("category_id", id).is("deleted_at", null);
  if (count) return { error: `${count} produit${count > 1 ? "s" : ""} dans cette catégorie : déplacez-les d'abord.` };
  await db.from("categories").delete().eq("id", id);
  await audit(user, "delete", "category", id, "Catégorie supprimée");
  return done("Supprimée.");
}

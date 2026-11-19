"use server";

import { revalidatePath } from "next/cache";
import { audit, requireAdmin, revalidateSite } from "@/lib/admin-auth";
import { adminDb } from "@/lib/supabase";
import { slugify, type ActionState } from "@/lib/admin-types";

const text = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const done = (ok = "Enregistré."): ActionState => {
  revalidatePath("/admin/caracteristiques");
  revalidateSite();
  return { ok };
};

export async function saveFacet(id: string | null, _: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireAdmin("attributes");
  const name = text(fd, "name");
  if (!name) return { error: "Nom requis." };
  const row = { name, multiple: fd.get("multiple") === "on", filterable: fd.get("filterable") === "on", position: Number(text(fd, "position")) || 0 };
  const db = adminDb();
  const { error } = id ? await db.from("facets").update(row).eq("id", id) : await db.from("facets").insert({ ...row, slug: slugify(name) });
  if (error) return { error: error.code === "23505" ? "Cette caractéristique existe déjà." : "Enregistrement impossible." };
  await audit(user, id ? "update" : "create", "facet", id, `Caractéristique ${name}`);
  return done(id ? "Enregistré." : "Caractéristique créée.");
}

export async function deleteFacet(id: string): Promise<ActionState> {
  const user = await requireAdmin("attributes");
  await adminDb().from("facets").delete().eq("id", id);
  await audit(user, "delete", "facet", id, "Caractéristique supprimée");
  return done("Supprimée.");
}

export async function addFacetValue(facetId: string, _: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireAdmin("attributes");
  const label = text(fd, "label");
  if (!label) return { error: "Valeur requise." };
  const db = adminDb();
  const { count } = await db.from("facet_values").select("id", { count: "exact", head: true }).eq("facet_id", facetId);
  const { error } = await db.from("facet_values").insert({ facet_id: facetId, label, slug: slugify(label), position: count ?? 0 });
  if (error) return { error: error.code === "23505" ? "Cette valeur existe déjà." : "Ajout impossible." };
  await audit(user, "create", "facet_value", facetId, `Valeur ajoutée : ${label}`);
  return done("Ajoutée.");
}

export async function renameFacetValue(id: string, label: string): Promise<ActionState> {
  const user = await requireAdmin("attributes");
  if (!label.trim()) return { error: "Valeur requise." };
  await adminDb().from("facet_values").update({ label: label.trim() }).eq("id", id);
  await audit(user, "update", "facet_value", id, `Valeur renommée : ${label}`);
  return done();
}

export async function deleteFacetValue(id: string): Promise<ActionState> {
  const user = await requireAdmin("attributes");
  await adminDb().from("facet_values").delete().eq("id", id);
  await audit(user, "delete", "facet_value", id, "Valeur supprimée");
  return done("Supprimée.");
}

export async function renameNote(id: string, name: string): Promise<ActionState> {
  const user = await requireAdmin("attributes");
  if (!name.trim()) return { error: "Nom requis." };
  await adminDb().from("notes").update({ name: name.trim() }).eq("id", id);
  await audit(user, "update", "note", id, `Note renommée : ${name}`);
  return done();
}

export async function deleteNote(id: string): Promise<ActionState> {
  const user = await requireAdmin("attributes");
  const db = adminDb();
  const { count } = await db.from("product_notes").select("note_id", { count: "exact", head: true }).eq("note_id", id);
  if (count) return { error: "Cette note est utilisée par un parfum." };
  await db.from("notes").delete().eq("id", id);
  await audit(user, "delete", "note", id, "Note supprimée");
  return done("Supprimée.");
}

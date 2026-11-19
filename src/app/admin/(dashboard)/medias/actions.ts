"use server";

import { revalidatePath } from "next/cache";
import { audit, requireAdmin } from "@/lib/admin-auth";
import { adminDb } from "@/lib/supabase";
import { slugify, type ActionState, type MediaItem } from "@/lib/admin-types";
import { canAccess } from "@/config/admin";

// Médiathèque : les fichiers partent directement du navigateur vers Supabase Storage
// (adresse d'envoi signée, valable 2 heures) ; seules leurs informations passent par le serveur.

async function requireMediaUser() {
  // Les gestionnaires du catalogue ajoutent aussi des photos produits
  const user = await requireAdmin("dashboard");
  if (!canAccess(user.role, "media") && !canAccess(user.role, "products")) throw new Error("Accès refusé.");
  return user;
}

const allowed = /^(image\/(jpeg|png|webp|gif|avif|svg\+xml)|video\/(mp4|quicktime|webm))$/;

export async function createUploadUrl(fileName: string, contentType: string, folder = "general") {
  await requireMediaUser();
  if (!allowed.test(contentType)) throw new Error("Format non accepté (photos JPG, PNG, WebP, AVIF, SVG ou vidéos MP4, MOV, WebM).");
  const ext = (fileName.split(".").pop() ?? "").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5) || "bin";
  const base = slugify(fileName.replace(/\.[^.]+$/, "")) || "fichier";
  const path = `${slugify(folder) || "general"}/${Date.now().toString(36)}-${base}.${ext}`;
  const db = adminDb();
  const { data, error } = await db.storage.from("media").createSignedUploadUrl(path);
  if (error || !data) throw new Error("Envoi impossible : vérifiez que le bucket « media » existe (migration 0003).");
  const publicUrl = db.storage.from("media").getPublicUrl(path).data.publicUrl;
  return { path, token: data.token, publicUrl };
}

export async function registerMedia(input: { url: string; path: string; kind: "image" | "video"; width?: number | null; height?: number | null; size?: number | null; alt?: string; folder?: string }) {
  const user = await requireMediaUser();
  const { data, error } = await adminDb()
    .from("media")
    .insert({
      url: input.url,
      storage_path: input.path,
      kind: input.kind === "video" ? "video" : "image",
      width: input.width ?? null,
      height: input.height ?? null,
      size_bytes: input.size ?? null,
      alt: input.alt?.slice(0, 200) || null,
      folder: slugify(input.folder ?? "general") || "general",
    })
    .select("id, kind, url, alt, width, height, folder, created_at")
    .single();
  if (error) throw new Error("Enregistrement impossible.");
  await audit(user, "create", "media", data.id, `Fichier ajouté : ${input.path}`);
  revalidatePath("/admin/medias");
  return data as MediaItem;
}

export async function listMedia(search = "", kind: "image" | "video" | "" = ""): Promise<MediaItem[]> {
  await requireMediaUser();
  let query = adminDb().from("media").select("id, kind, url, alt, width, height, folder, created_at").order("created_at", { ascending: false }).limit(200);
  if (kind) query = query.eq("kind", kind);
  if (search.trim()) query = query.or(`alt.ilike.%${search.replace(/[%,()]/g, "")}%,storage_path.ilike.%${search.replace(/[%,()]/g, "")}%`);
  const { data } = await query;
  return (data ?? []) as MediaItem[];
}

export async function updateMediaAlt(id: string, alt: string): Promise<ActionState> {
  const user = await requireMediaUser();
  await adminDb().from("media").update({ alt: alt.slice(0, 200) || null }).eq("id", id);
  await audit(user, "update", "media", id, "Texte alternatif modifié");
  revalidatePath("/admin/medias");
  return { ok: "Enregistré." };
}

export async function deleteMedia(id: string): Promise<ActionState> {
  const user = await requireMediaUser();
  const db = adminDb();
  const { data } = await db.from("media").select("url, storage_path").eq("id", id).maybeSingle();
  if (!data) return { error: "Fichier introuvable." };
  const { count } = await db.from("product_media").select("id", { count: "exact", head: true }).eq("url", data.url);
  if (count) return { error: "Ce fichier est utilisé par un produit : retirez-le d'abord de la fiche produit." };
  if (data.storage_path) await db.storage.from("media").remove([data.storage_path]);
  await db.from("media").delete().eq("id", id);
  await audit(user, "delete", "media", id, `Fichier supprimé : ${data.storage_path ?? data.url}`);
  revalidatePath("/admin/medias");
  return { ok: "Supprimé." };
}

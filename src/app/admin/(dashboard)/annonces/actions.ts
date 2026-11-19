"use server";

import { revalidatePath } from "next/cache";
import { audit, requireAdmin, revalidateSite } from "@/lib/admin-auth";
import { adminDb } from "@/lib/supabase";
import type { ActionState } from "@/lib/admin-types";

const text = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const date = (v: string) => (v ? new Date(v).toISOString() : null);

export async function saveAnnouncement(id: string | null, _: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireAdmin("announcements");
  const kind = text(fd, "kind") === "popup" ? "popup" : "bar";
  const name = text(fd, "name") || (kind === "bar" ? "Bandeau" : "Pop-up");
  const tone = ["noir", "or", "creme"].includes(text(fd, "tone")) ? text(fd, "tone") : "noir";
  const content = {
    text: text(fd, "text").slice(0, 300),
    title: text(fd, "title").slice(0, 120),
    link_label: text(fd, "link_label").slice(0, 40),
    link_href: text(fd, "link_href").slice(0, 300),
    image_url: text(fd, "image_url"),
    code: text(fd, "code").toUpperCase().slice(0, 24),
    newsletter: fd.get("newsletter") === "on",
  };
  if (!content.text && !content.title) return { error: "Ajoutez un texte." };
  const row = {
    kind,
    name,
    tone,
    content,
    targeting: { delay_s: Math.max(0, Number(text(fd, "delay_s")) || 8), once_per_days: Math.max(0, Number(text(fd, "once_per_days")) || 7) },
    priority: Number(text(fd, "priority")) || 0,
    starts_at: date(text(fd, "starts_at")),
    ends_at: date(text(fd, "ends_at")),
    active: fd.get("active") === "on",
  };
  const db = adminDb();
  const { error } = id ? await db.from("announcements").update(row).eq("id", id) : await db.from("announcements").insert(row);
  if (error) return { error: "Enregistrement impossible." };
  await audit(user, id ? "update" : "create", "announcement", id, `Annonce ${name}`);
  revalidatePath("/admin/annonces");
  revalidateSite();
  return { ok: id ? "Enregistré." : "Annonce créée." };
}

export async function deleteAnnouncement(id: string): Promise<ActionState> {
  const user = await requireAdmin("announcements");
  await adminDb().from("announcements").delete().eq("id", id);
  await audit(user, "delete", "announcement", id, "Annonce supprimée");
  revalidatePath("/admin/annonces");
  revalidateSite();
  return { ok: "Supprimée." };
}

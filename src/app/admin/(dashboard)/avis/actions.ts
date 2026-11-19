"use server";

import { revalidatePath } from "next/cache";
import { audit, requireAdmin, revalidateSite } from "@/lib/admin-auth";
import { adminDb } from "@/lib/supabase";
import type { ActionState } from "@/lib/admin-types";

export async function moderateReview(id: string, status: "publie" | "refuse"): Promise<ActionState> {
  const user = await requireAdmin("reviews");
  await adminDb().from("reviews").update({ status }).eq("id", id);
  await audit(user, "update", "review", id, status === "publie" ? "Avis publié" : "Avis refusé");
  revalidatePath("/admin", "layout");
  revalidateSite();
  return { ok: status === "publie" ? "Publié." : "Refusé." };
}

export async function replyReview(id: string, _: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireAdmin("reviews");
  await adminDb().from("reviews").update({ admin_reply: String(fd.get("reply") ?? "").trim().slice(0, 1000) || null }).eq("id", id);
  await audit(user, "update", "review", id, "Réponse à un avis");
  revalidateSite();
  return { ok: "Réponse enregistrée." };
}

export async function deleteReview(id: string): Promise<ActionState> {
  const user = await requireAdmin("reviews");
  await adminDb().from("reviews").delete().eq("id", id);
  await audit(user, "delete", "review", id, "Avis supprimé");
  revalidatePath("/admin", "layout");
  revalidateSite();
  return { ok: "Supprimé." };
}

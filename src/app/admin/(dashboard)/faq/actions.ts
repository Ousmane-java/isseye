"use server";

import { revalidatePath } from "next/cache";
import { audit, requireAdmin, revalidateSite } from "@/lib/admin-auth";
import { adminDb } from "@/lib/supabase";
import type { ActionState } from "@/lib/admin-types";

const text = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

export async function saveFaq(id: string | null, _: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireAdmin("faq");
  const question = text(fd, "question");
  const answer = text(fd, "answer");
  if (!question || !answer) return { error: "Question et réponse requises." };
  const row = { question, answer, topic: text(fd, "topic") || "general", position: Number(text(fd, "position")) || 0, active: fd.get("active") === "on" };
  const db = adminDb();
  const { error } = id ? await db.from("faqs").update(row).eq("id", id) : await db.from("faqs").insert(row);
  if (error) return { error: "Enregistrement impossible." };
  await audit(user, id ? "update" : "create", "faq", id, question.slice(0, 80));
  revalidatePath("/admin/faq");
  revalidateSite();
  return { ok: id ? "Enregistré." : "Question ajoutée." };
}

export async function deleteFaq(id: string): Promise<ActionState> {
  const user = await requireAdmin("faq");
  await adminDb().from("faqs").delete().eq("id", id);
  await audit(user, "delete", "faq", id, "Question supprimée");
  revalidatePath("/admin/faq");
  revalidateSite();
  return { ok: "Supprimée." };
}

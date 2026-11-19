"use server";

import { revalidatePath } from "next/cache";
import { audit, requireAdmin } from "@/lib/admin-auth";
import { adminDb } from "@/lib/supabase";
import type { ActionState } from "@/lib/admin-types";

export async function toggleHandled(id: string, handled: boolean): Promise<ActionState> {
  const user = await requireAdmin("messages");
  await adminDb().from("contact_messages").update({ handled_at: handled ? new Date().toISOString() : null }).eq("id", id);
  await audit(user, "update", "contact_message", id, handled ? "Message traité" : "Message rouvert");
  revalidatePath("/admin", "layout");
  return { ok: handled ? "Traité." : "Rouvert." };
}

export async function deleteMessage(id: string): Promise<ActionState> {
  const user = await requireAdmin("messages");
  await adminDb().from("contact_messages").delete().eq("id", id);
  await audit(user, "delete", "contact_message", id, "Message supprimé");
  revalidatePath("/admin", "layout");
  return { ok: "Supprimé." };
}

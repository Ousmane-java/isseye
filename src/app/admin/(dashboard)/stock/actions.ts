"use server";

import { revalidatePath } from "next/cache";
import { audit, requireAdmin, revalidateSite } from "@/lib/admin-auth";
import { adminDb } from "@/lib/supabase";
import { notifyBackInStock } from "@/lib/stock";
import type { ActionState } from "@/lib/admin-types";

const reasons = ["reassort", "ajustement", "retour", "casse"] as const;

export async function adjustStock(variantId: string, _: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireAdmin("stock");
  const delta = Math.trunc(Number(String(fd.get("delta") ?? "").replace(",", ".")));
  const reason = String(fd.get("reason") ?? "");
  if (!delta) return { error: "Indiquez une quantité (ex. 20 ou -2)." };
  if (!reasons.includes(reason as (typeof reasons)[number])) return { error: "Motif invalide." };
  const db = adminDb();
  const { data: before } = await db.from("product_variants").select("stock").eq("id", variantId).maybeSingle();
  if (!before) return { error: "Variante introuvable." };
  const { data: after, error } = await db.rpc("adjust_stock", { p_variant: variantId, p_delta: delta, p_reason: reason, p_note: String(fd.get("note") ?? "").slice(0, 200) || null, p_by: user.email });
  if (error) return { error: "Mise à jour impossible." };
  let notified = 0;
  if (before.stock <= 0 && (after as number) > 0) notified = await notifyBackInStock(variantId);
  await audit(user, "update", "stock", variantId, `Stock ${delta > 0 ? "+" : ""}${delta} (${reason}) → ${after}`);
  revalidatePath("/admin/stock");
  revalidateSite();
  return { ok: `Stock : ${after}${notified ? ` · ${notified} cliente(s) prévenue(s) du retour en stock` : ""}` };
}

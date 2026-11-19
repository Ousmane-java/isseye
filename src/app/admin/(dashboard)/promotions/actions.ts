"use server";

import { revalidatePath } from "next/cache";
import { audit, requireAdmin } from "@/lib/admin-auth";
import { adminDb } from "@/lib/supabase";
import { getCurrencies } from "@/lib/currencies";
import { parseMoney } from "@/lib/currency";
import type { ActionState } from "@/lib/admin-types";

const text = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const date = (v: string) => (v ? new Date(v).toISOString() : null);

export async function savePromo(id: string | null, _: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireAdmin("promotions");
  const code = text(fd, "code").toUpperCase().replace(/\s/g, "");
  if (!/^[A-Z0-9_-]{3,24}$/.test(code)) return { error: "Code : 3 à 24 lettres, chiffres, - ou _." };
  const kind = text(fd, "kind");
  if (!["percent", "amount", "free_shipping"].includes(kind)) return { error: "Type invalide." };
  const percent = kind === "percent" ? Number(text(fd, "percent")) : null;
  if (kind === "percent" && (!Number.isInteger(percent) || percent! < 1 || percent! > 90)) return { error: "Pourcentage entre 1 et 90." };

  const currencies = await getCurrencies();
  const amounts: { currency_code: string; amount: number | null; min_subtotal: number | null }[] = [];
  for (const c of currencies.filter((c) => c.active)) {
    const a = text(fd, `amount_${c.code}`);
    const m = text(fd, `min_${c.code}`);
    const amount = a ? parseMoney(a, c) : null;
    const min = m ? parseMoney(m, c) : null;
    if ((a && amount === null) || (m && min === null)) return { error: `Montant en ${c.code} invalide.` };
    if (amount !== null || min !== null) amounts.push({ currency_code: c.code, amount: amount || null, min_subtotal: min });
  }
  const base = currencies.find((c) => c.is_base)!;
  if (kind === "amount" && !amounts.some((a) => a.currency_code === base.code && a.amount)) return { error: `Indiquez le montant de la réduction en ${base.code}.` };

  const row = {
    code,
    kind,
    percent,
    category_ids: fd.getAll("category_ids").map(String),
    starts_at: date(text(fd, "starts_at")),
    ends_at: date(text(fd, "ends_at")),
    max_uses: text(fd, "max_uses") ? Math.max(1, Number(text(fd, "max_uses"))) : null,
    first_order_only: fd.get("first_order_only") === "on",
    active: fd.get("active") === "on",
  };
  const db = adminDb();
  const res = id ? await db.from("promo_codes").update(row).eq("id", id).select("id").single() : await db.from("promo_codes").insert(row).select("id").single();
  if (res.error) return { error: res.error.code === "23505" ? "Ce code existe déjà." : "Enregistrement impossible." };
  const promoId = res.data.id;
  await db.from("promo_code_amounts").delete().eq("promo_code_id", promoId);
  if (amounts.length) await db.from("promo_code_amounts").insert(amounts.map((a) => ({ ...a, promo_code_id: promoId })));
  await audit(user, id ? "update" : "create", "promo_code", promoId, `Code ${code}`);
  revalidatePath("/admin/promotions");
  return { ok: id ? "Enregistré." : `Code ${code} créé.` };
}

export async function archivePromo(id: string): Promise<ActionState> {
  const user = await requireAdmin("promotions");
  await adminDb().from("promo_codes").update({ archived: true, active: false }).eq("id", id);
  await audit(user, "delete", "promo_code", id, "Code archivé");
  revalidatePath("/admin/promotions");
  return { ok: "Archivé." };
}

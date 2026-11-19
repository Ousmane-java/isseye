"use server";

import { getAdminUser, adminDb } from "@/lib/supabase";
import { canAccess } from "@/config/admin";
import { getCurrencies } from "@/lib/currencies";
import { formatMoney } from "@/lib/currency";

export type NewOrder = { id: string; number: string; name: string; total: string; mode: string };

/** Commandes payées depuis `since` (alerte de l'admin, interrogée toutes les 30 secondes). */
export async function newOrdersSince(since: string): Promise<{ orders: NewOrder[]; now: string }> {
  const now = new Date().toISOString();
  const user = await getAdminUser();
  if (!user || !canAccess(user.role, "orders") || Number.isNaN(Date.parse(since))) return { orders: [], now };
  const [{ data }, currencies] = await Promise.all([
    adminDb().from("orders").select("id, number, first_name, last_name, total, currency_code, delivery_type").gt("paid_at", since).order("paid_at").limit(10),
    getCurrencies(),
  ]);
  return {
    now,
    orders: (data ?? []).map((o) => ({
      id: o.id,
      number: o.number,
      name: `${o.first_name} ${o.last_name}`,
      total: formatMoney(o.total, currencies.find((c) => c.code === o.currency_code) ?? currencies[0]),
      mode: o.delivery_type === "pickup" ? "Retrait" : o.delivery_type === "local" ? "Livraison locale" : "Envoi postal",
    })),
  };
}

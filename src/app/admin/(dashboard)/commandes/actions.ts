"use server";

import { revalidatePath } from "next/cache";
import { audit, requireAdmin, revalidateSite } from "@/lib/admin-auth";
import { adminDb } from "@/lib/supabase";
import { getCurrencies } from "@/lib/currencies";
import { parseMoney } from "@/lib/currency";
import { cancelOrder, getOrder, logOrderEvent, markDelivered, markOutForLocalDelivery, markPreparing, markReadyForPickup, markShipped, refundOrder } from "@/lib/orders";
import { carriers, orderWorkflow, statusLabel, type OrderStatus } from "@/lib/order-types";
import type { ActionState } from "@/lib/admin-types";

async function load(id: string) {
  const user = await requireAdmin("orders");
  const order = await getOrder(id);
  if (!order) throw new Error("Commande introuvable.");
  return { user, order };
}
const done = (id: string, ok: string): ActionState => {
  revalidatePath(`/admin/commandes/${id}`);
  revalidatePath("/admin", "layout");
  revalidateSite(); // stock affiché sur le site
  return { ok };
};

export type Shipment = { carrier: string; tracking: string; trackingUrl: string };

/**
 * Fait avancer la commande à l'étape choisie (préparation, prête à retirer, en livraison,
 * expédiée, livrée/retirée), selon son mode de livraison. La cliente reçoit l'email de l'étape si `notify`.
 */
export async function advanceOrder(id: string, target: OrderStatus, notify: boolean, shipment?: Shipment): Promise<ActionState> {
  const { user, order } = await load(id);
  const flow = orderWorkflow(order.delivery_type);
  const from = flow.indexOf(order.status);
  const to = flow.indexOf(target);
  if (from < 0 || to <= from) return { error: "Cette étape n'est pas possible depuis le statut actuel." };
  const opts = { notify, actor: user.email };

  switch (target) {
    case "en_preparation":
      await markPreparing(order, opts);
      break;
    case "prete_retrait":
      await markReadyForPickup(order, opts);
      break;
    case "expediee":
      if (order.delivery_type === "local") await markOutForLocalDelivery(order, opts);
      else {
        const carrier = shipment?.carrier.trim() ?? "";
        const tracking = shipment?.tracking.trim() ?? "";
        let trackingUrl = shipment?.trackingUrl.trim() || null;
        if (trackingUrl && !/^https:\/\//.test(trackingUrl)) return { error: "Le lien de suivi doit commencer par https://" };
        const known = carriers.find((c) => c.name === carrier);
        if (!trackingUrl && known && tracking) trackingUrl = known.url.replace("{tracking}", encodeURIComponent(tracking));
        await markShipped(order, { carrier, trackingNumber: tracking, trackingUrl }, opts);
      }
      break;
    case "livree":
      await markDelivered(order, opts);
      break;
    default:
      return { error: "Étape inconnue." };
  }
  const label = statusLabel({ status: target, delivery_type: order.delivery_type });
  await audit(user, "update", "order", id, `${order.number} : ${label}`);
  return done(id, notify ? `${label} · email envoyé à la cliente.` : `${label}.`);
}

/** Met à jour le numéro de suivi d'une commande déjà expédiée (sans nouvel email). */
export async function updateTracking(id: string, _: ActionState, fd: FormData): Promise<ActionState> {
  const { user, order } = await load(id);
  if (order.status !== "expediee" || order.delivery_type !== "postal") return { error: "Commande non expédiée par la poste." };
  const carrier = String(fd.get("carrier") ?? "").trim();
  const tracking = String(fd.get("tracking") ?? "").trim();
  let trackingUrl = String(fd.get("tracking_url") ?? "").trim() || null;
  if (trackingUrl && !/^https:\/\//.test(trackingUrl)) return { error: "Le lien de suivi doit commencer par https://" };
  const known = carriers.find((c) => c.name === carrier);
  if (!trackingUrl && known && tracking) trackingUrl = known.url.replace("{tracking}", encodeURIComponent(tracking));
  await adminDb().from("orders").update({ carrier: carrier || null, tracking_number: tracking || null, tracking_url: trackingUrl }).eq("id", id);
  await logOrderEvent(id, "suivi", `Suivi modifié : ${carrier} ${tracking}`.trim(), false, user.email);
  await audit(user, "update", "order", id, `${order.number} : suivi ${carrier} ${tracking}`);
  return done(id, "Suivi mis à jour.");
}

export async function cancelOrderAction(id: string, refund: boolean, notify: boolean): Promise<ActionState> {
  const { user, order } = await load(id);
  if (["annulee", "remboursee"].includes(order.status)) return { error: "Commande déjà annulée." };
  if (order.status === "expediee" || order.status === "livree") return { error: "Commande déjà partie : utilisez plutôt un remboursement." };
  try {
    await cancelOrder(order, { refund, notify, actor: user.email });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Annulation impossible." };
  }
  await audit(user, "update", "order", id, `${order.number} : annulée`);
  return done(id, "Commande annulée, stock remis à jour.");
}

export async function refundOrderAction(id: string, _: ActionState, fd: FormData): Promise<ActionState> {
  const { user, order } = await load(id);
  if (!order.paid_at) return { error: "Cette commande n'a pas été payée." };
  const cur = (await getCurrencies()).find((c) => c.code === order.currency_code)!;
  const amount = parseMoney(String(fd.get("amount") ?? ""), cur);
  if (!amount) return { error: "Montant invalide." };
  try {
    await refundOrder(order, amount, { notify: fd.get("notify") === "on", actor: user.email });
    if (fd.get("restock") === "on") await adminDb().rpc("release_order_stock", { p_order: id });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Remboursement impossible." };
  }
  await audit(user, "update", "order", id, `${order.number} : remboursement ${fd.get("amount")} ${cur.code}`);
  return done(id, "Remboursement effectué.");
}

export async function saveAdminNotes(id: string, _: ActionState, fd: FormData): Promise<ActionState> {
  const { user, order } = await load(id);
  await adminDb().from("orders").update({ admin_notes: String(fd.get("admin_notes") ?? "").slice(0, 4000) || null }).eq("id", id);
  await audit(user, "update", "order", id, `${order.number} : note interne`);
  return done(id, "Note enregistrée.");
}

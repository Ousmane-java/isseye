import "server-only";
import { revalidateTag } from "next/cache";
import { SITE_TAG } from "@/lib/cache";
import { adminDb } from "@/lib/supabase";
import { getSettings } from "@/lib/settings";
import { getCurrencies } from "@/lib/currencies";
import { getStripe } from "@/lib/stripe";
import { adminUrl, sendEmail, sendTemplate, siteUrl, unsubscribeUrlFor } from "@/lib/email";
import { formatMoney, type Currency } from "@/lib/currency";
import { countryName } from "@/config/countries";
import { scheduleLabel, trackingSteps, type OrderRow } from "@/lib/order-types";
import { buildInvoicePdf } from "@/lib/invoice";

// Cycle de vie d'une commande : paiement confirmé, préparation, expédition, livraison,
// annulation et remboursement. Chaque étape met à jour le stock et prévient la cliente.

export const orderSelect = "*, items:order_items(*)";

const esc = (s: string | null | undefined) => (s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export async function getOrder(id: string) {
  const { data } = await adminDb().from("orders").select(orderSelect).eq("id", id).maybeSingle();
  return data as OrderRow | null;
}

export async function getOrderByToken(token: string) {
  if (!/^[a-f0-9]{32,64}$/.test(token)) return null;
  const { data } = await adminDb().from("orders").select(orderSelect).eq("access_token", token).maybeSingle();
  return data as OrderRow | null;
}

async function currencyOf(order: Pick<OrderRow, "currency_code">): Promise<Currency> {
  const currencies = await getCurrencies();
  return currencies.find((c) => c.code === order.currency_code) ?? currencies[0];
}

export const trackingLink = (order: Pick<OrderRow, "access_token">) => `${siteUrl}/suivi/${order.access_token}`;

/** Récapitulatif HTML (articles et totaux) inséré dans les emails. */
export async function orderSummaryHtml(order: OrderRow) {
  const cur = await currencyOf(order);
  const { delivery } = await getSettings();
  const pickupInfo = order.delivery_type === "pickup" ? [delivery.pickupHours, delivery.pickupInstructions].filter(Boolean).map((t) => `<br>${esc(t)}`).join("") : "";
  const m = (v: number) => formatMoney(v, cur);
  const rows = (order.items ?? [])
    .map(
      (i) =>
        `<tr><td style="padding:10px 0;border-bottom:1px solid #eee5db;font-size:14px"><strong>${esc(i.product_name)}</strong>${i.variant_label ? `<br><span style="color:#7a6e64;font-size:13px">${esc(i.variant_label)}</span>` : ""}</td><td style="padding:10px 0;border-bottom:1px solid #eee5db;font-size:14px;text-align:center;color:#7a6e64">× ${i.quantity}</td><td style="padding:10px 0;border-bottom:1px solid #eee5db;font-size:14px;text-align:right">${m(i.line_total)}</td></tr>`,
    )
    .join("");
  const line = (label: string, value: string, strong = false) =>
    `<tr><td colspan="2" style="padding:4px 0;font-size:14px;${strong ? "font-weight:bold;color:#1b1917" : "color:#7a6e64"}">${label}</td><td style="padding:4px 0;font-size:14px;text-align:right;${strong ? "font-weight:bold;color:#1b1917" : ""}">${value}</td></tr>`;
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px">${rows}
${line("Sous-total", m(order.subtotal))}
${order.discount ? line(`Réduction${order.promo_code ? ` (${order.promo_code})` : ""}`, `−${m(order.discount)}`) : ""}
${line(`Livraison${order.shipping_method ? ` · ${esc(order.shipping_method)}` : ""}`, order.shipping ? m(order.shipping) : "Offerte")}
${order.gift_wrap ? line("Emballage cadeau", m(order.gift_wrap)) : ""}
${line("Total", m(order.total), true)}
${order.tax_included ? line("Dont TVA", m(order.tax_included)) : ""}
</table>
${order.invoice_number ? `<p style="margin:14px 0 0;font-size:13px"><a href="${siteUrl}/facture/${order.access_token}" style="color:#8b693e">Télécharger la facture ${order.invoice_number} (PDF)</a></p>` : ""}
<p style="margin:20px 0 0;font-size:13px;line-height:1.6;color:#7a6e64"><strong style="color:#2a2622">${order.delivery_type === "pickup" ? "Retrait à la boutique" : "Livraison"}</strong><br>${esc(order.first_name)} ${esc(order.last_name)}<br>${esc(order.ship_line1)}${order.ship_line2 ? `<br>${esc(order.ship_line2)}` : ""}<br>${esc(order.ship_postal_code)} ${esc(order.ship_city)}<br>${countryName(order.ship_country)}${pickupInfo}${scheduleLabel(order) ? `<br><strong style="color:#8b693e">${order.delivery_type === "pickup" ? "Retrait" : "Livraison"} : ${esc(scheduleLabel(order))}</strong>` : ""}</p>`;
}

async function orderVars(order: OrderRow) {
  const cur = await currencyOf(order);
  return {
    prenom: order.first_name,
    nom: order.last_name,
    numero: order.number,
    total: formatMoney(order.total, cur),
    transporteur: order.carrier ?? "notre transporteur",
    suivi: order.tracking_number ?? "",
    lien_suivi: trackingLink(order),
    creneau: scheduleLabel(order) ?? "",
  };
}

/**
 * Paiement confirmé (webhook Stripe, retour de paiement ou paiement simulé en local).
 * Idempotent : une commande déjà traitée n'est jamais décomptée ni notifiée deux fois.
 */
export async function finalizePaidOrder(orderId: string, payment: { provider: string; paymentIntentId?: string | null }) {
  const db = adminDb();
  const { data } = await db
    .from("orders")
    .update({ status: "payee", paid_at: new Date().toISOString(), payment_provider: payment.provider, payment_intent_id: payment.paymentIntentId ?? null })
    .eq("id", orderId)
    .in("status", ["en_attente_paiement", "abandonnee"])
    .select(orderSelect)
    .maybeSingle();
  const order = data as OrderRow | null;
  if (!order) return null;

  await db.rpc("commit_order_stock", { p_order: order.id });
  const { data: invoiceNumber } = await db.rpc("assign_invoice_number", { p_order: order.id });
  if (typeof invoiceNumber === "string") order.invoice_number = invoiceNumber;
  if (order.promo_code) await db.rpc("use_promo_code", { p_code: order.promo_code });
  if (order.marketing_consent) {
    await db.from("newsletter_subscribers").upsert({ email: order.email.toLowerCase(), first_name: order.first_name, source: "commande", unsubscribed_at: null }, { onConflict: "email" });
  }

  const vars = await orderVars(order);
  const summary = await orderSummaryHtml(order);
  await logOrderEvent(order.id, "creee", "Commande passée", false, "cliente");
  // Facture PDF jointe à la confirmation (si sa génération échoue, l'email part quand même)
  const invoice = order.invoice_number ? await buildInvoicePdf(order).catch((err) => (console.error("[facture]", err), null)) : null;
  const attachments = invoice ? [{ filename: `ISSEYE-${order.invoice_number}.pdf`, content: invoice }] : undefined;
  const confirmed = await sendTemplate("order_confirmation", order.email, vars, { ctaUrl: trackingLink(order), extraHtml: progressHtml(order) + summary + (invoice ? `<p style="margin:20px 0 0;font-size:13px;color:#7a6e64">Votre facture ${order.invoice_number} est jointe à cet email (PDF).</p>` : ""), attachments });
  await logOrderEvent(order.id, "payee", `Paiement reçu (${payment.provider === "stripe" ? "Stripe" : "simulé"})`, confirmed, "système");

  const settings = await getSettings();
  const notify = settings.store.notifyEmail || settings.contact.email;
  if (notify) await sendTemplate("admin_new_order", notify, vars, { ctaUrl: `${adminUrl}/commandes/${order.id}`, extraHtml: summary });
  if (settings.store.lowStockEmail && notify) await alertLowStock(order, notify);
  // Stock affiché sur le site : rafraîchi (possible depuis le webhook ; ignoré pendant l'affichage d'une page)
  try {
    revalidateTag(SITE_TAG, { expire: 0 });
  } catch {
    // le cache expirera de lui-même
  }
  return order;
}

async function alertLowStock(order: OrderRow, to: string) {
  const ids = (order.items ?? []).map((i) => i.variant_id).filter(Boolean) as string[];
  if (!ids.length) return;
  const { data } = await adminDb().from("product_variants").select("sku, label, stock, low_stock_threshold, track_stock, product:products(name)").in("id", ids);
  const low = (data ?? []).filter((v) => v.track_stock && v.stock <= v.low_stock_threshold);
  if (!low.length) return;
  const list = low.map((v) => `<li>${esc((v.product as unknown as { name: string } | null)?.name)} ${esc(v.label)} : <strong>${v.stock}</strong> en stock</li>`).join("");
  await sendEmail({
    to,
    subject: `Stock bas : ${low.length} article${low.length > 1 ? "s" : ""}`,
    html: `<p>Après la commande ${order.number}, ces articles passent sous leur seuil d'alerte :</p><ul>${list}</ul><p><a href="${adminUrl}/stock">Ouvrir le stock</a></p>`,
  });
}

export type StepOptions = { notify: boolean; actor: string };

/** Historique de la commande (Admin › Commandes › détail). N'interrompt jamais l'action. */
export async function logOrderEvent(orderId: string, kind: string, label: string, notified: boolean, actor: string) {
  try {
    await adminDb().from("order_events").insert({ order_id: orderId, kind, label, notified, actor });
  } catch (err) {
    console.error("[historique commande]", err);
  }
}

/** Frise d'avancement insérée dans les emails : étapes franchies en or, étape en cours soulignée. */
export function progressHtml(order: Pick<OrderRow, "status" | "delivery_type">) {
  const steps = trackingSteps(order.delivery_type);
  const reached = steps.findIndex((s) => s.status === order.status);
  if (reached < 0) return "";
  const cells = steps
    .map((step, i) => {
      const done = i <= reached;
      const current = i === reached;
      return `<td align="center" valign="top" style="width:${Math.floor(100 / steps.length)}%;padding:0 4px">
<div style="height:3px;background:${done ? "#c4974f" : "#eee5db"};border-radius:2px"></div>
<div style="margin:10px auto 6px;width:22px;height:22px;line-height:22px;border-radius:11px;font-size:11px;font-weight:bold;${done ? "background:#1b1917;color:#f6f1ea" : "background:#ffffff;color:#a8968a;border:1px solid #e4d6c9"}">${done ? "&#10003;" : i + 1}</div>
<div style="font-size:11px;letter-spacing:1px;text-transform:uppercase;color:${current ? "#8b693e" : done ? "#2a2622" : "#a8968a"};${current ? "font-weight:bold" : ""}">${step.label}</div>
</td>`;
    })
    .join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 4px"><tr>${cells}</tr></table>`;
}

async function update(order: OrderRow, patch: Record<string, unknown>) {
  const { data } = await adminDb().from("orders").update(patch).eq("id", order.id).select(orderSelect).single();
  return data as OrderRow;
}

/** Email d'étape (si demandé), avec la frise d'avancement ; puis trace dans l'historique. */
async function step(order: OrderRow, template: string, label: string, opts: StepOptions, extra: { vars?: Record<string, string>; ctaUrl?: string; extraHtml?: string } = {}) {
  let notified = false;
  if (opts.notify) {
    notified = await sendTemplate(template, order.email, { ...(await orderVars(order)), ...(extra.vars ?? {}) }, {
      ctaUrl: extra.ctaUrl ?? trackingLink(order),
      extraHtml: progressHtml(order) + (extra.extraHtml ?? ""),
    });
  }
  await logOrderEvent(order.id, order.status, label, notified, opts.actor);
  return order;
}

export async function markPreparing(order: OrderRow, opts: StepOptions) {
  return step(await update(order, { status: "en_preparation" }), "order_preparing", "En préparation", opts);
}

/** Retrait : commande prête ; l'email donne l'adresse exacte et les horaires de la boutique. */
export async function markReadyForPickup(order: OrderRow, opts: StepOptions) {
  const updated = await update(order, { status: "prete_retrait", ready_at: new Date().toISOString() });
  const { delivery } = await getSettings();
  return step(updated, "order_ready_pickup", "Prête à retirer", opts, {
    vars: { adresse_retrait: delivery.originAddress, horaires_retrait: delivery.pickupHours ? `Horaires : ${delivery.pickupHours}` : "" },
  });
}

/** Livraison locale : la commande part chez la cliente. */
export async function markOutForLocalDelivery(order: OrderRow, opts: StepOptions) {
  const updated = await update(order, { status: "expediee", shipped_at: new Date().toISOString(), carrier: "Livraison ISSEYE" });
  return step(updated, "order_local_delivery", "En livraison", opts);
}

export async function markShipped(order: OrderRow, shipment: { carrier: string; trackingNumber: string; trackingUrl: string | null }, opts: StepOptions) {
  const updated = await update(order, {
    status: "expediee",
    shipped_at: new Date().toISOString(),
    carrier: shipment.carrier || null,
    tracking_number: shipment.trackingNumber || null,
    tracking_url: shipment.trackingUrl,
  });
  return step(updated, "order_shipped", `Expédiée${shipment.carrier ? ` · ${shipment.carrier}` : ""}${shipment.trackingNumber ? ` ${shipment.trackingNumber}` : ""}`, opts, {
    ctaUrl: updated.tracking_url ?? trackingLink(updated),
  });
}

/** Livrée, ou retirée pour un retrait en boutique. */
export async function markDelivered(order: OrderRow, opts: StepOptions) {
  const updated = await update(order, { status: "livree", delivered_at: new Date().toISOString() });
  const pickup = updated.delivery_type === "pickup";
  return step(updated, pickup ? "order_picked_up" : "order_delivered", pickup ? "Retirée à la boutique" : "Livrée", opts);
}

/** Remboursement (total ou partiel) sur le moyen de paiement d'origine. */
export async function refundOrder(order: OrderRow, amount: number, opts: StepOptions = { notify: true, actor: "système" }) {
  const remaining = order.total - order.refunded_amount;
  if (amount <= 0 || amount > remaining) throw new Error("Montant de remboursement invalide.");
  if (order.payment_provider === "stripe") {
    const stripe = getStripe();
    if (!stripe || !order.payment_intent_id) throw new Error("Paiement Stripe introuvable : remboursez depuis le tableau de bord Stripe.");
    await stripe.refunds.create({ payment_intent: order.payment_intent_id, amount }, { idempotencyKey: `refund-${order.id}-${order.refunded_amount}-${amount}` });
  }
  const refunded = order.refunded_amount + amount;
  const full = refunded >= order.total;
  const updated = await update(order, { refunded_amount: refunded, refunded_at: new Date().toISOString(), ...(full ? { status: "remboursee" } : {}) });
  const cur = await currencyOf(updated);
  const notified = opts.notify
    ? await sendTemplate("order_refunded", updated.email, { ...(await orderVars(updated)), montant: formatMoney(amount, cur) }, { ctaUrl: trackingLink(updated) })
    : false;
  await logOrderEvent(order.id, "remboursement", `Remboursement de ${formatMoney(amount, cur)}${full ? " (total)" : ""}`, notified, opts.actor);
  return updated;
}

/** Annulation : remise en stock, code promo libéré, remboursement intégral si la commande était payée. */
export async function cancelOrder(order: OrderRow, opts: { refund: boolean; notify: boolean; actor: string }) {
  const db = adminDb();
  if (opts.refund && order.paid_at && order.total - order.refunded_amount > 0) {
    await refundOrder(order, order.total - order.refunded_amount, { notify: false, actor: opts.actor });
  }
  await db.rpc("release_order_stock", { p_order: order.id });
  if (order.promo_code && order.paid_at) await db.rpc("release_promo_code", { p_code: order.promo_code });
  const updated = await update(order, { status: opts.refund && order.paid_at ? "remboursee" : "annulee", cancelled_at: new Date().toISOString() });
  const notified = opts.notify ? await sendTemplate("order_cancelled", updated.email, await orderVars(updated), {}) : false;
  await logOrderEvent(order.id, "annulee", opts.refund && order.paid_at ? "Annulée et remboursée" : "Annulée", notified, opts.actor);
  return updated;
}

/** Relance d'une commande non payée : « votre sélection vous attend », avec lien pour reprendre le panier. */
export async function sendCartReminder(order: OrderRow) {
  await sendTemplate("abandoned_cart", order.email, await orderVars(order), {
    ctaUrl: `${siteUrl}/panier/reprendre/${order.access_token}`,
    extraHtml: await orderSummaryHtml(order),
    unsubscribeUrl: (await unsubscribeUrlFor(order.email)) ?? undefined,
  });
  await adminDb().from("orders").update({ reminder_sent_at: new Date().toISOString() }).eq("id", order.id);
}

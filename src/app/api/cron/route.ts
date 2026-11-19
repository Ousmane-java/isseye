import { NextResponse } from "next/server";
import { adminDb, isSupabaseConfigured } from "@/lib/supabase";
import { refreshVariableRates } from "@/lib/rates";
import { sendCartReminder, trackingLink } from "@/lib/orders";
import { sendTemplate, siteUrl } from "@/lib/email";
import type { OrderRow } from "@/lib/order-types";

// Tâches automatiques, lancées chaque matin par Vercel Cron (voir vercel.json) :
// taux du dollar, paiements jamais aboutis, relance de panier, demande d'avis.

export const maxDuration = 300;
const hours = (n: number) => new Date(Date.now() - n * 3_600_000).toISOString();

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  if (!isSupabaseConfigured) return NextResponse.json({ skipped: "Supabase non configuré" });
  const db = adminDb();
  const report: Record<string, unknown> = {};

  report.rates = await refreshVariableRates();

  // Paiements ouverts depuis plus de 3 h : abandonnés (la session Stripe expire au bout d'une heure)
  const { data: stale } = await db.from("orders").update({ status: "abandonnee" }).eq("status", "en_attente_paiement").lt("created_at", hours(3)).select("id");
  report.abandoned = stale?.length ?? 0;

  // Relance unique « votre sélection vous attend », entre 2 h et 72 h après, si aucune commande payée depuis
  const { data: toRemind } = await db
    .from("orders")
    .select("*, items:order_items(*)")
    .eq("status", "abandonnee")
    .is("reminder_sent_at", null)
    .lt("created_at", hours(2))
    .gt("created_at", hours(72))
    .limit(50);
  let reminded = 0;
  for (const order of (toRemind ?? []) as OrderRow[]) {
    const { count } = await db.from("orders").select("id", { count: "exact", head: true }).eq("email", order.email).gt("created_at", order.created_at).not("status", "in", "(abandonnee,en_attente_paiement)");
    if (count) {
      await db.from("orders").update({ reminder_sent_at: new Date().toISOString() }).eq("id", order.id);
      continue;
    }
    await sendCartReminder(order);
    reminded++;
  }
  report.reminded = reminded;

  // Demande d'avis 7 jours après la livraison
  const { data: delivered } = await db.from("orders").select("*, items:order_items(*)").eq("status", "livree").is("review_requested_at", null).lt("delivered_at", hours(24 * 7)).limit(50);
  for (const order of (delivered ?? []) as OrderRow[]) {
    const first = order.items?.[0];
    const { data: product } = first?.product_id ? await db.from("products").select("slug").eq("id", first.product_id).maybeSingle() : { data: null };
    await sendTemplate("review_request", order.email, { prenom: order.first_name, numero: order.number, produit: first?.product_name ?? "" }, { ctaUrl: product ? `${siteUrl}/parfum/${product.slug}#avis` : trackingLink(order) });
    await db.from("orders").update({ review_requested_at: new Date().toISOString() }).eq("id", order.id);
  }
  report.reviewRequests = delivered?.length ?? 0;

  return NextResponse.json(report);
}

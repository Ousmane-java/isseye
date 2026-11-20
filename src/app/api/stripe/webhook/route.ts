import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { adminDb } from "@/lib/supabase";
import { getStripe } from "@/lib/stripe";
import { finalizePaidOrder } from "@/lib/orders";

// Stripe → ISSEYE : confirmation des paiements, paiements expirés ou refusés.
// À déclarer dans Stripe (Développeurs › Webhooks) : https://isseyes.com/api/stripe/webhook
// Événements : checkout.session.completed, checkout.session.async_payment_succeeded,
// checkout.session.async_payment_failed, checkout.session.expired

export async function POST(request: Request) {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !secret) return NextResponse.json({ error: "Stripe non configuré" }, { status: 503 });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(await request.text(), request.headers.get("stripe-signature") ?? "", secret);
  } catch {
    return NextResponse.json({ error: "Signature invalide" }, { status: 400 });
  }

  if (event.type.startsWith("checkout.session.")) {
    const session = event.data.object as Stripe.Checkout.Session;
    const orderId = session.metadata?.order_id ?? session.client_reference_id;
    if (orderId) {
      const paid = (event.type === "checkout.session.completed" && session.payment_status === "paid") || event.type === "checkout.session.async_payment_succeeded";
      if (paid) {
        const paymentIntent = typeof session.payment_intent === "string" ? session.payment_intent : (session.payment_intent?.id ?? null);
        await finalizePaidOrder(orderId, { provider: "stripe", paymentIntentId: paymentIntent });
      } else if (event.type === "checkout.session.expired" || event.type === "checkout.session.async_payment_failed") {
        await adminDb().from("orders").update({ status: "abandonnee" }).eq("id", orderId).eq("status", "en_attente_paiement");
      }
    }
  }
  return NextResponse.json({ received: true });
}

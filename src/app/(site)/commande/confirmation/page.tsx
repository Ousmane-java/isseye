import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { finalizePaidOrder, getOrderByToken } from "@/lib/orders";
import { getCurrencies } from "@/lib/currencies";
import { getStripe } from "@/lib/stripe";
import { isSupabaseConfigured } from "@/lib/supabase";
import { ClearCart } from "@/components/cart/ClearCart";
import { OrderSummary, OrderTimeline } from "@/components/OrderView";
import { MaskLines } from "@/components/motion/Reveal";

export const metadata: Metadata = { title: "Merci", robots: { index: false } };

export default async function ConfirmationPage({ searchParams }: PageProps<"/commande/confirmation">) {
  const { ref, session_id } = await searchParams;
  if (!isSupabaseConfigured || typeof ref !== "string") notFound();
  let order = await getOrderByToken(ref);
  if (!order) notFound();

  // Retour de Stripe avant le webhook : on vérifie le paiement directement
  const stripe = getStripe();
  if (order.status === "en_attente_paiement" && stripe && typeof session_id === "string" && session_id === order.payment_session_id) {
    const session = await stripe.checkout.sessions.retrieve(session_id);
    if (session.payment_status === "paid") {
      const paymentIntent = typeof session.payment_intent === "string" ? session.payment_intent : (session.payment_intent?.id ?? null);
      order = (await finalizePaidOrder(order.id, { provider: "stripe", paymentIntentId: paymentIntent })) ?? (await getOrderByToken(ref))!;
    }
  }

  const currency = (await getCurrencies()).find((c) => c.code === order.currency_code)!;
  const paid = order.status !== "en_attente_paiement" && order.status !== "abandonnee";

  return (
    <div className="page-top mx-auto max-w-[1100px] px-4 pb-32 sm:px-8">
      <ClearCart />
      <p className="eyebrow filet animate-fade-up text-bronze">Commande {order.number}</p>
      <MaskLines as="h1" delay={0.1} lines={paid ? [`Merci, ${order.first_name}.`] : ["Paiement en cours…"]} className="mt-5 font-display text-[clamp(2.8rem,7vw,6rem)] leading-[0.95] font-light text-encre" />
      <p className="mt-6 max-w-2xl text-[16px] leading-relaxed text-gris">
        {paid
          ? `Votre commande est confirmée. Un email récapitulatif vient d'être envoyé à ${order.email}, avec votre lien de suivi. Nous la préparons avec soin.`
          : "Votre paiement est en cours de validation par votre banque. Vous recevrez un email de confirmation dès qu'il sera accepté."}
      </p>
      <div className="mt-12">
        <OrderTimeline order={order} />
      </div>
      <div className="mt-14">
        <OrderSummary order={order} currency={currency} />
      </div>
      <div className="mt-14 flex flex-wrap gap-4">
        <Link href={`/suivi/${order.access_token}`} className="btn-primary">
          Suivre ma commande
        </Link>
        <Link href="/boutique" className="btn-outline text-encre">
          Continuer mes achats
        </Link>
      </div>
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { finalizePaidOrder, getOrderByToken } from "@/lib/orders";
import { getCurrencies } from "@/lib/currencies";
import { getStripe } from "@/lib/stripe";
import { isSupabaseConfigured } from "@/lib/supabase";
import { ClearCart } from "@/components/cart/ClearCart";
import { OrderSummary, OrderTimeline } from "@/components/OrderView";
import { PageIntro } from "@/components/PageIntro";
import { ArrowLeft, FileText } from "lucide-react";
import { CreateAccountFromOrder } from "@/components/AccountForms";
import { getCustomer } from "@/lib/customer";

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

  const [currencies, customer] = await Promise.all([getCurrencies(), getCustomer()]);
  const currency = currencies.find((c) => c.code === order.currency_code)!;
  const paid = order.status !== "en_attente_paiement" && order.status !== "abandonnee";

  return (
    <>
      <ClearCart />
      <PageIntro
        eyebrow={`Commande ${order.number}`}
        title={paid ? `Merci, ${order.first_name}.` : "Paiement en cours…"}
        text={
          paid
            ? `Votre commande est confirmée. Un email récapitulatif vient d'être envoyé à ${order.email}${order.invoice_number ? ", avec votre facture" : ""}. Nous la préparons avec soin.`
            : "Votre paiement est en cours de validation par votre banque. Vous recevrez un email de confirmation dès qu'il sera accepté."
        }
      />
      <div className="mx-auto max-w-[1440px] px-4 pb-32 sm:px-8">
        <div className="mb-14">
          <OrderTimeline order={order} />
        </div>
        <OrderSummary
          order={order}
          currency={currency}
          actions={
            <>
              <Link href={`/suivi/${order.access_token}`} className="btn-primary w-full">
                Suivre ma commande
              </Link>
              {order.invoice_number && (
                <a href={`/facture/${order.access_token}`} target="_blank" className="btn-outline w-full text-encre">
                  <FileText className="size-4" strokeWidth={1.5} /> Facture {order.invoice_number}
                </a>
              )}
              <Link href="/boutique" className="mt-1 inline-flex items-center justify-center gap-2 text-[12px] font-semibold tracking-[0.18em] text-encre uppercase transition hover:text-bronze">
                <ArrowLeft className="size-4" strokeWidth={1.5} /> Continuer mes achats
              </Link>
            </>
          }
        >
          {!customer && paid && <CreateAccountFromOrder token={order.access_token} email={order.email} />}
        </OrderSummary>
      </div>
    </>
  );
}

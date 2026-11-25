import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getOrderByToken } from "@/lib/orders";
import { getCurrencies } from "@/lib/currencies";
import { isSupabaseConfigured } from "@/lib/supabase";
import { OrderSummary, OrderTimeline } from "@/components/OrderView";
import { PageIntro } from "@/components/PageIntro";
import { FileText, RotateCcw } from "lucide-react";
import { statusLabel } from "@/lib/order-types";

export const metadata: Metadata = { title: "Suivi de commande", robots: { index: false } };
const dateFormat = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeZone: "Europe/Paris" });

export default async function OrderTrackingPage({ params }: PageProps<"/suivi/[token]">) {
  const { token } = await params;
  const order = isSupabaseConfigured ? await getOrderByToken(token) : null;
  if (!order) notFound();
  const currency = (await getCurrencies()).find((c) => c.code === order.currency_code)!;
  return (
    <>
      <PageIntro eyebrow={`Passée le ${dateFormat.format(new Date(order.created_at))}`} title={`Commande ${order.number.replace("-", "\u2011")}`} text={`Statut : ${statusLabel(order)}`} />
      <div className="mx-auto max-w-[1440px] px-4 pb-32 sm:px-8">
        <div className="mb-14">
          <OrderTimeline order={order} />
        </div>
        <OrderSummary
          order={order}
          currency={currency}
          actions={
            <>
              <Link href={`/panier/recommander/${order.access_token}`} className="btn-primary w-full">
                <RotateCcw className="size-4" strokeWidth={1.5} /> Commander à nouveau
              </Link>
              {order.invoice_number && (
                <a href={`/facture/${order.access_token}`} target="_blank" className="btn-outline w-full text-encre">
                  <FileText className="size-4" strokeWidth={1.5} /> Facture {order.invoice_number}
                </a>
              )}
            </>
          }
        />
      </div>
    </>
  );
}

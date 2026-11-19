import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getOrderByToken } from "@/lib/orders";
import { getCurrencies } from "@/lib/currencies";
import { isSupabaseConfigured } from "@/lib/supabase";
import { OrderSummary, OrderTimeline } from "@/components/OrderView";
import { MaskLines } from "@/components/motion/Reveal";

export const metadata: Metadata = { title: "Suivi de commande", robots: { index: false } };
const dateFormat = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeZone: "Europe/Paris" });

export default async function OrderTrackingPage({ params }: PageProps<"/suivi/[token]">) {
  const { token } = await params;
  const order = isSupabaseConfigured ? await getOrderByToken(token) : null;
  if (!order) notFound();
  const currency = (await getCurrencies()).find((c) => c.code === order.currency_code)!;
  return (
    <div className="page-top mx-auto max-w-[1100px] px-4 pb-32 sm:px-8">
      <p className="eyebrow filet text-bronze">Passée le {dateFormat.format(new Date(order.created_at))}</p>
      <MaskLines as="h1" lines={[`Commande ${order.number}`]} className="mt-5 font-display text-[clamp(2.6rem,6vw,5rem)] leading-[0.95] font-light text-encre" />
      <div className="mt-12">
        <OrderTimeline order={order} />
      </div>
      <div className="mt-14">
        <OrderSummary order={order} currency={currency} />
      </div>
      <p className="mt-14 text-sm text-gris">
        Une question sur cette commande ?{" "}
        <Link href={`/contact?commande=${order.number}`} className="text-bronze underline underline-offset-4">
          Écrivez-nous
        </Link>
        .
      </p>
    </div>
  );
}

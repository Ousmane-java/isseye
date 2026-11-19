import Image from "next/image";
import { Check } from "lucide-react";
import clsx from "clsx";
import { formatMoney, type Currency } from "@/lib/currency";
import { countryName } from "@/config/countries";
import { scheduleLabel, statusLabels, trackingSteps, type OrderRow } from "@/lib/order-types";

const dateFormat = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeZone: "Europe/Paris" });

/** Étapes de la commande, de la confirmation à la livraison. */
export function OrderTimeline({ order }: { order: OrderRow }) {
  if (["annulee", "remboursee", "abandonnee", "en_attente_paiement"].includes(order.status)) {
    return <p className="rounded-xl bg-lin-clair px-5 py-4 text-[15px] text-encre">Statut : <strong className="font-semibold">{statusLabels[order.status]}</strong></p>;
  }
  const steps = trackingSteps(order.delivery_type);
  const reached = steps.findIndex((s) => s.status === order.status);
  const dates: Record<string, string | null> = { payee: order.paid_at, en_preparation: null, prete_retrait: order.ready_at, expediee: order.shipped_at, livree: order.delivered_at };
  return (
    <ol className="grid grid-cols-4 gap-2">
      {steps.map((step, i) => {
        const done = i <= reached;
        return (
          <li key={step.status} className="relative">
            <div className={clsx("h-[3px] rounded-full", done ? "bg-gradient-to-r from-bronze to-or" : "bg-encre/10")} />
            <div className="mt-4 flex items-center gap-2">
              <span className={clsx("grid size-5 shrink-0 place-items-center rounded-full", done ? "bg-noir text-creme" : "border border-encre/20")}>{done && <Check className="size-3" />}</span>
              <span className={clsx("text-[11px] font-semibold tracking-[0.12em] uppercase sm:text-[12px]", done ? "text-encre" : "text-gris")}>{step.label}</span>
            </div>
            {dates[step.status] && <p className="mt-1 pl-7 text-[12px] text-gris">{dateFormat.format(new Date(dates[step.status]!))}</p>}
          </li>
        );
      })}
    </ol>
  );
}

/** Articles, totaux et adresse d'une commande (confirmation, suivi, espace cliente). */
export function OrderSummary({ order, currency }: { order: OrderRow; currency: Pick<Currency, "symbol" | "decimals"> }) {
  const m = (v: number) => formatMoney(v, currency);
  return (
    <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr]">
      <div>
        <ul className="divide-y divide-encre/8 border-y border-encre/8">
          {(order.items ?? []).map((i) => (
            <li key={i.id} className="flex items-center gap-4 py-4">
              <span className="relative h-20 w-16 shrink-0 overflow-hidden bg-lin">{i.image_url && <Image src={i.image_url} alt="" fill sizes="64px" className="object-cover" />}</span>
              <span className="min-w-0 flex-1">
                <span className="block font-display text-xl tracking-[0.06em] text-encre uppercase">{i.product_name}</span>
                <span className="block text-[13px] text-gris">
                  {i.variant_label} · × {i.quantity}
                </span>
              </span>
              <span>{m(i.line_total)}</span>
            </li>
          ))}
        </ul>
        <dl className="mt-5 space-y-2 text-[15px]">
          <div className="flex justify-between"><dt className="text-gris">Sous-total</dt><dd>{m(order.subtotal)}</dd></div>
          {order.discount > 0 && <div className="flex justify-between text-bronze"><dt>Réduction {order.promo_code}</dt><dd>−{m(order.discount)}</dd></div>}
          <div className="flex justify-between"><dt className="text-gris">Livraison {order.shipping_method && `· ${order.shipping_method}`}</dt><dd>{order.shipping ? m(order.shipping) : "Offerte"}</dd></div>
          {order.gift_wrap > 0 && <div className="flex justify-between"><dt className="text-gris">Emballage cadeau</dt><dd>{m(order.gift_wrap)}</dd></div>}
          <div className="flex items-baseline justify-between border-t border-encre/10 pt-3"><dt className="text-[12px] font-semibold tracking-[0.18em] uppercase">Total</dt><dd className="font-display text-3xl">{m(order.total)}</dd></div>
          {order.tax_included > 0 && <p className="text-right text-[12px] text-gris">Dont TVA {m(order.tax_included)}</p>}
          {order.refunded_amount > 0 && <p className="text-right text-[13px] text-bronze">Remboursé : {m(order.refunded_amount)}</p>}
        </dl>
      </div>
      <div className="space-y-6 text-[15px] leading-relaxed text-encre/85">
        <div>
          <p className="eyebrow text-bronze">{order.delivery_type === "pickup" ? "Retrait" : "Livraison"}</p>
          <p className="mt-3">
            {order.first_name} {order.last_name}
            <br />
            {order.ship_line1}
            {order.ship_line2 && (<><br />{order.ship_line2}</>)}
            <br />
            {order.ship_postal_code} {order.ship_city}
            <br />
            {countryName(order.ship_country)}
          </p>
          {scheduleLabel(order) && <p className="mt-2 font-medium text-bronze first-letter:uppercase">{scheduleLabel(order)}</p>}
        </div>
        {order.gift_message && (
          <div>
            <p className="eyebrow text-bronze">Message cadeau</p>
            <p className="mt-3 font-display text-xl italic">« {order.gift_message} »</p>
          </div>
        )}
        {order.tracking_number && (
          <div>
            <p className="eyebrow text-bronze">Suivi du colis</p>
            <p className="mt-3">
              {order.carrier} · {order.tracking_number}
            </p>
            {order.tracking_url && (
              <a href={order.tracking_url} target="_blank" rel="noopener noreferrer" className="btn-primary mt-4 !py-3">
                Suivre le colis
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

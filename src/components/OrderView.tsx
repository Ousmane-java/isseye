import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { Check, Gift, Mail, Package, Store, Truck, type LucideIcon } from "lucide-react";
import clsx from "clsx";
import { formatMoney, type Currency } from "@/lib/currency";
import { countryName } from "@/config/countries";
import { scheduleLabel, statusLabels, trackingSteps, type OrderRow } from "@/lib/order-types";
import { summaryCard, summaryGrid } from "@/components/cart/layout";

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
    <ol className="grid gap-3 sm:grid-cols-4 sm:gap-2">
      {steps.map((step, i) => {
        const done = i <= reached;
        return (
          <li key={step.status} className={clsx("relative max-sm:flex max-sm:flex-wrap max-sm:items-center max-sm:gap-x-3 max-sm:border-l-2 max-sm:py-1 max-sm:pl-4", done ? "max-sm:border-or" : "max-sm:border-encre/10")}>
            <div className={clsx("hidden h-[3px] rounded-full sm:block", done ? "bg-gradient-to-r from-bronze to-or" : "bg-encre/10")} />
            <div className="flex items-center gap-2 sm:mt-4">
              <span className={clsx("grid size-5 shrink-0 place-items-center rounded-full", done ? "bg-noir text-creme" : "border border-encre/20")}>{done && <Check className="size-3" />}</span>
              <span className={clsx("text-[11px] font-semibold tracking-[0.12em] uppercase sm:text-[12px]", done ? "text-encre" : "text-gris")}>{step.label}</span>
            </div>
            {dates[step.status] && <p className="text-[12px] text-gris sm:mt-1 sm:pl-7">{dateFormat.format(new Date(dates[step.status]!))}</p>}
          </li>
        );
      })}
    </ol>
  );
}

/**
 * Articles, adresse et récapitulatif d'une commande (confirmation, suivi), sur la même grille que
 * le panier et la caisse : articles à gauche, récapitulatif à droite. `children` s'ajoute sous les
 * articles, `actions` sous le récapitulatif.
 */
export function OrderSummary({ order, currency, children, actions }: { order: OrderRow; currency: Pick<Currency, "symbol" | "decimals">; children?: ReactNode; actions?: ReactNode }) {
  const m = (v: number) => formatMoney(v, currency);
  const count = (order.items ?? []).reduce((n, i) => n + i.quantity, 0);
  const pickup = order.delivery_type === "pickup";
  return (
    <div className={summaryGrid}>
      <div className="min-w-0 space-y-12">
        <section aria-label="Articles">
          <p className="border-b border-encre/10 pb-4 text-[11px] font-semibold tracking-[0.2em] text-gris uppercase">
            Article{count > 1 ? "s" : ""} · {count}
          </p>
          <ul className="divide-y divide-encre/10 border-b border-encre/10">
            {(order.items ?? []).map((i) => (
              <li key={i.id} className="grid grid-cols-[6rem_minmax(0,1fr)_auto] items-center gap-x-5 py-6 sm:grid-cols-[8rem_minmax(0,1fr)_auto] sm:gap-x-8">
                <span className="relative aspect-[4/5] overflow-hidden rounded-sm bg-lin">{i.image_url && <Image src={i.image_url} alt="" fill sizes="128px" className="object-cover" />}</span>
                <span className="min-w-0">
                  <span className="block font-display text-2xl tracking-[0.08em] text-encre uppercase">{i.product_name}</span>
                  {i.variant_label && <span className="mt-1 block text-[13px] text-gris">{i.variant_label}</span>}
                  <span className="mt-2 block text-[13px] text-encre/80 tabular-nums">
                    {i.quantity} × {m(i.unit_price)}
                  </span>
                </span>
                <span className="text-[17px] font-medium text-encre tabular-nums">{m(i.line_total)}</span>
              </li>
            ))}
          </ul>
        </section>

        <div className="grid gap-5 sm:grid-cols-2">
          <InfoCard icon={pickup ? Store : Truck} title={pickup ? "Retrait à la boutique" : order.shipping_method || "Livraison"}>
            {pickup ? (
              <p>Rue de la Ronde, Metz · l&apos;adresse exacte et les horaires figurent dans votre email.</p>
            ) : (
              <p>
                {order.first_name} {order.last_name}
                <br />
                {order.ship_line1}
                {order.ship_line2 && (
                  <>
                    <br />
                    {order.ship_line2}
                  </>
                )}
                <br />
                {order.ship_postal_code} {order.ship_city}
                <br />
                {countryName(order.ship_country)}
              </p>
            )}
            {scheduleLabel(order) && <p className="mt-2 font-medium text-bronze first-letter:uppercase">{scheduleLabel(order)}</p>}
          </InfoCard>
          <InfoCard icon={Mail} title="Contact">
            <p>
              {order.first_name} {order.last_name}
              <br />
              {order.email}
              {order.phone && (
                <>
                  <br />
                  {order.phone}
                </>
              )}
            </p>
          </InfoCard>
          {order.tracking_number && (
            <InfoCard icon={Package} title="Suivi du colis">
              <p>
                {order.carrier} · {order.tracking_number}
              </p>
              {order.tracking_url && (
                <a href={order.tracking_url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-bronze underline underline-offset-4">
                  Suivre le colis
                </a>
              )}
            </InfoCard>
          )}
          {order.gift_message && (
            <InfoCard icon={Gift} title="Message cadeau">
              <p className="font-display text-xl italic">« {order.gift_message} »</p>
            </InfoCard>
          )}
        </div>
        {children}
      </div>

      <aside className="lg:sticky lg:top-[calc(var(--bar-h,0px)+7rem)]">
        <div className={summaryCard}>
          <h2 className="font-display text-3xl text-encre">Récapitulatif</h2>
          <dl className="mt-6 space-y-3 border-t border-encre/10 pt-6 text-[15px] tabular-nums">
            <Line label="Sous-total" value={m(order.subtotal)} />
            {order.discount > 0 && <Line label={`Réduction ${order.promo_code ?? ""}`} value={`−${m(order.discount)}`} accent />}
            <Line label={pickup ? "Retrait" : "Livraison"} value={order.shipping ? m(order.shipping) : pickup ? "Gratuit" : "Offerte"} />
            {order.gift_wrap > 0 && <Line label="Emballage cadeau" value={m(order.gift_wrap)} />}
          </dl>
          <div className="mt-6 flex items-baseline justify-between gap-4 border-t border-encre/10 pt-6">
            <span className="text-[12px] font-semibold tracking-[0.2em] text-encre uppercase">Total</span>
            <span className="text-2xl font-medium text-encre tabular-nums">{m(order.total)}</span>
          </div>
          {order.tax_included > 0 && <p className="mt-1 text-right text-[12px] text-gris">Dont TVA {m(order.tax_included)}</p>}
          {order.refunded_amount > 0 && <p className="mt-1 text-right text-[13px] text-bronze">Remboursé : {m(order.refunded_amount)}</p>}
          {order.paid_at && <p className="mt-5 border-t border-encre/10 pt-5 text-[13px] text-gris">Payée le {dateFormat.format(new Date(order.paid_at))}</p>}
          {actions && <div className="mt-6 flex flex-col gap-3">{actions}</div>}
        </div>
        <p className="mt-6 px-2 text-[13px] text-gris">
          Une question sur cette commande ?{" "}
          <Link href={`/contact?commande=${order.number}`} className="text-bronze underline underline-offset-4">
            Écrivez-nous
          </Link>
        </p>
      </aside>
    </div>
  );
}

function InfoCard({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-encre/10 bg-white/50 p-5 text-[14px] leading-relaxed text-encre/85">
      <p className="flex items-center gap-2.5 text-[11px] font-semibold tracking-[0.2em] text-bronze uppercase">
        <Icon className="size-4" strokeWidth={1.5} /> {title}
      </p>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function Line({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={clsx("flex justify-between gap-4", accent && "text-bronze")}>
      <dt className={accent ? "" : "text-gris"}>{label}</dt>
      <dd className={clsx("shrink-0 text-right", !accent && "text-encre")}>{value}</dd>
    </div>
  );
}

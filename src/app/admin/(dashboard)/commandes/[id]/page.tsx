import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Check, ExternalLink, FileText, Gift, Mail, MapPin, MessageCircle, Navigation, Phone, Store, Truck } from "lucide-react";
import type { ReactNode } from "react";
import { requireAdmin } from "@/lib/admin-auth";
import { adminDb } from "@/lib/supabase";
import { getOrder } from "@/lib/orders";
import { getCurrencies } from "@/lib/currencies";
import { getSettings } from "@/lib/settings";
import { formatMoney } from "@/lib/currency";
import { countryName } from "@/config/countries";
import { deliveryLabels, scheduleLabel, statusLabel, statusTone } from "@/lib/order-types";
import { Badge, Card } from "@/components/admin/ui";
import { NotesForm, OrderStepper, RefundForm, TrackingForm } from "./OrderActions";

export const metadata: Metadata = { title: "Commande" };
const dateTime = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeStyle: "short", timeZone: "Europe/Paris" });
const shortTime = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" });
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

type Event = { id: number; kind: string; label: string; notified: boolean; actor: string | null; created_at: string };

export default async function OrderPage({ params }: PageProps<"/admin/commandes/[id]">) {
  await requireAdmin("orders");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const order = await getOrder(id);
  if (!order) notFound();
  const db = adminDb();
  const [currencies, { delivery }, { data: events }, { count: previous }] = await Promise.all([
    getCurrencies(),
    getSettings(),
    db.from("order_events").select("id, kind, label, notified, actor, created_at").eq("order_id", id).order("created_at"),
    db.from("orders").select("id", { count: "exact", head: true }).eq("email", order.email).neq("id", id).not("status", "in", "(en_attente_paiement,abandonnee)"),
  ]);
  const cur = currencies.find((c) => c.code === order.currency_code)!;
  const m = (v: number) => formatMoney(v, cur);
  const remaining = order.total - order.refunded_amount;
  const remainingText = (remaining / 10 ** cur.decimals).toLocaleString("fr-FR", { minimumFractionDigits: cur.decimals, maximumFractionDigits: cur.decimals, useGrouping: false });

  const pickup = order.delivery_type === "pickup";
  const address = [order.ship_line1, order.ship_line2, `${order.ship_postal_code ?? ""} ${order.ship_city}`.trim(), countryName(order.ship_country)].filter(Boolean).join(", ");
  const mapsAddress = pickup ? order.ship_line2 : `${order.ship_line1}, ${order.ship_postal_code ?? ""} ${order.ship_city}, ${countryName(order.ship_country)}`;
  const phoneIntl = (order.phone ?? "").replace(/[\s.-]/g, "").replace(/^\+/, "").replace(/^0(?=\d{9}$)/, "33");
  const ModeIcon = pickup ? Store : Truck;

  // Historique : événements enregistrés, sinon reconstitué à partir des dates (commandes antérieures)
  const timeline: Event[] = events?.length
    ? (events as Event[])
    : ([
        { id: 1, kind: "creee", label: "Commande passée", notified: false, actor: "cliente", created_at: order.created_at },
        order.paid_at && { id: 2, kind: "payee", label: "Paiement reçu", notified: true, actor: "système", created_at: order.paid_at },
        order.ready_at && { id: 3, kind: "prete_retrait", label: "Prête à retirer", notified: true, actor: null, created_at: order.ready_at },
        order.shipped_at && { id: 4, kind: "expediee", label: "Expédiée", notified: true, actor: null, created_at: order.shipped_at },
        order.delivered_at && { id: 5, kind: "livree", label: pickup ? "Retirée" : "Livrée", notified: true, actor: null, created_at: order.delivered_at },
        order.cancelled_at && { id: 6, kind: "annulee", label: "Annulée", notified: false, actor: null, created_at: order.cancelled_at },
      ].filter(Boolean) as Event[]);

  return (
    <div className="space-y-6">
      <Link href="/commandes" className="inline-flex items-center gap-2 text-sm text-gris hover:text-encre print:hidden">
        <ArrowLeft className="size-4" /> Commandes
      </Link>

      <header className="flex flex-wrap items-end gap-x-5 gap-y-3">
        <div>
          <p className="eyebrow text-bronze">Commande</p>
          <h1 className="mt-1 font-display text-5xl font-light text-encre sm:text-6xl">{order.number}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2 pb-2">
          <Badge tone={statusTone[order.status]}>{statusLabel(order)}</Badge>
          <Badge tone="neutral">
            <ModeIcon className="mr-1.5 size-3.5" strokeWidth={1.8} /> {deliveryLabels[order.delivery_type]}
          </Badge>
        </div>
        <div className="ml-auto pb-2 text-right text-sm text-gris">
          Passée le {dateTime.format(new Date(order.created_at))}
          <a href={`${siteUrl}/suivi/${order.access_token}`} target="_blank" className="mt-1 flex items-center justify-end gap-1.5 text-bronze print:hidden">
            Page de suivi de la cliente <ExternalLink className="size-3.5" />
          </a>
          {order.paid_at && (
            <a href={`/api/admin/facture/${order.id}`} target="_blank" className="mt-1 flex items-center justify-end gap-1.5 text-bronze print:hidden">
              Facture {order.invoice_number ?? ""} (PDF) <FileText className="size-3.5" />
            </a>
          )}
        </div>
      </header>

      <OrderStepper order={order} />

      <div className="grid gap-6 lg:grid-cols-[1.55fr_1fr]">
        <div className="space-y-6">
          <Card>
            <div className="grid gap-6 sm:grid-cols-2">
              <Info icon={ModeIcon} label={pickup ? "Retrait à la boutique" : order.delivery_type === "local" ? "Livraison locale" : "Envoi postal"}>
                <p className="font-medium text-encre">{order.shipping_method}</p>
                {scheduleLabel(order) && <p className="mt-0.5 rounded-lg bg-or/15 px-2 py-1 text-[13px] font-semibold text-bronze first-letter:uppercase">{scheduleLabel(order)}</p>}
                {order.delivery_distance_km !== null && <p className="text-gris">{Number(order.delivery_distance_km).toLocaleString("fr-FR")} km de la boutique (par la route)</p>}
                {order.tracking_number && (
                  <p className="mt-1">
                    {order.carrier} · {order.tracking_url ? <a href={order.tracking_url} target="_blank" className="text-bronze underline underline-offset-4">{order.tracking_number}</a> : order.tracking_number}
                  </p>
                )}
                {order.shipping_zone && order.delivery_type === "postal" && <p className="text-gris">{order.shipping_zone}</p>}
              </Info>
              <Info icon={MapPin} label={pickup ? "Lieu de retrait" : "Adresse de livraison"}>
                <p className="text-encre">
                  {order.first_name} {order.last_name}
                </p>
                <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapsAddress ?? address)}`} target="_blank" rel="noreferrer" className="text-encre underline decoration-encre/20 underline-offset-4 hover:decoration-bronze">
                  {pickup ? order.ship_line2 : address}
                </a>
                {order.delivery_type === "local" && (
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(delivery.originAddress)}&destination=${encodeURIComponent(mapsAddress ?? address)}&travelmode=driving`}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex items-center gap-1.5 text-[13px] font-semibold text-bronze print:hidden"
                  >
                    <Navigation className="size-3.5" /> Itinéraire depuis la boutique
                  </a>
                )}
              </Info>
            </div>
            {order.delivery_type === "postal" && order.status === "expediee" && <TrackingForm id={order.id} carrier={order.carrier} tracking={order.tracking_number} />}
          </Card>

          <Card title="Articles">
            <ul className="divide-y divide-encre/5">
              {(order.items ?? []).map((i) => (
                <li key={i.id} className="flex items-center gap-4 py-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <span className="size-16 shrink-0 overflow-hidden rounded-lg bg-lin-clair">{i.image_url && <img src={i.image_url} alt="" className="h-full w-full object-cover" />}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-display text-xl tracking-[0.04em] text-encre uppercase">{i.product_name}</span>
                    <span className="text-[13px] text-gris">{[i.variant_label, i.sku].filter(Boolean).join(" · ")}</span>
                  </span>
                  <span className="text-sm text-gris">
                    {m(i.unit_price)} × {i.quantity}
                  </span>
                  <span className="w-24 text-right font-medium">{m(i.line_total)}</span>
                </li>
              ))}
            </ul>
            <dl className="mt-4 space-y-1.5 border-t border-encre/5 pt-4 text-sm">
              <Line label="Sous-total" value={m(order.subtotal)} />
              {order.discount > 0 && <Line label={`Réduction ${order.promo_code ?? ""}`} value={`−${m(order.discount)}`} />}
              <Line label={order.shipping_method ?? "Livraison"} value={order.shipping ? m(order.shipping) : pickup ? "Gratuit" : "Offerte"} />
              {order.gift_wrap > 0 && <Line label="Emballage cadeau" value={m(order.gift_wrap)} />}
              <div className="flex justify-between pt-2 text-base font-semibold text-encre">
                <dt>Total ({order.currency_code})</dt>
                <dd className="font-display text-2xl">{m(order.total)}</dd>
              </div>
              <Line label={order.tax_mode === "ttc" ? "Dont TVA" : "Vente export (hors TVA)"} value={order.tax_mode === "ttc" ? m(order.tax_included) : "—"} />
              {order.currency_code !== "EUR" && <Line label="Taux appliqué" value={`1 € = ${Number(order.fx_rate).toLocaleString("fr-FR")} ${cur.symbol}`} />}
              {order.refunded_amount > 0 && <Line label="Remboursé" value={`−${m(order.refunded_amount)}`} danger />}
            </dl>
          </Card>

          {(order.gift_message || order.notes) && (
            <Card title="Messages de la cliente">
              {order.gift_message && (
                <p className="flex gap-3 rounded-xl bg-lin-clair p-4 text-sm">
                  <Gift className="size-4 shrink-0 text-bronze" strokeWidth={1.5} />
                  <span>
                    <strong className="font-semibold">{order.gift_wrap > 0 ? "Emballage cadeau · carte" : "Carte cadeau"} :</strong> « {order.gift_message} »
                  </span>
                </p>
              )}
              {order.notes && (
                <p className="mt-3 text-sm">
                  <strong className="font-semibold">Pour la livraison :</strong> {order.notes}
                </p>
              )}
            </Card>
          )}

          <Card title="Historique" description="Chaque étape, qui l'a faite, et si la cliente a reçu un email.">
            <ol className="relative space-y-5 border-l border-encre/10 pl-6">
              {timeline.map((e) => (
                <li key={e.id} className="relative">
                  <span className="absolute top-1 -left-[1.95rem] grid size-4 place-items-center rounded-full bg-or text-noir">
                    <Check className="size-2.5" strokeWidth={3} />
                  </span>
                  <p className="font-medium text-encre">{e.label}</p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-gris">
                    {shortTime.format(new Date(e.created_at))}
                    {e.actor && e.actor !== "système" && e.actor !== "cliente" && <span>par {e.actor}</span>}
                    {e.notified && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-or/15 px-2 py-0.5 text-bronze">
                        <Mail className="size-3" /> email envoyé
                      </span>
                    )}
                  </p>
                </li>
              ))}
            </ol>
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Cliente">
            <p className="font-display text-2xl text-encre">
              {order.first_name} {order.last_name}
            </p>
            <div className="mt-3 space-y-2 text-sm">
              <a href={`mailto:${order.email}?subject=${encodeURIComponent(`Votre commande ${order.number}`)}`} className="flex items-center gap-2 text-encre hover:text-bronze">
                <Mail className="size-4 text-bronze" strokeWidth={1.5} /> {order.email}
              </a>
              {order.phone && (
                <>
                  <a href={`tel:${order.phone.replace(/\s/g, "")}`} className="flex items-center gap-2 text-encre hover:text-bronze">
                    <Phone className="size-4 text-bronze" strokeWidth={1.5} /> {order.phone}
                  </a>
                  <a href={`https://wa.me/${phoneIntl}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-encre hover:text-bronze print:hidden">
                    <MessageCircle className="size-4 text-bronze" strokeWidth={1.5} /> WhatsApp
                  </a>
                </>
              )}
            </div>
            <p className="mt-4 border-t border-encre/5 pt-3 text-[13px] text-gris">
              {previous ? `${previous} autre${previous > 1 ? "s" : ""} commande${previous > 1 ? "s" : ""}` : "Première commande"} · {order.marketing_consent ? "inscrite à la newsletter" : "pas de newsletter"}
            </p>
            {previous ? (
              <Link href={`/clientes?q=${encodeURIComponent(order.email)}`} className="mt-1 inline-block text-[13px] text-bronze print:hidden">
                Voir son historique
              </Link>
            ) : null}
          </Card>

          <Card title="Paiement" className="print:hidden">
            <p className="text-sm">
              {order.paid_at ? (
                <>
                  <span className="font-medium text-emerald-700">Payée</span> le {dateTime.format(new Date(order.paid_at))} · {order.payment_provider === "test" ? "paiement simulé" : "Stripe"}
                </>
              ) : (
                <span className="text-gris">Non payée</span>
              )}
            </p>
            {order.payment_intent_id && (
              <a href={`https://dashboard.stripe.com/payments/${order.payment_intent_id}`} target="_blank" className="mt-2 inline-flex items-center gap-1.5 text-sm text-bronze">
                Voir dans Stripe <ExternalLink className="size-3.5" />
              </a>
            )}
            {order.paid_at && remaining > 0 && (
              <div className="mt-5 border-t border-encre/5 pt-4">
                <p className="mb-3 text-[12px] font-semibold tracking-wide text-gris uppercase">Rembourser</p>
                <RefundForm id={order.id} remaining={remainingText} symbol={cur.symbol} />
              </div>
            )}
          </Card>

          <Card title="Note interne" className="print:hidden">
            <NotesForm id={order.id} notes={order.admin_notes ?? ""} />
          </Card>
        </div>
      </div>
    </div>
  );
}

function Info({ icon: Icon, label, children }: { icon: typeof MapPin; label: string; children: ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-lin-clair text-bronze">
        <Icon className="size-[18px]" strokeWidth={1.5} />
      </span>
      <div className="min-w-0 text-sm leading-relaxed">
        <p className="text-[11px] font-semibold tracking-[0.16em] text-gris uppercase">{label}</p>
        <div className="mt-1">{children}</div>
      </div>
    </div>
  );
}

function Line({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <div className={`flex justify-between gap-4 ${danger ? "text-red-700" : ""}`}>
      <dt className={danger ? "" : "text-gris"}>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

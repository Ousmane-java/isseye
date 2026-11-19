import Link from "next/link";
import { ArrowRight, Check, Circle } from "lucide-react";
import { requireAdmin } from "@/lib/admin-auth";
import { adminDb } from "@/lib/supabase";
import { getSettings } from "@/lib/settings";
import { missingLegal } from "@/lib/settings-schema";
import { getCurrencies } from "@/lib/currencies";
import { formatMoney } from "@/lib/currency";
import { paidStatuses, statusLabels, statusTone, type OrderStatus } from "@/lib/order-types";
import { Badge, Card, Notice, PageHeader, Stat } from "@/components/admin/ui";
import { canAccess } from "@/config/admin";

const dateFormat = new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Paris" });

export default async function DashboardPage({ searchParams }: PageProps<"/admin">) {
  const user = await requireAdmin("dashboard");
  const { acces } = await searchParams;
  const db = adminDb();
  const shop = canAccess(user.role, "orders");

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [settings, currencies, products, shippingPrices, monthOrders, toProcess, recent, variants, pendingReviews] = await Promise.all([
    getSettings(),
    getCurrencies(),
    db.from("products").select("id", { count: "exact", head: true }).eq("status", "active").is("deleted_at", null),
    db.from("shipping_method_prices").select("method_id", { count: "exact", head: true }),
    db.from("orders").select("currency_code, total, refunded_amount").gte("paid_at", monthStart.toISOString()).in("status", paidStatuses),
    db.from("orders").select("id", { count: "exact", head: true }).in("status", ["payee", "en_preparation", "prete_retrait"]),
    db.from("orders").select("id, number, created_at, status, first_name, last_name, total, currency_code").not("status", "in", "(abandonnee,en_attente_paiement)").order("created_at", { ascending: false }).limit(8),
    db.from("product_variants").select("stock, low_stock_threshold, track_stock").eq("active", true),
    db.from("reviews").select("id", { count: "exact", head: true }).eq("status", "en_attente"),
  ]);

  const revenue = new Map<string, number>();
  for (const o of monthOrders.data ?? []) revenue.set(o.currency_code, (revenue.get(o.currency_code) ?? 0) + o.total - o.refunded_amount);
  const byCode = new Map(currencies.map((c) => [c.code, c]));
  const lowStock = (variants.data ?? []).filter((v) => v.track_stock && v.stock <= v.low_stock_threshold).length;

  const legalMissing = missingLegal(settings.legal);
  const checklist = [
    { done: legalMissing.length === 0, label: `Renseigner l'identité légale${legalMissing.length ? ` (${legalMissing.join(", ")})` : ""}`, href: "/reglages", section: "settings" as const },
    { done: (products.count ?? 0) > 0, label: "Publier un premier parfum", href: "/produits", section: "products" as const },
    { done: (shippingPrices.count ?? 0) > 0, label: "Fixer les tarifs de livraison", href: "/livraison", section: "shipping" as const },
    { done: Boolean(process.env.STRIPE_SECRET_KEY), label: "Brancher le paiement Stripe (STRIPE_SECRET_KEY)", href: "/reglages", section: "settings" as const },
    { done: Boolean(process.env.RESEND_API_KEY), label: "Brancher l'envoi des emails (RESEND_API_KEY)", href: "/emails", section: "emails" as const },
  ].filter((step) => canAccess(user.role, step.section));
  const remaining = checklist.filter((s) => !s.done).length;

  return (
    <div className="space-y-8">
      <PageHeader title="Bonjour." description="Voici l'essentiel de la boutique aujourd'hui." />
      {acces === "refuse" && <Notice tone="warning">Cette section n&apos;est pas accessible avec votre rôle.</Notice>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link href="/commandes"><Stat label="Commandes à traiter" value={toProcess.count ?? 0} hint="Payées, à préparer ou expédier" /></Link>
        <Stat
          label="Ventes du mois"
          value={revenue.size === 0 ? "—" : <span className="text-[1.5rem]">{formatMoney(revenue.get("EUR") ?? 0, byCode.get("EUR")!)}</span>}
          hint={[...revenue.entries()].filter(([code]) => code !== "EUR" && byCode.get(code)).map(([code, amount]) => formatMoney(amount, byCode.get(code)!)).join(" · ") || `${monthOrders.data?.length ?? 0} commande(s)`}
        />
        <Link href="/stock"><Stat label="Stock bas" value={lowStock} hint={`${products.count ?? 0} parfum(s) en ligne`} /></Link>
        <Link href="/avis"><Stat label="Avis à modérer" value={pendingReviews.count ?? 0} /></Link>
      </div>

      {checklist.length > 0 && remaining > 0 && (
        <Card title="Mise en route" description={`${remaining} étape${remaining > 1 ? "s" : ""} avant d'ouvrir la boutique.`}>
          <ul className="divide-y divide-encre/5">
            {checklist.map((step) => (
              <li key={step.label}>
                <Link href={step.href} className="group flex items-center gap-3 py-3.5">
                  {step.done ? (
                    <span className="grid size-6 place-items-center rounded-full bg-noir text-creme"><Check className="size-3.5" /></span>
                  ) : (
                    <Circle className="size-6 text-encre/20" strokeWidth={1.5} />
                  )}
                  <span className={step.done ? "text-gris line-through" : "text-encre"}>{step.label}</span>
                  {!step.done && <ArrowRight className="ml-auto size-4 text-gris transition group-hover:translate-x-1 group-hover:text-encre" />}
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {shop && (
        <Card title="Dernières commandes" actions={<Link href="/commandes?statut=" className="text-sm text-bronze">Tout voir</Link>}>
          {!recent.data?.length ? (
            <p className="text-sm text-gris">Aucune commande pour l&apos;instant.</p>
          ) : (
            <ul className="divide-y divide-encre/5">
              {recent.data.map((o) => (
                <li key={o.id}>
                  <Link href={`/commandes/${o.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3 text-sm hover:text-bronze">
                    <span className="font-semibold">{o.number}</span>
                    <span>{o.first_name} {o.last_name}</span>
                    <span className="text-gris">{dateFormat.format(new Date(o.created_at))}</span>
                    <span className="ml-auto"><Badge tone={statusTone[o.status as OrderStatus]}>{statusLabels[o.status as OrderStatus]}</Badge></span>
                    <span className="w-24 text-right font-medium">{formatMoney(o.total, byCode.get(o.currency_code)!)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}
    </div>
  );
}

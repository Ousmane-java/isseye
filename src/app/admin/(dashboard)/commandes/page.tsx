import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/admin-auth";
import { adminDb } from "@/lib/supabase";
import { getCurrencies } from "@/lib/currencies";
import { formatMoney } from "@/lib/currency";
import { countryName } from "@/config/countries";
import { statusLabel, statusTone, type OrderStatus } from "@/lib/order-types";
import { Badge, Card, EmptyState, PageHeader, ExportLink } from "@/components/admin/ui";

export const metadata: Metadata = { title: "Commandes" };
const PER_PAGE = 50;
const dateFormat = new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Paris" });


const tabs: { label: string; value: string }[] = [
  { label: "À traiter", value: "a-traiter" },
  { label: "Toutes", value: "" },
  { label: "Expédiées", value: "expediee" },
  { label: "Livrées", value: "livree" },
  { label: "Annulées", value: "annulee" },
  { label: "Non payées", value: "abandonnee" },
];

export default async function OrdersPage({ searchParams }: PageProps<"/admin/commandes">) {
  await requireAdmin("orders");
  const params = await searchParams;
  const statut = typeof params.statut === "string" ? params.statut : "a-traiter";
  const q = typeof params.q === "string" ? params.q.trim() : "";
  const page = Math.max(1, Number(params.page) || 1);

  let query = adminDb()
    .from("orders")
    .select("id, number, created_at, status, first_name, last_name, email, ship_country, total, currency_code, shipping_method, delivery_type", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((page - 1) * PER_PAGE, page * PER_PAGE - 1);
  if (statut === "a-traiter") query = query.in("status", ["payee", "en_preparation", "prete_retrait"]);
  else if (statut === "annulee") query = query.in("status", ["annulee", "remboursee"]);
  else if (statut === "abandonnee") query = query.in("status", ["abandonnee", "en_attente_paiement"]);
  else if (statut) query = query.eq("status", statut);
  else query = query.not("status", "in", "(abandonnee,en_attente_paiement)");
  if (q) {
    const s = q.replace(/[%,()]/g, "");
    query = query.or(`number.ilike.%${s}%,email.ilike.%${s}%,last_name.ilike.%${s}%,first_name.ilike.%${s}%`);
  }
  const [{ data, count }, currencies] = await Promise.all([query, getCurrencies()]);
  const pages = Math.ceil((count ?? 0) / PER_PAGE);
  const link = (patch: Record<string, string | number>) => {
    const qs = new URLSearchParams({ statut, ...(q ? { q } : {}), ...Object.fromEntries(Object.entries(patch).map(([k, v]) => [k, String(v)])) });
    return `/commandes?${qs}`;
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Commandes"
        description="Préparez, expédiez (email de suivi automatique), annulez ou remboursez. Chaque étape met le stock à jour."
        actions={
          <ExportLink href="/api/admin/export/commandes" />
        }
      />
      <Card>
        <div className="mb-5 flex flex-wrap items-center gap-2">
          {tabs.map((t) => (
            <Link key={t.value} href={`/commandes?statut=${t.value}`} className={`rounded-full px-4 py-1.5 text-sm ${statut === t.value ? "bg-noir text-creme" : "text-gris hover:bg-lin-clair"}`}>
              {t.label}
            </Link>
          ))}
          <form className="ml-auto">
            <input type="hidden" name="statut" value={statut} />
            <input name="q" defaultValue={q} placeholder="N°, nom, email…" className="field !w-56 !py-2" />
          </form>
        </div>
        {!data?.length ? (
          <EmptyState title={statut === "a-traiter" ? "Aucune commande à traiter." : "Aucune commande."}>Les nouvelles commandes payées apparaissent ici.</EmptyState>
        ) : (
          <ul className="-mx-5 divide-y divide-encre/5 border-t border-encre/5 sm:-mx-7">
            {data.map((o) => {
              const cur = currencies.find((c) => c.code === o.currency_code)!;
              const status = o.status as OrderStatus;
              return (
                <li key={o.id}>
                  {/* Toute la ligne ouvre la commande */}
                  <Link href={`/commandes/${o.id}`} className="group grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 px-5 py-4 transition hover:bg-lin-clair/60 sm:grid-cols-[9rem_1.4fr_1fr_10rem_7rem] sm:px-7">
                    <span>
                      <span className="block font-semibold text-encre group-hover:text-bronze">{o.number}</span>
                      <span className="block text-[12px] text-gris">{dateFormat.format(new Date(o.created_at))}</span>
                    </span>
                    <span className="order-3 col-span-2 min-w-0 sm:order-none sm:col-span-1">
                      <span className="block truncate text-sm text-encre">{o.first_name} {o.last_name}</span>
                      <span className="block truncate text-[12px] text-gris">{o.email}</span>
                    </span>
                    <span className="order-4 col-span-2 text-sm sm:order-none sm:col-span-1">
                      {o.delivery_type === "pickup" ? "Retrait boutique" : o.delivery_type === "local" ? "Livraison locale" : countryName(o.ship_country)}
                      <span className="block text-[12px] text-gris">{o.shipping_method}</span>
                    </span>
                    <span className="order-2 sm:order-none">
                      <Badge tone={statusTone[status]}>{statusLabel({ status, delivery_type: o.delivery_type })}</Badge>
                    </span>
                    <span className="order-5 col-span-2 font-medium text-encre sm:order-none sm:col-span-1 sm:text-right">{formatMoney(o.total, cur)}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
        {pages > 1 && (
          <div className="mt-5 flex items-center justify-between text-sm">
            {page > 1 ? <Link href={link({ page: page - 1 })} className="text-bronze">← Précédentes</Link> : <span />}
            <span className="text-gris">Page {page} / {pages}</span>
            {page < pages ? <Link href={link({ page: page + 1 })} className="text-bronze">Suivantes →</Link> : <span />}
          </div>
        )}
      </Card>
    </div>
  );
}

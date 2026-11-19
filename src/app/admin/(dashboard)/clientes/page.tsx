import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/admin-auth";
import { adminDb } from "@/lib/supabase";
import { getCurrencies } from "@/lib/currencies";
import { formatMoney } from "@/lib/currency";
import { countryName } from "@/config/countries";
import { paidStatuses, statusLabels, type OrderStatus } from "@/lib/order-types";
import { Badge, Card, EmptyState, PageHeader, table, ExportLink } from "@/components/admin/ui";

export const metadata: Metadata = { title: "Clientes" };
const dateFormat = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeZone: "Europe/Paris" });

type Order = { id: string; number: string; email: string; first_name: string; last_name: string; phone: string | null; ship_country: string; total: number; refunded_amount: number; currency_code: string; status: OrderStatus; created_at: string; marketing_consent: boolean };

// Les clientes commandent sans compte : la fiche est reconstituée à partir de leurs commandes (même email).
export default async function CustomersPage({ searchParams }: PageProps<"/admin/clientes">) {
  await requireAdmin("customers");
  const { q, vue } = await searchParams;
  const db = adminDb();
  const newsletter = vue === "newsletter";
  const [{ data: orders }, { data: subscribers }, currencies] = await Promise.all([
    db.from("orders").select("id, number, email, first_name, last_name, phone, ship_country, total, refunded_amount, currency_code, status, created_at, marketing_consent").in("status", paidStatuses).order("created_at", { ascending: false }).limit(5000),
    db.from("newsletter_subscribers").select("email, first_name, source, subscribed_at, unsubscribed_at").order("subscribed_at", { ascending: false }).limit(5000),
    getCurrencies(),
  ]);

  const customers = new Map<string, { email: string; name: string; phone: string | null; country: string; orders: Order[]; spent: Map<string, number> }>();
  for (const o of (orders ?? []) as Order[]) {
    const c = customers.get(o.email) ?? { email: o.email, name: `${o.first_name} ${o.last_name}`, phone: o.phone, country: o.ship_country, orders: [] as Order[], spent: new Map<string, number>() };
    c.orders.push(o);
    c.spent.set(o.currency_code, (c.spent.get(o.currency_code) ?? 0) + o.total - o.refunded_amount);
    customers.set(o.email, c);
  }
  const search = typeof q === "string" ? q.trim().toLowerCase() : "";
  const list = [...customers.values()].filter((c) => !search || c.email.includes(search) || c.name.toLowerCase().includes(search));
  const subs = (subscribers ?? []).filter((s) => !s.unsubscribed_at);
  const money = (spent: Map<string, number>) => [...spent].map(([code, amount]) => formatMoney(amount, currencies.find((c) => c.code === code)!)).join(" · ");

  return (
    <div className="space-y-8">
      <PageHeader
        title="Clientes"
        description="Chaque personne ayant commandé, avec son historique et son total dépensé. Les commandes sans compte sont regroupées par email."
        actions={
          <ExportLink href={`/api/admin/export/${newsletter ? "newsletter" : "clientes"}`} />
        }
      />
      <div className="flex gap-2">
        <Link href="/clientes" className={`rounded-full px-4 py-1.5 text-sm ${!newsletter ? "bg-noir text-creme" : "text-gris hover:bg-lin-clair"}`}>Clientes ({customers.size})</Link>
        <Link href="/clientes?vue=newsletter" className={`rounded-full px-4 py-1.5 text-sm ${newsletter ? "bg-noir text-creme" : "text-gris hover:bg-lin-clair"}`}>Newsletter ({subs.length})</Link>
      </div>

      {newsletter ? (
        <Card>
          {!subs.length ? (
            <EmptyState title="Aucune inscription pour l'instant." />
          ) : (
            <div className={table.wrap}>
              <table className={table.table}>
                <thead><tr><th className={table.th}>Email</th><th className={table.th}>Source</th><th className={table.th}>Inscription</th></tr></thead>
                <tbody>
                  {subs.map((s) => (
                    <tr key={s.email}><td className={table.td}>{s.email}{s.first_name && <span className="text-gris"> · {s.first_name}</span>}</td><td className={table.td}>{s.source}</td><td className={table.td}>{dateFormat.format(new Date(s.subscribed_at))}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      ) : search && list.length === 1 ? (
        <Card title={list[0].name} description={`${list[0].email}${list[0].phone ? ` · ${list[0].phone}` : ""} · ${countryName(list[0].country)}`}>
          <p className="text-sm">Total dépensé : <strong>{money(list[0].spent)}</strong> · {list[0].orders.length} commande(s)</p>
          <ul className="mt-4 divide-y divide-encre/5">
            {list[0].orders.map((o) => (
              <li key={o.id}>
                <Link href={`/commandes/${o.id}`} className="flex items-center gap-4 py-3 text-sm hover:text-bronze">
                  <span className="font-semibold">{o.number}</span>
                  <span className="text-gris">{dateFormat.format(new Date(o.created_at))}</span>
                  <Badge>{statusLabels[o.status]}</Badge>
                  <span className="ml-auto">{formatMoney(o.total, currencies.find((c) => c.code === o.currency_code)!)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      ) : (
        <Card>
          <form className="mb-5">
            <input name="q" defaultValue={search} placeholder="Nom ou email…" className="field !w-64 !py-2" />
          </form>
          {!list.length ? (
            <EmptyState title="Aucune cliente pour l'instant.">Elles apparaissent dès leur première commande payée.</EmptyState>
          ) : (
            <div className={table.wrap}>
              <table className={table.table}>
                <thead><tr><th className={table.th}>Cliente</th><th className={table.th}>Pays</th><th className={table.th}>Commandes</th><th className={table.th}>Dernière</th><th className={`${table.th} text-right`}>Total dépensé</th></tr></thead>
                <tbody>
                  {list.map((c) => (
                    <tr key={c.email} className="hover:bg-lin-clair/50">
                      <td className={table.td}><Link href={`/clientes?q=${encodeURIComponent(c.email)}`} className="font-medium hover:text-bronze">{c.name}</Link><span className="block text-[12px] text-gris">{c.email}</span></td>
                      <td className={table.td}>{countryName(c.country)}</td>
                      <td className={table.td}>{c.orders.length}</td>
                      <td className={table.td}>{dateFormat.format(new Date(c.orders[0].created_at))}</td>
                      <td className={`${table.td} text-right font-medium`}>{money(c.spent)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

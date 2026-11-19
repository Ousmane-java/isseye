import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/admin-auth";
import { adminDb } from "@/lib/supabase";
import { Badge, Card, PageHeader, table } from "@/components/admin/ui";
import { ActionForm } from "@/components/admin/forms";
import { adjustStock } from "./actions";

export const metadata: Metadata = { title: "Stock" };
const dateFormat = new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Paris" });
const reasonLabels: Record<string, string> = { vente: "Vente", annulation: "Annulation", retour: "Retour", reassort: "Réassort", ajustement: "Ajustement", casse: "Casse" };

type Variant = { id: string; label: string | null; sku: string | null; stock: number; low_stock_threshold: number; track_stock: boolean; product: { id: string; name: string; status: string; deleted_at: string | null } | null; alerts: { count: number }[] };

export default async function StockPage() {
  await requireAdmin("stock");
  const db = adminDb();
  const [{ data: variants }, { data: moves }] = await Promise.all([
    db.from("product_variants").select("id, label, sku, stock, low_stock_threshold, track_stock, product:products(id, name, status, deleted_at), alerts:stock_alerts(count)").eq("active", true).order("stock"),
    db.from("stock_movements").select("id, delta, stock_after, reason, note, created_by, created_at, order:orders(id, number), variant:product_variants(label, product:products(name))").order("created_at", { ascending: false }).limit(60),
  ]);
  const rows = ((variants ?? []) as unknown as Variant[]).filter((v) => v.product && !v.product.deleted_at);
  const low = rows.filter((v) => v.track_stock && v.stock <= v.low_stock_threshold);

  return (
    <div className="space-y-8">
      <PageHeader title="Stock" description="Le stock baisse automatiquement à chaque commande payée et remonte en cas d'annulation. Ici : réassorts, ajustements et historique." />
      {low.length > 0 && <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">{low.length} article(s) sous le seuil d&apos;alerte.</p>}
      <Card title="Articles">
        <div className={table.wrap}>
          <table className={table.table}>
            <thead>
              <tr>
                <th className={table.th}>Article</th>
                <th className={table.th}>Stock</th>
                <th className={table.th}>Mouvement</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((v) => (
                <tr key={v.id}>
                  <td className={table.td}>
                    <Link href={`/produits/${v.product!.id}`} className="font-medium hover:text-bronze">{v.product!.name}</Link>
                    <span className="block text-[12px] text-gris">{[v.label, v.sku].filter(Boolean).join(" · ")}</span>
                    {v.alerts[0]?.count ? <span className="text-[12px] text-bronze">{v.alerts[0].count} alerte(s) retour en stock</span> : null}
                  </td>
                  <td className={table.td}>
                    {!v.track_stock ? <Badge>Non suivi</Badge> : <Badge tone={v.stock <= 0 ? "red" : v.stock <= v.low_stock_threshold ? "gold" : "green"}>{v.stock}</Badge>}
                  </td>
                  <td className={table.td}>
                    <ActionForm action={adjustStock.bind(null, v.id)} submitLabel="Valider" className="flex flex-wrap items-center gap-2 space-y-0">
                      <input name="delta" inputMode="numeric" placeholder="+20 ou -2" className="field !w-28 !py-2" />
                      <select name="reason" className="field !w-36 !py-2" defaultValue="reassort">
                        <option value="reassort">Réassort</option>
                        <option value="ajustement">Ajustement</option>
                        <option value="retour">Retour</option>
                        <option value="casse">Casse</option>
                      </select>
                      <input name="note" placeholder="Note" className="field !w-36 !py-2" />
                    </ActionForm>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <Card title="Historique">
        <ul className="divide-y divide-encre/5 text-sm">
          {(moves ?? []).map((m) => {
            const variant = m.variant as unknown as { label: string | null; product: { name: string } | null } | null;
            const order = m.order as unknown as { id: string; number: string } | null;
            return (
              <li key={m.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2.5">
                <span className="w-32 text-[13px] text-gris">{dateFormat.format(new Date(m.created_at))}</span>
                <span className={m.delta > 0 ? "w-12 font-semibold text-emerald-700" : "w-12 font-semibold text-red-700"}>{m.delta > 0 ? `+${m.delta}` : m.delta}</span>
                <span className="flex-1">{variant?.product?.name} {variant?.label && <span className="text-gris">· {variant.label}</span>}</span>
                <span className="text-gris">{reasonLabels[m.reason] ?? m.reason}{order && <> · <Link href={`/commandes/${order.id}`} className="text-bronze">{order.number}</Link></>}{m.note && ` · ${m.note}`}</span>
                <span className="text-[13px] text-gris">→ {m.stock_after}</span>
              </li>
            );
          })}
        </ul>
      </Card>
    </div>
  );
}

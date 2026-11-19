import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { requireAdmin } from "@/lib/admin-auth";
import { adminDb } from "@/lib/supabase";
import { getBaseCurrency } from "@/lib/currencies";
import { formatMoney } from "@/lib/currency";
import { statusLabels } from "@/lib/product-admin";
import { Badge, Card, EmptyState, PageHeader, table, ExportLink } from "@/components/admin/ui";
import { ActionForm, ConfirmButton } from "@/components/admin/forms";
import { createProduct, deleteProductForever, restoreProduct } from "./actions";

export const metadata: Metadata = { title: "Produits" };

type Row = {
  id: string;
  name: string;
  slug: string;
  status: "draft" | "active" | "archived";
  featured: boolean;
  deleted_at: string | null;
  category: { name: string } | null;
  media: { url: string; position: number }[];
  variants: { price: number; stock: number; track_stock: boolean; active: boolean }[];
};

export default async function ProductsPage({ searchParams }: PageProps<"/admin/produits">) {
  await requireAdmin("products");
  const { q, statut } = await searchParams;
  const trash = statut === "corbeille";
  let query = adminDb()
    .from("products")
    .select("id, name, slug, status, featured, deleted_at, category:categories(name), media:product_media(url, position), variants:product_variants(price, stock, track_stock, active)")
    .order("position")
    .order("created_at", { ascending: false });
  query = trash ? query.not("deleted_at", "is", null) : query.is("deleted_at", null);
  if (typeof statut === "string" && ["draft", "active", "archived"].includes(statut)) query = query.eq("status", statut);
  if (typeof q === "string" && q.trim()) query = query.ilike("name", `%${q.trim().replace(/[%_]/g, "")}%`);
  const [{ data }, base] = await Promise.all([query, getBaseCurrency()]);
  const rows = (data ?? []) as unknown as Row[];

  const tabs = [
    { label: "Tous", value: "" },
    { label: "En ligne", value: "active" },
    { label: "Brouillons", value: "draft" },
    { label: "Archivés", value: "archived" },
    { label: "Corbeille", value: "corbeille" },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Produits"
        description="Vos parfums : textes, photos, formats, prix (en euros, convertis automatiquement ou fixés par devise), stock et pyramide olfactive."
        actions={
          <ExportLink href="/api/admin/export/produits" />
        }
      />

      <Card title="Nouveau parfum">
        <ActionForm action={createProduct} submitLabel="Créer" className="sm:flex sm:items-end sm:gap-3 sm:space-y-0">
          <label className="block flex-1">
            <span className="label">Nom</span>
            <input name="name" required placeholder="Ex. Soleil" className="field" />
          </label>
        </ActionForm>
      </Card>

      <Card>
        <div className="mb-5 flex flex-wrap items-center gap-2">
          {tabs.map((t) => (
            <Link key={t.value} href={t.value ? `/produits?statut=${t.value}` : "/produits"} className={`rounded-full px-4 py-1.5 text-sm ${(statut ?? "") === t.value ? "bg-noir text-creme" : "text-gris hover:bg-lin-clair"}`}>
              {t.label}
            </Link>
          ))}
          <form className="ml-auto">
            {typeof statut === "string" && <input type="hidden" name="statut" value={statut} />}
            <input name="q" defaultValue={typeof q === "string" ? q : ""} placeholder="Rechercher…" className="field !w-56 !py-2" />
          </form>
        </div>
        {rows.length === 0 ? (
          <EmptyState title={trash ? "La corbeille est vide." : "Aucun produit."} />
        ) : (
          <div className={table.wrap}>
            <table className={table.table}>
              <thead>
                <tr>
                  <th className={table.th}>Produit</th>
                  <th className={table.th}>Statut</th>
                  <th className={table.th}>Prix</th>
                  <th className={table.th}>Stock</th>
                  <th className={table.th} />
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => {
                  const variants = p.variants.filter((v) => v.active);
                  const prices = variants.map((v) => v.price);
                  const stock = variants.filter((v) => v.track_stock).reduce((s, v) => s + v.stock, 0);
                  const image = [...p.media].sort((a, b) => a.position - b.position)[0]?.url;
                  return (
                    <tr key={p.id} className="hover:bg-lin-clair/50">
                      <td className={table.td}>
                        <Link href={`/produits/${p.id}`} className="flex items-center gap-3">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <span className="size-12 shrink-0 overflow-hidden rounded-lg bg-lin-clair">{image && <img src={image} alt="" className="h-full w-full object-cover" />}</span>
                          <span>
                            <span className="block font-medium text-encre">{p.name}</span>
                            <span className="text-[12px] text-gris">{p.category?.name ?? "Sans catégorie"}{p.featured ? " · Mis en avant" : ""}</span>
                          </span>
                        </Link>
                      </td>
                      <td className={table.td}>
                        <Badge tone={p.status === "active" ? "green" : p.status === "draft" ? "gold" : "neutral"}>{statusLabels[p.status]}</Badge>
                      </td>
                      <td className={table.td}>{prices.length ? formatMoney(Math.min(...prices), base) : "—"}</td>
                      <td className={table.td}>
                        <span className={stock <= 3 ? "font-semibold text-red-700" : ""}>{stock}</span>
                      </td>
                      <td className={`${table.td} text-right whitespace-nowrap`}>
                        {trash ? (
                          <span className="inline-flex gap-4">
                            <ConfirmButton action={restoreProduct.bind(null, p.id)}>Restaurer</ConfirmButton>
                            <ConfirmButton danger confirm={`Supprimer définitivement ${p.name} ?`} action={deleteProductForever.bind(null, p.id)}>
                              Supprimer
                            </ConfirmButton>
                          </span>
                        ) : (
                          <Link href={`/produits/${p.id}`} className="text-sm text-bronze hover:underline">
                            Modifier
                          </Link>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      <p className="flex items-center gap-2 text-sm text-gris">
        <Plus className="size-4" /> Les produits « En ligne » apparaissent immédiatement dans la boutique.
      </p>
    </div>
  );
}

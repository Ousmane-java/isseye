import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireAdmin } from "@/lib/admin-auth";
import { adminDb } from "@/lib/supabase";
import { getCurrencies } from "@/lib/currencies";
import type { ProductPayload } from "@/lib/product-admin";
import { PageHeader } from "@/components/admin/ui";
import { ProductEditor } from "./ProductEditor";

export const metadata: Metadata = { title: "Produit" };

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const major = (minor: number | null, decimals: number) => (minor === null ? "" : (minor / 10 ** decimals).toLocaleString("fr-FR", { maximumFractionDigits: decimals, useGrouping: false }));

export default async function ProductEditPage({ params }: PageProps<"/admin/produits/[id]">) {
  await requireAdmin("products");
  const { id } = await params;
  const db = adminDb();
  const [{ data: p, error: productError }, { data: categories }, { data: facets }, { data: notes }, { data: products }, currencies] = await Promise.all([
    db
      .from("products")
      .select(
        "*, variants:product_variants(*, prices:variant_prices(currency_code, amount, compare_at_amount)), media:product_media(url, alt, kind, position), facets:product_facet_values(facet_value_id), notes:product_notes(layer, position, note:notes(name)), related:product_relations!product_relations_product_id_fkey(related_id, position)",
      )
      .eq("id", id)
      .maybeSingle(),
    db.from("categories").select("id, name").is("deleted_at", null).order("position"),
    db.from("facets").select("id, name, multiple, position, values:facet_values(id, label, position)").order("position"),
    db.from("notes").select("name").order("name"),
    db.from("products").select("id, name").neq("id", id).is("deleted_at", null).order("name"),
    getCurrencies(),
  ]);
  if (!p) {
    if (productError) console.error("[produit]", productError.message);
    notFound();
  }
  const base = currencies.find((c) => c.is_base) ?? currencies[0];
  const others = currencies.filter((c) => !c.is_base && c.active);

  type V = { id: string; label: string | null; sku: string | null; price: number; compare_at_price: number | null; stock: number; track_stock: boolean; allow_backorder: boolean; low_stock_threshold: number; weight_grams: number | null; active: boolean; position: number; prices: { currency_code: string; amount: number; compare_at_amount: number | null }[] };
  const byLayer = (layer: string) =>
    (p.notes as { layer: string; position: number; note: { name: string } | null }[])
      .filter((n) => n.layer === layer && n.note)
      .sort((a, b) => a.position - b.position)
      .map((n) => n.note!.name);

  const initial: ProductPayload = {
    name: p.name,
    slug: p.slug,
    subtitle: p.subtitle ?? "",
    description: p.description ?? "",
    story: p.story ?? "",
    usage: p.usage ?? "",
    ingredients: p.ingredients ?? "",
    allergens: p.allergens ?? "",
    category_id: p.category_id ?? "",
    status: p.status,
    featured: p.featured,
    badge: p.badge ?? "",
    position: p.position,
    seo_title: p.seo_title ?? "",
    seo_description: p.seo_description ?? "",
    media: [...(p.media as { url: string; alt: string | null; kind: "image" | "video"; position: number }[])].sort((a, b) => a.position - b.position).map((m) => ({ url: m.url, alt: m.alt ?? "", kind: m.kind })),
    variants: [...(p.variants as V[])]
      .sort((a, b) => a.position - b.position)
      .map((v) => ({
        id: v.id,
        label: v.label ?? "",
        sku: v.sku ?? "",
        price: major(v.price, base.decimals),
        compare_at_price: major(v.compare_at_price, base.decimals),
        stock: v.stock,
        track_stock: v.track_stock,
        allow_backorder: v.allow_backorder,
        low_stock_threshold: v.low_stock_threshold,
        weight_grams: v.weight_grams === null ? "" : String(v.weight_grams),
        active: v.active,
        prices: others.map((c) => {
          const o = v.prices.find((x) => x.currency_code === c.code);
          return { currency_code: c.code, amount: o ? major(o.amount, c.decimals) : "", compare: o ? major(o.compare_at_amount, c.decimals) : "" };
        }),
      })),
    facetValueIds: (p.facets as { facet_value_id: string }[]).map((f) => f.facet_value_id),
    notes: { tete: byLayer("tete"), coeur: byLayer("coeur"), fond: byLayer("fond") },
    relatedIds: [...(p.related as { related_id: string; position: number }[])].sort((a, b) => a.position - b.position).map((r) => r.related_id),
  };

  return (
    <div className="space-y-8">
      <Link href="/produits" className="inline-flex items-center gap-2 text-sm text-gris hover:text-encre">
        <ArrowLeft className="size-4" /> Tous les produits
      </Link>
      <PageHeader
        title={p.name}
        description={p.deleted_at ? "Ce produit est dans la corbeille." : p.status === "active" ? "En ligne dans la boutique." : "Pas encore visible dans la boutique."}
        actions={
          p.status === "active" ? (
            <a href={`${siteUrl}/parfum/${p.slug}`} target="_blank" className="btn-outline !px-4 !py-2.5 text-encre">
              Voir sur le site
            </a>
          ) : undefined
        }
      />
      <ProductEditor
        id={p.id}
        initial={initial}
        categories={categories ?? []}
        facets={(facets ?? []).map((f) => ({ ...f, values: [...(f.values as { id: string; label: string; position: number }[])].sort((a, b) => a.position - b.position) }))}
        noteNames={(notes ?? []).map((n) => n.name)}
        products={products ?? []}
        base={base}
        currencies={others}
      />
    </div>
  );
}

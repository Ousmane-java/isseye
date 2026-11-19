import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCategories, getCollection, getProducts } from "@/lib/catalog";
import { getVisitorCurrency } from "@/lib/currencies";
import { PageIntro } from "@/components/PageIntro";
import { Catalog } from "@/components/shop/Catalog";

// Une catégorie (Admin › Catégories) ou une collection (Admin › Collections)
async function load(slug: string) {
  const category = (await getCategories()).find((c) => c.slug === slug);
  if (category) return { ...category, products: await getProducts({ categorySlug: slug }) };
  const collection = await getCollection(slug);
  if (collection) return { ...collection, products: await getProducts({ ids: collection.productIds }) };
  return null;
}

export async function generateMetadata({ params }: PageProps<"/boutique/[categorie]">): Promise<Metadata> {
  const data = await load((await params).categorie);
  if (!data) return {};
  return { title: data.seo_title ?? data.name, description: data.seo_description ?? data.description ?? undefined, alternates: { canonical: `/boutique/${data.slug}` } };
}

export default async function CategoryPage({ params, searchParams }: PageProps<"/boutique/[categorie]">) {
  const [{ categorie }, query, currency] = await Promise.all([params, searchParams, getVisitorCurrency()]);
  const data = await load(categorie);
  if (!data) notFound();
  return (
    <>
      <PageIntro eyebrow="La collection" title={data.name} text={data.description ?? undefined} />
      <Catalog basePath={`/boutique/${data.slug}`} products={data.products} params={query} currency={{ code: currency.code, symbol: currency.symbol, decimals: currency.decimals }} />
    </>
  );
}

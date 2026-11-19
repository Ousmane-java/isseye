import type { Metadata } from "next";
import Link from "next/link";
import { getProducts } from "@/lib/catalog";
import { getVisitorCurrency } from "@/lib/currencies";
import { PageIntro } from "@/components/PageIntro";
import { ProductCard } from "@/components/shop/ProductCard";

export const metadata: Metadata = { title: "Recherche", robots: { index: false } };

export default async function SearchPage({ searchParams }: PageProps<"/recherche">) {
  const { q } = await searchParams;
  const query = (typeof q === "string" ? q : "").trim().slice(0, 80);
  const [products, currency] = await Promise.all([query ? getProducts({ search: query }) : Promise.resolve([]), getVisitorCurrency()]);
  const cur = { code: currency.code, symbol: currency.symbol, decimals: currency.decimals };
  return (
    <div className="pb-32">
      <PageIntro
        eyebrow="Recherche"
        title={query ? `« ${query} »` : "Rechercher"}
        text={query ? `${products.length} résultat${products.length > 1 ? "s" : ""}` : "Un nom de parfum, une note ou une famille olfactive."}
      >
        <form action="/recherche" className="mt-8 flex max-w-xl border-b border-encre/25 focus-within:border-encre">
          <input name="q" defaultValue={query} type="search" placeholder="Luna, vanille, boisé…" aria-label="Rechercher" className="min-w-0 flex-1 bg-transparent py-3 text-lg outline-none" />
          <button className="text-[11px] font-semibold tracking-[0.2em] uppercase">Chercher</button>
        </form>
      </PageIntro>
      {query && products.length === 0 && (
        <div className="px-4 text-center">
          <p className="font-display text-3xl text-encre">Aucun parfum ne correspond.</p>
          <Link href="/boutique" className="btn-primary mt-8">
            Voir toute la collection
          </Link>
        </div>
      )}
      {products.length > 0 && (
        <div className="mx-auto grid max-w-[1440px] gap-x-6 gap-y-14 px-4 sm:grid-cols-2 sm:px-8 lg:grid-cols-3 xl:grid-cols-4">
          {products.map((p, i) => (
            <ProductCard key={p.id} product={p} currency={cur} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}

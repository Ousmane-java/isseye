import Link from "next/link";
import clsx from "clsx";
import { filtersFor } from "@/lib/catalog";
import type { ProductSummary } from "@/lib/catalog-types";
import { ProductCard, type CurrencyView } from "./ProductCard";

export type SearchParams = Record<string, string | string[] | undefined>;

const sorts = [
  { value: "", label: "Notre sélection" },
  { value: "nouveautes", label: "Nouveautés" },
  { value: "prix-croissant", label: "Prix croissant" },
  { value: "prix-decroissant", label: "Prix décroissant" },
  { value: "nom", label: "Nom" },
];

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

/** Filtre et trie côté serveur selon l'adresse (?pour=elle&famille=florale&tri=prix-croissant). */
export function applyFilters(products: ProductSummary[], params: SearchParams) {
  const facets = new Set(products.flatMap((p) => p.facets.map((f) => f.facet)));
  let list = products;
  for (const facet of facets) {
    const wanted = first(params[facet]).split(",").filter(Boolean);
    if (wanted.length) list = list.filter((p) => p.facets.some((f) => f.facet === facet && wanted.includes(f.value)));
  }
  if (first(params.dispo) === "1") list = list.filter((p) => p.available);
  const sort = first(params.tri);
  const sorted = [...list];
  if (sort === "prix-croissant") sorted.sort((a, b) => a.price - b.price);
  else if (sort === "prix-decroissant") sorted.sort((a, b) => b.price - a.price);
  else if (sort === "nom") sorted.sort((a, b) => a.name.localeCompare(b.name, "fr"));
  else if (sort === "nouveautes") sorted.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return sorted;
}

/** Grille de la boutique avec filtres par caractéristiques (Admin › Caractéristiques) et tri. */
export function Catalog({ basePath, products, params, currency }: { basePath: string; products: ProductSummary[]; params: SearchParams; currency: CurrencyView }) {
  const filters = filtersFor(products);
  const shown = applyFilters(products, params);
  const current: Record<string, string> = Object.fromEntries(Object.entries(params).map(([k, v]) => [k, first(v)] as const).filter(([, v]) => v));

  const hrefWith = (key: string, value: string | null) => {
    const next = { ...current };
    if (value === null || value === "") delete next[key];
    else next[key] = value;
    const qs = new URLSearchParams(next).toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };
  const toggle = (facet: string, value: string) => {
    const values = (current[facet] ?? "").split(",").filter(Boolean);
    const next = values.includes(value) ? values.filter((v) => v !== value) : [...values, value];
    return hrefWith(facet, next.join(","));
  };
  const active = filters.some((f) => current[f.slug]);
  const sort = current.tri ?? "";

  return (
    <div className="mx-auto max-w-[1440px] px-4 pb-28 sm:px-8">
      <div className="sticky top-[calc(var(--bar-h,0px)+4rem)] z-20 -mx-4 border-y border-encre/8 bg-creme/90 px-4 py-3 backdrop-blur-xl sm:top-[calc(var(--bar-h,0px)+5rem)] sm:-mx-8 sm:px-8">
        <div className="flex items-center gap-3">
          <div className="flex min-w-0 flex-1 gap-2 overflow-x-auto [scrollbar-width:none]">
            {filters.map((f) =>
              f.values.map((v) => {
                const on = (current[f.slug] ?? "").split(",").includes(v.slug);
                return (
                  <Link
                    key={`${f.slug}-${v.slug}`}
                    href={toggle(f.slug, v.slug)}
                    scroll={false}
                    title={f.name}
                    className={clsx(
                      "shrink-0 rounded-full border px-4 py-2 text-[11px] font-semibold tracking-[0.14em] whitespace-nowrap uppercase transition",
                      on ? "border-noir bg-noir text-creme" : "border-encre/15 text-encre/75 hover:border-encre/40 hover:text-encre",
                    )}
                  >
                    {v.label}
                  </Link>
                );
              }),
            )}
            {active && (
              <Link href={basePath} scroll={false} className="shrink-0 px-3 py-2 text-[11px] font-semibold tracking-[0.14em] text-bronze uppercase underline underline-offset-4">
                Tout effacer
              </Link>
            )}
          </div>
          <details className="group relative shrink-0">
            <summary className="flex cursor-pointer list-none items-center gap-2 rounded-full border border-encre/15 px-4 py-2 text-[11px] font-semibold tracking-[0.14em] text-encre uppercase [&::-webkit-details-marker]:hidden">
              Trier <span className="hidden text-gris normal-case sm:inline">· {sorts.find((s) => s.value === sort)?.label}</span>
            </summary>
            <ul className="absolute right-0 z-30 mt-2 w-56 overflow-hidden rounded-xl bg-white py-2 shadow-xl ring-1 ring-encre/5">
              {sorts.map((s) => (
                <li key={s.value}>
                  <Link href={hrefWith("tri", s.value)} scroll={false} className={clsx("block px-4 py-2.5 text-sm hover:bg-lin-clair", s.value === sort ? "font-semibold text-encre" : "text-gris")}>
                    {s.label}
                  </Link>
                </li>
              ))}
            </ul>
          </details>
        </div>
      </div>

      <p className="mt-8 text-[12px] font-medium tracking-[0.18em] text-gris uppercase">
        {shown.length} parfum{shown.length > 1 ? "s" : ""}
      </p>

      {shown.length === 0 ? (
        <div className="py-24 text-center">
          <p className="font-display text-4xl text-encre">Aucun parfum ne correspond.</p>
          <Link href={basePath} className="btn-outline mt-8 text-encre">
            Voir toute la collection
          </Link>
        </div>
      ) : (
        <div className={clsx("mt-8 grid gap-x-6 gap-y-16 sm:grid-cols-2", shown.length > 2 ? "lg:grid-cols-3 xl:grid-cols-4" : "lg:max-w-5xl lg:gap-x-12")}>
          {shown.map((p, i) => (
            <ProductCard key={p.id} product={p} currency={currency} priority={i < 2} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}

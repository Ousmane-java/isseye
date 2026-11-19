"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Heart, Loader2 } from "lucide-react";
import { wishlistProducts } from "@/app/(site)/actions";
import type { ProductSummary } from "@/lib/catalog-types";
import { useHydrated, useWishlist } from "@/components/cart/store";
import { ProductCard, type CurrencyView } from "./ProductCard";

export function WishlistGrid({ currency }: { currency: CurrencyView }) {
  const hydrated = useHydrated();
  const ids = useWishlist((s) => s.ids);
  const [result, setResult] = useState<{ key: string; products: ProductSummary[] } | null>(null);
  const key = ids.join(",");

  useEffect(() => {
    if (!hydrated) return;
    let cancelled = false;
    wishlistProducts(key ? key.split(",") : []).then((products) => !cancelled && setResult({ key, products }));
    return () => {
      cancelled = true;
    };
  }, [hydrated, key]);

  if (!hydrated || !result) {
    return (
      <div className="grid min-h-[30vh] place-items-center">
        <Loader2 className="size-6 animate-spin text-or" />
      </div>
    );
  }
  // Produits retirés entre-temps : on n'affiche que ceux encore en favoris
  const products = result.products.filter((p) => ids.includes(p.id));
  if (!products.length) {
    return (
      <div className="mx-auto max-w-xl px-4 text-center">
        <Heart className="mx-auto size-10 text-or" strokeWidth={1} />
        <p className="mt-6 font-display text-4xl text-encre">Aucun favori pour l&apos;instant.</p>
        <p className="mt-3 text-gris">Touchez le cœur d&apos;un parfum pour le retrouver ici.</p>
        <Link href="/boutique" className="btn-primary mt-10">
          Découvrir les parfums
        </Link>
      </div>
    );
  }
  return (
    <div className="mx-auto grid max-w-[1440px] gap-x-6 gap-y-14 px-4 sm:grid-cols-2 sm:px-8 lg:grid-cols-3 xl:grid-cols-4">
      {products.map((p, i) => (
        <ProductCard key={p.id} product={p} currency={currency} index={i} />
      ))}
    </div>
  );
}

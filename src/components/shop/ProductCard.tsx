"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "motion/react";
import { Heart, Plus } from "lucide-react";
import clsx from "clsx";
import { formatMoney } from "@/lib/currency";
import type { ProductSummary } from "@/lib/catalog-types";
import { useCart, useHydrated, useWishlist } from "@/components/cart/store";

export type CurrencyView = { code: string; symbol: string; decimals: number };

export function Price({ amount, compareAt, currency, from, className }: { amount: number; compareAt?: number | null; currency: CurrencyView; from?: boolean; className?: string }) {
  return (
    <span className={clsx("inline-flex items-baseline gap-2", className)}>
      {from && <span className="text-[0.8em] text-gris">dès</span>}
      <span>{formatMoney(amount, currency)}</span>
      {compareAt ? <s className="text-[0.85em] text-gris">{formatMoney(compareAt, currency)}</s> : null}
    </span>
  );
}

export function WishlistButton({ productId, name, className }: { productId: string; name: string; className?: string }) {
  const hydrated = useHydrated();
  const ids = useWishlist((s) => s.ids);
  const toggle = useWishlist((s) => s.toggle);
  const active = hydrated && ids.includes(productId);
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        toggle(productId);
      }}
      aria-pressed={active}
      aria-label={active ? `Retirer ${name} des favoris` : `Ajouter ${name} aux favoris`}
      className={clsx("grid size-10 place-items-center rounded-full bg-creme/80 backdrop-blur transition hover:bg-creme", className)}
    >
      <motion.span key={String(active)} initial={{ scale: 0.6 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 500, damping: 18 }}>
        <Heart className={clsx("size-[17px]", active ? "fill-bronze text-bronze" : "text-encre")} strokeWidth={1.5} />
      </motion.span>
    </button>
  );
}

export function ProductCard({ product, currency, priority, index = 0 }: { product: ProductSummary; currency: CurrencyView; priority?: boolean; index?: number }) {
  const add = useCart((s) => s.add);
  const [first, second] = product.media.filter((m) => m.kind === "image");
  return (
    <motion.article
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-8% 0px" }}
      transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1], delay: (index % 4) * 0.08 }}
      className="group relative"
    >
      <div className="relative">
        <Link href={`/parfum/${product.slug}`} className="relative block aspect-[4/5] overflow-hidden bg-lin" tabIndex={-1} aria-hidden>
          {first && (
            <Image
              src={first.url}
              alt=""
              fill
              priority={priority}
              sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 90vw"
              className={clsx("object-cover transition duration-[1.6s] ease-(--ease-luxe) group-hover:scale-[1.04]", second && "group-hover:opacity-0")}
            />
          )}
          {second && <Image src={second.url} alt="" fill sizes="(min-width: 1024px) 30vw, 45vw" className="object-cover opacity-0 transition duration-700 group-hover:opacity-100" />}
          {product.badge && <span className="absolute top-4 left-4 bg-creme/90 px-3 py-1.5 text-[10px] font-semibold tracking-[0.22em] text-bronze uppercase backdrop-blur">{product.badge}</span>}
          {!product.available && <span className="absolute inset-x-0 bottom-0 bg-noir/75 py-2.5 text-center text-[11px] font-semibold tracking-[0.2em] text-creme uppercase">Épuisé</span>}
        </Link>
        <WishlistButton productId={product.id} name={product.name} className="absolute top-3 right-3" />
        {product.available && product.defaultVariantId && !product.fromPrice && (
          <button
            type="button"
            onClick={() => add(product.defaultVariantId!)}
            className="absolute right-3 bottom-3 flex h-10 items-center gap-2 rounded-full bg-noir px-4 text-[11px] font-semibold tracking-[0.18em] text-creme uppercase shadow-lg transition duration-500 ease-(--ease-luxe) hover:bg-bronze sm:translate-y-2 sm:opacity-0 sm:group-hover:translate-y-0 sm:group-hover:opacity-100 sm:focus-visible:translate-y-0 sm:focus-visible:opacity-100"
            aria-label={`Ajouter ${product.name} au panier`}
          >
            <Plus className="size-4" /> <span className="hidden sm:inline">Ajouter</span>
          </button>
        )}
      </div>
      <Link href={`/parfum/${product.slug}`} className="mt-5 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="font-display text-[1.7rem] leading-none font-normal tracking-[0.06em] text-encre uppercase">{product.name}</h3>
          {product.subtitle && <p className="mt-2 text-[11px] font-medium tracking-[0.2em] text-gris uppercase">{product.subtitle}</p>}
        </div>
        <Price amount={product.price} compareAt={product.compareAt} currency={currency} from={product.fromPrice} className="shrink-0 pt-1 text-[15px] font-medium text-encre" />
      </Link>
    </motion.article>
  );
}

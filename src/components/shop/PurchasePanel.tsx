"use client";

import { useActionState, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, Loader2, Minus, Plus, ShoppingBag } from "lucide-react";
import clsx from "clsx";
import { formatMoney } from "@/lib/currency";
import type { VariantView } from "@/lib/catalog-types";
import { requestStockAlert } from "@/app/(site)/actions";
import { useCart } from "@/components/cart/store";
import { WishlistButton, type CurrencyView } from "./ProductCard";

/** Choix de la variante, quantité, ajout au panier ; alerte de retour en stock si épuisé. */
export function PurchasePanel({ productId, name, variants, currency, taxNote }: { productId: string; name: string; variants: VariantView[]; currency: CurrencyView; taxNote: string }) {
  const add = useCart((s) => s.add);
  const [selectedId, setSelectedId] = useState((variants.find((v) => v.available) ?? variants[0])?.id);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const variant = variants.find((v) => v.id === selectedId) ?? variants[0];
  if (!variant) return <p className="text-gris">Ce parfum n&apos;est pas encore disponible.</p>;

  const max = Math.max(1, variant.maxQty);
  const quantity = Math.min(qty, max);

  return (
    <div>
      <div className="flex items-baseline gap-3">
        <span className="font-display text-4xl text-encre">{formatMoney(variant.price * quantity, currency)}</span>
        {variant.compareAt && <s className="text-lg text-gris">{formatMoney(variant.compareAt * quantity, currency)}</s>}
      </div>
      <p className="mt-1 text-[12px] text-gris">{taxNote} · Livraison calculée à la commande</p>

      {variants.length > 1 && (
        <fieldset className="mt-8">
          <legend className="text-[11px] font-semibold tracking-[0.2em] text-encre uppercase">Format</legend>
          <div className="mt-3 flex flex-wrap gap-2">
            {variants.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => setSelectedId(v.id)}
                aria-pressed={v.id === variant.id}
                className={clsx(
                  "rounded-full border px-5 py-2.5 text-sm transition",
                  v.id === variant.id ? "border-noir bg-noir text-creme" : "border-encre/15 text-encre hover:border-encre/50",
                  !v.available && "line-through opacity-50",
                )}
              >
                {v.label}
              </button>
            ))}
          </div>
        </fieldset>
      )}
      {variants.length === 1 && variant.label && <p className="mt-6 text-[13px] tracking-wide text-encre/70">{variant.label}</p>}

      {variant.available ? (
        <>
          <div className="mt-8 flex gap-3">
            <div className="flex items-center rounded-full border border-encre/15">
              <button type="button" onClick={() => setQty(Math.max(1, quantity - 1))} className="grid size-12 place-items-center text-encre/70 hover:text-encre" aria-label="Moins">
                <Minus className="size-4" />
              </button>
              <span className="w-6 text-center tabular-nums">{quantity}</span>
              <button type="button" onClick={() => setQty(Math.min(max, quantity + 1))} disabled={quantity >= max} className="grid size-12 place-items-center text-encre/70 hover:text-encre disabled:opacity-30" aria-label="Plus">
                <Plus className="size-4" />
              </button>
            </div>
            <button
              type="button"
              onClick={() => {
                add(variant.id, quantity);
                setAdded(true);
                setTimeout(() => setAdded(false), 2200);
              }}
              className="btn-primary group flex-1"
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.span key={String(added)} initial={{ y: 14, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -14, opacity: 0 }} transition={{ duration: 0.3 }} className="flex items-center gap-2">
                  {added ? <Check className="size-4" /> : <ShoppingBag className="size-4" strokeWidth={1.5} />}
                  {added ? "Ajouté" : "Ajouter au panier"}
                </motion.span>
              </AnimatePresence>
              <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-or/40 to-transparent transition-transform duration-1000 group-hover:translate-x-full" />
            </button>
            <WishlistButton productId={productId} name={name} className="size-[3.25rem] shrink-0 border border-encre/15 !bg-transparent" />
          </div>
          {variant.lowStock !== null && (
            <p className="mt-4 flex items-center gap-2 text-[13px] text-bronze">
              <span className="size-1.5 animate-pulse rounded-full bg-or" /> Plus que {variant.lowStock} en stock
            </p>
          )}
        </>
      ) : (
        <StockAlert key={variant.id} variantId={variant.id} />
      )}
    </div>
  );
}

function StockAlert({ variantId }: { variantId: string }) {
  const [state, action, pending] = useActionState(requestStockAlert.bind(null, variantId), undefined);
  return (
    <div className="mt-8 rounded-2xl bg-lin-clair p-5">
      <p className="text-[11px] font-semibold tracking-[0.2em] text-encre uppercase">Momentanément épuisé</p>
      {state?.ok ? (
        <p className="mt-3 text-sm text-bronze">{state.ok}</p>
      ) : (
        <form action={action} className="mt-3 flex gap-2">
          <input name="email" type="email" required placeholder="Votre email" aria-label="Votre email" className="field !rounded-full !py-2.5" />
          <button disabled={pending} className="btn-primary shrink-0 !px-5 !py-2.5">
            {pending ? <Loader2 className="size-4 animate-spin" /> : "Me prévenir"}
          </button>
        </form>
      )}
      {state?.error && <p className="mt-2 text-[13px] text-red-700">{state.error}</p>}
    </div>
  );
}

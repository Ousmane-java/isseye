"use client";

import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { Minus, Plus, X } from "lucide-react";
import clsx from "clsx";
import { formatMoney } from "@/lib/currency";
import type { CartView } from "@/lib/cart-types";
import { useCart } from "./store";

/** Lignes du panier (tiroir et page panier) : photo, variante, quantité, prix. */
export function CartLines({ view, compact }: { view: CartView; compact?: boolean }) {
  const setQuantity = useCart((s) => s.setQuantity);
  const remove = useCart((s) => s.remove);
  const setOpen = useCart((s) => s.setOpen);
  return (
    <ul className="divide-y divide-encre/8">
      <AnimatePresence initial={false}>
        {view.lines.map((line) => (
          <motion.li
            key={line.variantId}
            layout
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className={clsx("flex gap-4", compact ? "py-5" : "py-6")}>
              <Link href={`/parfum/${line.slug}`} onClick={() => setOpen(false)} className={clsx("relative shrink-0 overflow-hidden bg-lin", compact ? "h-28 w-[5.6rem]" : "h-36 w-28")}>
                {line.image && <Image src={line.image} alt={line.name} fill sizes="120px" className="object-cover" />}
              </Link>
              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link href={`/parfum/${line.slug}`} onClick={() => setOpen(false)} className="font-display text-xl tracking-[0.06em] text-encre uppercase">
                      {line.name}
                    </Link>
                    {line.variantLabel && <p className="mt-1 text-[12px] tracking-wide text-gris">{line.variantLabel}</p>}
                  </div>
                  <button onClick={() => remove(line.variantId)} className="-mt-1 -mr-1 grid size-8 shrink-0 place-items-center text-gris transition hover:text-encre" aria-label={`Retirer ${line.name}`}>
                    <X className="size-4" strokeWidth={1.5} />
                  </button>
                </div>
                <div className="mt-auto flex items-end justify-between gap-3 pt-3">
                  <div className="flex items-center rounded-full border border-encre/15">
                    <button
                      onClick={() => setQuantity(line.variantId, line.quantity - 1)}
                      className="grid size-9 place-items-center text-encre/70 hover:text-encre"
                      aria-label="Retirer un exemplaire"
                    >
                      <Minus className="size-3.5" />
                    </button>
                    <span className="w-6 text-center text-sm tabular-nums" aria-live="polite">
                      {line.quantity}
                    </span>
                    <button
                      onClick={() => setQuantity(line.variantId, line.quantity + 1)}
                      disabled={line.quantity >= line.maxQty}
                      className="grid size-9 place-items-center text-encre/70 hover:text-encre disabled:opacity-30"
                      aria-label="Ajouter un exemplaire"
                    >
                      <Plus className="size-3.5" />
                    </button>
                  </div>
                  <div className="text-right">
                    {line.compareAt && <s className="block text-[12px] text-gris">{formatMoney(line.compareAt * line.quantity, view.currency)}</s>}
                    <span className="text-[15px] font-medium text-encre">{formatMoney(line.lineTotal, view.currency)}</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.li>
        ))}
      </AnimatePresence>
    </ul>
  );
}

/** Jauge « Plus que X pour la livraison offerte ». */
export function FreeShippingMeter({ view }: { view: CartView }) {
  if (view.freeShippingFrom === null) return null;
  const spent = view.quote.subtotal - view.quote.discount;
  const remaining = Math.max(0, view.freeShippingFrom - spent);
  const progress = Math.min(1, spent / view.freeShippingFrom);
  return (
    <div>
      <p className="text-[13px] text-encre">
        {remaining > 0 ? (
          <>
            Plus que <strong className="font-semibold">{formatMoney(remaining, view.currency)}</strong> pour la livraison offerte
          </>
        ) : (
          <>La livraison vous est offerte</>
        )}
      </p>
      <div className="mt-2.5 h-[3px] overflow-hidden rounded-full bg-encre/10">
        <motion.div className="h-full origin-left rounded-full bg-gradient-to-r from-bronze via-or to-or-clair" initial={false} animate={{ scaleX: progress }} transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }} />
      </div>
    </div>
  );
}

export function Notices({ notices }: { notices: string[] }) {
  if (!notices.length) return null;
  return (
    <div className="rounded-xl bg-or/10 px-4 py-3 text-[13px] text-bronze">
      {notices.map((n) => (
        <p key={n}>{n}</p>
      ))}
    </div>
  );
}

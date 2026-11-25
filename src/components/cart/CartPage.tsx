"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, Gift, Loader2, Lock, Minus, Plus, ShoppingBag, Store, Truck } from "lucide-react";
import clsx from "clsx";
import { formatMoney } from "@/lib/currency";
import type { CartView } from "@/lib/cart-types";
import { useCart } from "./store";
import { useCartQuote } from "./useCartQuote";
import { FreeShippingMeter, Notices } from "./CartLines";
import { PromoToggle } from "./PromoField";

// Page panier : une grille unique (Article · Quantité · Total) alignée sur le récapitulatif,
// identique avec un ou plusieurs parfums. Le tiroir garde sa liste compacte (CartLines).

/** Colonnes partagées par l'en-tête et les lignes (ordinateur). */
const columns = "lg:grid-cols-[10rem_minmax(0,1fr)_8.5rem_6.5rem]";

export function CartPage() {
  const promoCode = useCart((s) => s.promoCode);
  const giftWrap = useCart((s) => s.giftWrap);
  const { view, loading, empty, hydrated } = useCartQuote({ promoCode, giftWrap });

  if (!hydrated || (!empty && !view)) {
    return (
      <div className="grid min-h-[40vh] place-items-center">
        <Loader2 className="size-6 animate-spin text-or" />
      </div>
    );
  }
  if (empty || !view || view.lines.length === 0) {
    return (
      <div className="mx-auto max-w-xl px-4 pb-32 text-center">
        <ShoppingBag className="mx-auto size-10 text-or" strokeWidth={1} />
        <p className="mt-6 font-display text-4xl text-encre">Votre panier est vide.</p>
        <p className="mt-3 text-gris">Nos signatures n&apos;attendent que vous.</p>
        <Link href="/boutique" className="btn-primary mt-10">
          Découvrir les parfums
        </Link>
      </div>
    );
  }

  const count = view.lines.reduce((n, l) => n + l.quantity, 0);
  return (
    <div className="mx-auto max-w-[1440px] px-4 pb-32 sm:px-8">
      {view.notices.length > 0 && (
        <div className="mb-8">
          <Notices notices={view.notices} />
        </div>
      )}
      <div className={summaryGrid}>
        <section aria-label="Articles">
          <div className={clsx("hidden border-b border-encre/10 pb-4 text-[11px] font-semibold tracking-[0.2em] text-gris uppercase lg:grid lg:gap-x-8", columns)}>
            <span className="col-span-2">
              Article{count > 1 ? "s" : ""} · {count}
            </span>
            <span className="text-center">Quantité</span>
            <span className="text-right">Total</span>
          </div>
          <ul className="divide-y divide-encre/10 border-b border-encre/10 max-lg:border-t">
            <AnimatePresence initial={false}>
              {view.lines.map((line) => (
                <Line key={line.variantId} line={line} view={view} />
              ))}
            </AnimatePresence>
          </ul>
          <Link href="/boutique" className="mt-8 inline-flex items-center gap-2 text-[12px] font-semibold tracking-[0.18em] text-encre uppercase transition hover:text-bronze">
            <ArrowLeft className="size-4" strokeWidth={1.5} /> Continuer mes achats
          </Link>
        </section>

        <Summary view={view} loading={loading} />
      </div>
    </div>
  );
}

function Line({ line, view }: { line: CartView["lines"][number]; view: CartView }) {
  const setQuantity = useCart((s) => s.setQuantity);
  const remove = useCart((s) => s.remove);
  return (
    <motion.li
      layout
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="overflow-hidden"
    >
      <div className={clsx("grid grid-cols-[7rem_minmax(0,1fr)] gap-x-5 py-6 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-x-8 sm:py-8 lg:items-center", columns)}>
        <Link href={`/parfum/${line.slug}`} className="group relative row-span-2 aspect-[4/5] overflow-hidden rounded-sm bg-lin lg:row-span-1">
          {line.image && <Image src={line.image} alt={line.name} fill sizes="(min-width: 1024px) 160px, 144px" className="object-cover transition duration-700 group-hover:scale-[1.04]" />}
        </Link>

        <div className="min-w-0 self-start lg:self-center">
          <Link href={`/parfum/${line.slug}`} className="font-display text-2xl tracking-[0.08em] text-encre uppercase transition hover:text-bronze sm:text-[1.75rem]">
            {line.name}
          </Link>
          {line.variantLabel && <p className="mt-1.5 text-[13px] text-gris">{line.variantLabel}</p>}
          <p className="mt-2 text-[13px] text-encre/80 tabular-nums">
            {line.compareAt && <s className="mr-2 text-gris">{formatMoney(line.compareAt, view.currency)}</s>}
            {formatMoney(line.unitPrice, view.currency)}
            {line.quantity > 1 && <span className="text-gris"> l&apos;unité</span>}
          </p>
          <button
            type="button"
            onClick={() => remove(line.variantId)}
            className="mt-3 text-[12px] text-gris underline decoration-encre/20 underline-offset-4 transition hover:text-encre hover:decoration-encre"
            aria-label={`Retirer ${line.name} du panier`}
          >
            Retirer
          </button>
        </div>

        {/* Mobile : quantité et total sur une même ligne ; ordinateur : deux colonnes alignées sur l'en-tête */}
        <div className="col-start-2 mt-4 flex items-center justify-between gap-3 self-end lg:contents">
          <div className="flex justify-center">
            <div className="flex items-center rounded-full border border-encre/15 bg-white/40">
              <button
                type="button"
                onClick={() => setQuantity(line.variantId, line.quantity - 1)}
                className="grid size-10 place-items-center text-encre/70 transition hover:text-encre"
                aria-label={`Retirer un exemplaire de ${line.name}`}
              >
                <Minus className="size-3.5" />
              </button>
              <span className="w-7 text-center text-[15px] tabular-nums" aria-live="polite">
                {line.quantity}
              </span>
              <button
                type="button"
                onClick={() => setQuantity(line.variantId, line.quantity + 1)}
                disabled={line.quantity >= line.maxQty}
                className="grid size-10 place-items-center text-encre/70 transition hover:text-encre disabled:opacity-30"
                aria-label={`Ajouter un exemplaire de ${line.name}`}
              >
                <Plus className="size-3.5" />
              </button>
            </div>
          </div>
          <p className="text-right text-[17px] font-medium text-encre tabular-nums">{formatMoney(line.lineTotal, view.currency)}</p>
        </div>
      </div>
    </motion.li>
  );
}

function Summary({ view, loading }: { view: CartView; loading: boolean }) {
  const giftWrap = useCart((s) => s.giftWrap);
  const setGift = useCart((s) => s.setGift);
  const q = view.quote;
  const total = q.subtotal - q.discount + q.giftWrap;
  const money = (v: number) => formatMoney(v, view.currency);

  // Barre fixe en bas de l'écran (mobile) tant que le bouton du récapitulatif n'est pas visible
  const cta = useRef<HTMLAnchorElement>(null);
  const [ctaVisible, setCtaVisible] = useState(true);
  useEffect(() => {
    if (!cta.current) return;
    const observer = new IntersectionObserver(([entry]) => setCtaVisible(entry.isIntersecting));
    observer.observe(cta.current);
    return () => observer.disconnect();
  }, []);

  return (
    <aside className="lg:sticky lg:top-[calc(var(--bar-h,0px)+7rem)]">
      <div className="rounded-2xl bg-lin-clair p-6 sm:p-8">
        <h2 className="font-display text-3xl text-encre">Récapitulatif</h2>
        <div className="mt-6">
          <FreeShippingMeter view={view} />
        </div>

        <dl className="mt-7 space-y-3 border-t border-encre/10 pt-6 text-[15px] tabular-nums">
          <div className="flex justify-between gap-4">
            <dt className="text-gris">Sous-total</dt>
            <dd className="text-encre">{money(q.subtotal)}</dd>
          </div>
          {q.discount > 0 && (
            <div className="flex justify-between gap-4 text-bronze">
              <dt>Réduction</dt>
              <dd>−{money(q.discount)}</dd>
            </div>
          )}
          {q.giftWrap > 0 && (
            <div className="flex justify-between gap-4">
              <dt className="text-gris">Emballage cadeau</dt>
              <dd className="text-encre">{money(q.giftWrap)}</dd>
            </div>
          )}
          <div className="flex justify-between gap-4">
            <dt className="text-gris">Livraison</dt>
            <dd className="text-right text-gris">Calculée à l&apos;étape suivante</dd>
          </div>
        </dl>

        <div className="mt-6 space-y-3 border-t border-encre/10 pt-6">
          {view.giftWrap.enabled && (
            <label
              className={clsx(
                "flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3.5 transition",
                giftWrap ? "border-or bg-white/70" : "border-encre/10 bg-white/40 hover:border-encre/25",
              )}
            >
              <input type="checkbox" checked={giftWrap} onChange={(e) => setGift(e.target.checked)} className="size-4 accent-noir" />
              <Gift className="size-4 text-bronze" strokeWidth={1.5} />
              <span className="flex-1 text-[14px] text-encre">Emballage cadeau</span>
              <span className="text-[13px] text-gris">{view.giftWrap.price ? money(view.giftWrap.price) : "Offert"}</span>
            </label>
          )}
          <PromoToggle view={view} />
        </div>

        <div className="mt-6 flex items-baseline justify-between gap-4 border-t border-encre/10 pt-6">
          <span className="text-[12px] font-semibold tracking-[0.2em] text-encre uppercase">Total</span>
          <span className="flex items-center gap-2 text-2xl font-medium text-encre tabular-nums">
            {loading && <Loader2 className="size-4 animate-spin text-gris" />}
            {money(total)}
          </span>
        </div>
        <p className="mt-1 text-right text-[12px] text-gris">TVA incluse</p>

        <Link ref={cta} href="/commande" className="btn-primary mt-6 w-full">
          Passer commande
        </Link>
        <p className="mt-3 text-center text-[12px] text-gris">Sans création de compte</p>
      </div>

      <Reassurance view={view} />

      {/* Mobile : total et bouton toujours à portée de main */}
      <AnimatePresence>
        {!ctaVisible && (
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-x-0 bottom-0 z-50 flex items-center gap-4 border-t border-encre/10 bg-creme/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur lg:hidden"
          >
            <div className="min-w-0">
              <p className="text-[11px] font-semibold tracking-[0.18em] text-gris uppercase">Total</p>
              <p className="text-lg font-medium text-encre tabular-nums">{money(total)}</p>
            </div>
            <Link href="/commande" className="btn-primary flex-1 !py-3">
              Passer commande
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </aside>
  );
}

/** Réassurance sous le récapitulatif (panier et caisse). */
export function Reassurance({ view }: { view: CartView }) {
  const money = (v: number) => formatMoney(v, view.currency);
  return (
    <ul className="mt-6 space-y-3 px-2 text-[13px] text-gris">
      {view.freeShippingFrom !== null && (
        <li className="flex items-center gap-3">
          <Truck className="size-4 shrink-0 text-bronze" strokeWidth={1.5} /> Livraison offerte dès {money(view.freeShippingFrom)} d&apos;achat
        </li>
      )}
      {view.pickup.enabled && (
        <li className="flex items-center gap-3">
          <Store className="size-4 shrink-0 text-bronze" strokeWidth={1.5} /> Retrait gratuit · {view.pickup.address}
        </li>
      )}
      <li className="flex items-center gap-3">
        <Lock className="size-4 shrink-0 text-bronze" strokeWidth={1.5} /> Paiement sécurisé · carte, Apple Pay, Google Pay
      </li>
    </ul>
  );
}

/** Grille commune panier / caisse : contenu à gauche, récapitulatif aligné à droite. */
export const summaryGrid = "grid items-start gap-12 lg:grid-cols-[minmax(0,1fr)_26rem] lg:gap-16 xl:grid-cols-[minmax(0,1fr)_28rem] xl:gap-24";

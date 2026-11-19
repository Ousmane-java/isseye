"use client";

import Link from "next/link";
import { Loader2, ShoppingBag } from "lucide-react";
import { formatMoney } from "@/lib/currency";
import { useCart } from "./store";
import { useCartQuote } from "./useCartQuote";
import { CartLines, FreeShippingMeter, Notices } from "./CartLines";
import { PromoField } from "./PromoField";

export function CartPage() {
  const promoCode = useCart((s) => s.promoCode);
  const giftWrap = useCart((s) => s.giftWrap);
  const setGift = useCart((s) => s.setGift);
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

  const q = view.quote;
  return (
    <div className="mx-auto grid max-w-[1440px] gap-12 px-4 pb-32 sm:px-8 lg:grid-cols-[1.5fr_1fr] lg:gap-20">
      <div>
        <Notices notices={view.notices} />
        <CartLines view={view} />
      </div>
      <aside className="h-fit rounded-2xl bg-lin-clair p-6 sm:p-8 lg:sticky lg:top-[calc(var(--bar-h,0px)+7rem)]">
        <FreeShippingMeter view={view} />
        <div className="mt-6">
          <PromoField view={view} />
        </div>
        {view.giftWrap.enabled && (
          <label className="mt-5 flex cursor-pointer items-center gap-3 text-sm text-encre">
            <input type="checkbox" checked={giftWrap} onChange={(e) => setGift(e.target.checked)} className="size-4 accent-noir" />
            Emballage cadeau {view.giftWrap.price ? `(${formatMoney(view.giftWrap.price, view.currency)})` : "offert"}
          </label>
        )}
        <dl className="mt-6 space-y-2 border-t border-encre/10 pt-6 text-[15px]">
          <div className="flex justify-between">
            <dt className="text-gris">Sous-total</dt>
            <dd>{formatMoney(q.subtotal, view.currency)}</dd>
          </div>
          {q.discount > 0 && (
            <div className="flex justify-between text-bronze">
              <dt>Réduction</dt>
              <dd>−{formatMoney(q.discount, view.currency)}</dd>
            </div>
          )}
          {q.giftWrap > 0 && (
            <div className="flex justify-between">
              <dt className="text-gris">Emballage cadeau</dt>
              <dd>{formatMoney(q.giftWrap, view.currency)}</dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt className="text-gris">Livraison</dt>
            <dd className="text-gris">Calculée à l&apos;étape suivante</dd>
          </div>
          <div className="flex items-baseline justify-between border-t border-encre/10 pt-4">
            <dt className="text-[12px] font-semibold tracking-[0.18em] uppercase">Total</dt>
            <dd className="flex items-center gap-2 font-display text-3xl">
              {loading && <Loader2 className="size-4 animate-spin text-gris" />}
              {formatMoney(q.subtotal - q.discount + q.giftWrap, view.currency)}
            </dd>
          </div>
        </dl>
        <Link href="/commande" className="btn-primary mt-6 w-full">
          Passer commande
        </Link>
        <p className="mt-4 text-center text-[12px] text-gris">Sans création de compte · Paiement sécurisé</p>
      </aside>
    </div>
  );
}

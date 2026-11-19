"use client";

import { useEffect, useState } from "react";
import { quoteCart } from "@/app/(site)/actions";
import type { AddressInput, CartView, DeliveryChoice } from "@/lib/cart-types";
import { useCart, useHydrated } from "./store";

type Options = { country?: string; methodId?: string | null; promoCode?: string | null; giftWrap?: boolean; email?: string | null; enabled?: boolean; delivery?: DeliveryChoice; address?: AddressInput | null };

/**
 * Panier chiffré par le serveur (prix dans la devise de la visiteuse, stock, livraison, code promo).
 * Recalculé à chaque changement ; les quantités corrigées par le serveur sont reportées dans le panier.
 */
export function useCartQuote({ country, methodId, promoCode, giftWrap, email, enabled = true, delivery, address }: Options = {}) {
  const hydrated = useHydrated();
  const lines = useCart((s) => s.lines);
  const replace = useCart((s) => s.replace);
  const [result, setResult] = useState<{ key: string; view: CartView } | null>(null);

  const key = JSON.stringify([lines, country, methodId, promoCode, giftWrap, email, delivery, address]);
  const active = hydrated && enabled;

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      quoteCart({ lines, country, methodId, promoCode, giftWrap, email, delivery, address })
        .then((view) => {
          if (cancelled) return;
          setResult({ key, view });
          // Le serveur a retiré ou réduit un article : on aligne le panier du navigateur
          const server = view.lines.map((l) => `${l.variantId}:${l.quantity}`).join("|");
          const local = lines.map((l) => `${l.variantId}:${l.quantity}`).join("|");
          if (view.notices.length && server !== local) replace(view.lines.map((l) => ({ variantId: l.variantId, quantity: l.quantity })));
        })
        .catch(() => {
          if (!cancelled) setResult((r) => (r ? { ...r, key } : r));
        });
    }, 150);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // `key` résume toutes les dépendances
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, active]);

  return { view: result?.view ?? null, loading: active && result?.key !== key, hydrated, empty: hydrated && lines.length === 0 };
}

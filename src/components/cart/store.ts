"use client";

import { useSyncExternalStore } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { CartLineInput } from "@/lib/cart-types";
import { MAX_QTY } from "@/lib/catalog-types";

// Panier et favoris, conservés dans le navigateur (aucun compte nécessaire).
// Seuls les identifiants et quantités sont stockés : les prix viennent toujours du serveur.

type CartState = {
  lines: CartLineInput[];
  open: boolean;
  promoCode: string;
  giftWrap: boolean;
  giftMessage: string;
  add: (variantId: string, quantity?: number) => void;
  setQuantity: (variantId: string, quantity: number) => void;
  remove: (variantId: string) => void;
  replace: (lines: CartLineInput[]) => void;
  clear: () => void;
  setOpen: (open: boolean) => void;
  setPromoCode: (code: string) => void;
  setGift: (giftWrap: boolean, giftMessage?: string) => void;
};

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      lines: [],
      open: false,
      promoCode: "",
      giftWrap: false,
      giftMessage: "",
      add: (variantId, quantity = 1) =>
        set((s) => {
          const existing = s.lines.find((l) => l.variantId === variantId);
          const lines = existing
            ? s.lines.map((l) => (l.variantId === variantId ? { ...l, quantity: Math.min(MAX_QTY, l.quantity + quantity) } : l))
            : [...s.lines, { variantId, quantity: Math.min(MAX_QTY, quantity) }];
          return { lines, open: true };
        }),
      setQuantity: (variantId, quantity) =>
        set((s) => ({
          lines: quantity <= 0 ? s.lines.filter((l) => l.variantId !== variantId) : s.lines.map((l) => (l.variantId === variantId ? { ...l, quantity: Math.min(MAX_QTY, quantity) } : l)),
        })),
      remove: (variantId) => set((s) => ({ lines: s.lines.filter((l) => l.variantId !== variantId) })),
      replace: (lines) => set({ lines }),
      clear: () => set({ lines: [], promoCode: "", giftWrap: false, giftMessage: "" }),
      setOpen: (open) => set({ open }),
      setPromoCode: (promoCode) => set({ promoCode }),
      setGift: (giftWrap, giftMessage) => set((s) => ({ giftWrap, giftMessage: giftMessage ?? s.giftMessage })),
    }),
    {
      name: "isseye-panier",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ lines: s.lines, promoCode: s.promoCode, giftWrap: s.giftWrap, giftMessage: s.giftMessage }),
    },
  ),
);

type WishlistState = {
  ids: string[];
  /** Cliente connectée : chaque changement est aussi enregistré dans son compte. */
  account: boolean;
  toggle: (productId: string) => void;
  setFromAccount: (ids: string[]) => void;
};

export const useWishlist = create<WishlistState>()(
  persist(
    (set, get) => ({
      ids: [],
      account: false,
      toggle: (productId) => {
        const on = !get().ids.includes(productId);
        set((s) => ({ ids: on ? [productId, ...s.ids] : s.ids.filter((id) => id !== productId) }));
        if (get().account) import("@/app/(site)/actions").then((m) => m.setWishlistItem(productId, on)).catch(() => {});
      },
      setFromAccount: (ids) => set({ ids, account: true }),
    }),
    { name: "isseye-favoris", storage: createJSONStorage(() => localStorage), partialize: (s) => ({ ids: s.ids }) },
  ),
);

/** Vrai une fois le navigateur prêt : évite d'afficher un panier vide puis rempli au chargement. */
const noSubscribe = () => () => {};
export function useHydrated() {
  return useSyncExternalStore(noSubscribe, () => true, () => false);
}

export const cartCount = (lines: CartLineInput[]) => lines.reduce((n, l) => n + l.quantity, 0);

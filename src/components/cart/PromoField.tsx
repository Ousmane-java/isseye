"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";
import type { CartView } from "@/lib/cart-types";
import { useCart } from "./store";

/** Saisie du code promo : vérifié par le serveur à chaque recalcul du panier. */
export function PromoField({ view }: { view: CartView | null }) {
  const promoCode = useCart((s) => s.promoCode);
  const setPromoCode = useCart((s) => s.setPromoCode);
  const [draft, setDraft] = useState("");
  const applied = promoCode && view?.promo;

  if (applied) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-xl border border-dashed border-or/60 px-4 py-3">
        <span className="flex items-center gap-2 text-sm">
          {view.promo!.ok ? <Check className="size-4 text-bronze" /> : <X className="size-4 text-red-600" />}
          <strong className="font-semibold tracking-[0.12em] text-encre">{view.promo!.code}</strong>
          <span className={view.promo!.ok ? "text-bronze" : "text-red-700"}>{view.promo!.message}</span>
        </span>
        <button type="button" onClick={() => setPromoCode("")} className="text-[12px] text-gris underline underline-offset-4 hover:text-encre">
          Retirer
        </button>
      </div>
    );
  }
  return (
    <div className="flex gap-2">
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value.toUpperCase())}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            if (draft.trim()) setPromoCode(draft.trim());
          }
        }}
        placeholder="Code promo"
        aria-label="Code promo"
        maxLength={24}
        className="field !py-2.5 uppercase"
      />
      <button type="button" onClick={() => draft.trim() && setPromoCode(draft.trim())} className="btn-outline shrink-0 !px-5 !py-2.5 text-encre">
        Appliquer
      </button>
    </div>
  );
}

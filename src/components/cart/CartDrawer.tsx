"use client";

import Link from "next/link";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { Loader2, ShoppingBag, X } from "lucide-react";
import { formatMoney } from "@/lib/currency";
import { cartCount, useCart } from "./store";
import { useCartQuote } from "./useCartQuote";
import { CartLines, FreeShippingMeter, Notices } from "./CartLines";

/** Tiroir du panier : s'ouvre à chaque ajout, depuis n'importe quelle page. */
export function CartDrawer() {
  const open = useCart((s) => s.open);
  const setOpen = useCart((s) => s.setOpen);
  const lines = useCart((s) => s.lines);
  const promoCode = useCart((s) => s.promoCode);
  const { view, loading } = useCartQuote({ promoCode, enabled: open });
  const pathname = usePathname();

  // Fermeture : touche Échap, et à chaque changement de page
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    document.documentElement.classList.add("lenis-stopped");
    return () => {
      window.removeEventListener("keydown", onKey);
      document.documentElement.classList.remove("lenis-stopped");
    };
  }, [open, setOpen]);
  useEffect(() => setOpen(false), [pathname, setOpen]);

  const count = cartCount(lines);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-[60] bg-noir/40 backdrop-blur-[3px]"
          />
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label="Votre panier"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-y-0 right-0 z-[61] flex w-full max-w-[440px] flex-col bg-creme shadow-[-30px_0_80px_-20px_rgba(27,25,23,0.35)]"
            data-lenis-prevent
          >
            <div className="flex items-center justify-between border-b border-encre/8 px-6 py-5">
              <p className="font-display text-2xl text-encre">
                Votre panier {count > 0 && <span className="text-lg text-gris">({count})</span>}
              </p>
              <button onClick={() => setOpen(false)} className="-mr-2 grid size-10 place-items-center text-encre" aria-label="Fermer le panier">
                <X className="size-5" strokeWidth={1.5} />
              </button>
            </div>

            {count === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
                <ShoppingBag className="size-10 text-or" strokeWidth={1} />
                <p className="mt-6 font-display text-3xl text-encre">Votre panier est vide.</p>
                <p className="mt-2 text-sm text-gris">Laissez-vous guider par nos signatures.</p>
                <Link href="/boutique" onClick={() => setOpen(false)} className="btn-primary mt-8">
                  Découvrir les parfums
                </Link>
              </div>
            ) : !view ? (
              <div className="grid flex-1 place-items-center">
                <Loader2 className="size-6 animate-spin text-or" />
              </div>
            ) : (
              <>
                <div className="space-y-4 px-6 pt-5">
                  <FreeShippingMeter view={view} />
                  <Notices notices={view.notices} />
                </div>
                <div className="flex-1 overflow-y-auto px-6" data-lenis-prevent>
                  <CartLines view={view} compact />
                </div>
                <div className="border-t border-encre/8 bg-lin-clair px-6 pt-5 pb-6">
                  {view.quote.discount > 0 && (
                    <div className="mb-1.5 flex justify-between text-sm text-bronze">
                      <span>Réduction {view.promo?.code}</span>
                      <span>−{formatMoney(view.quote.discount, view.currency)}</span>
                    </div>
                  )}
                  <div className="flex items-baseline justify-between">
                    <span className="text-[13px] font-semibold tracking-[0.18em] text-encre uppercase">Sous-total</span>
                    <span className="flex items-center gap-2 font-display text-2xl text-encre">
                      {loading && <Loader2 className="size-4 animate-spin text-gris" />}
                      {formatMoney(view.quote.subtotal - view.quote.discount, view.currency)}
                    </span>
                  </div>
                  <p className="mt-1 text-[12px] text-gris">Livraison calculée à l&apos;étape suivante.</p>
                  <Link href="/commande" onClick={() => setOpen(false)} className="btn-primary mt-5 w-full">
                    Commander
                  </Link>
                  <Link href="/panier" onClick={() => setOpen(false)} className="mt-3 block text-center text-[12px] font-semibold tracking-[0.18em] text-encre/70 uppercase hover:text-encre">
                    Voir le panier
                  </Link>
                </div>
              </>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

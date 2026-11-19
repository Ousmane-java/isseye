"use client";

import { useEffect } from "react";
import { useCart } from "./store";

/** Vide le panier une fois la commande enregistrée (page de confirmation). */
export function ClearCart() {
  const clear = useCart((s) => s.clear);
  useEffect(() => {
    clear();
    try {
      localStorage.removeItem("isseye-caisse");
    } catch {
      // stockage indisponible
    }
  }, [clear]);
  return null;
}

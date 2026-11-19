import type { Metadata } from "next";
import { PageIntro } from "@/components/PageIntro";
import { CartPage } from "@/components/cart/CartPage";

export const metadata: Metadata = { title: "Panier", robots: { index: false } };

export default function Panier() {
  return (
    <>
      <PageIntro eyebrow="Votre sélection" title="Panier" />
      <CartPage />
    </>
  );
}

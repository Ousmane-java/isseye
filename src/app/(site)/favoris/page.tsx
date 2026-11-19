import type { Metadata } from "next";
import { getVisitorCurrency } from "@/lib/currencies";
import { PageIntro } from "@/components/PageIntro";
import { WishlistGrid } from "@/components/shop/WishlistGrid";

export const metadata: Metadata = { title: "Mes favoris", robots: { index: false } };

export default async function FavoritesPage() {
  const currency = await getVisitorCurrency();
  return (
    <div className="pb-32">
      <PageIntro eyebrow="Votre sélection" title="Mes favoris" text="Gardés dans ce navigateur, sans compte." />
      <WishlistGrid currency={{ code: currency.code, symbol: currency.symbol, decimals: currency.decimals }} />
    </div>
  );
}

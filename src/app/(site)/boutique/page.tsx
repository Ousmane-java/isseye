import type { Metadata } from "next";
import { getProducts } from "@/lib/catalog";
import { getVisitorCurrency } from "@/lib/currencies";
import { PageIntro } from "@/components/PageIntro";
import { Catalog } from "@/components/shop/Catalog";

export const metadata: Metadata = {
  title: "Parfums",
  description: "Les eaux de parfum ISSEYE : Luna pour elle, Noir pour lui. Format Pocket Parfum 30 ml, livré en France, en Europe, en Afrique et aux États-Unis.",
  alternates: { canonical: "/boutique" },
};

export default async function ShopPage({ searchParams }: PageProps<"/boutique">) {
  const [products, currency, params] = await Promise.all([getProducts(), getVisitorCurrency(), searchParams]);
  const audience = params.pour === "elle" ? "Pour elle" : params.pour === "lui" ? "Pour lui" : null;
  return (
    <>
      <PageIntro
        eyebrow={audience ?? "La collection"}
        title={audience ? `Parfums ${audience.toLowerCase()}` : "Les parfums"}
        text="Des eaux de parfum concentrées, présentées dans notre flacon signature Pocket Parfum de 30 ml : verre givré, sphère de bois, élégance à emporter."
      />
      <Catalog basePath="/boutique" products={products} params={params} currency={{ code: currency.code, symbol: currency.symbol, decimals: currency.decimals }} />
    </>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Globe, Lock, RotateCcw, Truck } from "lucide-react";
import { getProduct, getRelated, getReviews } from "@/lib/catalog";
import { getPricingContext } from "@/lib/shop";
import { stripsVat } from "@/lib/pricing";
import { markdownToHtml } from "@/lib/markdown";
import { noteLayers } from "@/lib/catalog-types";
import { Gallery } from "@/components/shop/Gallery";
import { PurchasePanel } from "@/components/shop/PurchasePanel";
import { Details } from "@/components/shop/Details";
import { Reviews, Stars } from "@/components/shop/Reviews";
import { ProductCard } from "@/components/shop/ProductCard";
import { FadeUp, MaskLines } from "@/components/motion/Reveal";

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

export async function generateMetadata({ params }: PageProps<"/parfum/[slug]">): Promise<Metadata> {
  const product = await getProduct((await params).slug);
  if (!product) return {};
  const image = product.media.find((m) => m.kind === "image")?.url;
  return {
    title: product.seoTitle ?? `${product.name} · ${product.subtitle ?? "Eau de parfum"}`,
    description: product.seoDescription ?? product.description?.slice(0, 160) ?? undefined,
    alternates: { canonical: `/parfum/${product.slug}` },
    openGraph: { images: image ? [{ url: image }] : undefined, type: "website" },
  };
}

export default async function ProductPage({ params }: PageProps<"/parfum/[slug]">) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) notFound();
  const [ctx, related, { reviews, average, count }] = await Promise.all([getPricingContext(), getRelated(product), getReviews(product.id)]);
  const currency = { code: ctx.currency.code, symbol: ctx.currency.symbol, decimals: ctx.currency.decimals };
  const taxNote = ctx.taxMode === "ttc" ? "TVA comprise" : stripsVat(ctx) ? "Prix hors TVA (export)" : "Prix toutes taxes françaises comprises";
  const hasNotes = product.notes.tete.length + product.notes.coeur.length + product.notes.fond.length > 0;

  // Données structurées pour Google (prix, disponibilité, avis)
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description ?? undefined,
    image: product.media.filter((m) => m.kind === "image").map((m) => (m.url.startsWith("http") ? m.url : `${siteUrl}${m.url}`)),
    brand: { "@type": "Brand", name: "ISSEYE" },
    sku: product.variants[0]?.sku ?? undefined,
    offers: product.variants.map((v) => ({
      "@type": "Offer",
      price: (v.price / 10 ** currency.decimals).toFixed(currency.decimals),
      priceCurrency: currency.code,
      availability: v.available ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      url: `${siteUrl}/parfum/${product.slug}`,
    })),
    ...(count ? { aggregateRating: { "@type": "AggregateRating", ratingValue: average.toFixed(1), reviewCount: count } } : {}),
  };

  const prose = (text: string | null) => <div className="prose-isseye" dangerouslySetInnerHTML={{ __html: markdownToHtml(text) }} />;

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />

      <div className="page-top mx-auto max-w-[1440px] px-4 sm:px-8">
        <nav aria-label="Fil d'Ariane" className="mb-6 hidden text-[11px] font-medium tracking-[0.18em] text-gris uppercase lg:block">
          <Link href="/" className="hover:text-encre">
            Accueil
          </Link>
          <span className="mx-2 text-or">·</span>
          <Link href="/boutique" className="hover:text-encre">
            Parfums
          </Link>
          <span className="mx-2 text-or">·</span>
          <span className="text-encre">{product.name}</span>
        </nav>

        <div className="grid gap-10 lg:grid-cols-[1.15fr_1fr] lg:gap-16 xl:gap-24">
          <Gallery media={product.media} name={product.name} />

          <div className="lg:sticky lg:top-[calc(var(--bar-h,0px)+7rem)] lg:self-start">
            {product.badge && <p className="eyebrow text-bronze">{product.badge}</p>}
            <MaskLines as="h1" delay={0.1} lines={[product.name]} className="mt-3 font-display text-[clamp(3.5rem,8vw,6.5rem)] leading-[0.9] font-light tracking-[0.06em] text-encre uppercase" />
            {product.subtitle && <p className="filet mt-4 text-[12px] font-semibold tracking-[0.24em] text-bronze uppercase">{product.subtitle}</p>}
            {count > 0 && (
              <a href="#avis" className="mt-4 flex items-center gap-2 text-[13px] text-gris hover:text-encre">
                <Stars rating={average} /> {count} avis
              </a>
            )}
            {product.description && <p className="mt-6 max-w-lg text-[15px] leading-relaxed text-encre/75">{product.description}</p>}

            <div className="mt-8">
              <PurchasePanel productId={product.id} name={product.name} variants={product.variants} currency={currency} taxNote={taxNote} />
            </div>

            <ul className="mt-8 grid grid-cols-2 gap-4 text-[12px] text-gris">
              <li className="flex items-center gap-2.5">
                <Truck className="size-4 shrink-0 text-bronze" strokeWidth={1.4} /> Expédié sous 48 h
              </li>
              <li className="flex items-center gap-2.5">
                <Globe className="size-4 shrink-0 text-bronze" strokeWidth={1.4} /> Europe, Afrique, USA
              </li>
              <li className="flex items-center gap-2.5">
                <Lock className="size-4 shrink-0 text-bronze" strokeWidth={1.4} /> Paiement sécurisé
              </li>
              <li className="flex items-center gap-2.5">
                <RotateCcw className="size-4 shrink-0 text-bronze" strokeWidth={1.4} /> Retour 14 jours (scellé)
              </li>
            </ul>

            <div className="mt-10">
              <Details
                sections={[
                  ...(hasNotes
                    ? [
                        {
                          title: "Pyramide olfactive",
                          open: true,
                          content: (
                            <dl className="space-y-4">
                              {(Object.keys(noteLayers) as (keyof typeof noteLayers)[])
                                .filter((layer) => product.notes[layer].length)
                                .map((layer) => (
                                  <div key={layer} className="grid grid-cols-[8.5rem_1fr] gap-4">
                                    <dt className="text-[12px] font-semibold tracking-[0.14em] text-bronze uppercase">{noteLayers[layer]}</dt>
                                    <dd className="font-display text-xl text-encre">{product.notes[layer].map((n) => n.name).join(" · ")}</dd>
                                  </div>
                                ))}
                            </dl>
                          ),
                        },
                      ]
                    : []),
                  ...(product.usage ? [{ title: "Conseils d'utilisation", content: prose(product.usage) }] : []),
                  ...(product.ingredients || product.allergens
                    ? [
                        {
                          title: "Ingrédients & allergènes",
                          content: (
                            <div className="space-y-3 text-[14px] leading-relaxed text-encre/80">
                              {product.ingredients && <p>{product.ingredients}</p>}
                              {product.allergens && (
                                <p>
                                  <strong className="font-semibold text-encre">Allergènes : </strong>
                                  {product.allergens}
                                </p>
                              )}
                              <p className="text-[12px] text-gris">Usage externe. Tenir hors de portée des enfants. Liquide inflammable : tenir éloigné de la chaleur.</p>
                            </div>
                          ),
                        },
                      ]
                    : []),
                  {
                    title: "Livraison & retours",
                    content: (
                      <div className="space-y-2 text-[14px] leading-relaxed text-encre/80">
                        <p>Commandes préparées sous 1 à 2 jours ouvrés. Délais et frais selon votre pays, affichés avant le paiement.</p>
                        <p>Retour possible sous 14 jours pour un article non ouvert, dans son emballage scellé.</p>
                        <Link href="/livraison-retours" className="text-bronze underline underline-offset-4">
                          Tout savoir
                        </Link>
                      </div>
                    ),
                  },
                ]}
              />
            </div>
          </div>
        </div>
      </div>

      {product.story && (
        <section className="grain relative mt-28 overflow-hidden bg-noir px-4 py-28 text-center text-creme sm:px-8 sm:py-36">
          <div className="absolute top-1/2 left-1/2 size-[50vmax] -translate-x-1/2 -translate-y-1/2 animate-breathe rounded-full bg-or/10 blur-[120px]" />
          <div className="relative mx-auto max-w-4xl">
            <p className="eyebrow filet justify-center text-or">L&apos;histoire de {product.name}</p>
            <FadeUp>
              <p className="mt-10 font-display text-[clamp(1.8rem,3.6vw,3rem)] leading-[1.25] font-light italic">« {product.story} »</p>
            </FadeUp>
          </div>
        </section>
      )}

      <Reviews productId={product.id} productName={product.name} reviews={reviews} average={average} />

      {related.length > 0 && (
        <section className="bg-lin-clair px-4 py-24 sm:px-8">
          <div className="mx-auto max-w-[1440px]">
            <p className="eyebrow filet text-bronze">À découvrir aussi</p>
            <h2 className="mt-5 font-display text-5xl font-light text-encre">Une autre signature.</h2>
            <div className={`mt-12 grid gap-x-6 gap-y-14 sm:grid-cols-2 ${related.length > 2 ? "lg:grid-cols-4" : "lg:max-w-5xl"}`}>
              {related.map((p, i) => (
                <ProductCard key={p.id} product={p} currency={currency} index={i} />
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}

import Link from "next/link";
import { getProducts } from "@/lib/catalog";
import { getFaqs } from "@/lib/content";
import { getVisitorCurrency } from "@/lib/currencies";
import { items, list, str, type Section } from "@/lib/blocks";
import { markdownToHtml } from "@/lib/markdown";
import { ProductCard } from "@/components/shop/ProductCard";
import { NewsletterForm } from "@/components/NewsletterForm";
import { FadeUp, MaskLines } from "@/components/motion/Reveal";
import { Hero } from "./Hero";
import { Closing, Families, Manifesto, Marquee, PageHero, Pocket, Reassurance, Split, Testimonials } from "./Editorial";
import { FaqList } from "./FaqList";

/** Affiche les blocs d'une page (Admin › Pages) dans l'ordre, en ignorant les blocs masqués. */
export function RenderSections({ sections }: { sections: Section[] }) {
  return (
    <>
      {sections
        .filter((s) => s.visible !== false)
        .map((s) => (
          <Block key={s.id} section={s} />
        ))}
    </>
  );
}

function Block({ section }: { section: Section }) {
  const p = section.props ?? {};
  switch (section.type) {
    case "hero": {
      const accent = Number.parseInt(str(p, "accentLine"), 10);
      return (
        <Hero
          eyebrow={str(p, "eyebrow")}
          titleLines={list(p, "titleLines")}
          accentLine={Number.isFinite(accent) ? accent - 1 : null}
          text={str(p, "text")}
          ctaLabel={str(p, "ctaLabel")}
          ctaHref={str(p, "ctaHref")}
          secondaryLabel={str(p, "secondaryLabel")}
          secondaryHref={str(p, "secondaryHref")}
          image={str(p, "image")}
        />
      );
    }
    case "pageHero":
      return <PageHero eyebrow={str(p, "eyebrow")} title={str(p, "title")} text={str(p, "text")} image={str(p, "image")} tone={str(p, "tone")} />;
    case "marquee":
      return <Marquee items={list(p, "items")} />;
    case "manifesto":
      return <Manifesto eyebrow={str(p, "eyebrow")} text={str(p, "text")} />;
    case "split":
      return (
        <Split
          eyebrow={str(p, "eyebrow")}
          title={str(p, "title")}
          text={str(p, "text")}
          image={str(p, "image")}
          side={str(p, "side")}
          tone={str(p, "tone")}
          ctaLabel={str(p, "ctaLabel")}
          ctaHref={str(p, "ctaHref")}
        />
      );
    case "pocket":
      return <Pocket eyebrow={str(p, "eyebrow")} title={str(p, "title")} text={str(p, "text")} image={str(p, "image")} points={list(p, "points")} ctaLabel={str(p, "ctaLabel")} ctaHref={str(p, "ctaHref")} />;
    case "families":
      return (
        <Families
          eyebrow={str(p, "eyebrow")}
          titleLines={list(p, "titleLines")}
          cards={items(p, "cards").map((c) => ({ title: str(c, "title"), text: str(c, "text"), href: str(c, "href"), image: str(c, "image"), tone: str(c, "tone") }))}
        />
      );
    case "reassurance":
      return <Reassurance items={items(p, "items").map((i) => ({ icon: str(i, "icon"), title: str(i, "title"), text: str(i, "text") }))} />;
    case "testimonials":
      return <Testimonials eyebrow={str(p, "eyebrow")} items={items(p, "items").map((i) => ({ quote: str(i, "quote"), author: str(i, "author") }))} />;
    case "closing":
      return <Closing titleLines={list(p, "titleLines")} text={str(p, "text")} ctaLabel={str(p, "ctaLabel")} ctaHref={str(p, "ctaHref")} />;
    case "products":
      return <ProductsBlock props={p} />;
    case "faq":
      return <FaqBlock props={p} />;
    case "richtext":
      return (
        <section className="bg-creme px-4 py-20 sm:px-8">
          <div className="mx-auto max-w-3xl">
            {str(p, "title") && <h2 className="font-display text-4xl font-light text-encre sm:text-5xl">{str(p, "title")}</h2>}
            <div className="prose-isseye mt-6" dangerouslySetInnerHTML={{ __html: markdownToHtml(str(p, "body")) }} />
          </div>
        </section>
      );
    case "newsletter":
      return (
        <section className="bg-lin px-4 py-24 text-center sm:px-8">
          <div className="mx-auto max-w-2xl">
            <p className="eyebrow filet text-bronze">{str(p, "eyebrow")}</p>
            <h2 className="mt-6 font-display text-4xl leading-tight font-light text-encre sm:text-5xl">{str(p, "title")}</h2>
            {str(p, "text") && <p className="mt-4 text-[15px] text-gris">{str(p, "text")}</p>}
            <NewsletterForm source="bloc" className="mx-auto mt-10 max-w-md text-left" />
          </div>
        </section>
      );
    default:
      return null;
  }
}

async function ProductsBlock({ props: p }: { props: Record<string, unknown> }) {
  const mode = str(p, "mode") || "featured";
  const ids = list(p, "productIds");
  const [currency, products] = await Promise.all([
    getVisitorCurrency(),
    mode === "manual" && ids.length ? getProducts({ ids }) : getProducts({ featured: mode === "featured", limit: 8 }),
  ]);
  const shown = products.length ? products : await getProducts({ limit: 8 });
  if (!shown.length) return null;
  const cur = { code: currency.code, symbol: currency.symbol, decimals: currency.decimals };
  return (
    <section className="bg-creme px-4 py-24 sm:px-8 sm:py-32">
      <div className="mx-auto max-w-[1440px]">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            {str(p, "eyebrow") && <p className="eyebrow filet text-bronze">{str(p, "eyebrow")}</p>}
            <MaskLines as="h2" lines={[str(p, "title")]} className="mt-5 font-display text-[clamp(2.4rem,5vw,4.5rem)] leading-[0.98] font-light text-encre" />
            {str(p, "text") && <p className="mt-5 text-[15px] leading-relaxed text-gris">{str(p, "text")}</p>}
          </div>
          {str(p, "ctaLabel") && str(p, "ctaHref") && (
            <FadeUp>
              <Link href={str(p, "ctaHref")} className="btn-outline text-encre">
                {str(p, "ctaLabel")}
              </Link>
            </FadeUp>
          )}
        </div>
        <div className={`mt-14 grid gap-x-6 gap-y-14 sm:grid-cols-2 ${shown.length > 2 ? "lg:grid-cols-3 xl:grid-cols-4" : "lg:mx-auto lg:max-w-5xl lg:gap-x-12"}`}>
          {shown.map((product, i) => (
            <ProductCard key={product.id} product={product} currency={cur} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}

async function FaqBlock({ props: p }: { props: Record<string, unknown> }) {
  const faqs = await getFaqs(str(p, "topic") || undefined);
  if (!faqs.length) return null;
  return (
    <section className="bg-creme px-4 py-24 sm:px-8">
      <div className="mx-auto grid max-w-[1440px] gap-12 lg:grid-cols-[1fr_1.6fr]">
        <div>
          <p className="eyebrow filet text-bronze">{str(p, "eyebrow")}</p>
          <h2 className="mt-5 font-display text-5xl font-light text-encre">{str(p, "title")}</h2>
          <Link href="/faq" className="mt-8 inline-block text-[12px] font-semibold tracking-[0.18em] text-encre uppercase underline decoration-or underline-offset-8">
            Toutes les questions
          </Link>
        </div>
        <FaqList items={faqs.slice(0, 6)} />
      </div>
    </section>
  );
}

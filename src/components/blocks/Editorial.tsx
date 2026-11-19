"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";
import { motion, useScroll, useTransform } from "motion/react";
import { ArrowUpRight, Gift, Globe, Leaf, Lock, Sparkles, Truck, type LucideIcon } from "lucide-react";
import clsx from "clsx";
import { FadeUp, MaskLines, ScrollWords } from "@/components/motion/Reveal";
import { Mist } from "@/components/motion/Mist";
import { markdownToHtml } from "@/lib/markdown";

type Tone = "creme" | "lin" | "noir" | "rose";
const toneBg: Record<Tone, string> = { creme: "bg-creme text-encre", lin: "bg-lin text-encre", noir: "bg-noir text-creme", rose: "bg-rose text-encre" };
const isTone = (t: string): t is Tone => t in toneBg;
const tone = (t: string) => toneBg[isTone(t) ? t : "creme"];

/** Bandeau défilant (mots-clés de la maison). */
export function Marquee({ items }: { items: string[] }) {
  if (!items.length) return null;
  const row = [...items, ...items];
  return (
    <div className="overflow-hidden border-y border-encre/10 bg-creme py-5" aria-hidden>
      <div className="flex w-max animate-marquee">
        {[0, 1].map((copy) => (
          <div key={copy} className="flex">
            {row.map((item, i) => (
              <span key={`${copy}-${i}`} className="flex items-center font-display text-2xl font-light whitespace-nowrap italic sm:text-3xl">
                <span className="px-8">{item}</span>
                <span className="size-1.5 rotate-45 bg-or" />
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Manifeste : grand texte qui s'illumine mot après mot au défilement. */
export function Manifesto({ eyebrow, text }: { eyebrow: string; text: string }) {
  return (
    <section className="bg-creme px-4 py-32 sm:px-8 sm:py-44">
      <div className="mx-auto max-w-5xl">
        <p className="eyebrow filet text-bronze">{eyebrow}</p>
        <ScrollWords text={text} className="mt-8 font-display text-[clamp(2rem,4.6vw,4rem)] leading-[1.12] font-light text-encre" />
      </div>
    </section>
  );
}

/** En-tête de page (La Maison, pages libres). */
export function PageHero({ eyebrow, title, text, image, tone: t }: { eyebrow: string; title: string; text: string; image: string; tone: string }) {
  const dark = t === "noir";
  return (
    <section className={clsx("grain relative overflow-hidden px-4 pt-[calc(var(--bar-h,0px)+8rem)] pb-20 sm:px-8 sm:pt-[calc(var(--bar-h,0px)+10rem)] sm:pb-28", tone(t))}>
      <div className={clsx("mx-auto grid max-w-[1440px] items-center gap-12", image && "lg:grid-cols-[1.1fr_1fr]")}>
        <div className={clsx(!image && "mx-auto max-w-3xl text-center")}>
          {eyebrow && <p className={clsx("eyebrow filet animate-fade-up", dark ? "text-or" : "text-bronze")}>{eyebrow}</p>}
          <MaskLines as="h1" delay={0.15} lines={[title]} className="mt-6 font-display text-[clamp(2.8rem,7vw,6.5rem)] leading-[0.95] font-light" />
          {text && <p className={clsx("mt-8 max-w-xl animate-fade-up text-[16px] leading-relaxed [animation-delay:0.6s]", dark ? "text-creme/70" : "text-encre/70", !image && "mx-auto")}>{text}</p>}
        </div>
        {image && (
          <motion.div
            initial={{ clipPath: "inset(12% 12% 12% 12%)", opacity: 0 }}
            animate={{ clipPath: "inset(0% 0% 0% 0%)", opacity: 1 }}
            transition={{ duration: 1.6, ease: [0.22, 1, 0.36, 1], delay: 0.3 }}
            className="relative aspect-[5/4] overflow-hidden bg-lin"
          >
            <Image src={image} alt="" fill priority sizes="(min-width: 1024px) 45vw, 100vw" className="object-cover" />
          </motion.div>
        )}
      </div>
    </section>
  );
}

/** Photo et texte, avec parallaxe douce sur la photo. */
export function Split({ eyebrow, title, text, image, side, tone: t, ctaLabel, ctaHref }: { eyebrow: string; title: string; text: string; image: string; side: string; tone: string; ctaLabel: string; ctaHref: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], ["-8%", "8%"]);
  const dark = t === "noir";
  return (
    <section className={clsx("px-4 py-24 sm:px-8 sm:py-32", tone(t))}>
      <div className="mx-auto grid max-w-[1440px] items-center gap-12 lg:grid-cols-2 lg:gap-24">
        <div ref={ref} className={clsx("relative aspect-[4/5] overflow-hidden bg-lin", side === "right" && "lg:order-2")}>
          {image && (
            <motion.div style={{ y }} className="absolute -inset-y-[10%] inset-x-0">
              <Image src={image} alt="" fill sizes="(min-width: 1024px) 45vw, 100vw" className="object-cover" />
            </motion.div>
          )}
        </div>
        <FadeUp className="max-w-xl">
          {eyebrow && <p className={clsx("eyebrow filet", dark ? "text-or" : "text-bronze")}>{eyebrow}</p>}
          <h2 className="mt-6 font-display text-[clamp(2.6rem,5.5vw,5rem)] leading-[0.95] font-light tracking-[0.02em]">{title}</h2>
          <div className={clsx("prose-isseye mt-6 !text-[16px]", dark && "!text-creme/75 [&_strong]:!text-creme")} dangerouslySetInnerHTML={{ __html: markdownToHtml(text) }} />
          {ctaLabel && ctaHref && (
            <Link href={ctaHref} className={clsx("mt-10", dark ? "btn-gold" : "btn-primary")}>
              {ctaLabel}
            </Link>
          )}
        </FadeUp>
      </div>
    </section>
  );
}

/** Signature Pocket Parfum : grande photo, points clés dorés, sur fond noir. */
export function Pocket({ eyebrow, title, text, image, points, ctaLabel, ctaHref }: { eyebrow: string; title: string; text: string; image: string; points: string[]; ctaLabel: string; ctaHref: string }) {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const scale = useTransform(scrollYProgress, [0, 1], [1.15, 1]);
  return (
    <section ref={ref} className="grain relative overflow-hidden bg-noir text-creme">
      <Mist className="absolute inset-0 h-full w-full" density={24} />
      <div className="relative mx-auto grid max-w-[1440px] items-center gap-12 px-4 py-24 sm:px-8 sm:py-32 lg:grid-cols-[1.05fr_1fr] lg:gap-20">
        <div className="relative aspect-[4/5] overflow-hidden">
          {image && (
            <motion.div style={{ scale }} className="absolute inset-0">
              <Image src={image} alt="" fill sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover" />
            </motion.div>
          )}
        </div>
        <div>
          <p className="eyebrow filet text-or">{eyebrow}</p>
          <MaskLines as="h2" lines={[title]} className="text-dore mt-6 font-display text-[clamp(3rem,7vw,6.5rem)] leading-[0.95] font-light" />
          <FadeUp delay={0.2}>
            <p className="mt-8 max-w-lg text-[16px] leading-relaxed text-creme/70">{text}</p>
            <ul className="mt-10 space-y-4 border-t border-creme/10 pt-8">
              {points.map((p, i) => (
                <motion.li
                  key={p}
                  initial={{ opacity: 0, x: -16 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.1 * i, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                  className="flex items-center gap-4 text-[15px] text-creme/85"
                >
                  <span className="size-1.5 shrink-0 rotate-45 bg-or" />
                  {p}
                </motion.li>
              ))}
            </ul>
            {ctaLabel && ctaHref && (
              <Link href={ctaHref} className="btn-gold mt-12">
                {ctaLabel}
              </Link>
            )}
          </FadeUp>
        </div>
      </div>
    </section>
  );
}

export type FamilyCard = { title: string; text: string; href: string; image: string; tone: string };

/**
 * Familles olfactives : la section reste épinglée pendant que les cartes défilent
 * horizontalement (ordinateur). Sur mobile, carrousel tactile.
 */
export function Families({ eyebrow, titleLines, cards }: { eyebrow: string; titleLines: string[]; cards: FamilyCard[] }) {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const x = useTransform(scrollYProgress, [0, 1], ["0%", `-${Math.max(0, cards.length - 2.4) * 30}%`]);
  if (!cards.length) return null;

  return (
    <section ref={ref} className={clsx("relative bg-noir text-creme", cards.length > 2 && "lg:h-[260vh]")}>
      <div className="overflow-hidden py-24 lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col lg:justify-center lg:py-0">
        <div className="mx-auto w-full max-w-[1440px] px-4 sm:px-8">
          <p className="eyebrow filet text-or">{eyebrow}</p>
          <MaskLines as="h2" lines={titleLines} className="mt-5 font-display text-[clamp(2.6rem,6vw,5.5rem)] leading-[0.95] font-light" />
        </div>

        <motion.ul style={{ x }} className="mt-14 hidden gap-6 pl-8 lg:flex">
          {cards.map((card) => (
            <li key={card.title} className="w-[30vw] max-w-[440px] shrink-0">
              <Card card={card} />
            </li>
          ))}
        </motion.ul>
        <ul className="mt-10 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 [scrollbar-width:none] sm:px-8 lg:hidden">
          {cards.map((card) => (
            <li key={card.title} className="w-[78vw] max-w-[360px] shrink-0 snap-start">
              <Card card={card} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function Card({ card }: { card: FamilyCard }) {
  const dark = card.tone === "noir";
  return (
    <Link href={card.href || "/boutique"} className="group block">
      <div className={clsx("grain relative aspect-[4/5] overflow-hidden ring-1 ring-creme/10", tone(card.tone))}>
        {card.image ? (
          <Image src={card.image} alt="" fill sizes="(min-width: 1024px) 30vw, 78vw" className="object-cover transition duration-[1.6s] ease-(--ease-luxe) group-hover:scale-105" />
        ) : (
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_25%,rgba(229,182,90,0.35),transparent_55%)] transition-transform duration-[1.6s] ease-(--ease-luxe) group-hover:scale-125" />
        )}
        <span
          className={clsx(
            "absolute top-5 right-5 grid size-11 place-items-center rounded-full border transition duration-500 group-hover:rotate-45",
            dark ? "border-creme/30 group-hover:bg-creme group-hover:text-noir" : "border-encre/20 group-hover:bg-noir group-hover:text-creme",
          )}
        >
          <ArrowUpRight className="size-4" strokeWidth={1.5} />
        </span>
        <div className="absolute inset-x-6 bottom-6">
          <p className="font-display text-5xl font-light italic">{card.title}</p>
          <p className={clsx("mt-2 text-[13px] tracking-wide", dark ? "text-creme/65" : "text-encre/65")}>{card.text}</p>
        </div>
      </div>
    </Link>
  );
}

const icons: Record<string, LucideIcon> = { truck: Truck, lock: Lock, gift: Gift, leaf: Leaf, globe: Globe, sparkles: Sparkles };

export function Reassurance({ items }: { items: { icon: string; title: string; text: string }[] }) {
  if (!items.length) return null;
  return (
    <section className="border-y border-encre/8 bg-lin-clair px-4 py-14 sm:px-8">
      <ul className="mx-auto grid max-w-[1440px] gap-10 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((item, i) => {
          const Icon = icons[item.icon] ?? Sparkles;
          return (
            <motion.li
              key={item.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
              className="flex items-start gap-4"
            >
              <span className="grid size-12 shrink-0 place-items-center rounded-full border border-or/40 text-bronze">
                <Icon className="size-5" strokeWidth={1.3} />
              </span>
              <span>
                <span className="block text-[12px] font-semibold tracking-[0.18em] text-encre uppercase">{item.title}</span>
                <span className="mt-1 block text-[14px] text-gris">{item.text}</span>
              </span>
            </motion.li>
          );
        })}
      </ul>
    </section>
  );
}

export function Testimonials({ eyebrow, items }: { eyebrow: string; items: { quote: string; author: string }[] }) {
  if (!items.length) return null;
  return (
    <section className="bg-creme px-4 py-28 sm:px-8">
      <div className="mx-auto max-w-[1440px]">
        <p className="eyebrow filet text-bronze">{eyebrow}</p>
        <ul className="mt-12 grid gap-10 md:grid-cols-3">
          {items.map((t, i) => (
            <FadeUp key={i} delay={i * 0.1}>
              <blockquote className="border-t border-or/40 pt-8">
                <p className="font-display text-2xl leading-snug font-light text-encre italic">« {t.quote} »</p>
                <footer className="mt-5 text-[12px] font-semibold tracking-[0.18em] text-gris uppercase">{t.author}</footer>
              </blockquote>
            </FadeUp>
          ))}
        </ul>
      </div>
    </section>
  );
}

/** Appel final : grand titre doré sur fond noir, brume. */
export function Closing({ titleLines, text, ctaLabel, ctaHref }: { titleLines: string[]; text: string; ctaLabel: string; ctaHref: string }) {
  return (
    <section className="grain relative overflow-hidden bg-noir-profond px-4 py-32 text-center text-creme sm:px-8 sm:py-44">
      <div className="absolute top-1/2 left-1/2 size-[60vmax] -translate-x-1/2 -translate-y-1/2 animate-breathe rounded-full bg-or/15 blur-[130px]" />
      <Mist className="absolute inset-0 h-full w-full" density={28} />
      <div className="relative mx-auto max-w-3xl">
        <MaskLines as="h2" lines={titleLines.map((l, i) => (i === titleLines.length - 1 ? <em key={i} className="text-dore">{l}</em> : l))} className="font-display text-[clamp(2.8rem,7vw,6.5rem)] leading-[0.95] font-light" />
        <FadeUp delay={0.3}>
          {text && <p className="mx-auto mt-8 max-w-md text-[15px] leading-relaxed text-creme/70">{text}</p>}
          {ctaLabel && ctaHref && (
            <Link href={ctaHref} className="btn-gold mt-10">
              {ctaLabel}
            </Link>
          )}
        </FadeUp>
      </div>
    </section>
  );
}

"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { motion, useMotionValue, useScroll, useSpring, useTransform } from "motion/react";
import { ArrowDown } from "lucide-react";
import { Mist } from "@/components/motion/Mist";
import { MaskLines } from "@/components/motion/Reveal";

export type HeroProps = {
  eyebrow: string;
  titleLines: string[];
  accentLine: number | null;
  text: string;
  ctaLabel: string;
  ctaHref: string;
  secondaryLabel: string;
  secondaryHref: string;
  image: string;
};

/**
 * Accueil : les flacons posés dans la lumière du lin, brume dorée, titre révélé ligne à ligne.
 * La photo flotte et s'incline doucement avec la souris ; parallaxe au défilement.
 */
export function Hero({ eyebrow, titleLines, accentLine, text, ctaLabel, ctaHref, secondaryLabel, secondaryHref, image }: HeroProps) {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const imageY = useTransform(scrollYProgress, [0, 1], [0, 140]);
  const imageScale = useTransform(scrollYProgress, [0, 1], [1, 1.08]);
  const textY = useTransform(scrollYProgress, [0, 1], [0, -90]);
  const fade = useTransform(scrollYProgress, [0, 0.7], [1, 0]);

  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rotateY = useSpring(useTransform(mx, [-1, 1], [-5, 5]), { stiffness: 50, damping: 20 });
  const rotateX = useSpring(useTransform(my, [-1, 1], [4, -4]), { stiffness: 50, damping: 20 });
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const onMove = (e: PointerEvent) => {
      mx.set((e.clientX / window.innerWidth) * 2 - 1);
      my.set((e.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [mx, my]);

  return (
    <section ref={ref} className="grain relative isolate h-[100svh] min-h-[680px] overflow-hidden bg-[linear-gradient(180deg,#cdbaac_0%,#d5c4b6_55%,#ded0c5_100%)] text-encre">
      <div className="absolute -top-1/4 -right-1/4 -z-10 size-[70vmax] animate-drift rounded-full bg-white/25 blur-[120px]" />
      <div className="absolute -bottom-1/3 -left-1/4 -z-10 size-[60vmax] animate-drift rounded-full bg-or/15 blur-[140px] [animation-delay:-11s]" />

      {/* Photo : à droite sur ordinateur, en haut sur mobile ; fondue dans le décor */}
      {image && (
        <motion.div style={{ y: imageY, scale: imageScale }} className="absolute inset-x-0 top-0 -z-10 h-[50%] sm:h-[58%] lg:inset-y-0 lg:right-0 lg:left-auto lg:h-full lg:w-[62%]">
          <motion.div
            initial={{ opacity: 0, scale: 1.06 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 2.2, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
            style={{ rotateX, rotateY, transformPerspective: 1400 }}
            className="relative h-full w-full [mask-image:linear-gradient(to_bottom,black_72%,transparent)] lg:[mask-image:linear-gradient(to_right,transparent_0%,black_22%,black_100%)]"
          >
            <Image src={image} alt="" fill priority sizes="(min-width: 1024px) 62vw, 100vw" quality={90} className="object-cover object-[50%_30%] lg:object-center" />
          </motion.div>
        </motion.div>
      )}
      <Mist tone="light" density={34} className="absolute inset-0 -z-10 h-full w-full" />

      <div className="mx-auto flex h-full max-w-[1440px] items-end px-4 pt-24 pb-10 sm:px-8 sm:pb-16 lg:items-center lg:pb-0">
        <motion.div style={{ y: textY, opacity: fade }} className="relative z-10 max-w-xl">
          <p className="eyebrow filet animate-fade-up text-bronze [animation-delay:0.2s]">{eyebrow}</p>
          <MaskLines
            as="h1"
            delay={0.35}
            className="mt-4 font-display text-[clamp(3rem,9vw,8rem)] lg:mt-6 leading-[0.9] font-light tracking-[-0.01em]"
            lines={titleLines.map((line, i) => (i === accentLine ? <em key={i} className="text-dore pr-[0.06em]">{line}</em> : line))}
          />
          <p className="mt-5 max-w-md animate-fade-up text-[15px] lg:mt-8 leading-relaxed text-encre/75 [animation-delay:1s]">{text}</p>
          <div className="mt-7 flex animate-fade-up flex-wrap items-center gap-x-6 gap-y-4 [animation-delay:1.2s] lg:mt-10">
            {ctaLabel && ctaHref && (
              <Link href={ctaHref} className="btn-primary group">
                {ctaLabel}
                <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-or/40 to-transparent transition-transform duration-1000 group-hover:translate-x-full" />
              </Link>
            )}
            {secondaryLabel && secondaryHref && (
              <Link href={secondaryHref} className="group relative text-[12px] font-semibold tracking-[0.2em] uppercase">
                {secondaryLabel}
                <span className="absolute -bottom-1 left-0 h-px w-full origin-left bg-current transition-transform duration-500 group-hover:scale-x-50" />
              </Link>
            )}
          </div>
        </motion.div>
      </div>

      <motion.div style={{ opacity: fade }} className="absolute bottom-8 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-3 text-encre/60 lg:flex">
        <span className="text-[10px] tracking-[0.35em] uppercase">Découvrir</span>
        <ArrowDown className="size-4 animate-bounce" strokeWidth={1.25} />
      </motion.div>
    </section>
  );
}

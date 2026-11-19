"use client";

import { useRef, type ReactNode } from "react";
import { motion, useInView, useScroll, useTransform, type MotionValue } from "motion/react";
import clsx from "clsx";

const luxe = [0.22, 1, 0.36, 1] as const;

/** Lignes de titre qui montent derrière un masque, l'une après l'autre. */
export function MaskLines({ lines, className, delay = 0, as: Tag = "span" }: { lines: ReactNode[]; className?: string; delay?: number; as?: "span" | "h1" | "h2" }) {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: "-10% 0px" });
  return (
    <Tag ref={ref as never} className={clsx("block", className)}>
      {lines.map((line, i) => (
        <span key={i} className="block overflow-hidden pb-[0.08em]">
          <motion.span
            className="block"
            initial={{ y: "110%" }}
            animate={inView ? { y: 0 } : undefined}
            transition={{ duration: 1.3, ease: luxe, delay: delay + i * 0.12 }}
          >
            {line}
          </motion.span>
        </span>
      ))}
    </Tag>
  );
}

/** Apparition douce (fondu + montée) quand l'élément entre à l'écran. */
export function FadeUp({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-10% 0px" }}
      transition={{ duration: 1.1, ease: luxe, delay }}
    >
      {children}
    </motion.div>
  );
}

/** Texte dont chaque mot s'illumine au fil du défilement. */
export function ScrollWords({ text, className }: { text: string; className?: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 85%", "end 45%"] });
  const words = text.split(" ");
  return (
    <p ref={ref} className={clsx("flex flex-wrap", className)}>
      {words.map((word, i) => (
        <Word key={i} progress={scrollYProgress} range={[i / words.length, (i + 1) / words.length]}>
          {word}
        </Word>
      ))}
    </p>
  );
}

function Word({ children, progress, range }: { children: string; progress: MotionValue<number>; range: [number, number] }) {
  const opacity = useTransform(progress, range, [0.14, 1]);
  return (
    <motion.span style={{ opacity }} className="mr-[0.25em]">
      {children}
    </motion.span>
  );
}

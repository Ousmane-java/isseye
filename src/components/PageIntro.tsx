import type { ReactNode } from "react";
import clsx from "clsx";
import { MaskLines } from "@/components/motion/Reveal";

/** En-tête des pages intérieures : sur-titre doré, grand titre révélé, texte. */
export function PageIntro({ eyebrow, title, text, children, center, className }: { eyebrow?: string; title: string; text?: ReactNode; children?: ReactNode; center?: boolean; className?: string }) {
  return (
    <div className={clsx("page-top mx-auto max-w-[1440px] px-4 pb-10 sm:px-8 sm:pb-14", center && "text-center", className)}>
      {eyebrow && <p className={clsx("eyebrow filet animate-fade-up text-bronze", center && "justify-center")}>{eyebrow}</p>}
      <MaskLines as="h1" delay={0.1} lines={[title]} className="mt-5 font-display text-[clamp(2.8rem,7vw,6rem)] leading-[0.95] font-light text-encre" />
      {text && <div className={clsx("mt-5 max-w-2xl animate-fade-up text-[15px] leading-relaxed text-gris [animation-delay:0.4s]", center && "mx-auto")}>{text}</div>}
      {children}
    </div>
  );
}

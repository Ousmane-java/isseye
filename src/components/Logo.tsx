import Image from "next/image";
import clsx from "clsx";
import monogram from "../../public/images/monogramme.png";

/**
 * Identité ISSEYE : monogramme IS doré (avec la goutte-flacon) et nom en capitales espacées,
 * comme sur les étuis Pocket Parfum.
 * - `inline` (défaut) : monogramme + nom sur une ligne (en-tête)
 * - `stacked` : monogramme au-dessus du nom (pied de page, connexion)
 * - `mark` : monogramme seul
 * `light` : nom en crème pour fond sombre (le monogramme reste doré).
 */
export function Logo({ className, light, variant = "inline", tagline }: { className?: string; light?: boolean; variant?: "inline" | "stacked" | "mark"; tagline?: string }) {
  const mark = <Image src={monogram} alt="" aria-hidden priority className="h-[1.55em] w-auto shrink-0" sizes="64px" />;
  if (variant === "mark") {
    return (
      <span aria-label="ISSEYE" className={clsx("inline-flex", className)}>
        {mark}
      </span>
    );
  }
  const name = (
    <span aria-hidden className={clsx("font-display leading-none font-medium tracking-[0.38em] -mr-[0.38em]", light ? "text-creme" : "text-encre")}>
      ISSEYE
    </span>
  );
  if (variant === "stacked") {
    return (
      <span aria-label="ISSEYE" className={clsx("inline-flex flex-col items-center gap-[0.45em] select-none", className)}>
        <Image src={monogram} alt="" aria-hidden className="h-[2.4em] w-auto" sizes="128px" />
        {name}
        {tagline && <span className={clsx("filet text-[0.22em] font-sans font-semibold tracking-[0.3em] uppercase", light ? "text-or" : "text-bronze")}>{tagline}</span>}
      </span>
    );
  }
  return (
    <span aria-label="ISSEYE" className={clsx("inline-flex items-center gap-[0.55em] select-none", className)}>
      {mark}
      {name}
    </span>
  );
}

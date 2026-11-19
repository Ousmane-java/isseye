import Link from "next/link";
import { Logo } from "@/components/Logo";

export default function NotFound() {
  return (
    <main className="grain grid min-h-dvh place-items-center bg-lin px-6 text-center">
      <div>
        <Link href="/" aria-label="Accueil ISSEYE" className="text-2xl">
          <Logo variant="stacked" className="text-[2.4rem]" />
        </Link>
        <p className="mt-16 font-display text-[clamp(5rem,16vw,11rem)] leading-none font-light text-dore">404</p>
        <p className="mt-4 font-display text-3xl text-encre">Ce sillage s&apos;est évaporé.</p>
        <p className="mt-3 text-gris">La page demandée n&apos;existe pas ou plus.</p>
        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <Link href="/" className="btn-primary">
            Accueil
          </Link>
          <Link href="/boutique" className="btn-outline text-encre">
            Les parfums
          </Link>
        </div>
      </div>
    </main>
  );
}

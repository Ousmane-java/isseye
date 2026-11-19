"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Heart, Menu, Search, ShoppingBag, User, X } from "lucide-react";
import clsx from "clsx";
import { Logo } from "@/components/Logo";
import type { MenuItem } from "@/lib/menus";
import type { Announcement } from "@/lib/content";
import { cartCount, useCart, useHydrated, useWishlist } from "@/components/cart/store";

const toneClass = { noir: "bg-noir text-creme", or: "bg-or text-noir", creme: "bg-lin text-encre" } as const;

/**
 * En-tête : bandeau d'annonce (Admin › Annonces), menu (Admin › Menus), recherche, favoris,
 * compte et panier. Transparent sur l'accueil, voile crème dès qu'on défile.
 */
export function Header({ items, currencyLabel, bar, barKey }: { items: MenuItem[]; currencyLabel: string; bar: Announcement | null; barKey: string }) {
  const pathname = usePathname();
  const overHero = pathname === "/";
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const hydrated = useHydrated();
  const count = useCart((s) => cartCount(s.lines));
  const setCartOpen = useCart((s) => s.setOpen);
  const favorites = useWishlist((s) => s.ids.length);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Ferme les menus à chaque changement de page
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setOpen(false);
    setSearching(false);
  }

  const solid = !overHero || scrolled || open;

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-50">
        {bar?.content.text && (
          <div className={clsx("isy-bar relative z-10 h-9 overflow-hidden text-center text-[11px] font-medium tracking-[0.16em] uppercase", toneClass[bar.tone] ?? toneClass.noir)}>
            <div className="flex h-full items-center justify-center gap-3 pr-11 pl-11">
              <span className="truncate">{bar.content.text}</span>
              {bar.content.link_href && bar.content.link_label && (
                <Link href={bar.content.link_href} className="hidden shrink-0 underline decoration-current/40 underline-offset-4 hover:decoration-current sm:inline">
                  {bar.content.link_label}
                </Link>
              )}
            </div>
            <button
              type="button"
              onClick={() => {
                try {
                  localStorage.setItem("isseye-bandeau", barKey);
                } catch {
                  // navigation privée : le bandeau est fermé pour cette visite seulement
                }
                const shell = document.getElementById("site-shell");
                shell?.style.setProperty("--bar-h", "0px");
                if (shell) shell.dataset.barClosed = "1";
              }}
              className="absolute top-1/2 right-2 grid size-8 -translate-y-1/2 place-items-center opacity-70 transition hover:opacity-100"
              aria-label="Fermer l'annonce"
            >
              <X className="size-4" strokeWidth={1.5} />
            </button>
          </div>
        )}
        <div
          className={clsx(
            "text-encre transition-[background-color,box-shadow,backdrop-filter] duration-700 ease-(--ease-luxe)",
            solid ? "bg-creme/85 shadow-[0_1px_0_rgba(42,38,34,0.07)] backdrop-blur-xl" : "bg-transparent",
          )}
        >
          <div className="mx-auto grid h-16 max-w-[1440px] grid-cols-[1fr_auto_1fr] items-center px-4 sm:h-20 sm:px-8">
            <nav className="flex items-center gap-1" aria-label="Menu principal">
              <button
                onClick={() => setOpen((o) => !o)}
                className="-ml-2 grid size-10 place-items-center lg:hidden"
                aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
                aria-expanded={open}
              >
                {open ? <X className="size-5" strokeWidth={1.5} /> : <Menu className="size-5" strokeWidth={1.5} />}
              </button>
              <ul className="hidden items-center gap-8 lg:flex">
                {items.map((item) => (
                  <li key={item.id}>
                    <Link href={item.href} className="group relative py-2 text-[11px] font-semibold tracking-[0.22em] uppercase">
                      {item.label}
                      <span className="absolute -bottom-0.5 left-0 h-px w-full origin-right scale-x-0 bg-or transition-transform duration-500 ease-(--ease-luxe) group-hover:origin-left group-hover:scale-x-100" />
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            <Link href="/" aria-label="Accueil ISSEYE" className="text-[1.15rem] sm:text-[1.4rem]">
              <Logo />
            </Link>

            <div className="flex items-center justify-end gap-0.5 sm:gap-1.5">
              <span className="mr-2 hidden text-[10px] font-semibold tracking-[0.2em] text-gris uppercase xl:inline">{currencyLabel}</span>
              <button onClick={() => setSearching(true)} className="grid size-10 place-items-center" aria-label="Rechercher">
                <Search className="size-[18px]" strokeWidth={1.5} />
              </button>
              <Link href="/favoris" className="relative hidden size-10 place-items-center sm:grid" aria-label="Mes favoris">
                <Heart className="size-[18px]" strokeWidth={1.5} />
                {hydrated && favorites > 0 && <span className="absolute top-2 right-1.5 size-1.5 rounded-full bg-or" />}
              </Link>
              <Link href="/compte" className="hidden size-10 place-items-center sm:grid" aria-label="Mon compte">
                <User className="size-[18px]" strokeWidth={1.5} />
              </Link>
              <button onClick={() => setCartOpen(true)} className="relative -mr-2 grid size-10 place-items-center" aria-label={`Panier${hydrated && count ? `, ${count} article${count > 1 ? "s" : ""}` : ""}`}>
                <ShoppingBag className="size-[18px]" strokeWidth={1.5} />
                <AnimatePresence>
                  {hydrated && count > 0 && (
                    <motion.span
                      key={count}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      transition={{ type: "spring", stiffness: 500, damping: 20 }}
                      className="absolute top-1 right-0 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-noir px-1 text-[10px] font-bold text-creme"
                    >
                      {count}
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Menu mobile plein écran */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ clipPath: "inset(0 0 100% 0)" }}
            animate={{ clipPath: "inset(0 0 0% 0)" }}
            exit={{ clipPath: "inset(0 0 100% 0)" }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-0 z-40 flex flex-col bg-creme px-6 pt-32 pb-10 lg:hidden"
          >
            <ul className="space-y-1">
              {[...items, { id: "fav", label: "Mes favoris", href: "/favoris" }, { id: "compte", label: "Mon compte", href: "/compte" }].map((item, i) => (
                <li key={item.id} className="overflow-hidden">
                  <motion.div initial={{ y: "110%" }} animate={{ y: 0 }} transition={{ delay: 0.25 + i * 0.06, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}>
                    <Link href={item.href} className={clsx("block font-display leading-tight font-light text-encre", i < items.length ? "text-[2.6rem]" : "mt-2 text-2xl text-gris")}>
                      {item.label}
                    </Link>
                  </motion.div>
                </li>
              ))}
            </ul>
            <p className="mt-auto text-[11px] font-medium tracking-[0.2em] text-gris uppercase">{currencyLabel}</p>
          </motion.div>
        )}
      </AnimatePresence>

      <SearchOverlay open={searching} onClose={() => setSearching(false)} />
    </>
  );
}

function SearchOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!open) return;
    input.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="fixed inset-0 z-[70] bg-creme/95 backdrop-blur-xl"
          role="dialog"
          aria-modal="true"
          aria-label="Recherche"
        >
          <button onClick={onClose} className="absolute top-5 right-4 grid size-11 place-items-center text-encre sm:top-7 sm:right-8" aria-label="Fermer la recherche">
            <X className="size-6" strokeWidth={1.25} />
          </button>
          <motion.form
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
            onSubmit={(e) => {
              e.preventDefault();
              const q = input.current?.value.trim();
              if (q) router.push(`/recherche?q=${encodeURIComponent(q)}`);
            }}
            className="mx-auto mt-[22vh] max-w-3xl px-6"
          >
            <p className="eyebrow text-bronze">Rechercher</p>
            <div className="mt-6 flex items-center border-b border-encre/25 focus-within:border-encre">
              <input
                ref={input}
                name="q"
                type="search"
                placeholder="Luna, vanille, boisé…"
                className="min-w-0 flex-1 bg-transparent py-4 font-display text-4xl font-light text-encre outline-none placeholder:text-encre/25 sm:text-6xl"
              />
              <button className="grid size-12 place-items-center text-encre" aria-label="Lancer la recherche">
                <ArrowRight className="size-6" strokeWidth={1.25} />
              </button>
            </div>
            <p className="mt-6 text-sm text-gris">Un nom de parfum, une note (rose, vanille, cuir…) ou une famille olfactive.</p>
          </motion.form>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

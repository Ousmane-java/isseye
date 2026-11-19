"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  BadgePercent,
  Boxes,
  Coins,
  ExternalLink,
  FolderTree,
  Images,
  Inbox,
  LayoutDashboard,
  Layers,
  LogOut,
  Mail,
  Megaphone,
  Menu,
  MessageCircleQuestion,
  Navigation,
  Package,
  ReceiptText,
  ScrollText,
  Settings,
  SlidersHorizontal,
  Star,
  Truck,
  UserRound,
  UsersRound,
  X,
  FileText,
  type LucideIcon,
} from "lucide-react";
import clsx from "clsx";
import { Logo } from "@/components/Logo";
import { adminSections, roleLabels, type AdminRole, type AdminSectionKey } from "@/config/admin";
import { logout } from "../actions";

const icons: Record<AdminSectionKey, LucideIcon> = {
  dashboard: LayoutDashboard,
  orders: ReceiptText,
  customers: UserRound,
  messages: Inbox,
  promotions: BadgePercent,
  reviews: Star,
  products: Package,
  categories: FolderTree,
  collections: Layers,
  attributes: SlidersHorizontal,
  stock: Boxes,
  pages: FileText,
  menus: Navigation,
  announcements: Megaphone,
  media: Images,
  faq: MessageCircleQuestion,
  emails: Mail,
  currencies: Coins,
  shipping: Truck,
  settings: Settings,
  team: UsersRound,
  activity: ScrollText,
};

export type NavCounts = Partial<Record<AdminSectionKey, number>>;

export function AdminNav({ email, role, siteUrl, counts }: { email: string; role: AdminRole; siteUrl: string; counts: NavCounts }) {
  // Sur le sous-domaine, /admin/commandes s'affiche /commandes : on compare toujours sans le préfixe.
  const pathname = usePathname().replace(/^\/admin(?=\/|$)/, "") || "/";
  const [open, setOpen] = useState(false);
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setOpen(false);
  }

  const sections = adminSections.filter((s) => s.roles.includes(role));
  const groups = [...new Set(sections.map((s) => s.group))];
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`));

  const content = (
    <>
      <Link href="/" className="block px-3 text-xl">
        <Logo light />
      </Link>
      <p className="mt-2 px-3 text-[10px] tracking-[0.3em] text-creme/40 uppercase">Espace de gestion</p>

      <nav className="mt-8 flex-1 space-y-7 overflow-y-auto pr-1 [scrollbar-width:thin]">
        {groups.map((group) => (
          <div key={group}>
            <p className="px-3 text-[10px] font-semibold tracking-[0.25em] text-creme/35 uppercase">{group}</p>
            <ul className="mt-2 space-y-0.5">
              {sections
                .filter((s) => s.group === group)
                .map((s) => {
                  const Icon = icons[s.key];
                  const n = counts[s.key] ?? 0;
                  const active = isActive(s.href);
                  return (
                    <li key={s.key}>
                      <Link
                        href={s.href}
                        className={clsx(
                          "relative flex items-center gap-3 rounded-lg px-3 py-2 text-[14px] transition",
                          active ? "text-creme" : "text-creme/60 hover:bg-creme/5 hover:text-creme",
                        )}
                      >
                        {active && (
                          <motion.span layoutId="admin-nav-active" className="absolute inset-0 -z-10 rounded-lg bg-creme/10 ring-1 ring-or/30" transition={{ type: "spring", stiffness: 400, damping: 34 }} />
                        )}
                        <Icon className="size-[17px] shrink-0" strokeWidth={1.6} />
                        {s.label}
                        {n > 0 && <span className="ml-auto grid h-5 min-w-5 place-items-center rounded-full bg-or px-1.5 text-[11px] font-bold text-noir">{n}</span>}
                      </Link>
                    </li>
                  );
                })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="mt-6 space-y-0.5 border-t border-creme/10 pt-4">
        <Link
          href="/mon-compte"
          className={clsx("block rounded-lg px-3 py-2 transition hover:bg-creme/5", isActive("/mon-compte") && "bg-creme/10")}
        >
          <span className="block truncate text-[13px] text-creme/80">{email}</span>
          <span className="block text-[11px] text-creme/40">{roleLabels[role]} · Mon compte</span>
        </Link>
        <a href={siteUrl} target="_blank" className="flex items-center gap-3 rounded-lg px-3 py-2 text-[14px] text-creme/60 hover:bg-creme/5 hover:text-creme">
          <ExternalLink className="size-[17px]" strokeWidth={1.6} /> Voir le site
        </a>
        <form action={logout}>
          <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[14px] text-creme/60 hover:bg-creme/5 hover:text-creme">
            <LogOut className="size-[17px]" strokeWidth={1.6} /> Déconnexion
          </button>
        </form>
      </div>
    </>
  );

  return (
    <>
      {/* Barre latérale (ordinateur) */}
      <aside className="fixed inset-y-0 left-0 isolate hidden w-64 flex-col bg-noir p-4 pt-7 lg:flex print:!hidden">{content}</aside>

      {/* Mobile : barre du haut + tiroir */}
      <header className="sticky top-0 z-30 flex items-center justify-between bg-noir px-4 py-3 lg:hidden print:hidden">
        <Link href="/" className="text-lg">
          <Logo light />
        </Link>
        <button onClick={() => setOpen(true)} className="grid size-10 place-items-center text-creme" aria-label="Ouvrir le menu">
          <Menu className="size-5" />
        </button>
      </header>
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-40 bg-noir/50 backdrop-blur-sm lg:hidden"
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 380, damping: 40 }}
              className="fixed inset-y-0 left-0 isolate z-50 flex w-[82vw] max-w-xs flex-col bg-noir p-4 pt-7 lg:hidden"
            >
              <button onClick={() => setOpen(false)} className="absolute top-5 right-4 grid size-9 place-items-center text-creme/70" aria-label="Fermer le menu">
                <X className="size-5" />
              </button>
              {content}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

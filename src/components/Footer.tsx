import Link from "next/link";
import { Logo } from "@/components/Logo";
import { NewsletterForm } from "@/components/NewsletterForm";
import type { MenuItem } from "@/lib/menus";
import type { Settings } from "@/lib/settings-schema";

export function Footer({ items, settings, currencyLabel }: { items: MenuItem[]; settings: Settings; currencyLabel: string }) {
  const { brand, contact } = settings;
  const socials = [
    { label: "Instagram", href: contact.instagram },
    { label: "TikTok", href: contact.tiktok },
    { label: "Facebook", href: contact.facebook },
    { label: "Snapchat", href: contact.snapchat },
    { label: "WhatsApp", href: contact.whatsapp ? `https://wa.me/${contact.whatsapp}` : "" },
  ].filter((s) => s.href);

  return (
    <footer className="grain relative overflow-hidden bg-noir text-creme">
      <div className="pointer-events-none absolute -top-40 left-1/2 size-[46rem] -translate-x-1/2 rounded-full bg-or/10 blur-[140px]" />
      <div className="relative mx-auto max-w-[1440px] px-4 pt-20 pb-10 sm:px-8 sm:pt-28">
        <div className="grid gap-16 lg:grid-cols-[1.2fr_1.5fr]">
          <div>
            <p className="eyebrow text-or">Le cercle ISSEYE</p>
            <p className="mt-5 max-w-md font-display text-4xl leading-tight font-light sm:text-5xl">
              Les nouvelles signatures, <em className="text-dore">avant tout le monde.</em>
            </p>
            <NewsletterForm source="pied-de-page" dark className="mt-8 max-w-md" />
          </div>

          <div className="grid grid-cols-2 gap-10 sm:grid-cols-3">
            {items.map((group) => (
              <div key={group.id}>
                <p className="eyebrow text-creme/45">{group.label}</p>
                <ul className="mt-5 space-y-3">
                  {(group.children ?? []).map((link) => (
                    <li key={link.id}>
                      <Link href={link.href} className="text-[14px] text-creme/75 transition hover:text-or">
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-24 flex justify-center select-none">
          <Logo variant="stacked" light tagline={brand.tagline} className="text-[clamp(2.4rem,9vw,6.5rem)]" />
        </div>

        <div className="mt-16 flex flex-col gap-5 border-t border-creme/10 pt-6 text-[12px] text-creme/45 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {brand.name} · {currencyLabel} · Paiement sécurisé
          </p>
          {socials.length > 0 && (
            <ul className="flex flex-wrap gap-x-6 gap-y-2">
              {socials.map((s) => (
                <li key={s.label}>
                  <a href={s.href} target="_blank" rel="noopener noreferrer" className="tracking-[0.14em] uppercase transition hover:text-or">
                    {s.label}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </footer>
  );
}

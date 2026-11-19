import type { Metadata } from "next";
import Link from "next/link";
import { Mail, MessageCircle, Phone } from "lucide-react";
import { getSettings } from "@/lib/settings";
import { PageIntro } from "@/components/PageIntro";
import { ContactForm } from "@/components/ContactForm";

export const metadata: Metadata = { title: "Contact", description: "Une question sur un parfum, une commande ou une livraison ? Écrivez à ISSEYE." };

export default async function ContactPage({ searchParams }: PageProps<"/contact">) {
  const [{ contact }, { commande }] = await Promise.all([getSettings(), searchParams]);
  return (
    <div className="pb-32">
      <PageIntro eyebrow="Service client" title="Écrivez-nous" text="Une question sur un parfum, une commande, une livraison ? Nous répondons sous 48 heures ouvrées." />
      <div className="mx-auto grid max-w-[1440px] gap-14 px-4 sm:px-8 lg:grid-cols-[1.5fr_1fr]">
        <ContactForm orderNumber={typeof commande === "string" ? commande.slice(0, 20) : undefined} />
        <aside className="h-fit space-y-6 rounded-2xl bg-lin-clair p-6 sm:p-8">
          <p className="font-display text-2xl text-encre">Autres moyens</p>
          <ul className="space-y-4 text-[15px] text-encre">
            {contact.email && (
              <li className="flex items-center gap-3">
                <Mail className="size-4 text-bronze" strokeWidth={1.5} />
                <a href={`mailto:${contact.email}`} className="underline-offset-4 hover:underline">
                  {contact.email}
                </a>
              </li>
            )}
            {contact.phone && (
              <li className="flex items-center gap-3">
                <Phone className="size-4 text-bronze" strokeWidth={1.5} />
                <a href={`tel:${contact.phone.replace(/\s/g, "")}`}>{contact.phone}</a>
              </li>
            )}
            {contact.whatsapp && (
              <li className="flex items-center gap-3">
                <MessageCircle className="size-4 text-bronze" strokeWidth={1.5} />
                <a href={`https://wa.me/${contact.whatsapp}`} target="_blank" rel="noopener noreferrer" className="underline-offset-4 hover:underline">
                  WhatsApp
                </a>
              </li>
            )}
          </ul>
          <div className="space-y-2 border-t border-encre/10 pt-6 text-sm">
            <Link href="/faq" className="block text-encre underline underline-offset-4">
              Questions fréquentes
            </Link>
            <Link href="/suivi" className="block text-encre underline underline-offset-4">
              Suivre ma commande
            </Link>
            <Link href="/livraison-retours" className="block text-encre underline underline-offset-4">
              Livraison & retours
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}

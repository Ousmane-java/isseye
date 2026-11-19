import type { Metadata } from "next";
import Link from "next/link";
import { adminDb, authClient, isSupabaseConfigured } from "@/lib/supabase";
import { getCurrencies } from "@/lib/currencies";
import { formatMoney } from "@/lib/currency";
import { statusLabels, type OrderRow } from "@/lib/order-types";
import { logoutCustomer } from "../actions";
import { PageIntro } from "@/components/PageIntro";
import { LoginLinkForm, NewsletterToggle } from "@/components/AccountForms";

export const metadata: Metadata = { title: "Mon compte", robots: { index: false } };
const dateFormat = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeZone: "Europe/Paris" });

// Espace cliente facultatif : on peut toujours commander sans compte. Connexion par lien email ;
// les commandes passées avec la même adresse sont retrouvées automatiquement.
export default async function AccountPage({ searchParams }: PageProps<"/compte">) {
  const { erreur } = await searchParams;
  const user = isSupabaseConfigured ? (await (await authClient()).auth.getUser()).data.user : null;

  if (!user?.email) {
    return (
      <div className="pb-32">
        <PageIntro center eyebrow="Espace cliente" title="Mon compte" text="Retrouvez vos commandes et vos préférences. Le compte est facultatif : vous pouvez commander sans." />
        <div className="px-4">
          <LoginLinkForm error={erreur ? "Ce lien a expiré ou a déjà servi. Demandez-en un nouveau." : undefined} />
          <p className="mt-10 text-center text-sm text-gris">
            Une commande sans compte ?{" "}
            <Link href="/suivi" className="text-bronze underline underline-offset-4">
              Suivez-la avec son numéro
            </Link>
          </p>
        </div>
      </div>
    );
  }

  const email = user.email.toLowerCase();
  const db = adminDb();
  const [{ data: orders }, { data: subscriber }, currencies] = await Promise.all([
    db.from("orders").select("id, number, created_at, status, total, currency_code, access_token").eq("email", email).not("status", "in", "(en_attente_paiement,abandonnee)").order("created_at", { ascending: false }),
    db.from("newsletter_subscribers").select("unsubscribed_at").eq("email", email).maybeSingle(),
    getCurrencies(),
  ]);
  const list = (orders ?? []) as Pick<OrderRow, "id" | "number" | "created_at" | "status" | "total" | "currency_code" | "access_token">[];

  return (
    <div className="pb-32">
      <PageIntro eyebrow="Espace cliente" title="Bonjour." text={email} />
      <div className="mx-auto grid max-w-[1440px] gap-12 px-4 sm:px-8 lg:grid-cols-[1.6fr_1fr]">
        <section>
          <h2 className="font-display text-3xl text-encre">Mes commandes</h2>
          {list.length === 0 ? (
            <p className="mt-6 text-gris">
              Aucune commande pour l&apos;instant.{" "}
              <Link href="/boutique" className="text-bronze underline underline-offset-4">
                Découvrir les parfums
              </Link>
            </p>
          ) : (
            <ul className="mt-6 divide-y divide-encre/8 border-y border-encre/8">
              {list.map((o) => {
                const cur = currencies.find((c) => c.code === o.currency_code)!;
                return (
                  <li key={o.id}>
                    <Link href={`/suivi/${o.access_token}`} className="flex flex-wrap items-center gap-x-6 gap-y-1 py-5 transition hover:bg-lin-clair/60">
                      <span className="font-display text-xl text-encre">{o.number}</span>
                      <span className="text-sm text-gris">{dateFormat.format(new Date(o.created_at))}</span>
                      <span className="text-[11px] font-semibold tracking-[0.14em] text-bronze uppercase">{statusLabels[o.status]}</span>
                      <span className="ml-auto">{formatMoney(o.total, cur)}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
        <aside className="h-fit space-y-6 rounded-2xl bg-lin-clair p-6 sm:p-8">
          <h2 className="font-display text-2xl text-encre">Préférences</h2>
          <NewsletterToggle subscribed={Boolean(subscriber && !subscriber.unsubscribed_at)} />
          <div className="flex flex-col gap-3 border-t border-encre/10 pt-6 text-sm">
            <Link href="/favoris" className="text-encre underline underline-offset-4">
              Mes favoris
            </Link>
            <form action={logoutCustomer}>
              <button className="text-gris underline underline-offset-4 hover:text-encre">Se déconnecter</button>
            </form>
          </div>
        </aside>
      </div>
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { FileText, Heart, RotateCcw } from "lucide-react";
import { adminDb } from "@/lib/supabase";
import { getCurrencies } from "@/lib/currencies";
import { formatMoney } from "@/lib/currency";
import { getCheckoutProfile, getCustomer, ordersFilter } from "@/lib/customer";
import { scheduleLabel, statusLabel, type OrderRow } from "@/lib/order-types";
import { countries } from "@/config/countries";
import clsx from "clsx";
import { summaryGrid } from "@/components/cart/layout";
import { logoutCustomer } from "../actions";
import { PageIntro } from "@/components/PageIntro";
import { AuthPanel, ChangePasswordForm, NewsletterToggle, ProfileForm, VerifyBanner } from "@/components/AccountForms";

export const metadata: Metadata = { title: "Mon compte", robots: { index: false } };
const dateFormat = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeZone: "Europe/Paris" });

type OrderCard = Pick<OrderRow, "id" | "number" | "created_at" | "status" | "total" | "currency_code" | "access_token" | "delivery_type" | "invoice_number" | "scheduled_date" | "scheduled_slot"> & {
  items: { product_name: string; image_url: string | null; quantity: number }[];
};

// Espace cliente (facultatif : on peut toujours commander sans compte). Email + mot de passe ;
// les informations se complètent ici et sont proposées à la caisse.
export default async function AccountPage({ searchParams }: PageProps<"/compte">) {
  const params = await searchParams;
  const customer = await getCustomer();

  if (!customer) {
    return (
      <div className="pb-32">
        <PageIntro center eyebrow="Espace cliente" title="Mon compte" text="Vos commandes, vos factures, vos favoris et vos coordonnées, au même endroit. Le compte est facultatif : vous pouvez aussi commander sans." />
        <div className="px-4">
          {params.erreur && <p className="mx-auto mb-6 max-w-md rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">Ce lien a expiré ou a déjà servi.</p>}
          <AuthPanel initial={params.creer ? "creation" : "connexion"} next={typeof params.suite === "string" && params.suite.startsWith("/") && !params.suite.startsWith("//") ? params.suite : "/compte"} />
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

  const db = adminDb();
  const [{ data: orders }, { data: subscriber }, { count: favorites }, currencies, profile] = await Promise.all([
    db
      .from("orders")
      .select("id, number, created_at, status, total, currency_code, access_token, delivery_type, invoice_number, scheduled_date, scheduled_slot, items:order_items(product_name, image_url, quantity)")
      .or(ordersFilter(customer))
      .not("status", "in", "(en_attente_paiement,abandonnee)")
      .order("created_at", { ascending: false }),
    db.from("newsletter_subscribers").select("unsubscribed_at").eq("email", customer.email).maybeSingle(),
    db.from("wishlists").select("product_id", { count: "exact", head: true }).eq("customer_id", customer.id),
    getCurrencies(),
    getCheckoutProfile(customer),
  ]);
  const list = (orders ?? []) as OrderCard[];
  const incomplete = !profile.firstName || !profile.lastName || !profile.phone || !profile.line1;

  return (
    <div className="pb-32">
      <PageIntro eyebrow="Espace cliente" title={profile.firstName ? `Bonjour, ${profile.firstName}.` : "Bonjour."} text={customer.email} />
      <div className="mx-auto max-w-[1440px] space-y-6 px-4 sm:px-8">
        {params.bienvenue && <p className="rounded-xl bg-or/10 px-5 py-4 text-[15px] text-bronze">Bienvenue chez ISSEYE ! Votre espace est prêt{incomplete ? " : complétez vos informations pour commander encore plus vite." : "."}</p>}
        {params.mdp && <p className="rounded-xl bg-or/10 px-5 py-4 text-[15px] text-bronze">Votre nouveau mot de passe est enregistré.</p>}
        {params.verifie && <p className="rounded-xl bg-or/10 px-5 py-4 text-[15px] text-bronze">Merci, votre adresse email est confirmée.</p>}
        {!customer.verified && <VerifyBanner email={customer.email} />}
      </div>

      <div className={clsx("mx-auto mt-10 max-w-[1440px] px-4 sm:px-8", summaryGrid)}>
        <div className="space-y-12">
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
              <ul className="mt-6 space-y-4">
                {list.map((o) => {
                  const cur = currencies.find((c) => c.code === o.currency_code)!;
                  return (
                    <li key={o.id} className="rounded-2xl bg-white p-5 ring-1 ring-encre/5 sm:p-6">
                      <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1">
                        <span className="font-display text-2xl text-encre">{o.number}</span>
                        <span className="text-sm text-gris">{dateFormat.format(new Date(o.created_at))}</span>
                        <span className="text-[11px] font-semibold tracking-[0.14em] text-bronze uppercase">{statusLabel(o)}</span>
                        <span className="ml-auto font-medium text-encre">{formatMoney(o.total, cur)}</span>
                      </div>
                      {scheduleLabel(o) && <p className="mt-1 text-[13px] text-gris first-letter:uppercase">{scheduleLabel(o)}</p>}
                      <div className="mt-4 flex items-center gap-3">
                        {o.items.slice(0, 4).map((i, k) => (
                          <span key={k} className="relative size-14 overflow-hidden rounded-lg bg-lin" title={`${i.quantity} × ${i.product_name}`}>
                            {i.image_url && <Image src={i.image_url} alt={i.product_name} fill sizes="56px" className="object-cover" />}
                          </span>
                        ))}
                        <span className="text-sm text-gris">{o.items.map((i) => `${i.quantity} × ${i.product_name}`).join(", ")}</span>
                      </div>
                      <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 border-t border-encre/5 pt-4 text-[13px] font-semibold tracking-[0.12em] uppercase">
                        <Link href={`/suivi/${o.access_token}`} className="text-encre hover:text-bronze">
                          Suivre
                        </Link>
                        <Link href={`/panier/recommander/${o.access_token}`} className="inline-flex items-center gap-1.5 text-encre hover:text-bronze">
                          <RotateCcw className="size-3.5" /> Commander à nouveau
                        </Link>
                        {o.invoice_number && (
                          <a href={`/facture/${o.access_token}`} target="_blank" className="inline-flex items-center gap-1.5 text-encre hover:text-bronze">
                            <FileText className="size-3.5" /> Facture
                          </a>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section id="informations" className="scroll-mt-32">
            <h2 className="font-display text-3xl text-encre">Mes informations</h2>
            <p className="mt-2 text-[14px] text-gris">Proposées automatiquement à la caisse : plus besoin de les ressaisir.</p>
            <div className="mt-6 rounded-2xl bg-white p-5 ring-1 ring-encre/5 sm:p-7">
              <ProfileForm profile={profile} countries={countries} />
            </div>
          </section>
        </div>

        <aside className="space-y-6 lg:sticky lg:top-[calc(var(--bar-h,0px)+7rem)]">
          {incomplete && (
            <a href="#informations" className="block rounded-2xl bg-noir p-6 text-creme">
              <p className="font-display text-2xl">Complétez votre profil</p>
              <p className="mt-1 text-[14px] text-creme/70">Nom, téléphone et adresse : vos prochaines commandes en quelques secondes.</p>
            </a>
          )}
          <div className="space-y-5 rounded-2xl bg-lin-clair p-6 sm:p-8">
            <h2 className="font-display text-2xl text-encre">Préférences</h2>
            <Link href="/favoris" className="flex items-center gap-2 text-[15px] text-encre hover:text-bronze">
              <Heart className="size-4 text-bronze" strokeWidth={1.5} /> Mes favoris {favorites ? `(${favorites})` : ""}
            </Link>
            <NewsletterToggle subscribed={Boolean(subscriber && !subscriber.unsubscribed_at)} />
          </div>
          <details className="rounded-2xl bg-lin-clair p-6 sm:p-8">
            <summary className="cursor-pointer font-display text-2xl text-encre">Mot de passe</summary>
            <div className="mt-5">
              <ChangePasswordForm />
            </div>
          </details>
          <form action={logoutCustomer} className="px-2">
            <button className="text-sm text-gris underline underline-offset-4 hover:text-encre">Se déconnecter</button>
          </form>
        </aside>
      </div>
    </div>
  );
}

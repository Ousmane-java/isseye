import type { Metadata } from "next";
import { adminDb, isSupabaseConfigured } from "@/lib/supabase";
import { PageIntro } from "@/components/PageIntro";
import { UnsubscribeForm } from "@/components/UnsubscribeForm";

export const metadata: Metadata = { title: "Désinscription", robots: { index: false } };

// Lien « Se désinscrire » des emails. La désinscription se confirme d'un clic
// (un simple passage sur la page, par exemple par un antivirus de messagerie, ne désinscrit pas).
export default async function UnsubscribePage({ searchParams }: PageProps<"/desinscription">) {
  const { t } = await searchParams;
  const token = typeof t === "string" && /^[a-f0-9]{32}$/.test(t) ? t : null;
  let email: string | null = null;
  if (token && isSupabaseConfigured) {
    const { data } = await adminDb().from("newsletter_subscribers").select("email").eq("unsubscribe_token", token).maybeSingle();
    email = data?.email ?? null;
  }
  return (
    <div className="pb-32">
      <PageIntro center eyebrow="Newsletter" title="Se désinscrire" text="Vous ne recevrez plus nos nouveautés ni nos offres. Vous pourrez vous réinscrire à tout moment." />
      <div className="px-4">
        <UnsubscribeForm token={token} email={email} />
      </div>
    </div>
  );
}

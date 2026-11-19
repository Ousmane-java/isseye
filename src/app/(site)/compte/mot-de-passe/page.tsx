import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCustomer } from "@/lib/customer";
import { PageIntro } from "@/components/PageIntro";
import { NewPasswordForm } from "@/components/AccountForms";

export const metadata: Metadata = { title: "Nouveau mot de passe", robots: { index: false } };

// Ouverte par le lien « mot de passe oublié » (la session est créée par le lien).
export default async function NewPasswordPage() {
  const customer = await getCustomer();
  if (!customer) redirect("/compte/mot-de-passe-oublie");
  return (
    <div className="pb-32">
      <PageIntro center eyebrow="Espace cliente" title="Nouveau mot de passe" text={customer.email} />
      <div className="px-4">
        <NewPasswordForm />
      </div>
    </div>
  );
}

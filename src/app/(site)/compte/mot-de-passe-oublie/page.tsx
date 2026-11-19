import type { Metadata } from "next";
import Link from "next/link";
import { PageIntro } from "@/components/PageIntro";
import { ForgotPasswordForm } from "@/components/AccountForms";

export const metadata: Metadata = { title: "Mot de passe oublié", robots: { index: false } };

export default function ForgotPasswordPage() {
  return (
    <div className="pb-32">
      <PageIntro center eyebrow="Espace cliente" title="Mot de passe oublié" text="Indiquez votre email : nous vous envoyons un lien pour en choisir un nouveau." />
      <div className="px-4">
        <ForgotPasswordForm />
        <p className="mt-8 text-center text-sm">
          <Link href="/compte" className="text-bronze underline underline-offset-4">
            Retour à la connexion
          </Link>
        </p>
      </div>
    </div>
  );
}

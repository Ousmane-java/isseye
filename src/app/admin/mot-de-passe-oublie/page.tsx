import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { ResetRequestForm } from "./ResetRequestForm";

export const metadata: Metadata = { title: "Mot de passe oublié", robots: { index: false } };

export default function ForgotPasswordPage() {
  return (
    <main className="grid min-h-dvh place-items-center bg-creme px-6 py-16">
      <div className="w-full max-w-sm">
        <Logo className="text-2xl" />
        <h1 className="mt-10 font-display text-4xl font-light">Mot de passe oublié</h1>
        <p className="mt-2 text-sm text-gris">Indiquez l&apos;email de votre accès : nous vous envoyons un lien pour en choisir un nouveau.</p>
        <ResetRequestForm />
        <Link href="/login" className="mt-8 inline-block text-sm text-bronze underline underline-offset-4">
          Retour à la connexion
        </Link>
      </div>
    </main>
  );
}

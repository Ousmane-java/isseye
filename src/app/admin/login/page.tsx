import type { Metadata } from "next";
import { Logo } from "@/components/Logo";
import { Mist } from "@/components/motion/Mist";
import { isSupabaseConfigured } from "@/lib/supabase";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Connexion admin", robots: { index: false } };

export default function LoginPage() {
  return (
    <main className="grid min-h-dvh lg:grid-cols-2">
      <div className="grain relative hidden overflow-hidden bg-noir-profond lg:block">
        <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_70%_30%,#3a2f22_0%,#1b1917_50%,#12100f_100%)]" />
        <Mist className="absolute inset-0 h-full w-full" density={30} />
        <div className="absolute inset-0 grid place-items-center text-creme">
          <Logo variant="stacked" light tagline="Espace de gestion" className="text-5xl" />
        </div>
      </div>
      <div className="grid place-items-center px-6 py-16">
        <div className="w-full max-w-sm">
          <Logo className="text-2xl lg:hidden" />
          <h1 className="mt-8 font-display text-4xl font-light lg:mt-0">Bon retour.</h1>
          <p className="mt-2 text-sm text-gris">Connectez-vous pour gérer la boutique.</p>
          {isSupabaseConfigured ? (
            <LoginForm />
          ) : (
            <p className="mt-10 rounded-xl bg-lin-clair p-4 text-sm text-encre">
              Supabase n&apos;est pas encore configuré. Renseignez les variables du fichier <code>.env.local</code> (voir README).
            </p>
          )}
        </div>
      </div>
    </main>
  );
}

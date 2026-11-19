"use client";

import Link from "next/link";
import { useActionState, useState, useTransition } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Loader2, MailCheck } from "lucide-react";
import clsx from "clsx";
import { setNewsletter } from "@/app/(site)/actions";
import { changePassword, createAccountFromOrder, requestReset, resendVerification, saveProfile, setPassword, signIn, signUp, type AccountState } from "@/app/(site)/compte/actions";
import { PasswordInput } from "@/components/PasswordInput";
import { AddressAutocomplete } from "@/components/checkout/AddressAutocomplete";
import type { CheckoutProfile } from "@/lib/customer";

function Message({ state }: { state: AccountState }) {
  if (!state?.error && !state?.ok) return null;
  return <p className={clsx("rounded-xl px-4 py-3 text-sm", state.error ? "bg-red-50 text-red-800" : "bg-lin-clair text-bronze")}>{state.error ?? state.ok}</p>;
}

function Submit({ pending, children, className }: { pending: boolean; children: React.ReactNode; className?: string }) {
  return (
    <button disabled={pending} className={clsx("btn-primary", className)}>
      {pending && <Loader2 className="size-4 animate-spin" />} {children}
    </button>
  );
}

/** Connexion ou création de compte (email + mot de passe), sur un même écran. */
export function AuthPanel({ next = "/compte", initial = "connexion" }: { next?: string; initial?: "connexion" | "creation" }) {
  const [tab, setTab] = useState(initial);
  // Contrôlé : l'email reste saisi après une erreur et d'un onglet à l'autre
  const [email, setEmail] = useState("");
  const [loginState, login, loggingIn] = useActionState(signIn, undefined);
  const [signupState, signup, signingUp] = useActionState(signUp, undefined);

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="grid grid-cols-2 rounded-full bg-lin-clair p-1">
        {(["connexion", "creation"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={clsx("relative rounded-full py-2.5 text-[12px] font-semibold tracking-[0.16em] uppercase transition", tab === t ? "text-creme" : "text-gris hover:text-encre")}
          >
            {tab === t && <motion.span layoutId="auth-tab" className="absolute inset-0 -z-0 rounded-full bg-noir" transition={{ type: "spring", stiffness: 400, damping: 34 }} />}
            <span className="relative">{t === "connexion" ? "Se connecter" : "Créer un compte"}</span>
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {tab === "connexion" ? (
          <motion.form key="login" action={login} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="mt-8 space-y-4">
            <input type="hidden" name="next" value={next} />
            <label className="block">
              <span className="label">Email</span>
              <input name="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="field" />
            </label>
            <label className="block">
              <span className="label">Mot de passe</span>
              <PasswordInput name="password" autoComplete="current-password" />
            </label>
            <Link href="/compte/mot-de-passe-oublie" className="-mt-1 block text-right text-[13px] text-bronze hover:underline">
              Mot de passe oublié ?
            </Link>
            <Message state={loginState} />
            <Submit pending={loggingIn} className="w-full">
              Se connecter
            </Submit>
          </motion.form>
        ) : (
          <motion.form key="signup" action={signup} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="mt-8 space-y-4">
            <input type="hidden" name="next" value={next} />
            <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
            <label className="block">
              <span className="label">Prénom (facultatif)</span>
              <input name="firstName" autoComplete="given-name" className="field" />
            </label>
            <label className="block">
              <span className="label">Email</span>
              <input name="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="field" />
            </label>
            <label className="block">
              <span className="label">Mot de passe</span>
              <PasswordInput name="password" autoComplete="new-password" minLength={8} />
              <span className="mt-1 block text-[12px] text-gris">8 caractères minimum.</span>
            </label>
            <label className="flex cursor-pointer items-start gap-3 text-[14px] text-encre/80">
              <input type="checkbox" name="marketing" className="mt-0.5 size-4 accent-noir" /> Recevoir les nouveautés et offres ISSEYE
            </label>
            <Message state={signupState} />
            <Submit pending={signingUp} className="w-full">
              Créer mon compte
            </Submit>
            <p className="text-center text-[12px] text-gris">
              En créant un compte, vous acceptez notre{" "}
              <Link href="/confidentialite" className="underline underline-offset-4">
                politique de confidentialité
              </Link>
              .
            </p>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(requestReset, undefined);
  if (state?.ok) return <p className="mx-auto max-w-md rounded-2xl bg-lin-clair p-6 text-center text-[15px] text-encre">{state.ok}</p>;
  return (
    <form action={action} className="mx-auto max-w-md space-y-4">
      <label className="block">
        <span className="label">Votre email</span>
        <input name="email" type="email" required autoComplete="email" className="field" />
      </label>
      <Message state={state} />
      <Submit pending={pending} className="w-full">
        Recevoir le lien
      </Submit>
    </form>
  );
}

export function NewPasswordForm() {
  const [state, action, pending] = useActionState(setPassword, undefined);
  return (
    <form action={action} className="mx-auto max-w-md space-y-4">
      <label className="block">
        <span className="label">Nouveau mot de passe</span>
        <PasswordInput name="password" autoComplete="new-password" minLength={8} />
      </label>
      <label className="block">
        <span className="label">Confirmer</span>
        <PasswordInput name="confirm" autoComplete="new-password" minLength={8} />
      </label>
      <Message state={state} />
      <Submit pending={pending} className="w-full">
        Enregistrer
      </Submit>
    </form>
  );
}

/** « Mes informations » : nom, téléphone, adresse de livraison par défaut. */
export function ProfileForm({ profile, countries }: { profile: CheckoutProfile; countries: { code: string; name: string }[] }) {
  const [state, action, pending] = useActionState(saveProfile, undefined);
  const [address, setAddress] = useState({
    line1: profile.line1,
    postalCode: profile.postalCode,
    city: profile.city,
    country: profile.country || "FR",
  });
  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="label">Prénom</span>
          <input name="firstName" defaultValue={profile.firstName} autoComplete="given-name" className="field" />
        </label>
        <label className="block">
          <span className="label">Nom</span>
          <input name="lastName" defaultValue={profile.lastName} autoComplete="family-name" className="field" />
        </label>
        <label className="block sm:col-span-2">
          <span className="label">Téléphone</span>
          <input name="phone" type="tel" defaultValue={profile.phone} autoComplete="tel" className="field" />
        </label>
        <label className="block sm:col-span-2">
          <span className="label">Pays</span>
          <select name="country" value={address.country} onChange={(e) => setAddress({ ...address, country: e.target.value })} className="field">
            {countries.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <div className="sm:col-span-2">
          <span className="label">Adresse de livraison</span>
          <input type="hidden" name="line1" value={address.line1} />
          <AddressAutocomplete
            enabled={address.country === "FR"}
            required={false}
            value={address.line1}
            onChange={(v) => setAddress({ ...address, line1: v })}
            onSelect={(a) =>
              setAddress({
                ...address,
                line1: a.line1,
                postalCode: a.postalCode,
                city: a.city,
              })
            }
          />
        </div>
        <label className="block sm:col-span-2">
          <span className="label">Complément (facultatif)</span>
          <input name="line2" defaultValue={profile.line2} className="field" placeholder="Bâtiment, étage, digicode…" />
        </label>
        <label className="block">
          <span className="label">Code postal</span>
          <input name="postalCode" value={address.postalCode} onChange={(e) => setAddress({ ...address, postalCode: e.target.value })} className="field" />
        </label>
        <label className="block">
          <span className="label">Ville</span>
          <input name="city" value={address.city} onChange={(e) => setAddress({ ...address, city: e.target.value })} className="field" />
        </label>
      </div>
      <Message state={state} />
      <Submit pending={pending}>Enregistrer</Submit>
    </form>
  );
}

export function ChangePasswordForm() {
  const [state, action, pending] = useActionState(changePassword, undefined);
  return (
    <form action={action} className="space-y-4">
      <label className="block">
        <span className="label">Mot de passe actuel</span>
        <PasswordInput name="current" autoComplete="current-password" />
      </label>
      <label className="block">
        <span className="label">Nouveau mot de passe</span>
        <PasswordInput name="next" autoComplete="new-password" minLength={8} />
      </label>
      <Message state={state} />
      <Submit pending={pending}>Changer</Submit>
    </form>
  );
}

/** Bandeau : email à confirmer pour retrouver les commandes passées sans compte. */
export function VerifyBanner({ email }: { email: string }) {
  const [state, setState] = useState<AccountState>();
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-or/40 bg-white p-5 sm:flex-row sm:items-center">
      <MailCheck className="size-6 shrink-0 text-bronze" strokeWidth={1.4} />
      <p className="flex-1 text-[14px] text-encre/85">
        Confirmez votre adresse en cliquant sur le lien envoyé à <strong>{email}</strong> : vous retrouverez aussi ici les commandes passées sans compte.
        {state && <span className={clsx("mt-1 block", state.error ? "text-red-700" : "text-bronze")}>{state.error ?? state.ok}</span>}
      </p>
      <button type="button" disabled={pending} onClick={() => start(async () => setState(await resendVerification()))} className="btn-outline shrink-0 !px-4 !py-2 text-encre">
        {pending && <Loader2 className="size-4 animate-spin" />} Renvoyer l&apos;email
      </button>
    </div>
  );
}

export function NewsletterToggle({ subscribed }: { subscribed: boolean }) {
  const [on, setOn] = useState(subscribed);
  const [pending, start] = useTransition();
  return (
    <label className="flex cursor-pointer items-center gap-3 text-[15px] text-encre">
      <input
        type="checkbox"
        checked={on}
        disabled={pending}
        onChange={(e) => {
          const next = e.target.checked;
          setOn(next);
          start(() => setNewsletter(next));
        }}
        className="size-4 accent-noir"
      />
      Recevoir les nouveautés et offres ISSEYE
      {pending && <Loader2 className="size-4 animate-spin text-gris" />}
    </label>
  );
}

/** Après l'achat : créer son espace en choisissant seulement un mot de passe (informations de la commande reprises). */
export function CreateAccountFromOrder({ token, email }: { token: string; email: string }) {
  const [state, action, pending] = useActionState(createAccountFromOrder.bind(null, token), undefined);
  return (
    <div className="mt-14 rounded-2xl bg-lin-clair p-6 sm:p-8">
      <p className="font-display text-3xl text-encre">Gardez une trace de vos parfums</p>
      <p className="mt-2 max-w-xl text-[14px] text-gris">
        Créez votre espace en choisissant simplement un mot de passe : cette commande, vos factures et vos coordonnées y sont déjà. Identifiant : <strong className="text-encre">{email}</strong>
      </p>
      <form action={action} className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-start">
        <div className="flex-1">
          <PasswordInput name="password" autoComplete="new-password" minLength={8} />
          <span className="mt-1 block text-[12px] text-gris">8 caractères minimum.</span>
        </div>
        <Submit pending={pending} className="shrink-0">
          Créer mon espace
        </Submit>
      </form>
      {state?.error && <p className="mt-3 text-sm text-red-700">{state.error}</p>}
    </div>
  );
}

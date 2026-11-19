"use client";

import { useActionState, useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { sendLoginLink, setNewsletter } from "@/app/(site)/actions";

export function LoginLinkForm({ error }: { error?: string }) {
  const [state, action, pending] = useActionState(sendLoginLink, undefined);
  if (state?.ok) return <p className="mx-auto max-w-md rounded-2xl bg-lin-clair p-6 text-center font-display text-2xl text-bronze">{state.ok}</p>;
  return (
    <form action={action} className="mx-auto max-w-md space-y-4">
      <label className="block">
        <span className="label">Votre email</span>
        <input name="email" type="email" required autoComplete="email" className="field" />
      </label>
      {(state?.error || error) && <p className="text-sm text-red-700">{state?.error ?? error}</p>}
      <button disabled={pending} className="btn-primary w-full">
        {pending && <Loader2 className="size-4 animate-spin" />} Recevoir mon lien de connexion
      </button>
      <p className="text-center text-[13px] text-gris">Pas de mot de passe : un lien sécurisé vous est envoyé par email.</p>
    </form>
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

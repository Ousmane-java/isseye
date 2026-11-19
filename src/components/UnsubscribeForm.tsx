"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { unsubscribeNewsletter } from "@/app/(site)/actions";

export function UnsubscribeForm({ token, email }: { token: string | null; email: string | null }) {
  const [state, action, pending] = useActionState(unsubscribeNewsletter, undefined);
  if (state?.ok) return <p className="mx-auto max-w-md rounded-2xl bg-lin-clair p-6 text-center font-display text-2xl text-bronze">{state.ok}</p>;
  return (
    <form action={action} className="mx-auto max-w-md space-y-4 text-left">
      {token ? (
        <>
          <input type="hidden" name="token" value={token} />
          <p className="text-center text-[15px] text-encre">{email ? <>Adresse : <strong>{email}</strong></> : "Confirmez la désinscription."}</p>
        </>
      ) : (
        <label className="block">
          <span className="label">Votre adresse email</span>
          <input name="email" type="email" required autoComplete="email" className="field" />
        </label>
      )}
      {state?.error && <p className="text-sm text-red-700">{state.error}</p>}
      <button disabled={pending} className="btn-primary w-full">
        {pending && <Loader2 className="size-4 animate-spin" />} Me désinscrire
      </button>
    </form>
  );
}

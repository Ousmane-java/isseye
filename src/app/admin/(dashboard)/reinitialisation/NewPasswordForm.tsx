"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { PasswordInput } from "@/components/PasswordInput";
import { setNewPassword } from "../mon-compte/actions";

export function NewPasswordForm() {
  const [state, action, pending] = useActionState(setNewPassword, undefined);
  if (state?.ok)
    return (
      <p className="text-sm text-emerald-700">
        {state.ok}{" "}
        <Link href="/" className="text-bronze underline underline-offset-4">
          Aller au tableau de bord
        </Link>
      </p>
    );
  return (
    <form action={action} className="max-w-md space-y-4">
      <label className="block">
        <span className="label">Nouveau mot de passe</span>
        <PasswordInput name="next" autoComplete="new-password" minLength={10} />
      </label>
      <label className="block">
        <span className="label">Confirmer</span>
        <PasswordInput name="confirm" autoComplete="new-password" minLength={10} />
      </label>
      {state?.error && <p className="text-sm text-red-700">{state.error}</p>}
      <button disabled={pending} className="btn-primary !px-5 !py-2.5">
        {pending && <Loader2 className="size-4 animate-spin" />} Enregistrer
      </button>
    </form>
  );
}

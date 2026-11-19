"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import clsx from "clsx";
import { PasswordInput } from "@/components/PasswordInput";
import { changePassword } from "./actions";

export function PasswordForm() {
  const [state, action, pending] = useActionState(changePassword, undefined);
  return (
    <form action={action} className="max-w-md space-y-4">
      <label className="block">
        <span className="label">Mot de passe actuel</span>
        <PasswordInput name="current" autoComplete="current-password" />
      </label>
      <label className="block">
        <span className="label">Nouveau mot de passe</span>
        <PasswordInput name="next" autoComplete="new-password" minLength={10} />
      </label>
      <label className="block">
        <span className="label">Confirmer</span>
        <PasswordInput name="confirm" autoComplete="new-password" minLength={10} />
      </label>
      <div className="flex items-center gap-3">
        <button disabled={pending} className="btn-primary !px-5 !py-2.5">
          {pending && <Loader2 className="size-4 animate-spin" />} Changer
        </button>
        {state && <p className={clsx("text-sm", state.error ? "text-red-700" : "text-emerald-700")}>{state.error ?? state.ok}</p>}
      </div>
    </form>
  );
}

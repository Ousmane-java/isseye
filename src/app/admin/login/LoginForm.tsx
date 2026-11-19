"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { login } from "../actions";
import { PasswordInput } from "@/components/PasswordInput";

export function LoginForm() {
  const [state, action, pending] = useActionState(login, undefined);
  return (
    <form action={action} className="mt-10 space-y-4">
      <label className="block">
        <span className="label">Email</span>
        <input name="email" type="email" required autoComplete="email" className="field" />
      </label>
      <label className="block">
        <span className="label">Mot de passe</span>
        <PasswordInput name="password" autoComplete="current-password" />
      </label>
      {state?.error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{state.error}</p>}
      <button type="submit" disabled={pending} className="btn-primary w-full">
        {pending && <Loader2 className="size-4 animate-spin" />} Se connecter
      </button>
    </form>
  );
}

"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { findOrder } from "@/app/(site)/actions";

export function OrderLookup() {
  const [state, action, pending] = useActionState(findOrder, undefined);
  return (
    <form action={action} className="mx-auto max-w-md space-y-4 text-left">
      <label className="block">
        <span className="label">Numéro de commande</span>
        <input name="number" required placeholder="ISY-1001" className="field uppercase" />
      </label>
      <label className="block">
        <span className="label">Email utilisé pour la commande</span>
        <input name="email" type="email" required autoComplete="email" className="field" />
      </label>
      {state?.error && <p className="text-sm text-red-700">{state.error}</p>}
      <button disabled={pending} className="btn-primary w-full">
        {pending && <Loader2 className="size-4 animate-spin" />} Voir ma commande
      </button>
    </form>
  );
}

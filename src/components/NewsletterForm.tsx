"use client";

import { useActionState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import clsx from "clsx";
import { subscribeNewsletter } from "@/app/(site)/actions";

/** Inscription à la newsletter (pied de page, bloc, pop-up). `dark` : sur fond noir. */
export function NewsletterForm({ source, dark, className }: { source: string; dark?: boolean; className?: string }) {
  const [state, action, pending] = useActionState(subscribeNewsletter, undefined);
  if (state?.ok) return <p className={clsx("font-display text-2xl italic", dark ? "text-or" : "text-bronze", className)}>{state.ok}</p>;
  return (
    <form action={action} className={className}>
      <input type="hidden" name="source" value={source} />
      {/* Champ invisible : seuls les robots le remplissent */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
      <div className={clsx("flex border-b transition", dark ? "border-creme/25 focus-within:border-or" : "border-encre/25 focus-within:border-encre")}>
        <input
          type="email"
          name="email"
          required
          placeholder="Votre adresse email"
          aria-label="Votre adresse email"
          className={clsx("min-w-0 flex-1 bg-transparent py-3.5 text-[15px] outline-none", dark ? "text-creme placeholder:text-creme/40" : "text-encre placeholder:text-gris/70")}
        />
        <button type="submit" disabled={pending} className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.22em] uppercase disabled:opacity-60">
          {pending ? <Loader2 className="size-4 animate-spin" /> : <>S&apos;inscrire <ArrowRight className="size-4" strokeWidth={1.5} /></>}
        </button>
      </div>
      {state?.error && <p className="mt-2 text-[13px] text-red-500">{state.error}</p>}
      <p className={clsx("mt-3 text-[12px]", dark ? "text-creme/40" : "text-gris")}>Désinscription en un clic, à tout moment.</p>
    </form>
  );
}

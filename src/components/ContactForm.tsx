"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { sendContact } from "@/app/(site)/actions";

const subjects = ["Question sur un parfum", "Ma commande", "Livraison", "Retour ou échange", "Partenariat & presse", "Autre"];

export function ContactForm({ orderNumber }: { orderNumber?: string }) {
  const [state, action, pending] = useActionState(sendContact, undefined);
  if (state?.ok) return <p className="rounded-2xl bg-lin-clair p-8 font-display text-3xl leading-snug text-bronze">{state.ok}</p>;
  const err = (k: string) => state?.fieldErrors?.[k] && <span className="mt-1 block text-[13px] text-red-700">{state.fieldErrors[k]}</span>;
  return (
    <form action={action} className="space-y-4">
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="label">Nom</span>
          <input name="name" required autoComplete="name" className="field" />
          {err("name")}
        </label>
        <label className="block">
          <span className="label">Email</span>
          <input name="email" type="email" required autoComplete="email" className="field" />
          {err("email")}
        </label>
        <label className="block">
          <span className="label">Téléphone (facultatif)</span>
          <input name="phone" type="tel" autoComplete="tel" className="field" />
        </label>
        <label className="block">
          <span className="label">N° de commande (facultatif)</span>
          <input name="orderNumber" defaultValue={orderNumber} placeholder="ISY-1001" className="field uppercase" />
        </label>
      </div>
      <label className="block">
        <span className="label">Sujet</span>
        <select name="subject" required defaultValue={orderNumber ? "Ma commande" : ""} className="field">
          <option value="" disabled>
            Choisir…
          </option>
          {subjects.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        {err("subject")}
      </label>
      <label className="block">
        <span className="label">Message</span>
        <textarea name="message" required rows={6} maxLength={4000} className="field resize-y" />
        {err("message")}
      </label>
      {state?.error && <p className="text-sm text-red-700">{state.error}</p>}
      <button disabled={pending} className="btn-primary">
        {pending && <Loader2 className="size-4 animate-spin" />} Envoyer
      </button>
    </form>
  );
}

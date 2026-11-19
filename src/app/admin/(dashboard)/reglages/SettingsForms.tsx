"use client";

import { useActionState, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import clsx from "clsx";
import { Card, Toggle } from "@/components/admin/ui";
import type { Settings } from "@/lib/settings-schema";
import type { Currency } from "@/lib/currency";
import { saveSettings } from "./actions";

function SectionForm({ section, title, description, children }: { section: keyof Settings; title: string; description?: string; children: ReactNode }) {
  const [state, action, pending] = useActionState(saveSettings.bind(null, section), undefined);
  return (
    <Card title={title} description={description}>
      <form action={action} className="space-y-4">
        {children}
        <div className="flex items-center gap-3 pt-2">
          <button disabled={pending} className="btn-primary !px-5 !py-2.5">
            {pending && <Loader2 className="size-4 animate-spin" />} Enregistrer
          </button>
          {state && <p className={clsx("text-sm", state.error ? "text-red-700" : "text-emerald-700")}>{state.error ?? state.ok}</p>}
        </div>
      </form>
    </Card>
  );
}

function Field({ label, name, defaultValue, placeholder, hint, type = "text", textarea }: { label: string; name: string; defaultValue: string | number; placeholder?: string; hint?: string; type?: string; textarea?: boolean }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {textarea ? (
        <textarea name={name} defaultValue={defaultValue} placeholder={placeholder} rows={3} className="field resize-y" />
      ) : (
        <input name={name} type={type} defaultValue={defaultValue} placeholder={placeholder} className="field" />
      )}
      {hint && <span className="mt-1 block text-[13px] text-gris">{hint}</span>}
    </label>
  );
}

export function SettingsForms({ settings, currencies }: { settings: Settings; currencies: Currency[] }) {
  const { brand, contact, store, legal } = settings;
  return (
    <div className="space-y-6">
      <SectionForm section="store" title="Boutique" description="Ouverture des commandes et affichage des devises.">
        <Toggle name="open" defaultChecked={store.open} label="Boutique ouverte aux commandes" description="Fermée : le site reste visible, mais le paiement est suspendu." />
        <Field label="Message affiché quand la boutique est fermée" name="closedMessage" defaultValue={store.closedMessage} placeholder="Nous revenons très vite…" />
        <label className="block">
          <span className="label">Devise par défaut</span>
          <select name="defaultCurrency" defaultValue={store.defaultCurrency} className="field max-w-xs">
            {currencies
              .filter((c) => c.active)
              .map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code} · {c.name}
                </option>
              ))}
          </select>
          <span className="mt-1 block text-[13px] text-gris">Pour les pays qui ne sont pas listés dans Devises & pays.</span>
        </label>
        <Toggle
          name="currencySwitcher"
          defaultChecked={store.currencySwitcher}
          label="Laisser la visiteuse choisir sa devise"
          description="Désactivé : la devise est imposée par le pays (une visiteuse en France voit uniquement des euros)."
        />
        <Toggle name="lowStockEmail" defaultChecked={store.lowStockEmail} label="M'alerter par email quand un stock est bas" />
        <Field label="Email qui reçoit les nouvelles commandes et messages" name="notifyEmail" type="email" defaultValue={store.notifyEmail} placeholder="Par défaut : l'email de contact" />
        <label className="block">
          <span className="label">Prix pour l&apos;Afrique, les États-Unis et les autres pays hors UE</span>
          <select name="exportPricing" defaultValue={store.exportPricing} className="field">
            <option value="ttc">Même prix qu&apos;en France (marge plus grande)</option>
            <option value="ht">Prix hors TVA française (moins cher pour la cliente)</option>
          </select>
          <span className="mt-1 block text-[13px] text-gris">Les ventes hors Union européenne ne supportent pas la TVA française : vous pouvez la retirer du prix affiché ou la garder comme marge.</span>
        </label>
        <Toggle name="giftWrap" defaultChecked={store.giftWrap} label="Proposer l'emballage cadeau à la commande" />
        <Field label="Prix de l'emballage cadeau (€, 0 = offert)" name="giftWrapPrice" defaultValue={(store.giftWrapPrice / 100).toLocaleString("fr-FR")} />
      </SectionForm>

      <SectionForm section="brand" title="Marque" description="Nom et textes utilisés par Google et lors des partages sur les réseaux.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nom" name="name" defaultValue={brand.name} />
          <Field label="Signature" name="tagline" defaultValue={brand.tagline} />
        </div>
        <Field label="Description" name="description" defaultValue={brand.description} textarea />
      </SectionForm>

      <SectionForm section="contact" title="Contact & réseaux sociaux">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Email de contact" name="email" type="email" defaultValue={contact.email} />
          <Field label="Téléphone" name="phone" defaultValue={contact.phone} />
          <Field label="WhatsApp" name="whatsapp" defaultValue={contact.whatsapp} placeholder="33612345678" hint="Format international, sans + ni espaces." />
          <Field label="Instagram" name="instagram" defaultValue={contact.instagram} placeholder="https://instagram.com/isseye" />
          <Field label="TikTok" name="tiktok" defaultValue={contact.tiktok} placeholder="https://tiktok.com/@isseye" />
          <Field label="Facebook" name="facebook" defaultValue={contact.facebook} />
          <Field label="Snapchat" name="snapchat" defaultValue={contact.snapchat} />
        </div>
      </SectionForm>

      <SectionForm section="legal" title="Identité légale" description="Obligatoire pour vendre en ligne : affichée dans les mentions légales, les CGV et sur les factures.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Raison sociale" name="companyName" defaultValue={legal.companyName} />
          <Field label="Forme juridique" name="status" defaultValue={legal.status} placeholder="SAS, SARL, micro-entreprise…" />
          <Field label="SIRET" name="siret" defaultValue={legal.siret} />
          <Field label="N° de TVA intracommunautaire" name="vatNumber" defaultValue={legal.vatNumber} />
          <Field label="Taux de TVA (%)" name="vatRate" defaultValue={legal.vatRate} type="number" />
        </div>
        <Field label="Adresse du siège" name="address" defaultValue={legal.address} />
        <Field label="Médiateur de la consommation" name="mediator" defaultValue={legal.mediator} placeholder="Nom, site web et adresse du médiateur" textarea />
      </SectionForm>
    </div>
  );
}

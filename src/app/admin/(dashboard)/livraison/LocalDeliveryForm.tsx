"use client";

import { useActionState, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { Settings } from "@/lib/settings-schema";
import { Feedback, SubmitButton } from "@/components/admin/forms";
import { saveLocalDelivery, simulateLocalDelivery } from "./actions";

const euros = (minor: number | null) => (minor === null ? "" : (minor / 100).toLocaleString("fr-FR", { maximumFractionDigits: 2, useGrouping: false }));

export function LocalDeliveryForm({ delivery }: { delivery: Settings["delivery"] }) {
  const [state, action] = useActionState(saveLocalDelivery, undefined);
  const [simState, simulate] = useActionState(simulateLocalDelivery, undefined);
  const [tiers, setTiers] = useState(delivery.localTiers.map((t) => ({ km: String(t.maxKm).replace(".", ","), price: euros(t.price) })));

  return (
    <div className="space-y-8">
      <form action={action} className="space-y-6">
        <label className="block">
          <span className="label">Adresse de la boutique (point de retrait et départ des livraisons)</span>
          <input name="originAddress" defaultValue={delivery.originAddress} required className="field" />
          <span className="mt-1 block text-[12px] text-gris">Vérifiée automatiquement à l&apos;enregistrement (Base Adresse Nationale).</span>
        </label>

        <div className="space-y-4 rounded-xl bg-lin-clair p-4">
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input type="checkbox" name="pickupEnabled" defaultChecked={delivery.pickupEnabled} className="size-4 accent-noir" /> Proposer le retrait gratuit à la boutique
          </label>
          <label className="block">
            <span className="label">Horaires de retrait</span>
            <input name="pickupHours" defaultValue={delivery.pickupHours} placeholder="Du lundi au samedi, de 10 h à 19 h" className="field" />
          </label>
          <label className="block">
            <span className="label">Précision affichée à la cliente</span>
            <input name="pickupInstructions" defaultValue={delivery.pickupInstructions} className="field" />
          </label>
        </div>

        <div className="space-y-4 rounded-xl bg-lin-clair p-4">
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input type="checkbox" name="localEnabled" defaultChecked={delivery.localEnabled} className="size-4 accent-noir" /> Livraison à domicile autour de la boutique
          </label>
          <p className="text-[13px] text-gris">Distance calculée par la route depuis la boutique. Au-delà de la dernière tranche : envoi postal (Colissimo).</p>
          <div className="space-y-2">
            {tiers.map((t, i) => (
              <div key={i} className="flex flex-wrap items-center gap-2 text-sm">
                <span className="w-20 text-gris">{i === 0 ? "De 0" : `De ${tiers[i - 1].km || "…"}`} à</span>
                <input name="tier_km" value={t.km} onChange={(e) => setTiers(tiers.map((x, j) => (j === i ? { ...x, km: e.target.value } : x)))} inputMode="decimal" className="field !w-24 !py-2" />
                <span className="text-gris">km →</span>
                <input name="tier_price" value={t.price} onChange={(e) => setTiers(tiers.map((x, j) => (j === i ? { ...x, price: e.target.value } : x)))} inputMode="decimal" className="field !w-24 !py-2" />
                <span className="text-gris">€</span>
                <button type="button" onClick={() => setTiers(tiers.filter((_, j) => j !== i))} className="grid size-8 place-items-center text-gris hover:text-red-700" aria-label="Retirer la tranche">
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))}
            <button type="button" onClick={() => setTiers([...tiers, { km: "", price: "" }])} className="inline-flex items-center gap-1.5 text-sm text-bronze">
              <Plus className="size-4" /> Ajouter une tranche
            </button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="label">Offerte dès (€ d&apos;achat, vide = jamais)</span>
              <input name="localFreeAbove" defaultValue={euros(delivery.localFreeAbove)} inputMode="decimal" className="field" />
            </label>
            <label className="block">
              <span className="label">Délai annoncé</span>
              <input name="localEta" defaultValue={delivery.localEta} className="field" />
            </label>
          </div>
        </div>

        <div className="space-y-4 rounded-xl bg-lin-clair p-4">
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input type="checkbox" name="slotsEnabled" defaultChecked={delivery.slotsEnabled} className="size-4 accent-noir" /> La cliente choisit un jour et un créneau (retrait et livraison locale)
          </label>
          <fieldset>
            <legend className="label">Jours ouverts</legend>
            <div className="flex flex-wrap gap-3 text-sm">
              {[1, 2, 3, 4, 5, 6, 0].map((d) => (
                <label key={d} className="flex items-center gap-1.5">
                  <input type="checkbox" name="slotDays" value={d} defaultChecked={delivery.slotDays.includes(d)} className="size-4 accent-noir" />
                  {["Dim.", "Lun.", "Mar.", "Mer.", "Jeu.", "Ven.", "Sam."][d]}
                </label>
              ))}
            </div>
          </fieldset>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="label">Créneaux de retrait (un par ligne)</span>
              <textarea name="pickupSlots" defaultValue={delivery.pickupSlots.join("\n")} rows={3} className="field resize-y font-mono text-sm" placeholder={"10:00-12:00\n14:00-19:00"} />
            </label>
            <label className="block">
              <span className="label">Créneaux de livraison locale (un par ligne)</span>
              <textarea name="localSlots" defaultValue={delivery.localSlots.join("\n")} rows={3} className="field resize-y font-mono text-sm" placeholder={"10:00-13:00\n14:00-19:00"} />
            </label>
            <label className="block">
              <span className="label">Délai minimum avant un créneau (heures)</span>
              <input name="slotLeadHours" type="number" min={0} max={240} defaultValue={delivery.slotLeadHours} className="field" />
            </label>
            <label className="block">
              <span className="label">Jours proposés à l&apos;avance</span>
              <input name="slotHorizonDays" type="number" min={1} max={60} defaultValue={delivery.slotHorizonDays} className="field" />
            </label>
            <label className="block sm:col-span-2">
              <span className="label">Jours fermés (un par ligne, ex. 2026-12-25)</span>
              <textarea name="closedDates" defaultValue={delivery.closedDates.join("\n")} rows={2} className="field resize-y font-mono text-sm" />
            </label>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <SubmitButton>Enregistrer</SubmitButton>
          <Feedback state={state} />
        </div>
      </form>

      <form action={simulate} className="space-y-3 border-t border-encre/5 pt-6">
        <p className="text-sm font-semibold">Simulateur</p>
        <div className="flex flex-wrap gap-2">
          <input name="address" placeholder="Ex. 12 rue Serpenoise 57000 Metz" required className="field min-w-64 flex-1 !py-2" />
          <SubmitButton variant="outline">Calculer</SubmitButton>
        </div>
        <Feedback state={simState} />
      </form>
    </div>
  );
}

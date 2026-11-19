"use client";

import { useActionState, useState, useTransition } from "react";
import { Loader2, Lock, RefreshCw, Trash2 } from "lucide-react";
import clsx from "clsx";
import { convertFromBase, formatMoney, parseMoney, type Currency } from "@/lib/currency";
import { addCurrency, deleteCurrency, refreshRates, updateCurrency, type ActionState } from "./actions";

// Prix d'exemple (devise de base, unités mineures) pour l'aperçu en direct
const samples = [2500, 3750, 5900, 8900, 12900];

const major = (minor: number, decimals: number) => (minor / 10 ** decimals).toLocaleString("fr-FR", { maximumFractionDigits: decimals });

function Feedback({ state }: { state: ActionState }) {
  if (!state) return null;
  return <p className={clsx("text-sm", state.error ? "text-red-700" : "text-emerald-700")}>{state.error ?? state.ok}</p>;
}

export function CurrencyCard({ currency, base, lastUpdate }: { currency: Currency; base: Currency; lastUpdate: string | null }) {
  const [state, action, pending] = useActionState(updateCurrency.bind(null, currency.code), undefined);
  const [deleting, startDelete] = useTransition();
  const [deleteError, setDeleteError] = useState<string>();
  // Valeurs en cours de saisie : l'aperçu se met à jour sans enregistrer
  const [rate, setRate] = useState(String(currency.rate).replace(".", ","));
  const [step, setStep] = useState(major(currency.rounding_step, currency.decimals));
  const [ending, setEnding] = useState(major(currency.rounding_ending, currency.decimals));
  const [symbol, setSymbol] = useState(currency.symbol);

  const draft: Currency = {
    ...currency,
    symbol,
    rate: Number(rate.replace(",", ".")) || currency.rate,
    rounding_step: parseMoney(step || "0", currency) || 1,
    rounding_ending: parseMoney(ending || "0", currency) ?? 0,
  };

  return (
    <form action={action} className="rounded-2xl bg-white p-5 ring-1 ring-encre/5 sm:p-6">
      <div className="flex flex-wrap items-center gap-3">
        <span className="grid size-11 place-items-center rounded-full bg-lin-clair text-[13px] font-bold text-bronze">{currency.code}</span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-encre">{currency.name}</p>
          <p className="text-[13px] text-gris">
            {currency.is_base ? "Devise de référence : les prix des produits sont saisis dans cette devise." : `1 ${base.symbol} = ${draft.rate.toLocaleString("fr-FR")} ${symbol}`}
          </p>
        </div>
        {!currency.is_base && (
          <label className="flex items-center gap-2 text-sm font-medium">
            <input type="checkbox" name="active" defaultChecked={currency.active} className="size-4 accent-noir" /> Active
          </label>
        )}
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <label>
          <span className="label">Nom</span>
          <input name="name" defaultValue={currency.name} className="field" required />
        </label>
        <label>
          <span className="label">Symbole affiché</span>
          <input name="symbol" value={symbol} onChange={(e) => setSymbol(e.target.value)} className="field" required />
        </label>
        {!currency.is_base && (
          <>
            <label>
              <span className="label">Taux (pour 1 {base.symbol})</span>
              <input name="rate" value={rate} onChange={(e) => setRate(e.target.value)} inputMode="decimal" className="field" required />
            </label>
            <label className="flex items-center gap-2 self-end pb-3 text-sm">
              <input type="checkbox" name="rate_locked" defaultChecked={currency.rate_locked} className="size-4 accent-noir" />
              <Lock className="size-3.5 text-gris" /> Taux fixe
            </label>
          </>
        )}
        <label>
          <span className="label">Arrondir au palier de</span>
          <input name="rounding_step" value={step} onChange={(e) => setStep(e.target.value)} inputMode="decimal" className="field" />
        </label>
        <label>
          <span className="label">Puis retirer</span>
          <input name="rounding_ending" value={ending} onChange={(e) => setEnding(e.target.value)} inputMode="decimal" className="field" placeholder="0" />
        </label>
      </div>
      {!currency.is_base && (
        <p className="mt-2 text-[13px] text-gris">
          {currency.rate_locked ? "Taux fixe : jamais modifié par la mise à jour automatique." : `Taux variable, mis à jour ${lastUpdate ? `le ${lastUpdate}` : "à la main"}.`}
        </p>
      )}

      {!currency.is_base && (
        <div className="mt-5 rounded-xl bg-creme p-4">
          <p className="text-[12px] font-medium tracking-wide text-gris uppercase">Aperçu des prix calculés</p>
          <ul className="mt-3 grid gap-2 text-sm sm:grid-cols-5">
            {samples.map((s) => (
              <li key={s} className="flex justify-between gap-2 sm:block">
                <span className="text-gris">{formatMoney(s, base)}</span>
                <span className="font-semibold text-encre sm:block">{formatMoney(convertFromBase(s, base, draft), draft)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button disabled={pending} className="btn-primary !px-5 !py-2.5">
          {pending && <Loader2 className="size-4 animate-spin" />} Enregistrer
        </button>
        <Feedback state={state} />
        {deleteError && <p className="text-sm text-red-700">{deleteError}</p>}
        {!currency.is_base && (
          <button
            type="button"
            disabled={deleting}
            onClick={() => {
              if (!confirm(`Supprimer la devise ${currency.code} ? Les pays associés passeront à la devise par défaut.`)) return;
              setDeleteError(undefined);
              startDelete(async () => {
                try {
                  await deleteCurrency(currency.code);
                } catch (err) {
                  setDeleteError(err instanceof Error ? err.message : "Suppression impossible.");
                }
              });
            }}
            className="ml-auto inline-flex items-center gap-1.5 text-sm text-gris hover:text-red-700"
          >
            <Trash2 className="size-4" /> Supprimer
          </button>
        )}
      </div>
    </form>
  );
}

export function RefreshRatesButton() {
  const [state, action, pending] = useActionState(refreshRates, undefined);
  return (
    <form action={action} className="flex flex-wrap items-center gap-3">
      <button disabled={pending} className="btn-outline !px-5 !py-2.5 text-encre">
        {pending ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />} Mettre à jour les taux
      </button>
      <Feedback state={state} />
    </form>
  );
}

export function AddCurrencyForm() {
  const [state, action, pending] = useActionState(addCurrency, undefined);
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[100px_1fr_110px_110px_150px_auto] lg:items-end">
      <label>
        <span className="label">Code</span>
        <input name="code" placeholder="GBP" maxLength={3} className="field uppercase" required />
      </label>
      <label>
        <span className="label">Nom</span>
        <input name="name" placeholder="Livre sterling" className="field" required />
      </label>
      <label>
        <span className="label">Symbole</span>
        <input name="symbol" placeholder="£" className="field" required />
      </label>
      <label>
        <span className="label">Décimales</span>
        <select name="decimals" defaultValue="2" className="field">
          <option value="0">0</option>
          <option value="2">2</option>
          <option value="3">3</option>
        </select>
      </label>
      <label>
        <span className="label">Taux (pour 1 €)</span>
        <input name="rate" placeholder="0,85" inputMode="decimal" className="field" required />
      </label>
      <button disabled={pending} className="btn-primary !px-5 !py-3">
        {pending && <Loader2 className="size-4 animate-spin" />} Ajouter
      </button>
      <div className="sm:col-span-2 lg:col-span-6">
        <Feedback state={state} />
      </div>
    </form>
  );
}

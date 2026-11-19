"use client";

import { useActionState, useMemo, useState, useTransition } from "react";
import { Eye, Loader2, X } from "lucide-react";
import clsx from "clsx";
import type { Currency } from "@/lib/currency";
import type { CountryCurrency } from "@/lib/currencies";
import { removeCountry, setCountryCurrency } from "./actions";

// La liste des pays est triée par le serveur : le navigateur trie parfois autrement (écart d'affichage)
export function CountryTable({ rows, currencies, defaultCurrency, siteUrl, countries }: { rows: CountryCurrency[]; currencies: Currency[]; defaultCurrency: string; siteUrl: string; countries: { code: string; name: string }[] }) {
  const [state, action, pending] = useActionState(setCountryCurrency, undefined);
  const [query, setQuery] = useState("");
  const [, startRemove] = useTransition();
  const active = currencies.filter((c) => c.active);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? rows.filter((r) => r.country_name.toLowerCase().includes(q) || r.country_code.toLowerCase() === q) : rows;
  }, [rows, query]);

  return (
    <div className="space-y-6">
      <form action={action} className="grid gap-3 sm:grid-cols-[1fr_180px_auto] sm:items-end">
        <label>
          <span className="label">Pays</span>
          <select name="country_code" className="field" required defaultValue="">
            <option value="" disabled>
              Choisir un pays…
            </option>
            {countries.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="label">Devise</span>
          <select name="currency_code" className="field" required>
            {active.map((c) => (
              <option key={c.code} value={c.code}>
                {c.code} · {c.symbol}
              </option>
            ))}
          </select>
        </label>
        <button disabled={pending} className="btn-primary !px-5 !py-3">
          {pending && <Loader2 className="size-4 animate-spin" />} Associer
        </button>
        {state && <p className={clsx("text-sm sm:col-span-3", state.error ? "text-red-700" : "text-emerald-700")}>{state.error ?? state.ok}</p>}
      </form>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rechercher un pays…" className="field max-w-xs !py-2.5" />
        <p className="text-[13px] text-gris">
          {rows.length} pays associés · tous les autres : <strong className="text-encre">{defaultCurrency}</strong>
        </p>
      </div>

      <div className="grid gap-x-8 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((row) => (
          <div key={row.country_code} className="group flex items-center gap-3 border-b border-encre/5 py-2.5 text-sm">
            <span className="w-7 text-[12px] font-semibold text-gris">{row.country_code}</span>
            <span className="min-w-0 flex-1 truncate text-encre">{row.country_name}</span>
            <span className="rounded-full bg-lin-clair px-2 py-0.5 text-[12px] font-semibold text-bronze">{row.currency_code}</span>
            <a
              href={`${siteUrl}/?pays=${row.country_code}`}
              target="_blank"
              title={`Voir la boutique comme depuis : ${row.country_name}`}
              className="text-gris opacity-60 transition hover:text-bronze group-hover:opacity-100"
            >
              <Eye className="size-4" />
            </a>
            <button
              type="button"
              title="Retirer (devise par défaut)"
              onClick={() => startRemove(() => removeCountry(row.country_code))}
              className="text-gris opacity-60 transition hover:text-red-700 group-hover:opacity-100"
            >
              <X className="size-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

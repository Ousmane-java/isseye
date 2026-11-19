"use client";

import { useEffect, useId, useRef, useState } from "react";
import { MapPin } from "lucide-react";
import clsx from "clsx";

export type AddressSuggestion = { label: string; line1: string; postalCode: string; city: string };

type Feature = { properties: { label: string; name: string; postcode: string; city: string; type: string } };

/** Suggestions : géocodage de l'IGN (comme Délices by Leina), secours api-adresse.data.gouv.fr */
async function search(q: string, near: { lat: number; lon: number } | null, signal: AbortSignal) {
  const params = new URLSearchParams({ q, limit: "6", autocomplete: "1" });
  if (near) {
    params.set("lat", String(near.lat));
    params.set("lon", String(near.lon));
  }
  for (const base of ["https://data.geopf.fr/geocodage/search", "https://api-adresse.data.gouv.fr/search/"]) {
    try {
      const res = await fetch(`${base}?${params}`, { signal });
      if (res.ok) return ((await res.json()) as { features: Feature[] }).features ?? [];
    } catch (err) {
      if (signal.aborted) throw err;
    }
  }
  return [];
}

/**
 * Champ adresse avec suggestions (France) : la cliente choisit son adresse exacte,
 * le code postal et la ville se remplissent seuls. `near` : les adresses proches de la boutique d'abord.
 */
export function AddressAutocomplete({ value, onChange, onSelect, onBlur, enabled, near, autoFocus }: { value: string; onChange: (v: string) => void; onSelect: (s: AddressSuggestion) => void; onBlur?: () => void; enabled: boolean; near?: { lat: number; lon: number } | null; autoFocus?: boolean }) {
  const [items, setItems] = useState<AddressSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const skip = useRef(false);
  const listId = useId();
  // Coordonnées en valeurs simples : le calcul ne se relance pas à chaque nouvel objet `near`
  const nearLat = near?.lat ?? null;
  const nearLon = near?.lon ?? null;

  useEffect(() => {
    if (!enabled || skip.current || value.trim().length < 4) {
      skip.current = false;
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const features = await search(value, nearLat !== null && nearLon !== null ? { lat: nearLat, lon: nearLon } : null, controller.signal);
        const list = features
          .filter((f) => ["housenumber", "street", "locality"].includes(f.properties.type))
          .map((f) => ({ label: f.properties.label, line1: f.properties.name, postalCode: f.properties.postcode, city: f.properties.city }))
          .slice(0, 5);
        setItems(list);
        setActive(-1);
        setOpen(list.length > 0);
      } catch {
        // service indisponible : saisie libre
      }
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [value, enabled, nearLat, nearLon]);

  const choose = (s: AddressSuggestion) => {
    skip.current = true;
    onSelect(s);
    setOpen(false);
  };

  return (
    <div className="relative">
      <input
        autoComplete="address-line1"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => items.length && setOpen(true)}
        onBlur={() => setTimeout(() => {
          setOpen(false);
          onBlur?.();
        }, 150)}
        onKeyDown={(e) => {
          if (!open) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((i) => Math.min(items.length - 1, i + 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((i) => Math.max(0, i - 1));
          } else if (e.key === "Enter" && active >= 0) {
            e.preventDefault();
            choose(items[active]);
          } else if (e.key === "Escape") setOpen(false);
        }}
        placeholder={enabled ? "Commencez à taper votre adresse…" : undefined}
        autoFocus={autoFocus}
        className="field"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        required
      />
      {open && (
        <ul id={listId} role="listbox" className="absolute inset-x-0 top-full z-20 mt-1 overflow-hidden rounded-xl bg-white py-1 shadow-xl ring-1 ring-encre/10">
          {items.map((s, i) => (
            <li key={s.label} role="option" aria-selected={i === active}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(s)}
                className={clsx("flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm", i === active ? "bg-lin-clair" : "hover:bg-lin-clair")}
              >
                <MapPin className="size-4 shrink-0 text-bronze" strokeWidth={1.5} />
                {s.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

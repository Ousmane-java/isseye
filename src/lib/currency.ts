// Calcul et affichage des prix multi-devises. Module pur (aucune dépendance) :
// utilisable côté serveur, côté navigateur et dans les tests.
// Tous les montants sont des entiers en unités mineures (centimes pour EUR/USD, francs pour FCFA).

export type Currency = {
  code: string;
  name: string;
  symbol: string;
  decimals: number;
  /** Unités de la devise pour 1 unité de la devise de base (EUR = 1, XOF = 655.957). */
  rate: number;
  rate_locked: boolean;
  rate_updated_at?: string | null;
  /** Arrondi au supérieur, en unités mineures (FCFA : 500). */
  rounding_step: number;
  /** Retranché après l'arrondi, en unités mineures (USD : 10 → prix en ,90). */
  rounding_ending: number;
  is_base: boolean;
  active: boolean;
  position: number;
};

/** Devises de départ : servent tant que la base n'est pas configurée (mêmes valeurs que la migration 0001). */
export const defaultCurrencies: Currency[] = [
  { code: "EUR", name: "Euro", symbol: "€", decimals: 2, rate: 1, rate_locked: true, rounding_step: 1, rounding_ending: 0, is_base: true, active: true, position: 0 },
  { code: "XOF", name: "Franc CFA (UEMOA)", symbol: "FCFA", decimals: 0, rate: 655.957, rate_locked: true, rounding_step: 500, rounding_ending: 0, is_base: false, active: true, position: 1 },
  { code: "XAF", name: "Franc CFA (CEMAC)", symbol: "FCFA", decimals: 0, rate: 655.957, rate_locked: true, rounding_step: 500, rounding_ending: 0, is_base: false, active: true, position: 2 },
  { code: "USD", name: "Dollar américain", symbol: "$", decimals: 2, rate: 1.08, rate_locked: false, rounding_step: 100, rounding_ending: 10, is_base: false, active: true, position: 3 },
];

/** Arrondi commercial : au palier supérieur, puis « prix psychologique » (ex. 38,00 → 37,90). */
export function roundPrice(minor: number, currency: Pick<Currency, "rounding_step" | "rounding_ending">) {
  const step = Math.max(1, currency.rounding_step);
  const rounded = Math.ceil(minor / step) * step;
  const ending = currency.rounding_ending;
  return ending > 0 && rounded - ending > 0 ? rounded - ending : rounded;
}

/**
 * Convertit un montant de la devise de base vers une autre devise, arrondi commercial compris.
 * La devise de base est renvoyée telle quelle.
 */
export function convertFromBase(baseMinor: number, base: Pick<Currency, "decimals">, target: Currency) {
  if (target.is_base) return baseMinor;
  // Arrondi intermédiaire à l'unité mineure : évite les erreurs de virgule flottante (24 597,000001)
  const exact = Math.round((baseMinor / 10 ** base.decimals) * target.rate * 10 ** target.decimals);
  return roundPrice(exact, target);
}

/**
 * Prix d'une variante dans une devise : le prix fixé à la main s'il existe, sinon le prix calculé.
 * `overrides` : prix saisis dans l'admin, par code devise.
 */
export function priceIn(
  basePrice: number,
  target: Currency,
  base: Pick<Currency, "decimals">,
  overrides?: Partial<Record<string, number>>,
) {
  const manual = overrides?.[target.code];
  return manual ?? convertFromBase(basePrice, base, target);
}

/** « 25 000 FCFA », « 37,90 € », « 37,90 $ » (format français, symbole après le montant). */
export function formatMoney(minor: number, currency: Pick<Currency, "decimals" | "symbol">) {
  const value = minor / 10 ** currency.decimals;
  // Pas de décimales inutiles sur un prix rond en euros/dollars : 45 € plutôt que 45,00 €
  const decimals = currency.decimals > 0 && minor % 10 ** currency.decimals === 0 ? 0 : currency.decimals;
  const number = new Intl.NumberFormat("fr-FR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(value);
  return `${number} ${currency.symbol}`;
}

/** Saisie admin (« 37,90 », « 25 000 ») → unités mineures. null si invalide. */
export function parseMoney(input: string, currency: Pick<Currency, "decimals">) {
  const clean = input.replace(/[\s  ]/g, "").replace(",", ".");
  if (!/^\d+(\.\d+)?$/.test(clean)) return null;
  const [int, frac = ""] = clean.split(".");
  if (frac.length > currency.decimals) return null;
  return Number(int) * 10 ** currency.decimals + Number(frac.padEnd(currency.decimals, "0") || 0);
}

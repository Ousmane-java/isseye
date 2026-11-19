import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { adminDb, isSupabaseConfigured } from "@/lib/supabase";
import { getSettings } from "@/lib/settings";
import { siteCache } from "@/lib/cache";
import { defaultCurrencies, type Currency } from "@/lib/currency";

export const COUNTRY_COOKIE = "isy_country"; // aperçu « vu depuis tel pays » (?pays=SN)
export const CURRENCY_COOKIE = "isy_currency"; // choix de la visiteuse, si le sélecteur est activé

export type CountryCurrency = { country_code: string; country_name: string; currency_code: string };

/** Toutes les devises, actives ou non, dans l'ordre de l'admin. */
export const getCurrencies = siteCache(
  async (): Promise<Currency[]> => {
    if (!isSupabaseConfigured) return defaultCurrencies;
    const { data, error } = await adminDb().from("currencies").select("*").order("position");
    if (error) throw new Error(error.message);
    if (!data?.length) return defaultCurrencies;
    return data.map((c) => ({ ...c, rate: Number(c.rate) })) as Currency[];
  },
  "devises",
  () => defaultCurrencies,
);

export const getCountryCurrencies = siteCache(
  async (): Promise<CountryCurrency[]> => {
    if (!isSupabaseConfigured) return [];
    const { data, error } = await adminDb().from("country_currencies").select("*").order("country_name");
    if (error) throw new Error(error.message);
    return (data ?? []) as CountryCurrency[];
  },
  "devises-pays",
  () => [],
);

export async function getBaseCurrency() {
  const currencies = await getCurrencies();
  return currencies.find((c) => c.is_base) ?? defaultCurrencies[0];
}

/** Pays de la visiteuse : aperçu forcé, sinon géolocalisation Vercel, sinon France (développement). */
export const getVisitorCountry = cache(async () => {
  const [cookieStore, headerList] = await Promise.all([cookies(), headers()]);
  const forced = cookieStore.get(COUNTRY_COOKIE)?.value;
  const geo = headerList.get("x-vercel-ip-country");
  return (forced ?? geo ?? "FR").toUpperCase();
});

/**
 * Devise affichée et facturée à la visiteuse :
 * choix manuel (si le sélecteur est activé) → devise de son pays → devise par défaut → devise de base.
 */
export const getVisitorCurrency = cache(async (): Promise<Currency> => {
  const [currencies, countries, settings, country, cookieStore] = await Promise.all([
    getCurrencies(),
    getCountryCurrencies(),
    getSettings(),
    getVisitorCountry(),
    cookies(),
  ]);
  const active = (code?: string | null) => currencies.find((c) => c.code === code && c.active);

  const chosen = settings.store.currencySwitcher ? active(cookieStore.get(CURRENCY_COOKIE)?.value) : undefined;
  const fromCountry = active(countries.find((c) => c.country_code === country)?.currency_code);
  // Sans base configurée : correspondance minimale pour que l'affichage reste juste
  const fallbackCountry = countries.length ? undefined : active(fallbackCountryCurrency(country));

  return chosen ?? fromCountry ?? fallbackCountry ?? active(settings.store.defaultCurrency) ?? currencies.find((c) => c.is_base) ?? defaultCurrencies[0];
});

const uemoa = ["SN", "CI", "ML", "BF", "BJ", "TG", "NE", "GW"];
const cemac = ["CM", "GA", "CG", "TD", "CF", "GQ"];
const euro = ["FR", "BE", "LU", "DE", "ES", "IT", "PT", "NL", "AT", "IE", "FI", "GR", "SK", "SI", "EE", "LV", "LT", "MT", "CY", "HR", "MC", "GP", "MQ", "GF", "RE", "YT"];

function fallbackCountryCurrency(country: string) {
  if (euro.includes(country)) return "EUR";
  if (uemoa.includes(country)) return "XOF";
  if (cemac.includes(country)) return "XAF";
  if (country === "US") return "USD";
  return null;
}

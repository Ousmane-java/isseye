import "server-only";
import { cache } from "react";
import { adminDb, isSupabaseConfigured } from "@/lib/supabase";
import { siteCache } from "@/lib/cache";
import { getSettings } from "@/lib/settings";
import { getBaseCurrency, getVisitorCountry, getVisitorCurrency } from "@/lib/currencies";
import { demoShippingZones } from "@/lib/demo-data";
import { zoneFor, type ShippingZone } from "@/lib/shipping-types";
import type { PricingContext } from "@/lib/pricing";
import type { Money } from "@/lib/catalog-types";
import type { Currency } from "@/lib/currency";

/** Zones de livraison, avec leurs modes et tarifs, dans l'ordre de l'admin. */
export const getShippingZones = siteCache(async (): Promise<ShippingZone[]> => {
  if (!isSupabaseConfigured) return demoShippingZones;
  const { data, error } = await adminDb()
    .from("shipping_zones")
    .select(
      "id, name, countries, tax_mode, customs_notice, active, position, methods:shipping_methods(id, name, description, eta, carrier, tracking_url_template, active, position, prices:shipping_method_prices(currency_code, amount, free_above))",
    )
    .order("position");
  if (error) throw new Error(error.message);
  return ((data ?? []) as ShippingZone[]).map((z) => ({ ...z, methods: [...z.methods].sort((a, b) => a.position - b.position) }));
}, "livraison", () => []);

/**
 * Contexte de prix de la visiteuse : sa devise, et le régime de TVA de son pays
 * (ou du pays de livraison choisi à la caisse).
 */
export const getPricingContext = cache(async (country?: string): Promise<PricingContext & { country: string; zone: ShippingZone | undefined }> => {
  const [currency, base, settings, zones, visitorCountry] = await Promise.all([getVisitorCurrency(), getBaseCurrency(), getSettings(), getShippingZones(), getVisitorCountry()]);
  const target = (country ?? visitorCountry).toUpperCase();
  const zone = zoneFor(zones, target);
  return {
    currency,
    base,
    taxMode: zone?.tax_mode ?? "ttc",
    exportPricing: settings.store.exportPricing,
    vatRate: settings.legal.vatRate,
    country: target,
    zone,
  };
});

export function money(amount: number, currency: Pick<Currency, "code" | "symbol" | "decimals">): Money {
  return { amount, code: currency.code, symbol: currency.symbol, decimals: currency.decimals };
}

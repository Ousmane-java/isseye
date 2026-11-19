// Livraison : types partagés et choix de la zone d'un pays (module pur).

export type ShippingMethodPrice = { currency_code: string; amount: number; free_above: number | null };

export type ShippingMethod = {
  id: string;
  name: string;
  description: string | null;
  eta: string | null;
  carrier: string | null;
  tracking_url_template: string | null;
  active: boolean;
  position: number;
  prices: ShippingMethodPrice[];
};

export type ShippingZone = {
  id: string;
  name: string;
  countries: string[];
  tax_mode: "ttc" | "export";
  customs_notice: string | null;
  active: boolean;
  position: number;
  methods: ShippingMethod[];
};

/** Zone active qui couvre le pays, ou undefined si la boutique n'y livre pas. */
export function zoneFor(zones: ShippingZone[], country: string) {
  return zones.find((z) => z.active && z.countries.includes(country.toUpperCase()));
}

/** Tous les pays desservis, sans doublon. */
export function servedCountries(zones: ShippingZone[]) {
  return [...new Set(zones.filter((z) => z.active && z.methods.some((m) => m.active)).flatMap((z) => z.countries))];
}

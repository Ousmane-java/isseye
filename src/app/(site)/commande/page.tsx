import type { Metadata } from "next";
import { getShippingZones } from "@/lib/shop";
import { getVisitorCountry } from "@/lib/currencies";
import { getSettings } from "@/lib/settings";
import { servedCountries } from "@/lib/shipping-types";
import { paymentSimulated } from "@/lib/stripe";
import { countryName } from "@/config/countries";
import { PageIntro } from "@/components/PageIntro";
import { Checkout } from "@/components/checkout/Checkout";

export const metadata: Metadata = { title: "Commande", robots: { index: false } };

export default async function CheckoutPage({ searchParams }: PageProps<"/commande">) {
  const [zones, country, settings, params] = await Promise.all([getShippingZones(), getVisitorCountry(), getSettings(), searchParams]);
  const countries = servedCountries(zones)
    .map((code) => ({ code, name: countryName(code) }))
    .sort((a, b) => a.name.localeCompare(b.name, "fr"));
  return (
    <>
      <PageIntro eyebrow="Commande sécurisée" title="Finaliser" text="Sans création de compte. Vous recevrez la confirmation et le lien de suivi par email." />
      <Checkout
        countries={countries}
        defaultCountry={country}
        cancelled={params.annule === "1"}
        simulated={paymentSimulated()}
        storeOpen={settings.store.open}
        closedMessage={settings.store.closedMessage}
      />
    </>
  );
}

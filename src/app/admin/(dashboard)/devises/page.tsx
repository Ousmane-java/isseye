import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin-auth";
import { getCountryCurrencies, getCurrencies } from "@/lib/currencies";
import { getSettings } from "@/lib/settings";
import { Card, Notice, PageHeader } from "@/components/admin/ui";
import { AddCurrencyForm, CurrencyCard, RefreshRatesButton } from "./CurrencyEditor";
import { CountryTable } from "./CountryTable";
import { countries as allCountries } from "@/config/countries";

export const metadata: Metadata = { title: "Devises & pays" };

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const dateFormat = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeStyle: "short", timeZone: "Europe/Paris" });

export default async function CurrenciesPage() {
  await requireAdmin("currencies");
  const [currencies, countries, settings] = await Promise.all([getCurrencies(), getCountryCurrencies(), getSettings()]);
  const base = currencies.find((c) => c.is_base) ?? currencies[0];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Devises & pays"
        description="Chaque visiteuse voit et paie les prix dans la devise de son pays. Les prix sont saisis en euros puis calculés automatiquement ; vous pouvez fixer un prix à la main pour n'importe quelle devise depuis la fiche produit."
        actions={<RefreshRatesButton />}
      />

      <Notice>
        Le franc CFA (XOF et XAF) a une parité fixe avec l&apos;euro : 1 € = 655,957 FCFA. Le dollar varie : son taux peut être mis à jour d&apos;un clic (taux de la
        Banque centrale européenne) et le sera automatiquement chaque matin une fois la boutique en ligne.
      </Notice>

      <div className="space-y-4">
        {currencies.map((c) => (
          <CurrencyCard
            key={c.code}
            currency={c}
            base={base}
            lastUpdate={c.rate_updated_at ? dateFormat.format(new Date(c.rate_updated_at)) : null}
          />
        ))}
      </div>

      <Card title="Ajouter une devise" description="Livre sterling, dollar canadien, dirham… Elle pourra ensuite être associée à des pays.">
        <AddCurrencyForm />
      </Card>

      <Card
        title="Devise par pays"
        description="Détection automatique du pays de la visiteuse. Pour un pays absent de la liste, la devise par défaut s'applique (modifiable dans Réglages)."
      >
        <CountryTable rows={countries} currencies={currencies} defaultCurrency={settings.store.defaultCurrency} siteUrl={siteUrl} countries={allCountries} />
      </Card>
    </div>
  );
}

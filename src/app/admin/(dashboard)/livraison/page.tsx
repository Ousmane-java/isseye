import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin-auth";
import { getCurrencies } from "@/lib/currencies";
import { getShippingZones } from "@/lib/shop";
import { convertFromBase, formatMoney, type Currency } from "@/lib/currency";
import { countryName } from "@/config/countries";
import type { ShippingMethod, ShippingZone } from "@/lib/shipping-types";
import { Badge, Card, Notice, PageHeader } from "@/components/admin/ui";
import { ActionForm, ConfirmButton } from "@/components/admin/forms";
import { deleteMethod, deleteZone, saveMethod, saveZone } from "./actions";
import { LocalDeliveryForm } from "./LocalDeliveryForm";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = { title: "Livraison" };
const major = (v: number | null | undefined, c: Currency) => (v === null || v === undefined ? "" : (v / 10 ** c.decimals).toLocaleString("fr-FR", { useGrouping: false, maximumFractionDigits: c.decimals }));

function ZoneFields({ z }: { z?: ShippingZone }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="block"><span className="label">Nom</span><input name="name" defaultValue={z?.name} required className="field" /></label>
      <label className="block">
        <span className="label">Régime de TVA</span>
        <select name="tax_mode" defaultValue={z?.tax_mode ?? "ttc"} className="field">
          <option value="ttc">TVA française comprise (France, UE)</option>
          <option value="export">Export hors UE (sans TVA)</option>
        </select>
      </label>
      <label className="block sm:col-span-2">
        <span className="label">Pays (codes à 2 lettres séparés par des virgules)</span>
        <input name="countries" defaultValue={z?.countries.join(", ")} placeholder="SN, CI, CM" className="field uppercase" />
        {z && <span className="mt-1 block text-[12px] text-gris">{z.countries.map(countryName).join(" · ")}</span>}
      </label>
      <label className="block sm:col-span-2"><span className="label">Message affiché à la caisse (douane…)</span><textarea name="customs_notice" defaultValue={z?.customs_notice ?? ""} rows={2} className="field resize-y" /></label>
      <label className="block"><span className="label">Ordre</span><input name="position" type="number" defaultValue={z?.position ?? 0} className="field" /></label>
      <label className="flex items-center gap-2 self-end pb-3 text-sm"><input type="checkbox" name="active" defaultChecked={z?.active ?? true} className="size-4 accent-noir" /> Zone active</label>
    </div>
  );
}

function MethodFields({ m, currencies }: { m?: ShippingMethod; currencies: Currency[] }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="block"><span className="label">Nom</span><input name="name" defaultValue={m?.name} required placeholder="Colissimo à domicile" className="field" /></label>
        <label className="block"><span className="label">Délai</span><input name="eta" defaultValue={m?.eta ?? ""} placeholder="2 à 3 jours ouvrés" className="field" /></label>
        <label className="block"><span className="label">Transporteur</span><input name="carrier" defaultValue={m?.carrier ?? ""} className="field" /></label>
        <label className="block sm:col-span-2"><span className="label">Description</span><input name="description" defaultValue={m?.description ?? ""} className="field" /></label>
        <label className="block"><span className="label">Ordre</span><input name="position" type="number" defaultValue={m?.position ?? 0} className="field" /></label>
        <label className="block sm:col-span-3"><span className="label">Lien de suivi (avec {"{tracking}"})</span><input name="tracking_url_template" defaultValue={m?.tracking_url_template ?? ""} placeholder="https://www.laposte.fr/outils/suivre-vos-envois?code={tracking}" className="field" /></label>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {currencies.map((c) => {
          const p = m?.prices.find((x) => x.currency_code === c.code);
          const base = m?.prices.find((x) => x.currency_code === currencies.find((cc) => cc.is_base)?.code);
          return (
            <div key={c.code} className="space-y-2 rounded-lg bg-lin-clair p-3">
              <p className="text-sm font-semibold">{c.code}{!c.is_base && base && !p && <span className="font-normal text-gris"> · auto {formatMoney(convertFromBase(base.amount, currencies.find((cc) => cc.is_base)!, c), c)}</span>}</p>
              <input name={`amount_${c.code}`} defaultValue={major(p?.amount, c)} placeholder={c.is_base ? `Tarif (${c.symbol})` : "Tarif (auto)"} className="field !py-2 text-sm" />
              <input name={`free_${c.code}`} defaultValue={major(p?.free_above, c)} placeholder={`Offerte dès (${c.symbol})`} className="field !py-2 text-sm" />
            </div>
          );
        })}
      </div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="active" defaultChecked={m?.active ?? true} className="size-4 accent-noir" /> Proposé à la caisse</label>
    </div>
  );
}

export default async function ShippingPage() {
  await requireAdmin("shipping");
  const [zones, currencies, settings] = await Promise.all([getShippingZones(), getCurrencies(), getSettings()]);
  const active = currencies.filter((c) => c.active);
  return (
    <div className="space-y-8">
      <PageHeader title="Livraison" description="Retrait en boutique, livraison locale au kilomètre, et envoi postal par zones de pays (Colissimo, DHL…) avec tarifs par devise." />
      <Card title="Retrait à la boutique & livraison locale" description="À la caisse, la cliente choisit « Livraison » ou « Retrait ». En France, son adresse est proposée automatiquement ; si elle est dans votre rayon, le prix de la livraison à domicile dépend des kilomètres.">
        <LocalDeliveryForm delivery={settings.delivery} />
      </Card>
      <Notice>Parfums et transport : l&apos;alcool des parfums est classé « liquide inflammable ». Vérifiez auprès de chaque transporteur les conditions d&apos;envoi (notamment par avion vers l&apos;Afrique et les États-Unis).</Notice>
      {zones.map((z) => (
        <Card key={z.id} title={z.name} description={`${z.countries.length} pays · ${z.tax_mode === "export" ? "export hors TVA" : "TVA comprise"}`} actions={<span className="flex items-center gap-3"><Badge tone={z.active ? "green" : "neutral"}>{z.active ? "Active" : "Inactive"}</Badge><ConfirmButton danger confirm={`Supprimer la zone ${z.name} et ses modes ?`} action={deleteZone.bind(null, z.id)}>Supprimer</ConfirmButton></span>}>
          <details>
            <summary className="cursor-pointer text-sm text-bronze">Modifier la zone</summary>
            <ActionForm action={saveZone.bind(null, z.id)} className="mt-4"><ZoneFields z={z} /></ActionForm>
          </details>
          <div className="mt-6 space-y-3">
            {z.methods.map((m) => {
              const base = m.prices.find((p) => p.currency_code === "EUR") ?? m.prices[0];
              const cur = currencies.find((c) => c.code === base?.currency_code);
              return (
                <details key={m.id} className="rounded-xl border border-encre/10 p-4">
                  <summary className="flex cursor-pointer flex-wrap items-center gap-3">
                    <span className="font-medium">{m.name}</span>
                    <span className="text-sm text-gris">{m.eta}</span>
                    <span className="ml-auto text-sm">{base && cur ? formatMoney(base.amount, cur) : "—"}{base?.free_above && cur ? ` · offerte dès ${formatMoney(base.free_above, cur)}` : ""}</span>
                    {!m.active && <Badge>Inactif</Badge>}
                  </summary>
                  <ActionForm action={saveMethod.bind(null, z.id, m.id)} className="mt-4" footer={<ConfirmButton danger confirm="Supprimer ce mode ?" action={deleteMethod.bind(null, m.id)}>Supprimer</ConfirmButton>}>
                    <MethodFields m={m} currencies={active} />
                  </ActionForm>
                </details>
              );
            })}
            <details className="rounded-xl border border-dashed border-encre/15 p-4">
              <summary className="cursor-pointer text-sm text-bronze">+ Ajouter un mode de livraison</summary>
              <ActionForm action={saveMethod.bind(null, z.id, null)} submitLabel="Ajouter" className="mt-4"><MethodFields currencies={active} /></ActionForm>
            </details>
          </div>
        </Card>
      ))}
      <Card title="Nouvelle zone">
        <ActionForm action={saveZone.bind(null, null)} submitLabel="Créer la zone"><ZoneFields /></ActionForm>
      </Card>
    </div>
  );
}

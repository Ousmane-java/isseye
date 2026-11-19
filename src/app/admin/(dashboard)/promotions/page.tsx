import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin-auth";
import { adminDb } from "@/lib/supabase";
import { getCurrencies } from "@/lib/currencies";
import type { Currency } from "@/lib/currency";
import { Badge, Card, PageHeader } from "@/components/admin/ui";
import { ActionForm, ConfirmButton } from "@/components/admin/forms";
import { archivePromo, savePromo } from "./actions";

export const metadata: Metadata = { title: "Promotions" };
type Promo = { id: string; code: string; kind: string; percent: number | null; category_ids: string[]; starts_at: string | null; ends_at: string | null; max_uses: number | null; uses: number; first_order_only: boolean; active: boolean; amounts: { currency_code: string; amount: number | null; min_subtotal: number | null }[] };
const local = (iso: string | null) => (iso ? new Date(new Date(iso).getTime() - new Date(iso).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "");
const major = (v: number | null | undefined, c: Currency) => (v === null || v === undefined ? "" : (v / 10 ** c.decimals).toLocaleString("fr-FR", { useGrouping: false, maximumFractionDigits: c.decimals }));

function PromoFields({ p, currencies, categories }: { p?: Promo; currencies: Currency[]; categories: { id: string; name: string }[] }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="block"><span className="label">Code</span><input name="code" defaultValue={p?.code} required placeholder="BIENVENUE10" className="field uppercase" /></label>
        <label className="block">
          <span className="label">Type</span>
          <select name="kind" defaultValue={p?.kind ?? "percent"} className="field">
            <option value="percent">Pourcentage</option>
            <option value="amount">Montant fixe</option>
            <option value="free_shipping">Livraison offerte</option>
          </select>
        </label>
        <label className="block"><span className="label">Pourcentage (si %)</span><input name="percent" type="number" min={1} max={90} defaultValue={p?.percent ?? ""} className="field" /></label>
      </div>
      <div className="rounded-xl bg-lin-clair p-4">
        <p className="text-[13px] text-gris">Montants par devise : réduction (si montant fixe) et minimum d&apos;achat. Laissez vide dans une devise pour une conversion automatique depuis l&apos;euro.</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {currencies.map((c) => {
            const a = p?.amounts.find((x) => x.currency_code === c.code);
            return (
              <div key={c.code} className="space-y-2">
                <p className="text-sm font-semibold">{c.code}</p>
                <input name={`amount_${c.code}`} defaultValue={major(a?.amount, c)} placeholder={`Réduction (${c.symbol})`} className="field !py-2 text-sm" />
                <input name={`min_${c.code}`} defaultValue={major(a?.min_subtotal, c)} placeholder={`Minimum (${c.symbol})`} className="field !py-2 text-sm" />
              </div>
            );
          })}
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="block"><span className="label">Début</span><input type="datetime-local" name="starts_at" defaultValue={local(p?.starts_at ?? null)} className="field" /></label>
        <label className="block"><span className="label">Fin</span><input type="datetime-local" name="ends_at" defaultValue={local(p?.ends_at ?? null)} className="field" /></label>
        <label className="block"><span className="label">Utilisations max.</span><input name="max_uses" type="number" min={1} defaultValue={p?.max_uses ?? ""} placeholder="Illimité" className="field" /></label>
      </div>
      {categories.length > 1 && (
        <fieldset>
          <legend className="label">Limité aux catégories (aucune = tout le catalogue)</legend>
          <div className="flex flex-wrap gap-4 text-sm">
            {categories.map((c) => (
              <label key={c.id} className="flex items-center gap-2"><input type="checkbox" name="category_ids" value={c.id} defaultChecked={p?.category_ids.includes(c.id)} className="size-4 accent-noir" /> {c.name}</label>
            ))}
          </div>
        </fieldset>
      )}
      <div className="flex flex-wrap gap-5 text-sm">
        <label className="flex items-center gap-2"><input type="checkbox" name="first_order_only" defaultChecked={p?.first_order_only} className="size-4 accent-noir" /> Première commande uniquement</label>
        <label className="flex items-center gap-2"><input type="checkbox" name="active" defaultChecked={p?.active ?? true} className="size-4 accent-noir" /> Actif</label>
      </div>
    </div>
  );
}

export default async function PromotionsPage() {
  await requireAdmin("promotions");
  const db = adminDb();
  const [{ data }, { data: categories }, currencies] = await Promise.all([
    db.from("promo_codes").select("*, amounts:promo_code_amounts(currency_code, amount, min_subtotal)").eq("archived", false).order("created_at", { ascending: false }),
    db.from("categories").select("id, name").is("deleted_at", null).order("position"),
    getCurrencies(),
  ]);
  const active = currencies.filter((c) => c.active);
  const now = new Date().toISOString();
  return (
    <div className="space-y-8">
      <PageHeader title="Codes promo" description="Réductions saisies par la cliente à la caisse : pourcentage, montant fixe (par devise) ou livraison offerte, programmables et limitées." />
      <Card title="Nouveau code">
        <ActionForm action={savePromo.bind(null, null)} submitLabel="Créer le code">
          <PromoFields currencies={active} categories={categories ?? []} />
        </ActionForm>
      </Card>
      {((data ?? []) as Promo[]).map((p) => {
        const live = p.active && (!p.starts_at || p.starts_at <= now) && (!p.ends_at || p.ends_at >= now) && (p.max_uses === null || p.uses < p.max_uses);
        return (
          <Card
            key={p.id}
            title={p.code}
            description={`${p.kind === "percent" ? `−${p.percent} %` : p.kind === "amount" ? "Montant fixe" : "Livraison offerte"} · utilisé ${p.uses} fois${p.max_uses ? ` sur ${p.max_uses}` : ""}`}
            actions={<span className="flex items-center gap-3"><Badge tone={live ? "green" : "neutral"}>{live ? "Actif" : "Inactif"}</Badge><ConfirmButton danger confirm={`Archiver le code ${p.code} ?`} action={archivePromo.bind(null, p.id)}>Archiver</ConfirmButton></span>}
          >
            <details>
              <summary className="cursor-pointer text-sm text-bronze">Modifier</summary>
              <ActionForm action={savePromo.bind(null, p.id)} className="mt-4">
                <PromoFields p={p} currencies={active} categories={categories ?? []} />
              </ActionForm>
            </details>
          </Card>
        );
      })}
    </div>
  );
}

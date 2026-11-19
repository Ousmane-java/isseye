"use client";

import { useState, useTransition, type ReactNode } from "react";
import { ArrowLeft, ArrowRight, Copy, ImagePlus, Loader2, Plus, Trash2, X } from "lucide-react";
import clsx from "clsx";
import { convertFromBase, formatMoney, parseMoney, type Currency } from "@/lib/currency";
import { slugify, type ActionState } from "@/lib/admin-types";
import type { ProductPayload, VariantInput } from "@/lib/product-admin";
import { Card } from "@/components/admin/ui";
import { Feedback } from "@/components/admin/forms";
import { MediaLibraryModal } from "@/components/admin/MediaPicker";
import { duplicateProduct, saveProduct, trashProduct } from "../actions";

type Facet = { id: string; name: string; multiple: boolean; values: { id: string; label: string }[] };

const layers = [
  { key: "tete", label: "Notes de tête", hint: "Les premières secondes : fraîches, vives." },
  { key: "coeur", label: "Notes de cœur", hint: "L'âme du parfum, après quelques minutes." },
  { key: "fond", label: "Notes de fond", hint: "Le sillage qui dure des heures." },
] as const;

export function ProductEditor({
  id,
  initial,
  categories,
  facets,
  noteNames,
  products,
  base,
  currencies,
}: {
  id: string;
  initial: ProductPayload;
  categories: { id: string; name: string }[];
  facets: Facet[];
  noteNames: string[];
  products: { id: string; name: string }[];
  base: Currency;
  currencies: Currency[];
}) {
  const [p, setP] = useState(initial);
  const [state, setState] = useState<ActionState>();
  const [pending, start] = useTransition();
  const [picking, setPicking] = useState(false);
  const [slugTouched, setSlugTouched] = useState(Boolean(initial.slug));
  const dirty = JSON.stringify(p) !== JSON.stringify(initial);

  const set = <K extends keyof ProductPayload>(key: K, value: ProductPayload[K]) => setP((x) => ({ ...x, [key]: value }));
  const setVariant = (i: number, patch: Partial<VariantInput>) => set("variants", p.variants.map((v, j) => (j === i ? { ...v, ...patch } : v)));
  const moveMedia = (i: number, dir: -1 | 1) => {
    const list = [...p.media];
    const j = i + dir;
    if (j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    set("media", list);
  };

  const save = () =>
    start(async () => {
      setState(undefined);
      setState(await saveProduct(id, p));
    });

  return (
    <div className="space-y-6 pb-28">
      <Card title="Informations">
        <div className="grid gap-4 sm:grid-cols-2">
          <F label="Nom">
            <input value={p.name} onChange={(e) => setP((x) => ({ ...x, name: e.target.value, slug: slugTouched ? x.slug : slugify(e.target.value) }))} className="field" />
          </F>
          <F label="Adresse de la page" hint={`/parfum/${p.slug || "…"}`}>
            <input
              value={p.slug}
              onChange={(e) => {
                setSlugTouched(true);
                set("slug", slugify(e.target.value));
              }}
              className="field"
            />
          </F>
          <F label="Sous-titre" hint="Ex. « Eau de parfum · Pour elle »">
            <input value={p.subtitle} onChange={(e) => set("subtitle", e.target.value)} className="field" />
          </F>
          <F label="Catégorie">
            <select value={p.category_id} onChange={(e) => set("category_id", e.target.value)} className="field">
              <option value="">Sans catégorie</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </F>
          <F label="Pastille" hint="Ex. « Nouveau », « Édition limitée » (laisser vide pour aucune)">
            <input value={p.badge} onChange={(e) => set("badge", e.target.value)} className="field" />
          </F>
          <F label="Ordre d'affichage" hint="Plus petit = affiché en premier">
            <input type="number" value={p.position} onChange={(e) => set("position", Number(e.target.value))} className="field" />
          </F>
        </div>
        <label className="mt-5 flex items-center gap-3 text-sm text-encre">
          <input type="checkbox" checked={p.featured} onChange={(e) => set("featured", e.target.checked)} className="size-4 accent-noir" />
          Mettre en avant (bloc « Sélection » de l&apos;accueil)
        </label>
      </Card>

      <Card
        title="Photos & vidéos"
        description="La première photo est utilisée dans la boutique et les partages. Format conseillé : portrait 4:5, au moins 1200 px de large."
        actions={
          <button type="button" onClick={() => setPicking(true)} className="btn-outline !px-4 !py-2 text-encre">
            <ImagePlus className="size-4" /> Ajouter
          </button>
        }
      >
        {p.media.length === 0 ? (
          <button type="button" onClick={() => setPicking(true)} className="w-full rounded-xl border border-dashed border-encre/15 py-12 text-sm text-gris hover:border-or">
            Aucune photo : cliquez pour en ajouter.
          </button>
        ) : (
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {p.media.map((m, i) => (
              <li key={m.url + i} className="space-y-2">
                <div className="group relative aspect-[4/5] overflow-hidden rounded-xl bg-lin-clair">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {m.kind === "video" ? <video src={m.url} muted className="h-full w-full object-cover" /> : <img src={m.url} alt="" className="h-full w-full object-cover" />}
                  {i === 0 && <span className="absolute top-2 left-2 rounded-full bg-noir px-2 py-0.5 text-[10px] font-semibold text-creme">Principale</span>}
                  <div className="absolute inset-x-2 bottom-2 flex justify-between opacity-0 transition group-hover:opacity-100">
                    <span className="flex gap-1">
                      <IconBtn label="Avancer" onClick={() => moveMedia(i, -1)}>
                        <ArrowLeft className="size-3.5" />
                      </IconBtn>
                      <IconBtn label="Reculer" onClick={() => moveMedia(i, 1)}>
                        <ArrowRight className="size-3.5" />
                      </IconBtn>
                    </span>
                    <IconBtn label="Retirer" onClick={() => set("media", p.media.filter((_, j) => j !== i))}>
                      <X className="size-3.5" />
                    </IconBtn>
                  </div>
                </div>
                <input value={m.alt} onChange={(e) => set("media", p.media.map((x, j) => (j === i ? { ...x, alt: e.target.value } : x)))} placeholder="Description de la photo" className="field !py-1.5 text-[13px]" />
              </li>
            ))}
          </ul>
        )}
        <MediaLibraryModal open={picking} onClose={() => setPicking(false)} multiple folder="produits" onPick={(items) => set("media", [...p.media, ...items.map((m) => ({ url: m.url, alt: m.alt ?? p.name, kind: m.kind }))])} />
      </Card>

      <Card
        title="Formats, prix & stock"
        description={`Prix saisis en ${base.name.toLowerCase()} (${base.symbol}). Les autres devises sont calculées automatiquement ; vous pouvez fixer un prix à la main.`}
        actions={
          <button
            type="button"
            onClick={() =>
              set("variants", [
                ...p.variants,
                { label: "", sku: "", price: "", compare_at_price: "", stock: 0, track_stock: true, allow_backorder: false, low_stock_threshold: 3, weight_grams: "", active: true, prices: currencies.map((c) => ({ currency_code: c.code, amount: "", compare: "" })) },
              ])
            }
            className="btn-outline !px-4 !py-2 text-encre"
          >
            <Plus className="size-4" /> Format
          </button>
        }
      >
        <div className="space-y-5">
          {p.variants.map((v, i) => {
            const baseMinor = parseMoney(v.price || "0", base) ?? 0;
            return (
              <div key={v.id ?? `new-${i}`} className={clsx("rounded-xl border p-4", v.active ? "border-encre/10" : "border-dashed border-encre/15 opacity-70")}>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
                  <F label="Libellé" className="lg:col-span-2">
                    <input value={v.label} onChange={(e) => setVariant(i, { label: e.target.value })} placeholder="30 ml · Eau de parfum" className="field" />
                  </F>
                  <F label="Référence (SKU)">
                    <input value={v.sku} onChange={(e) => setVariant(i, { sku: e.target.value.toUpperCase() })} className="field" />
                  </F>
                  <F label={`Prix (${base.symbol})`}>
                    <input value={v.price} onChange={(e) => setVariant(i, { price: e.target.value })} inputMode="decimal" placeholder="35" className="field" />
                  </F>
                  <F label="Prix barré">
                    <input value={v.compare_at_price} onChange={(e) => setVariant(i, { compare_at_price: e.target.value })} inputMode="decimal" placeholder="—" className="field" />
                  </F>
                  <F label="Stock">
                    <input type="number" value={v.stock} onChange={(e) => setVariant(i, { stock: Number(e.target.value) })} className="field" />
                  </F>
                  <F label="Alerte stock bas sous">
                    <input type="number" min={0} value={v.low_stock_threshold} onChange={(e) => setVariant(i, { low_stock_threshold: Number(e.target.value) })} className="field" />
                  </F>
                  <F label="Poids (g)">
                    <input value={v.weight_grams} onChange={(e) => setVariant(i, { weight_grams: e.target.value.replace(/\D/g, "") })} inputMode="numeric" className="field" />
                  </F>
                  <div className="flex flex-col justify-end gap-2 pb-1 text-[13px] text-encre sm:col-span-2 lg:col-span-4">
                    <label className="flex items-center gap-2">
                      <input type="checkbox" checked={v.track_stock} onChange={(e) => setVariant(i, { track_stock: e.target.checked })} className="size-4 accent-noir" /> Suivre le stock
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" checked={v.allow_backorder} onChange={(e) => setVariant(i, { allow_backorder: e.target.checked })} className="size-4 accent-noir" /> Vendre même en rupture (précommande)
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" checked={v.active} onChange={(e) => setVariant(i, { active: e.target.checked })} className="size-4 accent-noir" /> Format proposé à la vente
                    </label>
                  </div>
                </div>

                {currencies.length > 0 && (
                  <div className="mt-4 rounded-lg bg-lin-clair p-3">
                    <p className="text-[12px] font-semibold tracking-wide text-gris uppercase">Prix dans les autres devises</p>
                    <div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {v.prices.map((o, k) => {
                        const cur = currencies.find((c) => c.code === o.currency_code);
                        if (!cur) return null;
                        const auto = convertFromBase(baseMinor, base, cur);
                        return (
                          <div key={o.currency_code} className="text-sm">
                            <span className="mb-1 block text-[13px] text-encre">
                              {cur.code} · auto : <strong>{formatMoney(auto, cur)}</strong>
                            </span>
                            <input
                              value={o.amount}
                              onChange={(e) => setVariant(i, { prices: v.prices.map((x, m) => (m === k ? { ...x, amount: e.target.value } : x)) })}
                              placeholder="Prix fixé à la main (facultatif)"
                              inputMode="decimal"
                              className="field !py-2 text-sm"
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {p.variants.length > 1 && (
                  <button type="button" onClick={() => set("variants", p.variants.filter((_, j) => j !== i))} className="mt-3 inline-flex items-center gap-1.5 text-sm text-gris hover:text-red-700">
                    <Trash2 className="size-4" /> Retirer ce format
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      <Card title="Pyramide olfactive" description="Tapez une note puis Entrée. Les notes sont réutilisables d'un parfum à l'autre.">
        <datalist id="notes-library">
          {noteNames.map((n) => (
            <option key={n} value={n} />
          ))}
        </datalist>
        <div className="grid gap-5 lg:grid-cols-3">
          {layers.map((l) => (
            <TagInput key={l.key} label={l.label} hint={l.hint} values={p.notes[l.key]} onChange={(values) => set("notes", { ...p.notes, [l.key]: values })} />
          ))}
        </div>
      </Card>

      {facets.length > 0 && (
        <Card title="Caractéristiques" description="Servent aux filtres de la boutique (Pour elle, Florale…). Les listes se gèrent dans Caractéristiques.">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {facets.map((f) => (
              <fieldset key={f.id}>
                <legend className="label">{f.name}</legend>
                <div className="flex flex-wrap gap-2">
                  {f.values.map((v) => {
                    const on = p.facetValueIds.includes(v.id);
                    return (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => {
                          const others = f.multiple ? p.facetValueIds : p.facetValueIds.filter((x) => !f.values.some((fv) => fv.id === x));
                          set("facetValueIds", on ? p.facetValueIds.filter((x) => x !== v.id) : [...others, v.id]);
                        }}
                        className={clsx("rounded-full border px-3 py-1.5 text-[13px] transition", on ? "border-noir bg-noir text-creme" : "border-encre/15 text-encre hover:border-encre/40")}
                      >
                        {v.label}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            ))}
          </div>
        </Card>
      )}

      <Card title="Textes" description="Mise en forme possible : **gras**, *italique*, listes avec « - », titres avec « ## ».">
        <div className="space-y-4">
          <F label="Description (affichée près du prix)">
            <textarea value={p.description} onChange={(e) => set("description", e.target.value)} rows={4} className="field resize-y" />
          </F>
          <F label="L'histoire du parfum (grande citation sur fond noir)">
            <textarea value={p.story} onChange={(e) => set("story", e.target.value)} rows={3} className="field resize-y" />
          </F>
          <F label="Conseils d'utilisation">
            <textarea value={p.usage} onChange={(e) => set("usage", e.target.value)} rows={3} className="field resize-y" />
          </F>
          <div className="grid gap-4 sm:grid-cols-2">
            <F label="Ingrédients (liste INCI)">
              <textarea value={p.ingredients} onChange={(e) => set("ingredients", e.target.value)} rows={3} className="field resize-y" />
            </F>
            <F label="Allergènes (obligatoire)">
              <textarea value={p.allergens} onChange={(e) => set("allergens", e.target.value)} rows={3} className="field resize-y" />
            </F>
          </div>
        </div>
      </Card>

      {products.length > 0 && (
        <Card title="À découvrir aussi" description="Produits proposés en bas de la fiche. Sans choix, ceux de la même catégorie s'affichent.">
          <div className="flex flex-wrap gap-2">
            {products.map((o) => {
              const on = p.relatedIds.includes(o.id);
              return (
                <button key={o.id} type="button" onClick={() => set("relatedIds", on ? p.relatedIds.filter((x) => x !== o.id) : [...p.relatedIds, o.id])} className={clsx("rounded-full border px-3 py-1.5 text-[13px]", on ? "border-noir bg-noir text-creme" : "border-encre/15 text-encre")}>
                  {o.name}
                </button>
              );
            })}
          </div>
        </Card>
      )}

      <Card title="Référencement Google">
        <div className="grid gap-4">
          <F label="Titre" hint={`${(p.seo_title || p.name).length} / 60 caractères conseillés`}>
            <input value={p.seo_title} onChange={(e) => set("seo_title", e.target.value)} placeholder={`${p.name} · ${p.subtitle}`} className="field" />
          </F>
          <F label="Description" hint={`${p.seo_description.length} / 160 caractères conseillés`}>
            <textarea value={p.seo_description} onChange={(e) => set("seo_description", e.target.value)} rows={2} className="field resize-y" />
          </F>
          <div className="rounded-xl bg-lin-clair p-4">
            <p className="text-[13px] text-emerald-800">isseye.com › parfum › {p.slug}</p>
            <p className="mt-1 text-lg text-[#1a0dab]">{(p.seo_title || `${p.name} · ${p.subtitle}`).slice(0, 65)} · ISSEYE</p>
            <p className="mt-1 text-[13px] text-gris">{(p.seo_description || p.description).slice(0, 160)}</p>
          </div>
        </div>
      </Card>

      {/* Barre d'enregistrement */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-encre/10 bg-white/95 backdrop-blur lg:left-64">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3 sm:px-8">
          <select value={p.status} onChange={(e) => set("status", e.target.value as ProductPayload["status"])} className="field !w-auto !py-2.5">
            <option value="draft">Brouillon</option>
            <option value="active">En ligne</option>
            <option value="archived">Archivé</option>
          </select>
          <button type="button" onClick={save} disabled={pending} className="btn-primary !px-6 !py-2.5">
            {pending && <Loader2 className="size-4 animate-spin" />} Enregistrer
          </button>
          {dirty && !pending && <span className="text-[13px] text-bronze">Modifications non enregistrées</span>}
          <Feedback state={state} />
          <span className="ml-auto flex gap-4">
            <button type="button" onClick={() => start(() => duplicateProduct(id))} className="inline-flex items-center gap-1.5 text-sm text-gris hover:text-encre">
              <Copy className="size-4" /> Dupliquer
            </button>
            <button
              type="button"
              onClick={() => confirm(`Mettre ${p.name} à la corbeille ?`) && start(async () => setState(await trashProduct(id)))}
              className="inline-flex items-center gap-1.5 text-sm text-gris hover:text-red-700"
            >
              <Trash2 className="size-4" /> Corbeille
            </button>
          </span>
        </div>
      </div>
    </div>
  );
}

function F({ label, hint, className, children }: { label: string; hint?: string; className?: string; children: ReactNode }) {
  return (
    <label className={clsx("block", className)}>
      <span className="label">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[12px] text-gris">{hint}</span>}
    </label>
  );
}

function IconBtn({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} className="grid size-7 place-items-center rounded-full bg-white/90 text-encre shadow hover:bg-white">
      {children}
    </button>
  );
}

function TagInput({ label, hint, values, onChange }: { label: string; hint: string; values: string[]; onChange: (values: string[]) => void }) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const v = draft.trim();
    if (v && !values.some((x) => x.toLowerCase() === v.toLowerCase())) onChange([...values, v]);
    setDraft("");
  };
  return (
    <div>
      <span className="label">{label}</span>
      <div className="flex min-h-12 flex-wrap items-center gap-1.5 rounded-xl border border-encre/12 bg-white p-2">
        {values.map((v) => (
          <span key={v} className="inline-flex items-center gap-1 rounded-full bg-or/15 py-1 pr-1.5 pl-3 text-[13px] text-bronze">
            {v}
            <button type="button" onClick={() => onChange(values.filter((x) => x !== v))} aria-label={`Retirer ${v}`} className="grid size-4 place-items-center rounded-full hover:bg-or/30">
              <X className="size-3" />
            </button>
          </span>
        ))}
        <input
          list="notes-library"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              add();
            }
          }}
          onBlur={add}
          placeholder="Ajouter…"
          className="min-w-24 flex-1 bg-transparent px-1 py-1 text-sm outline-none"
        />
      </div>
      <span className="mt-1 block text-[12px] text-gris">{hint}</span>
    </div>
  );
}

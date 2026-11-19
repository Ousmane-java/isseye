"use client";

import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import clsx from "clsx";
import type { BlockField } from "@/lib/blocks";
import { MediaField } from "./MediaPicker";

export const sitePaths = ["/", "/boutique", "/boutique?pour=elle", "/boutique?pour=lui", "/maison", "/faq", "/contact", "/suivi", "/livraison-retours", "/cgv"];

/** Formulaire généré à partir de la description des champs d'un bloc (lib/blocks.ts). */
export function BlockFields({ fields, value, onChange, products }: { fields: BlockField[]; value: Record<string, unknown>; onChange: (v: Record<string, unknown>) => void; products: { id: string; name: string }[] }) {
  const set = (key: string, v: unknown) => onChange({ ...value, [key]: v });
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {fields.map((f) => {
        const v = value[f.key];
        const str = typeof v === "string" ? v : "";
        const wide = ["textarea", "markdown", "lines", "image", "products", "items"].includes(f.type);
        return (
          <div key={f.key} className={clsx(wide && "sm:col-span-2")}>
            <span className="label">{f.label}</span>
            {f.type === "text" && <input value={str} onChange={(e) => set(f.key, e.target.value)} className="field" />}
            {f.type === "link" && (
              <>
                <input value={str} onChange={(e) => set(f.key, e.target.value)} list="site-paths" placeholder="/boutique ou https://…" className="field" />
                <datalist id="site-paths">{sitePaths.map((p) => <option key={p} value={p} />)}</datalist>
              </>
            )}
            {(f.type === "textarea" || f.type === "markdown") && <textarea value={str} onChange={(e) => set(f.key, e.target.value)} rows={f.type === "markdown" ? 6 : 3} className="field resize-y" />}
            {f.type === "markdown" && <span className="mt-1 block text-[12px] text-gris">**gras**, *italique*, listes avec « - », titres avec « ## », liens [texte](/adresse)</span>}
            {f.type === "lines" && (
              <textarea value={Array.isArray(v) ? (v as string[]).join("\n") : ""} onChange={(e) => set(f.key, e.target.value.split("\n"))} onBlur={(e) => set(f.key, e.target.value.split("\n").map((l) => l.trim()).filter(Boolean))} rows={4} className="field resize-y" />
            )}
            {f.type === "select" && (
              <select value={str} onChange={(e) => set(f.key, e.target.value)} className="field">
                {f.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            )}
            {f.type === "image" && <MediaField value={str} onChange={(url) => set(f.key, url)} folder="pages" />}
            {f.type === "products" && (
              <div className="flex flex-wrap gap-2">
                {products.map((p) => {
                  const ids = Array.isArray(v) ? (v as string[]) : [];
                  const on = ids.includes(p.id);
                  return (
                    <button key={p.id} type="button" onClick={() => set(f.key, on ? ids.filter((x) => x !== p.id) : [...ids, p.id])} className={clsx("rounded-full border px-3 py-1.5 text-[13px]", on ? "border-noir bg-noir text-creme" : "border-encre/15")}>
                      {p.name}
                    </button>
                  );
                })}
              </div>
            )}
            {f.type === "items" && f.itemFields && <ItemsField fields={f.itemFields} value={Array.isArray(v) ? (v as Record<string, unknown>[]) : []} onChange={(list) => set(f.key, list)} products={products} />}
            {f.help && <span className="mt-1 block text-[12px] text-gris">{f.help}</span>}
          </div>
        );
      })}
    </div>
  );
}

function ItemsField({ fields, value, onChange, products }: { fields: BlockField[]; value: Record<string, unknown>[]; onChange: (v: Record<string, unknown>[]) => void; products: { id: string; name: string }[] }) {
  const move = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= value.length) return;
    const list = [...value];
    [list[i], list[j]] = [list[j], list[i]];
    onChange(list);
  };
  return (
    <div className="space-y-3">
      {value.map((item, i) => (
        <div key={i} className="rounded-xl border border-encre/10 p-4">
          <div className="mb-3 flex items-center gap-2 text-[12px] font-semibold text-gris uppercase">
            Élément {i + 1}
            <span className="ml-auto flex gap-1">
              <button type="button" onClick={() => move(i, -1)} className="grid size-7 place-items-center rounded hover:bg-lin-clair" aria-label="Monter"><ArrowUp className="size-3.5" /></button>
              <button type="button" onClick={() => move(i, 1)} className="grid size-7 place-items-center rounded hover:bg-lin-clair" aria-label="Descendre"><ArrowDown className="size-3.5" /></button>
              <button type="button" onClick={() => onChange(value.filter((_, j) => j !== i))} className="grid size-7 place-items-center rounded text-gris hover:bg-red-50 hover:text-red-700" aria-label="Supprimer"><Trash2 className="size-3.5" /></button>
            </span>
          </div>
          <BlockFields fields={fields} value={item} onChange={(next) => onChange(value.map((x, j) => (j === i ? next : x)))} products={products} />
        </div>
      ))}
      <button type="button" onClick={() => onChange([...value, Object.fromEntries(fields.map((f) => [f.key, f.type === "select" ? (f.options?.[0]?.value ?? "") : ""]))])} className="inline-flex items-center gap-1.5 text-sm text-bronze">
        <Plus className="size-4" /> Ajouter un élément
      </button>
    </div>
  );
}

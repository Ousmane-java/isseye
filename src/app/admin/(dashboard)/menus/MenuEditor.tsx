"use client";

import { useState, useTransition } from "react";
import { ArrowDown, ArrowUp, Loader2, Plus, Trash2 } from "lucide-react";
import type { MenuItem } from "@/lib/menus";
import type { ActionState } from "@/lib/admin-types";
import { Feedback } from "@/components/admin/forms";
import { sitePaths } from "@/components/admin/BlockFields";
import { saveMenu } from "./actions";

const blank = (): MenuItem => ({ id: `m${Math.random().toString(36).slice(2, 9)}`, label: "", href: "/" });

function Rows({ items, onChange, nested }: { items: MenuItem[]; onChange: (items: MenuItem[]) => void; nested?: boolean }) {
  const move = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <div key={item.id} className={nested ? "" : "rounded-xl border border-encre/10 p-3"}>
          <div className="flex flex-wrap items-center gap-2">
            <input value={item.label} onChange={(e) => onChange(items.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} placeholder="Libellé" className="field !w-48 !py-2" />
            <input value={item.href} list="menu-paths" onChange={(e) => onChange(items.map((x, j) => (j === i ? { ...x, href: e.target.value } : x)))} placeholder="/adresse" className="field min-w-40 flex-1 !py-2" />
            <button type="button" onClick={() => move(i, -1)} className="grid size-8 place-items-center rounded text-gris hover:bg-lin-clair" aria-label="Monter"><ArrowUp className="size-4" /></button>
            <button type="button" onClick={() => move(i, 1)} className="grid size-8 place-items-center rounded text-gris hover:bg-lin-clair" aria-label="Descendre"><ArrowDown className="size-4" /></button>
            <button type="button" onClick={() => onChange(items.filter((_, j) => j !== i))} className="grid size-8 place-items-center rounded text-gris hover:text-red-700" aria-label="Supprimer"><Trash2 className="size-4" /></button>
          </div>
          {!nested && item.children && (
            <div className="mt-3 border-l-2 border-or/30 pl-4">
              <Rows nested items={item.children} onChange={(children) => onChange(items.map((x, j) => (j === i ? { ...x, children } : x)))} />
            </div>
          )}
        </div>
      ))}
      <button type="button" onClick={() => onChange([...items, nested ? blank() : { ...blank(), ...(items.some((x) => x.children) ? { children: [] } : {}) }])} className="inline-flex items-center gap-1.5 text-sm text-bronze">
        <Plus className="size-4" /> {nested ? "Ajouter un lien" : "Ajouter"}
      </button>
    </div>
  );
}

export function MenuEditor({ slug, initial }: { slug: "header" | "footer"; initial: MenuItem[] }) {
  const [items, setItems] = useState(initial);
  const [state, setState] = useState<ActionState>();
  const [pending, start] = useTransition();
  return (
    <div className="space-y-4">
      <datalist id="menu-paths">{sitePaths.map((p) => <option key={p} value={p} />)}</datalist>
      <Rows items={items} onChange={setItems} />
      <div className="flex items-center gap-3 border-t border-encre/5 pt-4">
        <button type="button" disabled={pending} onClick={() => start(async () => setState(await saveMenu(slug, items)))} className="btn-primary !px-5 !py-2.5">
          {pending && <Loader2 className="size-4 animate-spin" />} Enregistrer
        </button>
        <Feedback state={state} />
      </div>
    </div>
  );
}

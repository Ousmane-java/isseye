"use client";

import { useState, useTransition } from "react";
import { Check, Loader2, X } from "lucide-react";
import type { ActionState } from "@/lib/admin-types";

/** Pastille modifiable : clic pour renommer, croix pour supprimer. */
export function InlineRename({ value, onRename, onDelete }: { value: string; onRename: (v: string) => Promise<ActionState>; onDelete: () => Promise<ActionState> }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<ActionState>) =>
    start(async () => {
      const r = await fn();
      setError(r?.error);
      if (!r?.error) setEditing(false);
    });
  return (
    <span className="inline-flex flex-col">
      {editing ? (
        <span className="inline-flex items-center gap-1 rounded-full border border-or bg-white py-0.5 pr-1 pl-3">
          <input autoFocus value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === "Enter" && run(() => onRename(draft))} className="w-28 bg-transparent text-[13px] outline-none" />
          <button type="button" onClick={() => run(() => onRename(draft))} className="grid size-6 place-items-center text-bronze" aria-label="Valider">
            {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
          </button>
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 rounded-full bg-lin-clair py-1 pr-1.5 pl-3 text-[13px] text-encre">
          <button type="button" onClick={() => setEditing(true)} className="hover:text-bronze">
            {value}
          </button>
          <button type="button" onClick={() => confirm(`Supprimer « ${value} » ?`) && run(onDelete)} className="grid size-5 place-items-center rounded-full text-gris hover:bg-red-50 hover:text-red-700" aria-label={`Supprimer ${value}`}>
            <X className="size-3" />
          </button>
        </span>
      )}
      {error && <span className="mt-1 text-[12px] text-red-700">{error}</span>}
    </span>
  );
}

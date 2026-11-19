"use client";

import { useState, useTransition } from "react";
import { ArrowDown, ArrowUp, ChevronDown, Copy, Eye, EyeOff, Loader2, Plus, Trash2 } from "lucide-react";
import clsx from "clsx";
import { blockDef, blockDefs, newSection, type Section } from "@/lib/blocks";
import { markdownToHtml } from "@/lib/markdown";
import type { ActionState } from "@/lib/admin-types";
import { Card } from "@/components/admin/ui";
import { Feedback } from "@/components/admin/forms";
import { BlockFields } from "@/components/admin/BlockFields";
import { MediaField } from "@/components/admin/MediaPicker";
import { getVersion, savePage } from "../actions";

type Meta = { title: string; slug: string; seo_title: string; seo_description: string; og_image_url: string };

export function PageEditor({
  id,
  kind,
  system,
  initialSections,
  initialBody,
  defaultBody,
  meta: initialMeta,
  products,
  versions,
  hasDraft,
}: {
  id: string;
  kind: "sections" | "legal";
  system: boolean;
  initialSections: Section[];
  initialBody: string;
  defaultBody: string;
  meta: Meta;
  products: { id: string; name: string }[];
  versions: { id: string; created_at: string; created_by: string | null }[];
  hasDraft: boolean;
}) {
  const [sections, setSections] = useState(initialSections);
  const [body, setBody] = useState(initialBody);
  const [meta, setMeta] = useState(initialMeta);
  const [open, setOpen] = useState<string | null>(null);
  const [adding, setAdding] = useState("");
  const [state, setState] = useState<ActionState>();
  const [pending, start] = useTransition();
  const [preview, setPreview] = useState(false);

  const update = (i: number, patch: Partial<Section>) => setSections((list) => list.map((s, j) => (j === i ? { ...s, ...patch } : s)));
  const move = (i: number, d: -1 | 1) =>
    setSections((list) => {
      const j = i + d;
      if (j < 0 || j >= list.length) return list;
      const next = [...list];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  const save = (publish: boolean) =>
    start(async () => {
      setState(undefined);
      setState(await savePage(id, { ...meta, sections, body }, publish));
    });

  return (
    <div className="space-y-6 pb-28">
      {hasDraft && <p className="rounded-xl bg-or/10 px-4 py-3 text-sm text-bronze">Vous voyez le brouillon : il n&apos;est pas encore publié sur le site.</p>}

      {kind === "sections" ? (
        <>
          <div className="space-y-3">
            {sections.map((s, i) => {
              const def = blockDef(s.type);
              const isOpen = open === s.id;
              return (
                <div key={s.id} className={clsx("rounded-2xl bg-white ring-1 ring-encre/5", !s.visible && "opacity-60")}>
                  <div className="flex items-center gap-2 px-4 py-3 sm:px-5">
                    <button type="button" onClick={() => setOpen(isOpen ? null : s.id)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                      <span className="grid size-7 shrink-0 place-items-center rounded-full bg-lin-clair text-[12px] font-semibold">{i + 1}</span>
                      <span className="min-w-0">
                        <span className="block font-medium text-encre">{def?.name ?? s.type}</span>
                        <span className="block truncate text-[12px] text-gris">{String(s.props.title ?? s.props.eyebrow ?? (Array.isArray(s.props.titleLines) ? (s.props.titleLines as string[]).join(" ") : "") ?? "")}</span>
                      </span>
                      <ChevronDown className={clsx("ml-auto size-4 shrink-0 text-gris transition", isOpen && "rotate-180")} />
                    </button>
                    <span className="flex shrink-0 gap-0.5">
                      <Icon label="Monter" onClick={() => move(i, -1)}><ArrowUp className="size-4" /></Icon>
                      <Icon label="Descendre" onClick={() => move(i, 1)}><ArrowDown className="size-4" /></Icon>
                      <Icon label={s.visible ? "Masquer" : "Afficher"} onClick={() => update(i, { visible: !s.visible })}>{s.visible ? <Eye className="size-4" /> : <EyeOff className="size-4" />}</Icon>
                      <Icon label="Dupliquer" onClick={() => setSections((list) => [...list.slice(0, i + 1), newSection(s.type, s.props), ...list.slice(i + 1)])}><Copy className="size-4" /></Icon>
                      <Icon label="Supprimer" danger onClick={() => confirm("Supprimer ce bloc ?") && setSections((list) => list.filter((_, j) => j !== i))}><Trash2 className="size-4" /></Icon>
                    </span>
                  </div>
                  {isOpen && def && (
                    <div className="border-t border-encre/5 p-4 sm:p-5">
                      <p className="mb-4 text-[13px] text-gris">{def.description}</p>
                      <BlockFields fields={def.fields} value={s.props} onChange={(props) => update(i, { props })} products={products} />
                    </div>
                  )}
                </div>
              );
            })}
            {sections.length === 0 && <p className="rounded-2xl border border-dashed border-encre/15 py-10 text-center text-sm text-gris">Page vide : ajoutez un premier bloc.</p>}
          </div>
          <Card>
            <div className="flex flex-wrap items-end gap-3">
              <label className="block flex-1">
                <span className="label">Ajouter un bloc</span>
                <select value={adding} onChange={(e) => setAdding(e.target.value)} className="field">
                  <option value="">Choisir…</option>
                  {blockDefs.map((b) => <option key={b.type} value={b.type}>{b.name} — {b.description}</option>)}
                </select>
              </label>
              <button type="button" disabled={!adding} onClick={() => { const s = newSection(adding); setSections((l) => [...l, s]); setOpen(s.id); setAdding(""); }} className="btn-outline !px-5 !py-3 text-encre">
                <Plus className="size-4" /> Ajouter
              </button>
            </div>
          </Card>
        </>
      ) : (
        <Card title="Texte de la page" description="Titres avec « ## », listes avec « - », **gras**, liens [texte](/adresse)." actions={<button type="button" onClick={() => setPreview((p) => !p)} className="text-sm text-bronze">{preview ? "Modifier" : "Aperçu"}</button>}>
          {preview ? (
            <div className="prose-isseye" dangerouslySetInnerHTML={{ __html: markdownToHtml(body || defaultBody) }} />
          ) : (
            <>
              <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={24} className="field resize-y font-mono text-[13px]" placeholder="Laissez vide pour utiliser le texte de départ, rempli avec l'identité légale de Réglages." />
              {defaultBody && (
                <button type="button" onClick={() => setBody(defaultBody)} className="mt-3 text-sm text-bronze">
                  Partir du texte de départ (rempli avec vos Réglages)
                </button>
              )}
            </>
          )}
        </Card>
      )}

      <Card title="Page & référencement">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block"><span className="label">Titre</span><input value={meta.title} onChange={(e) => setMeta({ ...meta, title: e.target.value })} className="field" /></label>
          <label className="block"><span className="label">Adresse</span><input value={meta.slug} disabled={system} onChange={(e) => setMeta({ ...meta, slug: e.target.value })} className="field" /></label>
          <label className="block"><span className="label">Titre Google</span><input value={meta.seo_title} onChange={(e) => setMeta({ ...meta, seo_title: e.target.value })} className="field" /></label>
          <label className="block"><span className="label">Description Google</span><input value={meta.seo_description} onChange={(e) => setMeta({ ...meta, seo_description: e.target.value })} className="field" /></label>
          <div className="sm:col-span-2"><span className="label">Image de partage (réseaux sociaux)</span><MediaField value={meta.og_image_url} onChange={(url) => setMeta({ ...meta, og_image_url: url })} folder="pages" /></div>
        </div>
      </Card>

      {versions.length > 0 && (
        <Card title="Versions publiées" description="Restaurer charge la version dans l'éditeur ; publiez ensuite pour l'appliquer.">
          <ul className="divide-y divide-encre/5 text-sm">
            {versions.map((v) => (
              <li key={v.id} className="flex items-center gap-4 py-2.5">
                <span>{new Date(v.created_at).toLocaleString("fr-FR")}</span>
                <span className="text-gris">{v.created_by}</span>
                <button type="button" className="ml-auto text-bronze" onClick={() => start(async () => { const data = await getVersion(v.id); if (data) { if (data.sections) setSections(data.sections); setBody(data.body ?? ""); setState({ ok: "Version chargée : publiez pour l'appliquer." }); } })}>
                  Restaurer
                </button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-encre/10 bg-white/95 backdrop-blur lg:left-64">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3 sm:px-8">
          <button type="button" onClick={() => save(true)} disabled={pending} className="btn-primary !px-6 !py-2.5">
            {pending && <Loader2 className="size-4 animate-spin" />} Publier
          </button>
          {kind === "sections" && (
            <button type="button" onClick={() => save(false)} disabled={pending} className="btn-outline !px-5 !py-2.5 text-encre">
              Enregistrer le brouillon
            </button>
          )}
          <Feedback state={state} />
        </div>
      </div>
    </div>
  );
}

function Icon({ label, onClick, danger, children }: { label: string; onClick: () => void; danger?: boolean; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} title={label} className={clsx("grid size-8 place-items-center rounded-lg text-gris transition hover:bg-lin-clair", danger ? "hover:text-red-700" : "hover:text-encre")}>
      {children}
    </button>
  );
}

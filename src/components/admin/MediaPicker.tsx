"use client";

// Vignettes de l'admin : fichiers de la médiathèque affichés tels quels (pas d'optimisation nécessaire).
/* eslint-disable @next/next/no-img-element */

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ImagePlus, Loader2, Search, Upload, X } from "lucide-react";
import clsx from "clsx";
import { listMedia } from "@/app/admin/(dashboard)/medias/actions";
import type { MediaItem } from "@/lib/admin-types";
import { useUpload } from "./useUpload";

/** Fenêtre de choix dans la médiathèque, avec envoi de nouveaux fichiers. */
export function MediaLibraryModal({ open, onClose, onPick, multiple, folder, kind = "" }: { open: boolean; onClose: () => void; onPick: (items: MediaItem[]) => void; multiple?: boolean; folder?: string; kind?: "image" | "video" | "" }) {
  const [items, setItems] = useState<MediaItem[] | null>(null);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const { upload, uploading, error } = useUpload(folder);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const timer = setTimeout(() => listMedia(search, kind).then((list) => !cancelled && setItems(list)), 200);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [open, search, kind]);

  if (!open) return null;
  const choose = (list: MediaItem[]) => {
    onPick(list);
    setSelected([]);
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] grid place-items-center bg-noir/50 p-3 backdrop-blur-sm sm:p-8" onClick={onClose}>
      <div className="flex max-h-full w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Médiathèque">
        <div className="flex flex-wrap items-center gap-3 border-b border-encre/8 p-4">
          <p className="mr-auto font-display text-2xl text-encre">Médiathèque</p>
          <label className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-gris" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher" className="field !w-52 !py-2 pl-9" />
          </label>
          <input ref={input} type="file" multiple accept={kind === "video" ? "video/*" : kind === "image" ? "image/*" : "image/*,video/*"} className="hidden" onChange={async (e) => {
            if (!e.target.files?.length) return;
            const added = await upload(e.target.files);
            e.target.value = "";
            setItems((list) => [...added, ...(list ?? [])]);
            setSelected((s) => (multiple ? [...s, ...added.map((a) => a.id)] : added.slice(0, 1).map((a) => a.id)));
          }} />
          <button type="button" onClick={() => input.current?.click()} disabled={uploading} className="btn-primary !px-4 !py-2">
            {uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />} Envoyer
          </button>
          <button type="button" onClick={onClose} className="grid size-9 place-items-center text-gris hover:text-encre" aria-label="Fermer">
            <X className="size-5" />
          </button>
        </div>
        {error && <p className="bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>}
        <div className="flex-1 overflow-y-auto p-4">
          {!items ? (
            <div className="grid h-40 place-items-center"><Loader2 className="size-6 animate-spin text-or" /></div>
          ) : items.length === 0 ? (
            <p className="py-16 text-center text-sm text-gris">Aucun fichier. Cliquez sur « Envoyer » pour ajouter des photos ou vidéos.</p>
          ) : (
            <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
              {items.map((m) => {
                const on = selected.includes(m.id);
                return (
                  <li key={m.id}>
                    <button
                      type="button"
                      onClick={() => (multiple ? setSelected((s) => (on ? s.filter((x) => x !== m.id) : [...s, m.id])) : choose([m]))}
                      className={clsx("relative block aspect-square w-full overflow-hidden rounded-lg bg-lin-clair ring-2 transition", on ? "ring-or" : "ring-transparent hover:ring-encre/20")}
                      title={m.alt ?? ""}
                    >
                      {m.kind === "video" ? <video src={m.url} muted className="h-full w-full object-cover" /> : <img src={m.url} alt={m.alt ?? ""} loading="lazy" className="h-full w-full object-cover" />}
                      {m.kind === "video" && <span className="absolute bottom-1 left-1 rounded bg-noir/70 px-1.5 text-[10px] text-creme">Vidéo</span>}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        {multiple && (
          <div className="flex items-center justify-end gap-3 border-t border-encre/8 p-4">
            <span className="text-sm text-gris">{selected.length} sélectionné{selected.length > 1 ? "s" : ""}</span>
            <button type="button" disabled={!selected.length} onClick={() => choose((items ?? []).filter((m) => selected.includes(m.id)))} className="btn-primary !px-5 !py-2.5">
              Ajouter
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

/** Champ « image » : aperçu, choix dans la médiathèque, saisie d'une adresse. Valeur envoyée via `name`. */
export function MediaField({ name, value, onChange, folder, kind = "image" }: { name?: string; value: string; onChange: (url: string) => void; folder?: string; kind?: "image" | "video" | "" }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex items-start gap-3">
      {name && <input type="hidden" name={name} value={value} />}
      <button type="button" onClick={() => setOpen(true)} className="relative grid size-20 shrink-0 place-items-center overflow-hidden rounded-xl bg-lin-clair ring-1 ring-encre/10 hover:ring-or">
                {value ? <img src={value} alt="" className="h-full w-full object-cover" /> : <ImagePlus className="size-5 text-gris" />}
      </button>
      <div className="min-w-0 flex-1 space-y-2">
        <input value={value} onChange={(e) => onChange(e.target.value)} placeholder="Adresse de l'image ou choisir dans la médiathèque" className="field !py-2 text-sm" />
        <div className="flex gap-3 text-sm">
          <button type="button" onClick={() => setOpen(true)} className="text-bronze hover:underline">Choisir…</button>
          {value && <button type="button" onClick={() => onChange("")} className="text-gris hover:text-red-700">Retirer</button>}
        </div>
      </div>
      <MediaLibraryModal open={open} onClose={() => setOpen(false)} onPick={(items) => items[0] && onChange(items[0].url)} folder={folder} kind={kind} />
    </div>
  );
}

/** Variante non contrôlée de MediaField, pour les formulaires classiques. */
export function MediaInput({ name, defaultValue = "", folder, kind }: { name: string; defaultValue?: string; folder?: string; kind?: "image" | "video" | "" }) {
  const [value, setValue] = useState(defaultValue);
  return <MediaField name={name} value={value} onChange={setValue} folder={folder} kind={kind} />;
}

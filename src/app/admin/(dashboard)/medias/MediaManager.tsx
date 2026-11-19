"use client";

// Vignettes de l'admin : fichiers de la médiathèque affichés tels quels (pas d'optimisation nécessaire).
/* eslint-disable @next/next/no-img-element */

import { useRef, useState, useTransition } from "react";
import { Copy, Loader2, Trash2, Upload } from "lucide-react";
import clsx from "clsx";
import type { MediaItem } from "@/lib/admin-types";
import { useUpload } from "@/components/admin/useUpload";
import { deleteMedia, updateMediaAlt } from "./actions";

export function MediaManager({ initial }: { initial: MediaItem[] }) {
  const [items, setItems] = useState(initial);
  const [drag, setDrag] = useState(false);
  const [selected, setSelected] = useState<MediaItem | null>(null);
  const { upload, uploading, error } = useUpload("general");
  const input = useRef<HTMLInputElement>(null);

  const add = async (files: FileList | File[]) => {
    const added = await upload(files);
    setItems((list) => [...added, ...list]);
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDrag(true);
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(false);
        if (e.dataTransfer.files.length) add(e.dataTransfer.files);
      }}
      className={clsx("rounded-2xl bg-white p-5 ring-1 transition sm:p-7", drag ? "ring-2 ring-or" : "ring-encre/5")}
    >
      <div className="flex flex-wrap items-center gap-3">
        <input ref={input} type="file" multiple accept="image/*,video/*" className="hidden" onChange={(e) => e.target.files && add(e.target.files).then(() => (e.target.value = ""))} />
        <button onClick={() => input.current?.click()} disabled={uploading} className="btn-primary !px-5 !py-2.5">
          {uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />} Envoyer des fichiers
        </button>
        <span className="text-sm text-gris">{items.length} fichier{items.length > 1 ? "s" : ""} · photos jusqu&apos;à 50 Mo, vidéos MP4/MOV/WebM</span>
        {error && <span className="text-sm text-red-700">{error}</span>}
      </div>

      {items.length === 0 ? (
        <p className="mt-8 rounded-xl border border-dashed border-encre/15 py-16 text-center text-sm text-gris">Glissez vos photos ici.</p>
      ) : (
        <ul className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {items.map((m) => (
            <li key={m.id}>
              <button onClick={() => setSelected(m)} className={clsx("block aspect-square w-full overflow-hidden rounded-xl bg-lin-clair ring-2", selected?.id === m.id ? "ring-or" : "ring-transparent hover:ring-encre/15")}>
                {m.kind === "video" ? <video src={m.url} muted className="h-full w-full object-cover" /> : <img src={m.url} alt={m.alt ?? ""} loading="lazy" className="h-full w-full object-cover" />}
              </button>
              <p className="mt-1.5 truncate text-[12px] text-gris">{m.alt || "Sans description"}</p>
            </li>
          ))}
        </ul>
      )}

      {selected && <MediaDetails key={selected.id} media={selected} onDeleted={() => { setItems((l) => l.filter((x) => x.id !== selected.id)); setSelected(null); }} onSaved={(alt) => setItems((l) => l.map((x) => (x.id === selected.id ? { ...x, alt } : x)))} />}
    </div>
  );
}

function MediaDetails({ media, onDeleted, onSaved }: { media: MediaItem; onDeleted: () => void; onSaved: (alt: string) => void }) {
  const [alt, setAlt] = useState(media.alt ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="mt-8 grid gap-6 rounded-xl bg-lin-clair p-5 sm:grid-cols-[200px_1fr]">
            {media.kind === "video" ? <video src={media.url} controls className="w-full rounded-lg" /> : <img src={media.url} alt="" className="w-full rounded-lg" />}
      <div className="space-y-3">
        <label className="block">
          <span className="label">Description (lue par Google et les lecteurs d&apos;écran)</span>
          <input value={alt} onChange={(e) => setAlt(e.target.value)} className="field" />
        </label>
        <p className="text-[13px] text-gris">
          {media.width && media.height ? `${media.width} × ${media.height} px · ` : ""}
          {new Date(media.created_at).toLocaleDateString("fr-FR")}
        </p>
        <div className="flex flex-wrap items-center gap-4">
          <button disabled={pending} onClick={() => start(async () => { await updateMediaAlt(media.id, alt); onSaved(alt); setMessage("Enregistré."); })} className="btn-primary !px-5 !py-2.5">
            Enregistrer
          </button>
          <button onClick={() => navigator.clipboard.writeText(media.url).then(() => setMessage("Adresse copiée."))} className="inline-flex items-center gap-1.5 text-sm text-encre hover:text-bronze">
            <Copy className="size-4" /> Copier l&apos;adresse
          </button>
          <button
            disabled={pending}
            onClick={() => confirm("Supprimer définitivement ce fichier ?") && start(async () => { const r = await deleteMedia(media.id); if (r?.error) setMessage(r.error); else onDeleted(); })}
            className="ml-auto inline-flex items-center gap-1.5 text-sm text-gris hover:text-red-700"
          >
            <Trash2 className="size-4" /> Supprimer
          </button>
        </div>
        {message && <p className="text-sm text-emerald-700">{message}</p>}
      </div>
    </div>
  );
}

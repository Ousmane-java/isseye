"use client";

import { useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { createUploadUrl, registerMedia } from "@/app/admin/(dashboard)/medias/actions";
import type { MediaItem } from "@/lib/admin-types";

const MAX = 50 * 1024 * 1024;

function imageSize(file: File) {
  return new Promise<{ width: number; height: number } | null>((resolve) => {
    if (!file.type.startsWith("image/") || file.type === "image/svg+xml") return resolve(null);
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(img.src);
    };
    img.onerror = () => resolve(null);
    img.src = URL.createObjectURL(file);
  });
}

/** Envoi de fichiers vers la médiathèque (directement du navigateur vers Supabase Storage). */
export function useUpload(folder = "general") {
  const [uploading, setUploading] = useState(0);
  const [error, setError] = useState<string | null>(null);

  async function upload(files: FileList | File[]): Promise<MediaItem[]> {
    setError(null);
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anon) {
      setError("Supabase n'est pas configuré.");
      return [];
    }
    const storage = createClient(url, anon, { auth: { persistSession: false } }).storage.from("media");
    const done: MediaItem[] = [];
    const list = [...files];
    setUploading(list.length);
    for (const file of list) {
      try {
        if (file.size > MAX) throw new Error(`${file.name} : 50 Mo maximum.`);
        const target = await createUploadUrl(file.name, file.type, folder);
        const { error: upErr } = await storage.uploadToSignedUrl(target.path, target.token, file, { contentType: file.type });
        if (upErr) throw new Error(`${file.name} : envoi interrompu.`);
        const size = await imageSize(file);
        done.push(
          await registerMedia({
            url: target.publicUrl,
            path: target.path,
            kind: file.type.startsWith("video/") ? "video" : "image",
            width: size?.width,
            height: size?.height,
            size: file.size,
            alt: file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " "),
            folder,
          }),
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "Envoi impossible.");
      }
      setUploading((n) => n - 1);
    }
    return done;
  }

  return { upload, uploading: uploading > 0, error };
}

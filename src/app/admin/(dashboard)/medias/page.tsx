import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin-auth";
import { PageHeader } from "@/components/admin/ui";
import { MediaManager } from "./MediaManager";
import { listMedia } from "./actions";

export const metadata: Metadata = { title: "Médiathèque" };

export default async function MediaPage() {
  await requireAdmin("media");
  const items = await listMedia();
  return (
    <div className="space-y-8">
      <PageHeader title="Médiathèque" description="Toutes les photos et vidéos du site. Glissez des fichiers ici ou cliquez sur « Envoyer » ; ils sont ensuite disponibles partout (produits, pages, annonces)." />
      <MediaManager initial={items} />
    </div>
  );
}

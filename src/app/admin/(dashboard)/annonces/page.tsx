import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin-auth";
import { adminDb } from "@/lib/supabase";
import { Badge, Card, PageHeader } from "@/components/admin/ui";
import { ActionForm, ConfirmButton } from "@/components/admin/forms";
import { MediaInput } from "@/components/admin/MediaPicker";
import { deleteAnnouncement, saveAnnouncement } from "./actions";

export const metadata: Metadata = { title: "Annonces & pop-ups" };
type A = { id: string; kind: "bar" | "popup"; name: string; tone: string; content: Record<string, string | boolean>; targeting: { delay_s?: number; once_per_days?: number }; priority: number; starts_at: string | null; ends_at: string | null; active: boolean };
const local = (iso: string | null) => (iso ? new Date(new Date(iso).getTime() - new Date(iso).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "");
const s = (v: unknown) => (typeof v === "string" ? v : "");

function Fields({ a }: { a?: A }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="block"><span className="label">Type</span><select name="kind" defaultValue={a?.kind ?? "bar"} className="field"><option value="bar">Bandeau en haut du site</option><option value="popup">Pop-up</option></select></label>
      <label className="block"><span className="label">Nom interne</span><input name="name" defaultValue={a?.name} className="field" /></label>
      <label className="block sm:col-span-2"><span className="label">Texte</span><input name="text" defaultValue={s(a?.content.text)} className="field" placeholder="Livraison offerte dès 60 €" /></label>
      <label className="block"><span className="label">Titre (pop-up)</span><input name="title" defaultValue={s(a?.content.title)} className="field" /></label>
      <label className="block"><span className="label">Code promo affiché (pop-up)</span><input name="code" defaultValue={s(a?.content.code)} className="field uppercase" /></label>
      <label className="block"><span className="label">Texte du lien</span><input name="link_label" defaultValue={s(a?.content.link_label)} className="field" /></label>
      <label className="block"><span className="label">Adresse du lien</span><input name="link_href" defaultValue={s(a?.content.link_href)} className="field" placeholder="/boutique" /></label>
      <div className="sm:col-span-2"><span className="label">Photo (pop-up)</span><MediaInput name="image_url" defaultValue={s(a?.content.image_url)} folder="annonces" /></div>
      <label className="block"><span className="label">Couleur (bandeau)</span><select name="tone" defaultValue={a?.tone ?? "noir"} className="field"><option value="noir">Noir</option><option value="or">Or</option><option value="creme">Lin</option></select></label>
      <label className="block"><span className="label">Priorité</span><input name="priority" type="number" defaultValue={a?.priority ?? 0} className="field" /></label>
      <label className="block"><span className="label">Pop-up : délai d&apos;apparition (secondes)</span><input name="delay_s" type="number" defaultValue={a?.targeting.delay_s ?? 8} className="field" /></label>
      <label className="block"><span className="label">Pop-up : réafficher après (jours)</span><input name="once_per_days" type="number" defaultValue={a?.targeting.once_per_days ?? 7} className="field" /></label>
      <label className="block"><span className="label">Début</span><input type="datetime-local" name="starts_at" defaultValue={local(a?.starts_at ?? null)} className="field" /></label>
      <label className="block"><span className="label">Fin</span><input type="datetime-local" name="ends_at" defaultValue={local(a?.ends_at ?? null)} className="field" /></label>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="newsletter" defaultChecked={Boolean(a?.content.newsletter)} className="size-4 accent-noir" /> Pop-up : formulaire newsletter</label>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="active" defaultChecked={a?.active ?? true} className="size-4 accent-noir" /> Active</label>
    </div>
  );
}

export default async function AnnouncementsPage() {
  await requireAdmin("announcements");
  const { data } = await adminDb().from("announcements").select("*").order("priority", { ascending: false }).order("created_at", { ascending: false });
  const now = new Date().toISOString();
  return (
    <div className="space-y-8">
      <PageHeader title="Annonces & pop-ups" description="Un bandeau en haut du site et une pop-up au plus sont affichés à la fois (la priorité la plus haute l'emporte). Programmez-les par dates." />
      {((data ?? []) as A[]).map((a) => {
        const live = a.active && (!a.starts_at || a.starts_at <= now) && (!a.ends_at || a.ends_at >= now);
        return (
          <Card key={a.id} title={a.name} description={a.kind === "bar" ? "Bandeau" : "Pop-up"} actions={<span className="flex items-center gap-3"><Badge tone={live ? "green" : "neutral"}>{live ? "Affichée" : "Inactive"}</Badge><ConfirmButton danger confirm="Supprimer cette annonce ?" action={deleteAnnouncement.bind(null, a.id)}>Supprimer</ConfirmButton></span>}>
            <details>
              <summary className="cursor-pointer text-sm text-bronze">Modifier</summary>
              <ActionForm action={saveAnnouncement.bind(null, a.id)} className="mt-4"><Fields a={a} /></ActionForm>
            </details>
          </Card>
        );
      })}
      <Card title="Nouvelle annonce">
        <ActionForm action={saveAnnouncement.bind(null, null)} submitLabel="Créer"><Fields /></ActionForm>
      </Card>
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/admin-auth";
import { adminDb } from "@/lib/supabase";
import { Badge, Card, PageHeader } from "@/components/admin/ui";
import { ActionForm } from "@/components/admin/forms";
import { createPage } from "./actions";

export const metadata: Metadata = { title: "Pages" };
const dateFormat = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeZone: "Europe/Paris" });

export default async function PagesPage() {
  await requireAdmin("pages");
  const { data } = await adminDb().from("pages").select("id, slug, title, kind, status, system, draft_sections, updated_at").is("deleted_at", null).order("system", { ascending: false }).order("title");
  return (
    <div className="space-y-8">
      <PageHeader title="Pages" description="Composez vos pages avec des blocs animés (accueil, La Maison, pages libres) ou rédigez les pages légales. Brouillon, publication et historique des versions." />
      <Card>
        <ul className="divide-y divide-encre/5">
          {(data ?? []).map((p) => (
            <li key={p.id}>
              <Link href={`/pages/${p.id}`} className="flex flex-wrap items-center gap-3 py-3.5 hover:text-bronze">
                <span className="font-medium">{p.title}</span>
                <span className="text-[13px] text-gris">/{p.slug}</span>
                <span className="ml-auto flex items-center gap-2">
                  {p.draft_sections && <Badge tone="gold">Brouillon en cours</Badge>}
                  <Badge>{p.kind === "legal" ? "Texte" : "Blocs"}</Badge>
                  <Badge tone={p.status === "published" ? "green" : "neutral"}>{p.status === "published" ? "En ligne" : "Hors ligne"}</Badge>
                  <span className="hidden w-28 text-right text-[13px] text-gris sm:inline">{dateFormat.format(new Date(p.updated_at))}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Card>
      <Card title="Nouvelle page">
        <ActionForm action={createPage} submitLabel="Créer">
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="block"><span className="label">Titre</span><input name="title" required placeholder="Ex. Nos engagements" className="field" /></label>
            <label className="block"><span className="label">Adresse</span><input name="slug" placeholder="automatique" className="field" /></label>
            <label className="block">
              <span className="label">Type</span>
              <select name="kind" className="field">
                <option value="sections">Page composée de blocs</option>
                <option value="legal">Page de texte</option>
              </select>
            </label>
          </div>
        </ActionForm>
      </Card>
    </div>
  );
}

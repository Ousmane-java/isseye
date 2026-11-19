import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin-auth";
import { adminDb } from "@/lib/supabase";
import { Card, PageHeader } from "@/components/admin/ui";
import { ActionForm, ConfirmButton } from "@/components/admin/forms";
import { InlineRename } from "./InlineRename";
import { addFacetValue, deleteFacet, deleteFacetValue, deleteNote, renameFacetValue, renameNote, saveFacet } from "./actions";

export const metadata: Metadata = { title: "Caractéristiques" };
type Facet = { id: string; name: string; slug: string; multiple: boolean; filterable: boolean; position: number; values: { id: string; label: string; position: number }[] };

export default async function AttributesPage() {
  await requireAdmin("attributes");
  const db = adminDb();
  const [{ data: facets }, { data: notes }] = await Promise.all([
    db.from("facets").select("id, name, slug, multiple, filterable, position, values:facet_values(id, label, position)").order("position"),
    db.from("notes").select("id, name").order("name"),
  ]);
  return (
    <div className="space-y-8">
      <PageHeader title="Caractéristiques" description="Les listes qui décrivent vos parfums et servent de filtres dans la boutique (Pour, Famille olfactive, Saison…), et la bibliothèque des notes olfactives." />
      {((facets ?? []) as Facet[]).map((f) => (
        <Card key={f.id} title={f.name} description={`Filtre de l'adresse : ?${f.slug}=…`} actions={<ConfirmButton danger confirm={`Supprimer « ${f.name} » et toutes ses valeurs ?`} action={deleteFacet.bind(null, f.id)}>Supprimer</ConfirmButton>}>
          <div className="flex flex-wrap gap-2">
            {[...f.values].sort((a, b) => a.position - b.position).map((v) => (
              <InlineRename key={v.id} value={v.label} onRename={renameFacetValue.bind(null, v.id)} onDelete={deleteFacetValue.bind(null, v.id)} />
            ))}
          </div>
          <div className="mt-5 grid gap-6 border-t border-encre/5 pt-5 lg:grid-cols-2">
            <ActionForm action={addFacetValue.bind(null, f.id)} submitLabel="Ajouter" className="sm:flex sm:items-end sm:gap-3 sm:space-y-0">
              <label className="block flex-1"><span className="label">Nouvelle valeur</span><input name="label" required className="field" /></label>
            </ActionForm>
            <ActionForm action={saveFacet.bind(null, f.id)}>
              <div className="grid gap-3 sm:grid-cols-[1fr_90px]">
                <label className="block"><span className="label">Nom</span><input name="name" defaultValue={f.name} className="field" /></label>
                <label className="block"><span className="label">Ordre</span><input name="position" type="number" defaultValue={f.position} className="field" /></label>
              </div>
              <div className="flex flex-wrap gap-5 text-sm">
                <label className="flex items-center gap-2"><input type="checkbox" name="multiple" defaultChecked={f.multiple} className="size-4 accent-noir" /> Plusieurs valeurs par parfum</label>
                <label className="flex items-center gap-2"><input type="checkbox" name="filterable" defaultChecked={f.filterable} className="size-4 accent-noir" /> Proposé en filtre</label>
              </div>
            </ActionForm>
          </div>
        </Card>
      ))}
      <Card title="Nouvelle caractéristique">
        <ActionForm action={saveFacet.bind(null, null)} submitLabel="Créer">
          <label className="block"><span className="label">Nom</span><input name="name" required placeholder="Ex. Occasion" className="field" /></label>
          <div className="flex flex-wrap gap-5 text-sm">
            <label className="flex items-center gap-2"><input type="checkbox" name="multiple" defaultChecked className="size-4 accent-noir" /> Plusieurs valeurs par parfum</label>
            <label className="flex items-center gap-2"><input type="checkbox" name="filterable" defaultChecked className="size-4 accent-noir" /> Proposé en filtre</label>
          </div>
        </ActionForm>
      </Card>
      <Card title="Notes olfactives" description="Créées automatiquement depuis les fiches produits. Cliquez pour corriger l'orthographe.">
        <div className="flex flex-wrap gap-2">
          {(notes ?? []).map((n) => (
            <InlineRename key={n.id} value={n.name} onRename={renameNote.bind(null, n.id)} onDelete={deleteNote.bind(null, n.id)} />
          ))}
        </div>
      </Card>
    </div>
  );
}

import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin-auth";
import { adminDb } from "@/lib/supabase";
import { Card, PageHeader } from "@/components/admin/ui";
import { ActionForm, ConfirmButton } from "@/components/admin/forms";
import { MediaInput } from "@/components/admin/MediaPicker";
import { deleteCategory, saveCategory } from "./actions";

export const metadata: Metadata = { title: "Catégories" };
type Category = { id: string; name: string; slug: string; description: string | null; banner_url: string | null; position: number; active: boolean; seo_title: string | null; seo_description: string | null; products: { count: number }[] };

function Fields({ c }: { c?: Category }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="block">
        <span className="label">Nom</span>
        <input name="name" defaultValue={c?.name} required className="field" />
      </label>
      <label className="block">
        <span className="label">Adresse</span>
        <input name="slug" defaultValue={c?.slug} placeholder="automatique" className="field" />
      </label>
      <label className="block sm:col-span-2">
        <span className="label">Description (en haut de la page catégorie)</span>
        <textarea name="description" defaultValue={c?.description ?? ""} rows={2} className="field resize-y" />
      </label>
      <div className="sm:col-span-2">
        <span className="label">Bannière (facultative)</span>
        <MediaInput name="banner_url" defaultValue={c?.banner_url ?? ""} folder="categories" />
      </div>
      <label className="block">
        <span className="label">Titre Google</span>
        <input name="seo_title" defaultValue={c?.seo_title ?? ""} className="field" />
      </label>
      <label className="block">
        <span className="label">Ordre</span>
        <input name="position" type="number" defaultValue={c?.position ?? 0} className="field" />
      </label>
      <label className="block sm:col-span-2">
        <span className="label">Description Google</span>
        <input name="seo_description" defaultValue={c?.seo_description ?? ""} className="field" />
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="active" defaultChecked={c?.active ?? true} className="size-4 accent-noir" /> Visible sur le site
      </label>
    </div>
  );
}

export default async function CategoriesPage() {
  await requireAdmin("categories");
  const { data } = await adminDb().from("categories").select("*, products(count)").is("deleted_at", null).order("position");
  const categories = (data ?? []) as Category[];
  return (
    <div className="space-y-8">
      <PageHeader title="Catégories" description="Chaque catégorie a sa page : /boutique/adresse. Au lancement, une seule catégorie « Parfums » suffit." />
      {categories.map((c) => (
        <Card key={c.id} title={c.name} description={`/boutique/${c.slug} · ${c.products[0]?.count ?? 0} produit(s)`} actions={<ConfirmButton danger confirm={`Supprimer la catégorie ${c.name} ?`} action={deleteCategory.bind(null, c.id)}>Supprimer</ConfirmButton>}>
          <ActionForm action={saveCategory.bind(null, c.id)}>
            <Fields c={c} />
          </ActionForm>
        </Card>
      ))}
      <Card title="Nouvelle catégorie">
        <ActionForm action={saveCategory.bind(null, null)} submitLabel="Créer">
          <Fields />
        </ActionForm>
      </Card>
    </div>
  );
}

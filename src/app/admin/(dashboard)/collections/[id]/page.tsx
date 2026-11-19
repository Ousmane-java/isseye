import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireAdmin } from "@/lib/admin-auth";
import { adminDb } from "@/lib/supabase";
import { Card, PageHeader } from "@/components/admin/ui";
import { ActionForm, ConfirmButton } from "@/components/admin/forms";
import { MediaInput } from "@/components/admin/MediaPicker";
import { deleteCollection, saveCollection } from "../actions";

export const metadata: Metadata = { title: "Collection" };
const local = (iso: string | null) => (iso ? new Date(new Date(iso).getTime() - new Date(iso).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "");

export default async function CollectionPage({ params }: PageProps<"/admin/collections/[id]">) {
  await requireAdmin("collections");
  const { id } = await params;
  const db = adminDb();
  const [{ data: c }, { data: products }] = await Promise.all([
    db.from("collections").select("*, items:collection_products(product_id, position)").eq("id", id).maybeSingle(),
    db.from("products").select("id, name, status").is("deleted_at", null).order("name"),
  ]);
  if (!c) notFound();
  const selected = new Set((c.items as { product_id: string }[]).map((i) => i.product_id));
  return (
    <div className="space-y-8">
      <Link href="/collections" className="inline-flex items-center gap-2 text-sm text-gris hover:text-encre">
        <ArrowLeft className="size-4" /> Collections
      </Link>
      <PageHeader title={c.name} description={`/boutique/${c.slug}`} actions={<ConfirmButton danger confirm="Supprimer cette collection ?" action={deleteCollection.bind(null, c.id)}>Supprimer</ConfirmButton>} />
      <Card>
        <ActionForm action={saveCollection.bind(null, c.id)}>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block"><span className="label">Nom</span><input name="name" defaultValue={c.name} required className="field" /></label>
            <label className="block"><span className="label">Adresse</span><input name="slug" defaultValue={c.slug} className="field" /></label>
            <label className="block sm:col-span-2"><span className="label">Description</span><textarea name="description" defaultValue={c.description ?? ""} rows={2} className="field resize-y" /></label>
            <div className="sm:col-span-2"><span className="label">Bannière</span><MediaInput name="banner_url" defaultValue={c.banner_url ?? ""} folder="collections" /></div>
            <label className="block"><span className="label">Visible à partir du</span><input type="datetime-local" name="starts_at" defaultValue={local(c.starts_at)} className="field" /></label>
            <label className="block"><span className="label">Jusqu&apos;au</span><input type="datetime-local" name="ends_at" defaultValue={local(c.ends_at)} className="field" /></label>
            <label className="block"><span className="label">Titre Google</span><input name="seo_title" defaultValue={c.seo_title ?? ""} className="field" /></label>
            <label className="block"><span className="label">Description Google</span><input name="seo_description" defaultValue={c.seo_description ?? ""} className="field" /></label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="active" defaultChecked={c.active} className="size-4 accent-noir" /> Active</label>
          </div>
          <fieldset className="pt-4">
            <legend className="label">Produits de la collection</legend>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {(products ?? []).map((p) => (
                <label key={p.id} className="flex items-center gap-2 rounded-lg border border-encre/10 px-3 py-2 text-sm">
                  <input type="checkbox" name="productIds" value={p.id} defaultChecked={selected.has(p.id)} className="size-4 accent-noir" />
                  {p.name} {p.status !== "active" && <span className="text-[12px] text-gris">(hors ligne)</span>}
                </label>
              ))}
            </div>
          </fieldset>
        </ActionForm>
      </Card>
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/admin-auth";
import { adminDb } from "@/lib/supabase";
import { Badge, Card, EmptyState, PageHeader } from "@/components/admin/ui";
import { ActionForm } from "@/components/admin/forms";
import { createCollection } from "./actions";

export const metadata: Metadata = { title: "Collections" };

export default async function CollectionsPage() {
  await requireAdmin("collections");
  const { data } = await adminDb().from("collections").select("id, name, slug, active, starts_at, ends_at, products:collection_products(count)").is("deleted_at", null).order("position");
  const now = new Date().toISOString();
  return (
    <div className="space-y-8">
      <PageHeader title="Collections" description="Sélections de parfums (Fête des mères, Coffrets de Noël…) avec leur propre page /boutique/adresse, programmables par dates." />
      <Card title="Nouvelle collection">
        <ActionForm action={createCollection} submitLabel="Créer" className="sm:flex sm:items-end sm:gap-3 sm:space-y-0">
          <label className="block flex-1">
            <span className="label">Nom</span>
            <input name="name" required className="field" placeholder="Ex. Fête des mères" />
          </label>
        </ActionForm>
      </Card>
      <Card>
        {!data?.length ? (
          <EmptyState title="Aucune collection." />
        ) : (
          <ul className="divide-y divide-encre/5">
            {data.map((c) => {
              const live = c.active && (!c.starts_at || c.starts_at <= now) && (!c.ends_at || c.ends_at >= now);
              return (
                <li key={c.id}>
                  <Link href={`/collections/${c.id}`} className="flex flex-wrap items-center gap-3 py-3.5 hover:text-bronze">
                    <span className="font-medium">{c.name}</span>
                    <span className="text-[13px] text-gris">/boutique/{c.slug}</span>
                    <span className="ml-auto text-[13px] text-gris">{(c.products as { count: number }[])[0]?.count ?? 0} produit(s)</span>
                    <Badge tone={live ? "green" : "neutral"}>{live ? "Visible" : "Masquée"}</Badge>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/admin-auth";
import { adminDb } from "@/lib/supabase";
import { Badge, Card, EmptyState, PageHeader } from "@/components/admin/ui";
import { ActionForm, ConfirmButton } from "@/components/admin/forms";
import { deleteReview, moderateReview, replyReview } from "./actions";

export const metadata: Metadata = { title: "Avis" };
const dateFormat = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeZone: "Europe/Paris" });
const labels = { en_attente: "À modérer", publie: "Publié", refuse: "Refusé" } as const;

export default async function ReviewsPage({ searchParams }: PageProps<"/admin/avis">) {
  await requireAdmin("reviews");
  const { statut } = await searchParams;
  const status = statut === "publie" || statut === "refuse" ? statut : "en_attente";
  const { data } = await adminDb().from("reviews").select("*, product:products(name, slug)").eq("status", status).order("created_at", { ascending: false }).limit(100);
  return (
    <div className="space-y-8">
      <PageHeader title="Avis" description="Les avis déposés sur les fiches produits n'apparaissent qu'après votre validation. Une demande d'avis part automatiquement 7 jours après la livraison." />
      <div className="flex gap-2">
        {(Object.keys(labels) as (keyof typeof labels)[]).map((s) => (
          <Link key={s} href={`/avis?statut=${s}`} className={`rounded-full px-4 py-1.5 text-sm ${status === s ? "bg-noir text-creme" : "text-gris hover:bg-lin-clair"}`}>{labels[s]}</Link>
        ))}
      </div>
      {!data?.length ? (
        <EmptyState title="Aucun avis ici." />
      ) : (
        data.map((r) => {
          const product = r.product as { name: string } | null;
          return (
            <Card key={r.id}>
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-or">{"★".repeat(r.rating)}<span className="text-encre/20">{"★".repeat(5 - r.rating)}</span></span>
                <span className="font-semibold">{r.author_name}</span>
                {r.verified && <Badge tone="gold">Achat vérifié</Badge>}
                <span className="text-sm text-gris">sur {product?.name} · {dateFormat.format(new Date(r.created_at))}</span>
              </div>
              {r.title && <p className="mt-3 font-display text-xl">{r.title}</p>}
              <p className="mt-1 text-[15px]">{r.body}</p>
              <div className="mt-4 flex flex-wrap gap-5">
                {status !== "publie" && <ConfirmButton action={moderateReview.bind(null, r.id, "publie")} className="!text-emerald-700">Publier</ConfirmButton>}
                {status !== "refuse" && <ConfirmButton action={moderateReview.bind(null, r.id, "refuse")}>Refuser</ConfirmButton>}
                <ConfirmButton danger confirm="Supprimer cet avis ?" action={deleteReview.bind(null, r.id)}>Supprimer</ConfirmButton>
              </div>
              <details className="mt-4">
                <summary className="cursor-pointer text-sm text-bronze">{r.admin_reply ? "Modifier la réponse publique" : "Répondre publiquement"}</summary>
                <ActionForm action={replyReview.bind(null, r.id)} className="mt-3">
                  <textarea name="reply" defaultValue={r.admin_reply ?? ""} rows={3} className="field resize-y" />
                </ActionForm>
              </details>
            </Card>
          );
        })
      )}
    </div>
  );
}

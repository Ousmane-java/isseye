import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin-auth";
import { adminDb } from "@/lib/supabase";
import { Badge, Card, EmptyState, PageHeader } from "@/components/admin/ui";
import { ConfirmButton } from "@/components/admin/forms";
import { deleteMessage, toggleHandled } from "./actions";

export const metadata: Metadata = { title: "Messages" };
const dateFormat = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Paris" });

export default async function MessagesPage() {
  await requireAdmin("messages");
  const { data } = await adminDb().from("contact_messages").select("*").order("created_at", { ascending: false }).limit(200);
  return (
    <div className="space-y-8">
      <PageHeader title="Messages" description="Formulaire de contact du site. Une copie arrive aussi par email ; répondez directement depuis votre messagerie." />
      {!data?.length ? (
        <EmptyState title="Aucun message." />
      ) : (
        data.map((m) => (
          <Card key={m.id} className={m.handled_at ? "opacity-60" : ""}>
            <div className="flex flex-wrap items-center gap-3">
              <p className="font-semibold">{m.subject}</p>
              {m.order_number && <Badge tone="gold">{m.order_number}</Badge>}
              {!m.handled_at && <Badge tone="dark">Nouveau</Badge>}
              <span className="ml-auto text-[13px] text-gris">{dateFormat.format(new Date(m.created_at))}</span>
            </div>
            <p className="mt-1 text-sm text-gris">
              {m.name} · <a href={`mailto:${m.email}?subject=${encodeURIComponent(`Re: ${m.subject}`)}`} className="text-bronze">{m.email}</a>
              {m.phone && ` · ${m.phone}`}
            </p>
            <p className="mt-4 text-[15px] whitespace-pre-line">{m.message}</p>
            <div className="mt-4 flex gap-5">
              <a href={`mailto:${m.email}?subject=${encodeURIComponent(`Re: ${m.subject}`)}`} className="text-sm text-bronze">Répondre</a>
              <ConfirmButton action={toggleHandled.bind(null, m.id, !m.handled_at)}>{m.handled_at ? "Rouvrir" : "Marquer comme traité"}</ConfirmButton>
              <ConfirmButton danger confirm="Supprimer ce message ?" action={deleteMessage.bind(null, m.id)}>Supprimer</ConfirmButton>
            </div>
          </Card>
        ))
      )}
    </div>
  );
}

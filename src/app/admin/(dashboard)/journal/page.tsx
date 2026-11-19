import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin-auth";
import { adminDb } from "@/lib/supabase";
import { Card, PageHeader } from "@/components/admin/ui";

export const metadata: Metadata = { title: "Journal" };

const dateFormat = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Paris" });
const actionLabels: Record<string, string> = { create: "Création", update: "Modification", delete: "Suppression", restore: "Restauration", publish: "Publication" };

type Entry = { id: number; actor_email: string | null; action: string; entity: string; summary: string | null; created_at: string };

export default async function ActivityPage() {
  await requireAdmin("activity");
  const { data } = await adminDb().from("audit_log").select("id, actor_email, action, entity, summary, created_at").order("created_at", { ascending: false }).limit(200);
  const entries = (data ?? []) as Entry[];

  return (
    <div className="space-y-8">
      <PageHeader title="Journal" description="Qui a modifié quoi, et quand. Les 200 dernières actions." />
      <Card>
        {entries.length === 0 ? (
          <p className="text-sm text-gris">Aucune modification pour l&apos;instant.</p>
        ) : (
          <ul className="divide-y divide-encre/5">
            {entries.map((e) => (
              <li key={e.id} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:gap-4">
                <span className="w-40 shrink-0 text-[13px] text-gris">{dateFormat.format(new Date(e.created_at))}</span>
                <span className="w-28 shrink-0 text-[12px] font-semibold tracking-wide text-bronze uppercase">{actionLabels[e.action] ?? e.action}</span>
                <span className="min-w-0 flex-1 text-sm text-encre">{e.summary}</span>
                <span className="truncate text-[13px] text-gris sm:max-w-56">{e.actor_email}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin-auth";
import { adminDb } from "@/lib/supabase";
import { roleDescriptions, roleLabels, type AdminRole } from "@/config/admin";
import { Card, PageHeader } from "@/components/admin/ui";
import { AddMemberForm, MemberList, type Member } from "./TeamManager";

export const metadata: Metadata = { title: "Équipe" };

export default async function TeamPage() {
  const user = await requireAdmin("team");
  const { data } = await adminDb().from("admin_users").select("user_id, email, role").order("created_at");
  const owners = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  return (
    <div className="space-y-8">
      <PageHeader title="Équipe" description="Donnez accès à l'admin à vos collaboratrices, chacune avec les droits dont elle a besoin." />

      <Card title="Membres">
        <MemberList members={(data ?? []) as Member[]} owners={owners} selfId={user.id} />
      </Card>

      <Card title="Ajouter un membre">
        <AddMemberForm />
      </Card>

      <Card title="Les rôles">
        <dl className="grid gap-4 sm:grid-cols-3">
          {(Object.keys(roleLabels) as AdminRole[]).map((r) => (
            <div key={r} className="rounded-xl bg-creme p-4">
              <dt className="font-semibold text-encre">{roleLabels[r]}</dt>
              <dd className="mt-1 text-sm text-gris">{roleDescriptions[r]}</dd>
            </div>
          ))}
        </dl>
      </Card>
    </div>
  );
}

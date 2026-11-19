import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin-auth";
import { roleLabels } from "@/config/admin";
import { Card, PageHeader } from "@/components/admin/ui";
import { PasswordForm } from "./PasswordForm";

export const metadata: Metadata = { title: "Mon compte" };

export default async function AccountPage() {
  const user = await requireAdmin("dashboard");
  return (
    <div className="space-y-8">
      <PageHeader title="Mon compte" description={`${user.email} · ${roleLabels[user.role]}`} />
      <Card title="Changer de mot de passe">
        <PasswordForm />
      </Card>
    </div>
  );
}

import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin-auth";
import { Card, PageHeader } from "@/components/admin/ui";
import { NewPasswordForm } from "./NewPasswordForm";

export const metadata: Metadata = { title: "Nouveau mot de passe" };

export default async function ResetPasswordPage() {
  await requireAdmin("dashboard");
  return (
    <div className="space-y-8">
      <PageHeader title="Nouveau mot de passe" description="Choisissez le mot de passe de votre accès à l'espace de gestion." />
      <Card>
        <NewPasswordForm />
      </Card>
    </div>
  );
}

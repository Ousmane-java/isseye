import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin-auth";
import { adminDb } from "@/lib/supabase";
import { Badge, Card, Notice, PageHeader } from "@/components/admin/ui";
import { ActionForm, ConfirmButton } from "@/components/admin/forms";
import { saveTemplate, sendTest } from "./actions";

export const metadata: Metadata = { title: "Emails" };

const when: Record<string, string> = {
  order_confirmation: "Envoyé dès le paiement accepté, avec le récapitulatif.",
  order_shipped: "Envoyé quand vous expédiez une commande.",
  order_delivered: "Envoyé quand vous marquez une commande livrée.",
  order_cancelled: "Envoyé à l'annulation (si vous cochez « Prévenir la cliente »).",
  order_refunded: "Envoyé à chaque remboursement.",
  order_preparing: "Envoyé quand vous passez la commande « En préparation ».",
  order_ready_pickup: "Retrait : envoyé quand la commande est prête, avec l'adresse exacte et les horaires.",
  order_local_delivery: "Livraison locale : envoyé quand la commande part en livraison.",
  order_picked_up: "Retrait : envoyé quand la cliente a retiré sa commande.",
  review_request: "Envoyé automatiquement 7 jours après la livraison.",
  abandoned_cart: "Envoyé automatiquement 2 h après un paiement non abouti.",
  back_in_stock: "Envoyé aux clientes inscrites quand un parfum épuisé revient.",
  contact_received: "Accusé de réception du formulaire de contact.",
  admin_new_order: "Reçu par l'équipe à chaque nouvelle commande.",
  customer_login: "Modèle réservé (la connexion utilise l'email de Supabase).",
};

function PreviewLink({ emailKey }: { emailKey: string }) {
  return (
    <a href={`/api/admin/email-preview/${emailKey}`} target="_blank" className="text-sm text-bronze hover:underline">
      Aperçu
    </a>
  );
}

export default async function EmailsPage() {
  await requireAdmin("emails");
  const { data } = await adminDb().from("email_templates").select("*").order("name");
  return (
    <div className="space-y-8">
      <PageHeader title="Emails" description="Les emails automatiques envoyés aux clientes, avec la mise en page ISSEYE. Variables disponibles : {{prenom}}, {{nom}}, {{numero}}, {{total}}, {{transporteur}}, {{suivi}}, {{produit}}, {{montant}}, {{adresse_retrait}}, {{horaires_retrait}}." />
      {!process.env.RESEND_API_KEY && <Notice tone="warning">Aucun email ne part tant que RESEND_API_KEY n&apos;est pas configurée (voir README).</Notice>}
      {(data ?? []).filter((t) => t.key !== "customer_login").map((t) => (
        <Card key={t.key} title={t.name} description={when[t.key]} actions={<span className="flex items-center gap-4"><Badge tone={t.enabled ? "green" : "neutral"}>{t.enabled ? "Actif" : "Désactivé"}</Badge><PreviewLink emailKey={t.key} /><ConfirmButton action={sendTest.bind(null, t.key)}>M&apos;envoyer un test</ConfirmButton></span>}>
          <details>
            <summary className="cursor-pointer text-sm text-bronze">Modifier</summary>
            <ActionForm action={saveTemplate.bind(null, t.key)} className="mt-4">
              <label className="block"><span className="label">Objet</span><input name="subject" defaultValue={t.subject} className="field" /></label>
              <label className="block"><span className="label">Titre</span><input name="heading" defaultValue={t.heading} className="field" /></label>
              <label className="block"><span className="label">Texte</span><textarea name="body" defaultValue={t.body} rows={4} className="field resize-y" /></label>
              <label className="block"><span className="label">Texte du bouton</span><input name="cta_label" defaultValue={t.cta_label ?? ""} className="field" /></label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="enabled" defaultChecked={t.enabled} className="size-4 accent-noir" /> Email actif</label>
            </ActionForm>
          </details>
        </Card>
      ))}
    </div>
  );
}

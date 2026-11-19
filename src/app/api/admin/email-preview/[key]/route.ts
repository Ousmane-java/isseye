import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/supabase";
import { canAccess } from "@/config/admin";
import { getTemplate, renderTemplate, siteUrl } from "@/lib/email";
import { getSettings } from "@/lib/settings";
import { progressHtml } from "@/lib/orders";
import type { OrderRow } from "@/lib/order-types";

// Aperçu d'un email (Admin › Emails), avec des données d'exemple et la frise d'avancement.

const steps: Record<string, Pick<OrderRow, "status" | "delivery_type">> = {
  order_confirmation: { status: "payee", delivery_type: "postal" },
  order_preparing: { status: "en_preparation", delivery_type: "postal" },
  order_ready_pickup: { status: "prete_retrait", delivery_type: "pickup" },
  order_local_delivery: { status: "expediee", delivery_type: "local" },
  order_shipped: { status: "expediee", delivery_type: "postal" },
  order_delivered: { status: "livree", delivery_type: "postal" },
  order_picked_up: { status: "livree", delivery_type: "pickup" },
};

export async function GET(_: Request, { params }: RouteContext<"/api/admin/email-preview/[key]">) {
  const user = await getAdminUser();
  if (!user || !canAccess(user.role, "emails")) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  const { key } = await params;
  const template = await getTemplate(key);
  if (!template) return NextResponse.json({ error: "Modèle introuvable" }, { status: 404 });
  const { delivery } = await getSettings();
  const step = steps[key];
  const { subject, html } = await renderTemplate(
    template,
    {
      prenom: "Awa",
      nom: "Diop",
      numero: "ISY-1042",
      total: "40 €",
      transporteur: "Colissimo",
      suivi: "6A12345678901",
      produit: "Luna",
      montant: "40 €",
      lien_suivi: `${siteUrl}/suivi`,
      adresse_retrait: delivery.originAddress,
      horaires_retrait: delivery.pickupHours ? `Horaires : ${delivery.pickupHours}` : "",
    },
    { ctaUrl: siteUrl, extraHtml: step ? progressHtml(step) : "" },
  );
  const page = html.replace("<body", `<body data-objet="${subject.replace(/"/g, "&quot;")}"`).replace(
    /<body([^>]*)>/,
    `<body$1><div style="font:13px Helvetica,Arial,sans-serif;background:#1b1917;color:#f6f1ea;padding:10px 16px">Aperçu · Objet : <strong>${subject.replace(/</g, "&lt;")}</strong></div>`,
  );
  return new NextResponse(page, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
}

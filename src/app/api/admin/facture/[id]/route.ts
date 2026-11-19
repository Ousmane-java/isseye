import { NextResponse } from "next/server";
import { adminDb, getAdminUser } from "@/lib/supabase";
import { canAccess } from "@/config/admin";
import { getOrder } from "@/lib/orders";
import { buildInvoicePdf } from "@/lib/invoice";

// Facture PDF depuis l'admin (numéro attribué au besoin si la commande est payée).
export async function GET(_: Request, { params }: RouteContext<"/api/admin/facture/[id]">) {
  const user = await getAdminUser();
  if (!user || !canAccess(user.role, "orders")) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  const { id } = await params;
  let order = await getOrder(id);
  if (!order?.paid_at) return NextResponse.json({ error: "Commande non payée : pas de facture" }, { status: 404 });
  if (!order.invoice_number) {
    await adminDb().rpc("assign_invoice_number", { p_order: id });
    order = await getOrder(id);
  }
  const pdf = await buildInvoicePdf(order!);
  return new NextResponse(Buffer.from(pdf), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="ISSEYE-${order!.invoice_number}.pdf"`, "Cache-Control": "no-store" },
  });
}

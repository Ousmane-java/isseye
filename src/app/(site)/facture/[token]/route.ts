import { NextResponse } from "next/server";
import { getOrderByToken } from "@/lib/orders";
import { buildInvoicePdf } from "@/lib/invoice";
import { isSupabaseConfigured } from "@/lib/supabase";

// Facture PDF pour la cliente (lien de suivi, email de confirmation, espace cliente).
export async function GET(_: Request, { params }: RouteContext<"/facture/[token]">) {
  const { token } = await params;
  const order = isSupabaseConfigured ? await getOrderByToken(token) : null;
  if (!order?.invoice_number) return NextResponse.json({ error: "Facture introuvable" }, { status: 404 });
  const pdf = await buildInvoicePdf(order);
  return new NextResponse(Buffer.from(pdf), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="ISSEYE-${order.invoice_number}.pdf"`, "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex" },
  });
}

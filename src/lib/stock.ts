import "server-only";
import { adminDb } from "@/lib/supabase";
import { sendTemplate, siteUrl } from "@/lib/email";

/** Retour en stock : prévient les clientes inscrites à l'alerte de cette variante (une seule fois). */
export async function notifyBackInStock(variantId: string) {
  const db = adminDb();
  const { data: variant } = await db.from("product_variants").select("id, product:products(name, slug, status)").eq("id", variantId).maybeSingle();
  const product = variant?.product as unknown as { name: string; slug: string; status: string } | null;
  if (!product || product.status !== "active") return 0;
  const { data: alerts } = await db.from("stock_alerts").select("id, email").eq("variant_id", variantId).is("notified_at", null).limit(500);
  for (const alert of alerts ?? []) {
    await sendTemplate("back_in_stock", alert.email, { produit: product.name }, { ctaUrl: `${siteUrl}/parfum/${product.slug}` });
    await db.from("stock_alerts").update({ notified_at: new Date().toISOString() }).eq("id", alert.id);
  }
  return alerts?.length ?? 0;
}

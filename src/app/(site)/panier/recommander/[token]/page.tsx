import { redirect } from "next/navigation";
import { getOrderByToken } from "@/lib/orders";
import { isSupabaseConfigured } from "@/lib/supabase";
import { RestoreCart } from "@/components/cart/RestoreCart";

// « Commander à nouveau » : remet dans le panier les articles d'une commande passée (lien de suivi ou espace cliente).
export default async function ReorderPage({ params }: PageProps<"/panier/recommander/[token]">) {
  const { token } = await params;
  const order = isSupabaseConfigured ? await getOrderByToken(token) : null;
  if (!order) redirect("/panier");
  const lines = (order.items ?? []).filter((i) => i.variant_id && !i.is_gift).map((i) => ({ variantId: i.variant_id!, quantity: i.quantity }));
  return <RestoreCart lines={lines} />;
}

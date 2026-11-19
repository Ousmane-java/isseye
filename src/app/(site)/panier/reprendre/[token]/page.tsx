import { redirect } from "next/navigation";
import { getOrderByToken } from "@/lib/orders";
import { isSupabaseConfigured } from "@/lib/supabase";
import { RestoreCart } from "@/components/cart/RestoreCart";

// Lien de l'email « Votre sélection vous attend » : remet les articles d'une commande non payée dans le panier.
export default async function ResumeCartPage({ params }: PageProps<"/panier/reprendre/[token]">) {
  const { token } = await params;
  const order = isSupabaseConfigured ? await getOrderByToken(token) : null;
  if (!order || !["en_attente_paiement", "abandonnee"].includes(order.status)) redirect("/panier");
  const lines = (order.items ?? []).filter((i) => i.variant_id).map((i) => ({ variantId: i.variant_id!, quantity: i.quantity }));
  return <RestoreCart lines={lines} />;
}

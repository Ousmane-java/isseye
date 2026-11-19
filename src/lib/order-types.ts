// Commandes : types et libellés partagés (admin, suivi, emails).

export type OrderStatus = "en_attente_paiement" | "payee" | "en_preparation" | "prete_retrait" | "expediee" | "livree" | "annulee" | "remboursee" | "abandonnee";

export type OrderItemRow = {
  id: string;
  product_id: string | null;
  variant_id: string | null;
  sku: string | null;
  product_name: string;
  variant_label: string | null;
  image_url: string | null;
  unit_price: number;
  quantity: number;
  line_total: number;
  is_gift: boolean;
};

export type OrderRow = {
  id: string;
  number: string;
  created_at: string;
  updated_at: string;
  status: OrderStatus;
  email: string;
  phone: string | null;
  first_name: string;
  last_name: string;
  ship_line1: string;
  ship_line2: string | null;
  ship_postal_code: string | null;
  ship_city: string;
  ship_country: string;
  currency_code: string;
  fx_rate: number;
  tax_mode: "ttc" | "export";
  subtotal: number;
  discount: number;
  shipping: number;
  gift_wrap: number;
  total: number;
  tax_included: number;
  promo_code: string | null;
  shipping_method: string | null;
  shipping_zone: string | null;
  gift_message: string | null;
  notes: string | null;
  payment_provider: string;
  payment_session_id: string | null;
  payment_intent_id: string | null;
  paid_at: string | null;
  carrier: string | null;
  tracking_number: string | null;
  tracking_url: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  refunded_amount: number;
  refunded_at: string | null;
  cancelled_at: string | null;
  stock_committed: boolean;
  access_token: string;
  admin_notes: string | null;
  marketing_consent: boolean;
  reminder_sent_at: string | null;
  delivery_type: "postal" | "local" | "pickup";
  delivery_distance_km: number | null;
  ready_at: string | null;
  invoice_number: string | null;
  invoiced_at: string | null;
  scheduled_date: string | null;
  scheduled_slot: string | null;
  items?: OrderItemRow[];
};

export const statusLabels: Record<OrderStatus, string> = {
  en_attente_paiement: "En attente de paiement",
  payee: "Payée",
  en_preparation: "En préparation",
  prete_retrait: "Prête à retirer",
  expediee: "Expédiée",
  livree: "Livrée",
  annulee: "Annulée",
  remboursee: "Remboursée",
  abandonnee: "Paiement non abouti",
};

/** Libellé du statut, adapté au mode de livraison (« Retirée » pour un retrait, « En livraison » en local). */
export function statusLabel(order: Pick<OrderRow, "status" | "delivery_type">) {
  if (order.delivery_type === "pickup" && order.status === "livree") return "Retirée";
  if (order.delivery_type === "local" && order.status === "expediee") return "En livraison";
  return statusLabels[order.status];
}

/** Couleur du badge de statut dans l'admin */
export const statusTone: Record<OrderStatus, "gold" | "green" | "blue" | "neutral" | "red" | "dark"> = {
  en_attente_paiement: "neutral",
  payee: "gold",
  en_preparation: "blue",
  prete_retrait: "gold",
  expediee: "dark",
  livree: "green",
  annulee: "red",
  remboursee: "red",
  abandonnee: "neutral",
};

/** Statuts d'une commande réellement payée (comptés dans le chiffre d'affaires). */
export const paidStatuses: OrderStatus[] = ["payee", "en_preparation", "prete_retrait", "expediee", "livree"];

/** Étapes affichées à la cliente sur la page de suivi, selon le mode de livraison. */
export function trackingSteps(type: OrderRow["delivery_type"]): { status: OrderStatus; label: string }[] {
  if (type === "pickup") {
    return [
      { status: "payee", label: "Commande confirmée" },
      { status: "en_preparation", label: "En préparation" },
      { status: "prete_retrait", label: "Prête à retirer" },
      { status: "livree", label: "Retirée" },
    ];
  }
  return [
    { status: "payee", label: "Commande confirmée" },
    { status: "en_preparation", label: "En préparation" },
    { status: "expediee", label: type === "local" ? "En livraison" : "Expédiée" },
    { status: "livree", label: "Livrée" },
  ];
}

/** « samedi 21 novembre · 14 h – 19 h », ou null sans créneau. */
export function scheduleLabel(order: Pick<OrderRow, "scheduled_date" | "scheduled_slot">) {
  if (!order.scheduled_date || !order.scheduled_slot) return null;
  const day = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(`${order.scheduled_date}T12:00:00Z`));
  const slot = order.scheduled_slot.replace(/:00/g, " h").replace(/:(\d{2})/g, " h $1").replace("-", " – ");
  return `${day} · ${slot}`;
}

/** Étapes que l'admin fait avancer, dans l'ordre, selon le mode de livraison. */
export function orderWorkflow(type: OrderRow["delivery_type"]): OrderStatus[] {
  return ["payee", "en_preparation", type === "pickup" ? "prete_retrait" : "expediee", "livree"];
}

export const deliveryLabels: Record<OrderRow["delivery_type"], string> = { postal: "Envoi postal", local: "Livraison locale", pickup: "Retrait boutique" };

/** Transporteurs courants : lien de suivi construit automatiquement à partir du numéro. */
export const carriers: { name: string; url: string }[] = [
  { name: "Colissimo", url: "https://www.laposte.fr/outils/suivre-vos-envois?code={tracking}" },
  { name: "Chronopost", url: "https://www.chronopost.fr/tracking-no-cms/suivi-page?listeNumerosLT={tracking}" },
  { name: "Mondial Relay", url: "https://www.mondialrelay.fr/suivi-de-colis/?numeroExpedition={tracking}" },
  { name: "DHL", url: "https://www.dhl.com/fr-fr/home/tracking.html?tracking-id={tracking}" },
  { name: "UPS", url: "https://www.ups.com/track?tracknum={tracking}" },
  { name: "FedEx", url: "https://www.fedex.com/fedextrack/?trknbr={tracking}" },
  { name: "La Poste", url: "https://www.laposte.fr/outils/suivre-vos-envois?code={tracking}" },
];

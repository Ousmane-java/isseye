// Prix affichés et calcul d'un panier (sous-total, réduction, livraison, TVA).
// Module pur, partagé par le serveur, le navigateur et les tests : le serveur refait
// toujours le calcul au moment de la commande, les montants du navigateur ne servent qu'à l'affichage.

import { convertFromBase, roundPrice, type Currency } from "./currency.ts";

/** ttc : prix TVA comprise (France, UE) · export : vente hors UE. */
export type TaxMode = "ttc" | "export";

export type PricingContext = {
  currency: Currency;
  base: Pick<Currency, "code" | "decimals">;
  taxMode: TaxMode;
  /** Réglage boutique : à l'export, garder le prix TTC français ou retirer la TVA. */
  exportPricing: "ttc" | "ht";
  vatRate: number;
};

export type PriceOverride = { currency_code: string; amount: number; compare_at_amount: number | null };

/** Vrai quand le prix affiché doit être hors TVA (vente export avec l'option « prix HT »). */
export function stripsVat(ctx: Pick<PricingContext, "taxMode" | "exportPricing">) {
  return ctx.taxMode === "export" && ctx.exportPricing === "ht";
}

function withoutVat(amount: number, vatRate: number) {
  return Math.round(amount / (1 + vatRate / 100));
}

/**
 * Prix d'une variante dans la devise de la visiteuse : prix fixé à la main pour cette devise
 * s'il existe, sinon conversion du prix de référence (taux + arrondi commercial).
 */
export function displayPrice(
  variant: { price: number; compare_at_price: number | null; prices?: PriceOverride[] | null },
  ctx: PricingContext,
): { price: number; compareAt: number | null } {
  const manual = variant.prices?.find((p) => p.currency_code === ctx.currency.code);
  const ht = stripsVat(ctx);
  const convert = (base: number) => convertFromBase(ht ? withoutVat(base, ctx.vatRate) : base, ctx.base, ctx.currency);
  const fromManual = (amount: number) => (ht ? roundPrice(withoutVat(amount, ctx.vatRate), ctx.currency) : amount);

  const price = manual ? fromManual(manual.amount) : convert(variant.price);
  const compareRaw = manual ? (manual.compare_at_amount === null ? null : fromManual(manual.compare_at_amount)) : variant.compare_at_price === null ? null : convert(variant.compare_at_price);
  return { price, compareAt: compareRaw !== null && compareRaw > price ? compareRaw : null };
}

/** Montant défini en devise de base (frais de port, emballage cadeau) converti pour la visiteuse. */
export function baseAmountIn(amount: number, ctx: PricingContext) {
  return convertFromBase(stripsVat(ctx) ? withoutVat(amount, ctx.vatRate) : amount, ctx.base, ctx.currency);
}

// ─────────────────────────────────────────────────────────────
// Codes promo
// ─────────────────────────────────────────────────────────────

export type PromoRule = {
  code: string;
  kind: "percent" | "amount" | "free_shipping";
  percent: number | null;
  /** Réduction fixe, dans la devise de la commande. */
  amount: number | null;
  /** Minimum d'achat, dans la devise de la commande. */
  minSubtotal: number | null;
  /** Catégories concernées (vide = tout le catalogue). */
  categoryIds: string[];
  startsAt: string | null;
  endsAt: string | null;
  maxUses: number | null;
  uses: number;
  active: boolean;
  firstOrderOnly: boolean;
};

/** Raison du refus d'un code, ou null s'il s'applique. */
export function promoProblem(promo: PromoRule, opts: { subtotal: number; now?: Date; previousOrders?: number }): string | null {
  const now = opts.now ?? new Date();
  if (!promo.active) return "Ce code n'est plus valable.";
  if (promo.startsAt && new Date(promo.startsAt) > now) return "Ce code n'est pas encore actif.";
  if (promo.endsAt && new Date(promo.endsAt) < now) return "Ce code a expiré.";
  if (promo.maxUses !== null && promo.uses >= promo.maxUses) return "Ce code a atteint sa limite d'utilisation.";
  if (promo.firstOrderOnly && (opts.previousOrders ?? 0) > 0) return "Ce code est réservé à une première commande.";
  if (promo.kind === "amount" && promo.amount === null) return "Ce code n'est pas utilisable dans votre devise.";
  if (promo.minSubtotal !== null && opts.subtotal < promo.minSubtotal) return "minimum";
  return null;
}

// ─────────────────────────────────────────────────────────────
// Calcul du panier
// ─────────────────────────────────────────────────────────────

export type QuoteLine = { unitPrice: number; quantity: number; categoryId: string | null };
export type ShippingRate = { amount: number; freeAbove: number | null };

export type Quote = {
  subtotal: number;
  discount: number;
  shipping: number;
  shippingFree: boolean;
  giftWrap: number;
  total: number;
  /** Part de TVA comprise dans le total (0 à l'export). */
  taxIncluded: number;
};

export function computeQuote(input: {
  lines: QuoteLine[];
  promo?: Pick<PromoRule, "kind" | "percent" | "amount" | "categoryIds"> | null;
  shipping?: ShippingRate | null;
  giftWrap?: number;
  taxMode: TaxMode;
  vatRate: number;
}): Quote {
  const subtotal = input.lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);
  const promo = input.promo;

  let discount = 0;
  if (promo && promo.kind !== "free_shipping") {
    const eligible = input.lines
      .filter((l) => promo.categoryIds.length === 0 || (l.categoryId !== null && promo.categoryIds.includes(l.categoryId)))
      .reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);
    discount = promo.kind === "percent" ? Math.floor((eligible * (promo.percent ?? 0)) / 100) : Math.min(promo.amount ?? 0, eligible);
  }

  const afterDiscount = subtotal - discount;
  let shipping = input.shipping?.amount ?? 0;
  const shippingFree =
    Boolean(input.shipping) && (promo?.kind === "free_shipping" || (input.shipping!.freeAbove !== null && afterDiscount >= input.shipping!.freeAbove));
  if (shippingFree) shipping = 0;

  const giftWrap = input.giftWrap ?? 0;
  const total = afterDiscount + shipping + giftWrap;
  const taxIncluded = input.taxMode === "ttc" && input.vatRate > 0 ? Math.round((total * input.vatRate) / (100 + input.vatRate)) : 0;
  return { subtotal, discount, shipping, shippingFree, giftWrap, total, taxIncluded };
}

import "server-only";
import { adminDb, isSupabaseConfigured } from "@/lib/supabase";
import { getSettings } from "@/lib/settings";
import { getPricingContext } from "@/lib/shop";
import { getRawProducts, loadRawProducts, toSummary, variantAvailable } from "@/lib/catalog";
import { baseAmountIn, computeQuote, displayPrice, promoProblem, type PricingContext, type PromoRule } from "@/lib/pricing";
import { convertFromBase, formatMoney } from "@/lib/currency";
import { MAX_QTY, type RawProduct, type RawVariant } from "@/lib/catalog-types";
import type { CartLineView, CartRequest, CartView, ShippingOptionView } from "@/lib/cart-types";
import type { ShippingMethod } from "@/lib/shipping-types";
import { geocodeFR, roadDistanceKm } from "@/lib/geo";
import { localRadius, localTier, publicPickupLabel } from "@/lib/delivery";
import { availableDays } from "@/lib/slots";
import type { Settings } from "@/lib/settings-schema";

// Calcul serveur du panier : prix, stock, livraison, code promo. Utilisé pour l'affichage
// (tiroir, page panier, caisse) et refait à l'identique au moment de créer la commande.

/** Réglages de créneaux pour le retrait ou la livraison locale. */
export function slotSettings(d: Settings["delivery"], kind: "pickup" | "local") {
  return { days: d.slotDays, slots: kind === "pickup" ? d.pickupSlots : d.localSlots, leadHours: d.slotLeadHours, horizonDays: d.slotHorizonDays, closedDates: d.closedDates };
}

export type ResolvedLine = CartLineView & { product: RawProduct; variant: RawVariant; categoryId: string | null };

function shippingPrice(method: ShippingMethod, ctx: PricingContext) {
  const own = method.prices.find((p) => p.currency_code === ctx.currency.code);
  if (own) return { amount: own.amount, freeAbove: own.free_above };
  // Pas de tarif saisi dans cette devise : conversion du tarif en devise de base
  const base = method.prices.find((p) => p.currency_code === ctx.base.code) ?? method.prices[0];
  if (!base) return null;
  return { amount: baseAmountIn(base.amount, ctx), freeAbove: base.free_above === null ? null : convertFromBase(base.free_above, ctx.base, ctx.currency) };
}

/** Code promo dans la devise de la commande (montants fixés à la main, sinon convertis). */
export async function findPromo(code: string, ctx: PricingContext): Promise<PromoRule | null> {
  if (!isSupabaseConfigured) return null;
  const { data } = await adminDb()
    .from("promo_codes")
    .select("code, kind, percent, category_ids, starts_at, ends_at, max_uses, uses, active, archived, first_order_only, amounts:promo_code_amounts(currency_code, amount, min_subtotal)")
    .eq("code", code.trim().toUpperCase())
    .maybeSingle();
  if (!data || data.archived) return null;
  const amounts = data.amounts as { currency_code: string; amount: number | null; min_subtotal: number | null }[];
  const own = amounts.find((a) => a.currency_code === ctx.currency.code);
  const base = amounts.find((a) => a.currency_code === ctx.base.code);
  const convert = (v: number | null | undefined) => (v === null || v === undefined ? null : convertFromBase(v, ctx.base, ctx.currency));
  return {
    code: data.code,
    kind: data.kind,
    percent: data.percent,
    amount: own?.amount ?? convert(base?.amount),
    minSubtotal: own?.min_subtotal ?? convert(base?.min_subtotal),
    categoryIds: data.category_ids ?? [],
    startsAt: data.starts_at,
    endsAt: data.ends_at,
    maxUses: data.max_uses,
    uses: data.uses,
    active: data.active,
    firstOrderOnly: data.first_order_only,
  };
}

async function previousOrders(email: string) {
  const { count } = await adminDb()
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("email", email.trim().toLowerCase())
    .in("status", ["payee", "en_preparation", "prete_retrait", "expediee", "livree"]);
  return count ?? 0;
}

/** `fresh` : stock et prix relus en base (validation de la commande), sinon données en cache (affichage). */
export async function buildCart(req: CartRequest, { fresh = false }: { fresh?: boolean } = {}): Promise<CartView & { resolved: ResolvedLine[] }> {
  const settings = await getSettings();
  const d = settings.delivery;
  const pickup = req.delivery === "retrait" && d.pickupEnabled;
  // Retrait à la boutique : vente en France (TVA comprise), quelle que soit l'adresse de la cliente
  const [ctx, raws] = await Promise.all([getPricingContext(pickup ? "FR" : req.country), fresh ? loadRawProducts() : getRawProducts()]);
  const notices: string[] = [];

  // Lignes : regroupées par variante, quantités limitées au stock
  const wanted = new Map<string, number>();
  for (const l of req.lines.slice(0, 50)) {
    if (typeof l.variantId !== "string" || !Number.isFinite(l.quantity)) continue;
    wanted.set(l.variantId, (wanted.get(l.variantId) ?? 0) + Math.max(0, Math.floor(l.quantity)));
  }
  const resolved: ResolvedLine[] = [];
  for (const [variantId, qty] of wanted) {
    if (qty <= 0) continue;
    const product = raws.find((p) => p.variants.some((v) => v.id === variantId && v.active));
    const variant = product?.variants.find((v) => v.id === variantId);
    if (!product || !variant) {
      notices.push("Un article n'est plus disponible et a été retiré de votre panier.");
      continue;
    }
    if (!variantAvailable(variant)) {
      notices.push(`${product.name} est épuisé et a été retiré de votre panier.`);
      continue;
    }
    const limited = variant.track_stock && !variant.allow_backorder;
    const maxQty = limited ? Math.min(MAX_QTY, variant.stock) : MAX_QTY;
    const quantity = Math.min(qty, maxQty);
    if (quantity < qty) notices.push(`${product.name} : quantité ajustée au stock disponible (${quantity}).`);
    const { price, compareAt } = displayPrice(variant, ctx);
    const summary = toSummary(product, ctx);
    resolved.push({
      variantId,
      productId: product.id,
      slug: product.slug,
      name: product.name,
      variantLabel: variant.label ?? "",
      image: summary.media[0]?.url ?? null,
      unitPrice: price,
      compareAt,
      quantity,
      maxQty,
      lineTotal: price * quantity,
      product,
      variant,
      categoryId: product.category_id,
    });
  }

  // Livraison : retrait, livraison locale au km, ou envoi postal (zones de Admin › Livraison)
  const zone = ctx.zone;
  const options: (ShippingOptionView & { freeAbove: number | null; base: number })[] = [];
  let mode: CartView["shipping"]["mode"] = "postal";
  let distanceKm: number | null = null;
  let addressLabel: string | null = null;

  if (pickup) {
    mode = "pickup";
    // Adresse exacte et horaires : seulement après le paiement (email de confirmation)
    options.push({ id: "retrait", name: "Retrait à la boutique", description: publicPickupLabel(d.originAddress), eta: "Adresse exacte et horaires envoyés par email après votre achat", amount: 0, free: true, freeAbove: null, base: 0 });
  } else {
    if (ctx.country === "FR" && d.localEnabled && d.originLat !== null && d.originLon !== null && req.address?.line1?.trim() && req.address.city?.trim()) {
      const geo = await geocodeFR(req.address);
      if (geo) {
        addressLabel = geo.label;
        distanceKm = await roadDistanceKm({ lat: d.originLat, lon: d.originLon }, geo);
        const tier = localTier(distanceKm, d.localTiers);
        if (tier) {
          const price = tier.price;
          mode = "local";
          options.push({
            id: "local",
            name: "Livraison à domicile",
            description: `Metz et alentours · à moins de ${tier.maxKm.toLocaleString("fr-FR")} km de la boutique`,
            eta: d.localEta || null,
            amount: baseAmountIn(price, ctx),
            free: false,
            freeAbove: d.localFreeAbove === null ? null : convertFromBase(d.localFreeAbove, ctx.base, ctx.currency),
            base: price,
          });
        }
      }
    }
    if (mode === "postal") {
      for (const m of zone?.methods.filter((m) => m.active) ?? []) {
        const p = shippingPrice(m, ctx);
        if (p) options.push({ id: m.id, name: m.name, description: m.description, eta: m.eta, amount: p.amount, free: false, freeAbove: p.freeAbove, base: p.amount });
      }
    }
  }
  const selected = options.find((o) => o.id === req.methodId) ?? options[0] ?? null;

  // Code promo
  const subtotal = resolved.reduce((s, l) => s + l.lineTotal, 0);
  let promo: CartView["promo"] = null;
  let promoRule: PromoRule | null = null;
  if (req.promoCode?.trim()) {
    const code = req.promoCode.trim().toUpperCase();
    const rule = await findPromo(code, ctx);
    if (!rule) promo = { code, ok: false, message: "Ce code n'existe pas." };
    else {
      const needsHistory = rule.firstOrderOnly && req.email;
      const problem = promoProblem(rule, { subtotal, previousOrders: needsHistory ? await previousOrders(req.email!) : 0 });
      if (problem === "minimum") promo = { code, ok: false, message: `Ce code s'applique dès ${formatMoney(rule.minSubtotal!, ctx.currency)} d'achat.` };
      else if (problem) promo = { code, ok: false, message: problem };
      else {
        promoRule = rule;
        promo = {
          code,
          ok: true,
          message: rule.kind === "percent" ? `−${rule.percent} %` : rule.kind === "amount" ? `−${formatMoney(rule.amount!, ctx.currency)}` : "Livraison offerte",
        };
      }
    }
  }

  const giftWrapEnabled = settings.store.giftWrap;
  const giftWrapPrice = baseAmountIn(settings.store.giftWrapPrice, ctx);
  const giftWrapSelected = giftWrapEnabled && Boolean(req.giftWrap);

  const quote = computeQuote({
    lines: resolved.map((l) => ({ unitPrice: l.unitPrice, quantity: l.quantity, categoryId: l.categoryId })),
    promo: promoRule,
    shipping: selected ? { amount: selected.amount, freeAbove: selected.freeAbove } : null,
    giftWrap: giftWrapSelected ? giftWrapPrice : 0,
    taxMode: ctx.taxMode,
    vatRate: ctx.vatRate,
  });
  // Mode par mode : offert ou non avec ce panier
  const afterDiscount = quote.subtotal - quote.discount;
  for (const o of options) {
    o.free = o.id === "retrait" || promoRule?.kind === "free_shipping" || (o.freeAbove !== null && afterDiscount >= o.freeAbove);
    if (o.free) o.amount = 0;
  }
  const thresholds = options.map((o) => o.freeAbove).filter((v): v is number => v !== null);

  return {
    resolved,
    lines: resolved.map(({ product: _p, variant: _v, categoryId: _c, ...line }) => line),
    currency: { code: ctx.currency.code, symbol: ctx.currency.symbol, decimals: ctx.currency.decimals },
    quote,
    notices,
    promo,
    shipping: {
      mode,
      distanceKm,
      addressLabel,
      country: ctx.country,
      served: options.length > 0,
      zoneName: mode === "postal" ? (zone?.name ?? null) : mode === "local" ? "Livraison locale" : "Retrait à la boutique",
      taxMode: ctx.taxMode,
      customsNotice: mode === "postal" ? (zone?.customs_notice ?? null) : null,
      options: options.map(({ freeAbove: _f, base: _b, ...o }) => o),
      selectedId: selected?.id ?? null,
    },
    freeShippingFrom: thresholds.length ? Math.min(...thresholds) : null,
    giftWrap: { enabled: giftWrapEnabled, price: giftWrapPrice, selected: giftWrapSelected },
    storeOpen: settings.store.open,
    closedMessage: settings.store.closedMessage,
    pickup: { enabled: d.pickupEnabled, address: publicPickupLabel(d.originAddress), hours: "", instructions: d.pickupInstructions },
    local: {
      enabled: d.localEnabled && d.localTiers.length > 0,
      radiusKm: localRadius(d.localTiers),
      near: d.originLat !== null && d.originLon !== null ? { lat: Math.round(d.originLat * 100) / 100, lon: Math.round(d.originLon * 100) / 100 } : null,
    },
    slots: d.slotsEnabled ? { pickup: availableDays(slotSettings(d, "pickup")), local: availableDays(slotSettings(d, "local")) } : null,
  };
}

"use server";

import { z } from "zod";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { adminDb, authClient, isSupabaseConfigured } from "@/lib/supabase";
import { buildCart } from "@/lib/cart";
import { getProducts } from "@/lib/catalog";
import { getVisitorCurrency } from "@/lib/currencies";
import { getSettings } from "@/lib/settings";
import { getStripe, paymentSimulated } from "@/lib/stripe";
import { finalizePaidOrder } from "@/lib/orders";
import { sendEmail, sendTemplate, siteUrl } from "@/lib/email";
import type { CartRequest, CartView } from "@/lib/cart-types";
import type { ProductSummary } from "@/lib/catalog-types";

// Actions publiques de la boutique. Chaque entrée est vérifiée : rien de ce qui vient
// du navigateur n'est cru sur parole (prix, stock, frais de port et réductions sont recalculés).

export type FormState = { ok?: string; error?: string; fieldErrors?: Record<string, string> } | undefined;

const lineSchema = z.array(z.object({ variantId: z.string().min(1).max(64), quantity: z.number().int().min(1).max(99) })).max(50);

/** Panier chiffré pour l'affichage (tiroir, page panier, caisse). */
export async function quoteCart(req: CartRequest): Promise<CartView> {
  const lines = lineSchema.safeParse(req.lines);
  const { resolved: _resolved, ...view } = await buildCart({
    lines: lines.success ? lines.data : [],
    country: typeof req.country === "string" && /^[A-Z]{2}$/.test(req.country) ? req.country : undefined,
    methodId: typeof req.methodId === "string" ? req.methodId : null,
    promoCode: typeof req.promoCode === "string" ? req.promoCode.slice(0, 24) : null,
    giftWrap: req.giftWrap === true,
    email: typeof req.email === "string" && req.email.includes("@") ? req.email.slice(0, 200) : null,
    delivery: req.delivery === "retrait" ? "retrait" : "livraison",
    address: cleanAddress(req.address),
  });
  return view;
}

function cleanAddress(a: unknown) {
  if (!a || typeof a !== "object") return null;
  const v = a as Record<string, unknown>;
  const str = (k: string, max: number) => (typeof v[k] === "string" ? (v[k] as string).trim().slice(0, max) : "");
  const address = { line1: str("line1", 200), postalCode: str("postalCode", 20), city: str("city", 100) };
  return address.line1 && address.city ? address : null;
}

const checkoutSchema = z.object({
  email: z.email("Adresse email invalide.").max(200),
  phone: z.string().trim().min(6, "Téléphone requis (pour le transporteur).").max(30),
  firstName: z.string().trim().min(1, "Prénom requis.").max(80),
  lastName: z.string().trim().min(1, "Nom requis.").max(80),
  delivery: z.enum(["livraison", "retrait"]).default("livraison"),
  line1: z.string().trim().max(200).optional().default(""),
  line2: z.string().trim().max(200).optional().default(""),
  postalCode: z.string().trim().max(20).optional().default(""),
  city: z.string().trim().max(100).optional().default(""),
  country: z.string().regex(/^[A-Z]{2}$/, "Pays requis."),
  methodId: z.string().min(1, "Choisissez un mode de livraison."),
  promoCode: z.string().trim().max(24).optional().default(""),
  giftWrap: z.boolean().default(false),
  giftMessage: z.string().trim().max(300, "Message cadeau : 300 caractères maximum.").optional().default(""),
  notes: z.string().trim().max(500).optional().default(""),
  marketing: z.boolean().default(false),
  acceptTerms: z.literal(true, { error: "Merci d'accepter les conditions générales de vente." }),
  lines: lineSchema.min(1, "Votre panier est vide."),
}).superRefine((v, ctx) => {
  // Livraison : adresse complète requise (le retrait se fait à la boutique)
  if (v.delivery === "livraison") {
    if (v.line1.length < 3) ctx.addIssue({ code: "custom", path: ["line1"], message: "Adresse requise." });
    if (!v.city) ctx.addIssue({ code: "custom", path: ["city"], message: "Ville requise." });
    if (v.country === "FR" && !/^\d{5}$/.test(v.postalCode)) ctx.addIssue({ code: "custom", path: ["postalCode"], message: "Code postal à 5 chiffres." });
  }
});

export type CheckoutInput = z.input<typeof checkoutSchema>;
export type CheckoutResult = { url?: string; error?: string; fieldErrors?: Record<string, string> };

/** Crée la commande (en attente de paiement) puis ouvre la page de paiement sécurisée Stripe. */
export async function placeOrder(input: CheckoutInput): Promise<CheckoutResult> {
  const parsed = checkoutSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] ??= issue.message;
    return { error: "Merci de vérifier les champs indiqués.", fieldErrors };
  }
  const data = parsed.data;
  if (!isSupabaseConfigured) return { error: "La boutique est en cours de configuration : les commandes ouvrent très bientôt." };

  const settings = await getSettings();
  if (!settings.store.open) return { error: settings.store.closedMessage || "La boutique est momentanément fermée aux commandes." };

  const stripe = getStripe();
  if (!stripe && !paymentSimulated()) return { error: "Le paiement en ligne est momentanément indisponible. Réessayez dans quelques instants." };

  const pickup = data.delivery === "retrait";
  const cart = await buildCart({
    lines: data.lines,
    country: pickup ? "FR" : data.country,
    methodId: data.methodId,
    promoCode: data.promoCode || null,
    giftWrap: data.giftWrap,
    email: data.email,
    delivery: data.delivery,
    address: pickup ? null : { line1: data.line1, postalCode: data.postalCode, city: data.city },
  }, { fresh: true });
  if (cart.notices.length) return { error: cart.notices.join(" ") + " Vérifiez votre panier puis validez à nouveau." };
  if (!cart.lines.length) return { error: "Votre panier est vide." };
  if (!cart.shipping.served) return { error: "Nous ne livrons pas encore ce pays.", fieldErrors: { country: "Pays non desservi." } };
  if (cart.shipping.selectedId !== data.methodId) return { error: "Ce mode de livraison n'est pas disponible pour ce pays.", fieldErrors: { methodId: "Mode indisponible." } };
  if (data.promoCode && !cart.promo?.ok) return { error: cart.promo?.message ?? "Code promo invalide.", fieldErrors: { promoCode: cart.promo?.message ?? "Code invalide." } };

  const currency = await getVisitorCurrency();
  const method = cart.shipping.options.find((o) => o.id === data.methodId)!;
  const db = adminDb();
  // Retrait : l'adresse de la commande est celle de la boutique
  const shop = settings.delivery.originAddress;
  const shopMatch = /(\d{5})\s+(.+)$/.exec(shop);
  const ship = pickup
    ? { ship_line1: "Retrait à la boutique", ship_line2: shop, ship_postal_code: shopMatch?.[1] ?? null, ship_city: shopMatch?.[2] ?? "Metz", ship_country: "FR" }
    : { ship_line1: data.line1, ship_line2: data.line2 || null, ship_postal_code: data.postalCode || null, ship_city: data.city, ship_country: data.country };

  const { data: order, error } = await db
    .from("orders")
    .insert({
      email: data.email.toLowerCase(),
      phone: data.phone,
      first_name: data.firstName,
      last_name: data.lastName,
      ...ship,
      delivery_type: cart.shipping.mode,
      delivery_distance_km: cart.shipping.distanceKm,
      currency_code: currency.code,
      fx_rate: currency.rate,
      tax_mode: cart.shipping.taxMode,
      subtotal: cart.quote.subtotal,
      discount: cart.quote.discount,
      shipping: cart.quote.shipping,
      gift_wrap: cart.quote.giftWrap,
      total: cart.quote.total,
      tax_included: cart.quote.taxIncluded,
      promo_code: cart.promo?.ok ? cart.promo.code : null,
      shipping_method: method.name,
      shipping_zone: cart.shipping.zoneName,
      gift_message: data.giftMessage || null,
      notes: data.notes || null,
      marketing_consent: data.marketing,
      payment_provider: stripe ? "stripe" : "test",
    })
    .select("id, number, access_token")
    .single();
  if (error || !order) {
    console.error("[commande]", error?.message);
    return { error: "La commande n'a pas pu être enregistrée. Réessayez dans un instant." };
  }

  const { error: itemsError } = await db.from("order_items").insert(
    cart.resolved.map((l) => ({
      order_id: order.id,
      product_id: l.productId,
      variant_id: l.variantId,
      sku: l.variant.sku,
      product_name: l.name,
      variant_label: l.variantLabel || null,
      image_url: l.image,
      unit_price: l.unitPrice,
      quantity: l.quantity,
      line_total: l.lineTotal,
    })),
  );
  if (itemsError) {
    await db.from("orders").delete().eq("id", order.id);
    return { error: "La commande n'a pas pu être enregistrée. Réessayez dans un instant." };
  }

  const confirmation = `${siteUrl}/commande/confirmation?ref=${order.access_token}`;

  // Développement sans Stripe : paiement simulé pour tester tout le parcours
  if (!stripe) {
    await finalizePaidOrder(order.id, { provider: "test" });
    return { url: confirmation };
  }

  const cur = currency.code.toLowerCase();
  const absolute = (url: string | null) => (url ? (url.startsWith("http") ? url : `${siteUrl}${url}`) : null);
  try {
    let coupon: string | undefined;
    if (cart.quote.discount > 0) {
      const c = await stripe.coupons.create(
        { amount_off: cart.quote.discount, currency: cur, duration: "once", max_redemptions: 1, name: cart.promo?.code ?? "Réduction" },
        { idempotencyKey: `coupon-${order.id}` },
      );
      coupon = c.id;
    }
    const session = await stripe.checkout.sessions.create(
      {
        mode: "payment",
        locale: "fr",
        customer_email: data.email,
        client_reference_id: order.id,
        metadata: { order_id: order.id, order_number: order.number },
        payment_intent_data: { metadata: { order_id: order.id, order_number: order.number }, description: `Commande ${order.number}` },
        line_items: [
          ...cart.lines.map((l) => {
            const image = absolute(l.image);
            return {
              quantity: l.quantity,
              price_data: {
                currency: cur,
                unit_amount: l.unitPrice,
                product_data: { name: l.name, ...(l.variantLabel ? { description: l.variantLabel } : {}), ...(image?.startsWith("https://") ? { images: [image] } : {}) },
              },
            };
          }),
          ...(cart.quote.giftWrap > 0 ? [{ quantity: 1, price_data: { currency: cur, unit_amount: cart.quote.giftWrap, product_data: { name: "Emballage cadeau" } } }] : []),
        ],
        shipping_options: [{ shipping_rate_data: { type: "fixed_amount", display_name: method.name, fixed_amount: { amount: cart.quote.shipping, currency: cur } } }],
        ...(coupon ? { discounts: [{ coupon }] } : {}),
        success_url: `${confirmation}&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${siteUrl}/commande?annule=1`,
        expires_at: Math.floor(Date.now() / 1000) + 60 * 60,
      },
      { idempotencyKey: `checkout-${order.id}` },
    );
    await db.from("orders").update({ payment_session_id: session.id }).eq("id", order.id);
    return { url: session.url ?? confirmation };
  } catch (err) {
    console.error("[stripe]", err);
    await db.from("orders").update({ status: "abandonnee" }).eq("id", order.id);
    return { error: "Le paiement n'a pas pu être ouvert. Vérifiez vos informations ou réessayez." };
  }
}

// ─────────────────────────────────────────────────────────────
// Newsletter, contact, avis, alerte retour en stock
// ─────────────────────────────────────────────────────────────

const emailSchema = z.email("Adresse email invalide.").max(200);

export async function subscribeNewsletter(_: FormState, formData: FormData): Promise<FormState> {
  const email = emailSchema.safeParse(String(formData.get("email") ?? "").trim());
  if (!email.success) return { error: email.error.issues[0].message };
  if (formData.get("website")) return { ok: "Merci !" }; // champ piège anti-robots
  if (isSupabaseConfigured) {
    const { error } = await adminDb()
      .from("newsletter_subscribers")
      .upsert({ email: email.data.toLowerCase(), source: String(formData.get("source") ?? "site").slice(0, 30), unsubscribed_at: null, subscribed_at: new Date().toISOString() }, { onConflict: "email" });
    if (error) return { error: "Inscription impossible pour le moment." };
  }
  return { ok: "Bienvenue dans le cercle ISSEYE." };
}

const contactSchema = z.object({
  name: z.string().trim().min(1, "Votre nom est requis.").max(120),
  email: emailSchema,
  phone: z.string().trim().max(30),
  subject: z.string().trim().min(1, "Choisissez un sujet.").max(120),
  orderNumber: z.string().trim().max(20),
  message: z.string().trim().min(10, "Votre message est un peu court.").max(4000),
});

export async function sendContact(_: FormState, formData: FormData): Promise<FormState> {
  if (formData.get("website")) return { ok: "Merci, votre message a bien été envoyé." };
  const parsed = contactSchema.safeParse(Object.fromEntries(["name", "email", "phone", "subject", "orderNumber", "message"].map((k) => [k, String(formData.get(k) ?? "")])));
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] ??= issue.message;
    return { error: "Merci de vérifier le formulaire.", fieldErrors };
  }
  const m = parsed.data;
  if (!isSupabaseConfigured) return { error: "Le formulaire ouvre très bientôt. En attendant, écrivez-nous par email." };
  const { error } = await adminDb()
    .from("contact_messages")
    .insert({ name: m.name, email: m.email.toLowerCase(), phone: m.phone || null, subject: m.subject, order_number: m.orderNumber || null, message: m.message });
  if (error) return { error: "Envoi impossible pour le moment. Réessayez dans un instant." };

  const settings = await getSettings();
  const to = settings.store.notifyEmail || settings.contact.email;
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  if (to) {
    await sendEmail({
      to,
      replyTo: m.email,
      subject: `Contact : ${m.subject}${m.orderNumber ? ` (${m.orderNumber})` : ""}`,
      html: `<p><strong>${esc(m.name)}</strong> &lt;${esc(m.email)}&gt;${m.phone ? ` · ${esc(m.phone)}` : ""}</p><p>${esc(m.message).replace(/\n/g, "<br>")}</p>`,
    });
  }
  await sendTemplate("contact_received", m.email, { prenom: m.name.split(" ")[0] });
  return { ok: "Merci, votre message a bien été envoyé. Nous vous répondons sous 48 heures ouvrées." };
}

const reviewSchema = z.object({
  author: z.string().trim().min(1, "Votre prénom est requis.").max(60),
  email: z.email("Email invalide.").max(200).or(z.literal("")),
  rating: z.coerce.number().int().min(1, "Choisissez une note.").max(5),
  title: z.string().trim().max(120),
  body: z.string().trim().min(10, "Quelques mots de plus ?").max(2000),
});

export async function submitReview(productId: string, _: FormState, formData: FormData): Promise<FormState> {
  if (formData.get("website")) return { ok: "Merci pour votre avis !" };
  const parsed = reviewSchema.safeParse(Object.fromEntries(["author", "email", "rating", "title", "body"].map((k) => [k, String(formData.get(k) ?? "")])));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  if (!isSupabaseConfigured) return { error: "Les avis ouvrent très bientôt." };
  const db = adminDb();
  const { data: product } = await db.from("products").select("id").eq("id", productId).eq("status", "active").maybeSingle();
  if (!product) return { error: "Produit introuvable." };

  // Achat vérifié : une commande payée avec cet email contient ce produit
  let verified = false;
  let orderId: string | null = null;
  if (parsed.data.email) {
    const { data } = await db
      .from("order_items")
      .select("order_id, orders!inner(email, status)")
      .eq("product_id", productId)
      .eq("orders.email", parsed.data.email.toLowerCase())
      .in("orders.status", ["payee", "en_preparation", "prete_retrait", "expediee", "livree"])
      .limit(1);
    if (data?.length) {
      verified = true;
      orderId = data[0].order_id;
    }
  }
  const { error } = await db.from("reviews").insert({
    product_id: productId,
    order_id: orderId,
    author_name: parsed.data.author,
    rating: parsed.data.rating,
    title: parsed.data.title || null,
    body: parsed.data.body,
    verified,
  });
  if (error) return { error: "Envoi impossible pour le moment." };
  return { ok: "Merci ! Votre avis sera publié après relecture." };
}

export async function requestStockAlert(variantId: string, _: FormState, formData: FormData): Promise<FormState> {
  const email = emailSchema.safeParse(String(formData.get("email") ?? "").trim());
  if (!email.success) return { error: email.error.issues[0].message };
  if (!isSupabaseConfigured) return { ok: "C'est noté." };
  const { error } = await adminDb().from("stock_alerts").upsert({ variant_id: variantId, email: email.data.toLowerCase(), notified_at: null }, { onConflict: "variant_id,email" });
  if (error) return { error: "Inscription impossible pour le moment." };
  return { ok: "C'est noté : nous vous écrivons dès son retour." };
}

/** Produits des favoris (enregistrés dans le navigateur). */
export async function wishlistProducts(ids: string[]): Promise<ProductSummary[]> {
  const clean = ids.filter((id) => typeof id === "string" && id.length <= 64).slice(0, 60);
  return clean.length ? getProducts({ ids: clean }) : [];
}

// ─────────────────────────────────────────────────────────────
// Espace cliente (facultatif) : connexion par lien envoyé par email
// ─────────────────────────────────────────────────────────────

export async function sendLoginLink(_: FormState, formData: FormData): Promise<FormState> {
  const email = emailSchema.safeParse(String(formData.get("email") ?? "").trim());
  if (!email.success) return { error: email.error.issues[0].message };
  if (!isSupabaseConfigured) return { error: "L'espace cliente ouvre très bientôt." };
  const origin = (await headers()).get("origin") ?? siteUrl;
  const supabase = await authClient();
  const { error } = await supabase.auth.signInWithOtp({ email: email.data, options: { emailRedirectTo: `${origin}/auth/confirm?next=/compte`, shouldCreateUser: true } });
  if (error) return { error: error.status === 429 ? "Trop de demandes : patientez une minute." : "Envoi impossible pour le moment." };
  return { ok: `Un lien de connexion vient d'être envoyé à ${email.data}. Il est valable une heure.` };
}

export async function logoutCustomer() {
  if (isSupabaseConfigured) await (await authClient()).auth.signOut();
  redirect("/compte");
}

export async function setNewsletter(subscribed: boolean) {
  if (!isSupabaseConfigured) return;
  const { data } = await (await authClient()).auth.getUser();
  const email = data.user?.email?.toLowerCase();
  if (!email) return;
  const db = adminDb();
  if (subscribed) await db.from("newsletter_subscribers").upsert({ email, source: "compte", unsubscribed_at: null }, { onConflict: "email" });
  else await db.from("newsletter_subscribers").update({ unsubscribed_at: new Date().toISOString() }).eq("email", email);
}

/** Suivi sans compte : numéro de commande + email. */
export async function findOrder(_: FormState, formData: FormData): Promise<FormState> {
  const number = String(formData.get("number") ?? "").trim().toUpperCase().replace(/\s/g, "");
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!number || !email) return { error: "Indiquez votre numéro de commande et votre email." };
  if (!isSupabaseConfigured) return { error: "Aucune commande ne correspond." };
  const { data } = await adminDb().from("orders").select("access_token").eq("number", number.startsWith("ISY-") ? number : `ISY-${number}`).eq("email", email).maybeSingle();
  if (!data) return { error: "Aucune commande ne correspond à ces informations." };
  redirect(`/suivi/${data.access_token}`);
}

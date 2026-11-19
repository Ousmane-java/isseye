import { test } from "node:test";
import assert from "node:assert/strict";
import { defaultCurrencies } from "./currency.ts";
import { baseAmountIn, computeQuote, displayPrice, promoProblem, type PricingContext, type PromoRule } from "./pricing.ts";

const [EUR, XOF, , USD] = defaultCurrencies;
const ctx = (currency = EUR, over: Partial<PricingContext> = {}): PricingContext => ({ currency, base: EUR, taxMode: "ttc", exportPricing: "ttc", vatRate: 20, ...over });

test("prix affiché : conversion automatique depuis l'euro", () => {
  assert.deepEqual(displayPrice({ price: 3500, compare_at_price: null }, ctx()), { price: 3500, compareAt: null });
  assert.deepEqual(displayPrice({ price: 3500, compare_at_price: null }, ctx(XOF)), { price: 23_000, compareAt: null });
  assert.deepEqual(displayPrice({ price: 3500, compare_at_price: null }, ctx(USD)), { price: 3790, compareAt: null });
});

test("prix affiché : le prix fixé à la main l'emporte", () => {
  const prices = [{ currency_code: "XOF", amount: 22_000, compare_at_amount: 25_000 }];
  assert.deepEqual(displayPrice({ price: 3500, compare_at_price: null, prices }, ctx(XOF)), { price: 22_000, compareAt: 25_000 });
  assert.deepEqual(displayPrice({ price: 3500, compare_at_price: null, prices }, ctx(USD)), { price: 3790, compareAt: null });
});

test("prix barré ignoré s'il n'est pas supérieur au prix", () => {
  assert.equal(displayPrice({ price: 3500, compare_at_price: 3000 }, ctx()).compareAt, null);
  assert.equal(displayPrice({ price: 3500, compare_at_price: 4500 }, ctx()).compareAt, 4500);
});

test("export : même prix par défaut, hors TVA si l'option est choisie", () => {
  assert.equal(displayPrice({ price: 3600, compare_at_price: null }, ctx(EUR, { taxMode: "export" })).price, 3600);
  assert.equal(displayPrice({ price: 3600, compare_at_price: null }, ctx(EUR, { taxMode: "export", exportPricing: "ht" })).price, 3000);
  // 36 € TTC → 30 € HT → 19 678 FCFA → 20 000 FCFA
  assert.equal(displayPrice({ price: 3600, compare_at_price: null }, ctx(XOF, { taxMode: "export", exportPricing: "ht" })).price, 20_000);
  assert.equal(baseAmountIn(2900, ctx(XOF)), 19_500);
});

const promo = (over: Partial<PromoRule>): PromoRule => ({
  code: "BIENVENUE",
  kind: "percent",
  percent: 10,
  amount: null,
  minSubtotal: null,
  categoryIds: [],
  startsAt: null,
  endsAt: null,
  maxUses: null,
  uses: 0,
  active: true,
  firstOrderOnly: false,
  ...over,
});

test("panier : sous-total, réduction en %, livraison et TVA comprise", () => {
  const q = computeQuote({
    lines: [{ unitPrice: 3500, quantity: 2, categoryId: "c1" }],
    promo: promo({}),
    shipping: { amount: 690, freeAbove: 6000 },
    taxMode: "ttc",
    vatRate: 20,
  });
  // 70 € − 7 € = 63 € ≥ 60 € → livraison offerte
  assert.deepEqual(q, { subtotal: 7000, discount: 700, shipping: 0, shippingFree: true, giftWrap: 0, total: 6300, taxIncluded: 1050 });
});

test("panier : livraison payante sous le seuil, aucune TVA à l'export", () => {
  const q = computeQuote({ lines: [{ unitPrice: 23_000, quantity: 1, categoryId: null }], shipping: { amount: 19_500, freeAbove: null }, taxMode: "export", vatRate: 20 });
  assert.equal(q.total, 42_500);
  assert.equal(q.taxIncluded, 0);
});

test("panier : réduction fixe plafonnée, limitée aux catégories du code, livraison offerte par code", () => {
  const lines = [
    { unitPrice: 3500, quantity: 1, categoryId: "parfums" },
    { unitPrice: 2000, quantity: 1, categoryId: "coffrets" },
  ];
  assert.equal(computeQuote({ lines, promo: promo({ kind: "amount", amount: 5000, categoryIds: ["parfums"] }), taxMode: "ttc", vatRate: 20 }).discount, 3500);
  const free = computeQuote({ lines, promo: promo({ kind: "free_shipping" }), shipping: { amount: 690, freeAbove: null }, taxMode: "ttc", vatRate: 20 });
  assert.equal(free.shipping, 0);
  assert.equal(free.discount, 0);
});

test("codes promo : dates, limite, première commande, minimum", () => {
  const now = new Date("2026-10-23T12:00:00Z");
  assert.equal(promoProblem(promo({}), { subtotal: 1000, now }), null);
  assert.match(promoProblem(promo({ endsAt: "2026-10-01T00:00:00Z" }), { subtotal: 1000, now })!, /expiré/);
  assert.match(promoProblem(promo({ maxUses: 5, uses: 5 }), { subtotal: 1000, now })!, /limite/);
  assert.match(promoProblem(promo({ firstOrderOnly: true }), { subtotal: 1000, now, previousOrders: 1 })!, /première/);
  assert.equal(promoProblem(promo({ minSubtotal: 5000 }), { subtotal: 1000, now }), "minimum");
  assert.match(promoProblem(promo({ kind: "amount", amount: null }), { subtotal: 1000, now })!, /devise/);
});

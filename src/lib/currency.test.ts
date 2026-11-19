import { test } from "node:test";
import assert from "node:assert/strict";
import { convertFromBase, defaultCurrencies, formatMoney, parseMoney, priceIn, roundPrice } from "./currency.ts";

const [EUR, XOF, XAF, USD] = defaultCurrencies;

test("euro : le prix de référence est renvoyé tel quel", () => {
  assert.equal(convertFromBase(3750, EUR, EUR), 3750);
});

test("FCFA : parité fixe puis arrondi au 500 supérieur", () => {
  assert.equal(convertFromBase(3750, EUR, XOF), 25_000); // 37,50 € = 24 598 FCFA
  assert.equal(convertFromBase(5000, EUR, XAF), 33_000); // 50 € = 32 798 FCFA
  assert.equal(convertFromBase(7622, EUR, XOF), 50_000); // 76,22 € = 49 997 FCFA
});

test("dollar : arrondi au dollar supérieur puis prix en ,90", () => {
  assert.equal(convertFromBase(3500, EUR, USD), 3790); // 35 € × 1,08 = 37,80 $
  assert.equal(convertFromBase(10000, EUR, USD), 10790); // 100 € × 1,08 = 108,00 $ → 107,90 $
});

test("arrondi : un montant déjà rond n'est pas augmenté", () => {
  assert.equal(roundPrice(25_000, XOF), 25_000);
  assert.equal(roundPrice(10800, USD), 10790);
});

test("prix fixé à la main prioritaire sur le calcul", () => {
  assert.equal(priceIn(3750, XOF, EUR, { XOF: 24_000 }), 24_000);
  assert.equal(priceIn(3750, XOF, EUR, { USD: 4000 }), 25_000);
});

test("affichage au format français", () => {
  assert.equal(formatMoney(25_000, XOF), "25 000 FCFA");
  assert.equal(formatMoney(3790, USD), "37,90 $");
  assert.equal(formatMoney(4500, EUR), "45 €");
});

test("saisie admin", () => {
  assert.equal(parseMoney("37,90", EUR), 3790);
  assert.equal(parseMoney("25 000", XOF), 25_000);
  assert.equal(parseMoney("45", EUR), 4500);
  assert.equal(parseMoney("12,5", XOF), null);
  assert.equal(parseMoney("abc", EUR), null);
});

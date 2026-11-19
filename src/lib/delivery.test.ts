import { test } from "node:test";
import assert from "node:assert/strict";
import { haversineKm, localPrice, localRadius } from "./delivery.ts";

const tiers = [
  { maxKm: 10, price: 800 },
  { maxKm: 5, price: 500 },
  { maxKm: 20, price: 1200 },
];

test("livraison locale : tranche selon la distance", () => {
  assert.equal(localPrice(0.4, tiers), 500);
  assert.equal(localPrice(5, tiers), 500);
  assert.equal(localPrice(5.01, tiers), 800);
  assert.equal(localPrice(19.9, tiers), 1200);
  assert.equal(localPrice(20.5, tiers), null);
  assert.equal(localRadius(tiers), 20);
});

test("distance à vol d'oiseau : Metz centre → rue de la Ronde ≈ 1,7 km", () => {
  const d = haversineKm({ lat: 49.127456, lon: 6.159235 }, { lat: 49.117359, lon: 6.175671 });
  assert.ok(d > 1.4 && d < 2, String(d));
});

test("adresse de retrait publique : sans numéro ni code postal", async () => {
  const { publicPickupLabel } = await import("./delivery.ts");
  assert.equal(publicPickupLabel("7 Rue de la Ronde 57050 Metz"), "Rue de la Ronde, Metz");
  assert.equal(publicPickupLabel("12 bis avenue Foch, 57000 Metz"), "avenue Foch, Metz");
});

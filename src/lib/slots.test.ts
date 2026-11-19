import { test } from "node:test";
import assert from "node:assert/strict";
import { availableDays, isSlotAvailable, isValidSlot, slotLabel } from "./slots.ts";

const settings = { days: [1, 2, 3, 4, 5, 6], slots: ["14:00-19:00", "10:00-12:00"], leadHours: 20, horizonDays: 7, closedDates: ["2026-11-25"] };
// Vendredi 20 novembre 2026, 15 h 30 à Paris (14 h 30 UTC)
const now = new Date("2026-11-20T14:30:00Z");

test("créneaux : délai de 20 h, dimanche fermé, jour férié exclu", () => {
  const days = availableDays(settings, now);
  // Samedi 21 : 10-12 trop tôt (avant vendredi 15 h 30 + 20 h = samedi 11 h 30), 14-19 ok
  assert.deepEqual(days[0], { date: "2026-11-21", label: "samedi 21 novembre", slots: ["14:00-19:00"] });
  assert.ok(!days.some((d) => d.date === "2026-11-22"), "dimanche fermé");
  assert.ok(!days.some((d) => d.date === "2026-11-25"), "jour fermé");
  assert.deepEqual(days.find((d) => d.date === "2026-11-23")?.slots, ["10:00-12:00", "14:00-19:00"]);
});

test("créneaux : validation", () => {
  assert.equal(isValidSlot("10:00-12:00"), true);
  assert.equal(isValidSlot("12:00-10:00"), false);
  assert.equal(isValidSlot("10h-12h"), false);
  assert.equal(isSlotAvailable(settings, "2026-11-21", "10:00-12:00", now), false);
  assert.equal(isSlotAvailable(settings, "2026-11-23", "10:00-12:00", now), true);
  assert.equal(slotLabel("14:00-19:30"), "14 h – 19 h 30");
});

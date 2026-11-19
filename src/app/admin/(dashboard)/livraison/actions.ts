"use server";

import { revalidatePath } from "next/cache";
import { audit, requireAdmin, revalidateSite } from "@/lib/admin-auth";
import { adminDb } from "@/lib/supabase";
import { getCurrencies } from "@/lib/currencies";
import { parseMoney } from "@/lib/currency";
import { countries } from "@/config/countries";
import type { ActionState } from "@/lib/admin-types";
import { getSettings } from "@/lib/settings";
import { geocodeFR, roadDistanceKm } from "@/lib/geo";
import { localPrice } from "@/lib/delivery";

const text = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const done = (ok: string): ActionState => {
  revalidatePath("/admin", "layout");
  revalidateSite();
  return { ok };
};

export async function saveZone(id: string | null, _: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireAdmin("shipping");
  const name = text(fd, "name");
  if (!name) return { error: "Nom requis." };
  const codes = [...new Set(text(fd, "countries").toUpperCase().split(/[\s,;]+/).filter(Boolean))];
  const unknown = codes.filter((c) => !countries.some((x) => x.code === c));
  if (unknown.length) return { error: `Codes pays inconnus : ${unknown.join(", ")} (codes à 2 lettres, ex. FR, SN, US).` };
  const db = adminDb();
  // Un pays ne peut appartenir qu'à une zone
  const { data: others } = await db.from("shipping_zones").select("name, countries").neq("id", id ?? "00000000-0000-0000-0000-000000000000");
  const taken = (others ?? []).flatMap((z) => (z.countries as string[]).filter((c) => codes.includes(c)).map((c) => `${c} (${z.name})`));
  if (taken.length) return { error: `Déjà dans une autre zone : ${taken.join(", ")}.` };
  const row = { name, countries: codes, tax_mode: text(fd, "tax_mode") === "export" ? "export" : "ttc", customs_notice: text(fd, "customs_notice") || null, active: fd.get("active") === "on", position: Number(text(fd, "position")) || 0 };
  const { error } = id ? await db.from("shipping_zones").update(row).eq("id", id) : await db.from("shipping_zones").insert(row);
  if (error) return { error: "Enregistrement impossible." };
  await audit(user, id ? "update" : "create", "shipping_zone", id, `Zone ${name} (${codes.length} pays)`);
  return done(id ? "Zone enregistrée." : "Zone créée.");
}

export async function deleteZone(id: string): Promise<ActionState> {
  const user = await requireAdmin("shipping");
  await adminDb().from("shipping_zones").delete().eq("id", id);
  await audit(user, "delete", "shipping_zone", id, "Zone supprimée");
  return done("Zone supprimée.");
}

export async function saveMethod(zoneId: string, id: string | null, _: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireAdmin("shipping");
  const name = text(fd, "name");
  if (!name) return { error: "Nom requis." };
  const template = text(fd, "tracking_url_template");
  if (template && !/^https:\/\/.+\{tracking\}/.test(template)) return { error: "Lien de suivi : https://… contenant {tracking}." };
  const currencies = await getCurrencies();
  const prices = [];
  for (const c of currencies.filter((c) => c.active)) {
    const a = text(fd, `amount_${c.code}`);
    const f = text(fd, `free_${c.code}`);
    if (!a) {
      if (c.is_base) return { error: `Le tarif en ${c.code} est requis.` };
      continue;
    }
    const amount = parseMoney(a, c);
    const free = f ? parseMoney(f, c) : null;
    if (amount === null || (f && free === null)) return { error: `Tarif en ${c.code} invalide.` };
    prices.push({ currency_code: c.code, amount, free_above: free });
  }
  const row = { zone_id: zoneId, name, description: text(fd, "description") || null, eta: text(fd, "eta") || null, carrier: text(fd, "carrier") || null, tracking_url_template: template || null, active: fd.get("active") === "on", position: Number(text(fd, "position")) || 0 };
  const db = adminDb();
  const res = id ? await db.from("shipping_methods").update(row).eq("id", id).select("id").single() : await db.from("shipping_methods").insert(row).select("id").single();
  if (res.error) return { error: "Enregistrement impossible." };
  await db.from("shipping_method_prices").delete().eq("method_id", res.data.id);
  await db.from("shipping_method_prices").insert(prices.map((p) => ({ ...p, method_id: res.data.id })));
  await audit(user, id ? "update" : "create", "shipping_method", res.data.id, `Mode ${name}`);
  return done(id ? "Mode enregistré." : "Mode ajouté.");
}

export async function deleteMethod(id: string): Promise<ActionState> {
  const user = await requireAdmin("shipping");
  await adminDb().from("shipping_methods").delete().eq("id", id);
  await audit(user, "delete", "shipping_method", id, "Mode supprimé");
  return done("Mode supprimé.");
}

// ─────────────────────────────────────────────────────────────
// Retrait en boutique et livraison locale (réglages, géolocalisation de l'adresse)
// ─────────────────────────────────────────────────────────────

export async function saveLocalDelivery(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireAdmin("shipping");
  const originAddress = text(fd, "originAddress");
  if (!originAddress) return { error: "Adresse de la boutique requise." };
  const geo = await geocodeFR({ line1: originAddress });
  if (!geo) return { error: "Adresse introuvable : vérifiez le numéro, la rue, le code postal et la ville." };

  const kms = fd.getAll("tier_km").map((v) => Number(String(v).replace(",", ".")));
  const prices = fd.getAll("tier_price").map((v) => String(v).trim());
  const tiers: { maxKm: number; price: number }[] = [];
  for (const [i, km] of kms.entries()) {
    if (!prices[i] && !km) continue;
    const price = parseMoney(prices[i] || "0", { decimals: 2 });
    if (!(km > 0) || price === null) return { error: `Tranche ${i + 1} : distance ou prix invalide.` };
    tiers.push({ maxKm: km, price });
  }
  tiers.sort((a, b) => a.maxKm - b.maxKm);
  const free = text(fd, "localFreeAbove");
  const freeAbove = free ? parseMoney(free, { decimals: 2 }) : null;
  if (free && freeAbove === null) return { error: "Montant de livraison offerte invalide." };

  const delivery = {
    originAddress: geo.label,
    originLat: geo.lat,
    originLon: geo.lon,
    pickupEnabled: fd.get("pickupEnabled") === "on",
    pickupHours: text(fd, "pickupHours").slice(0, 300),
    pickupInstructions: text(fd, "pickupInstructions").slice(0, 300),
    localEnabled: fd.get("localEnabled") === "on",
    localTiers: tiers,
    localFreeAbove: freeAbove,
    localEta: text(fd, "localEta").slice(0, 120),
  };
  const db = adminDb();
  const { data: row } = await db.from("site_settings").select("data").eq("id", 1).maybeSingle();
  const { error } = await db.from("site_settings").upsert({ id: 1, data: { ...((row?.data as object) ?? {}), delivery } });
  if (error) return { error: "Enregistrement impossible." };
  await audit(user, "update", "settings", "delivery", `Retrait et livraison locale : ${tiers.length} tranche(s)`);
  return done(`Enregistré. Adresse reconnue : ${geo.label}.`);
}

/** Simulateur : distance et prix de la livraison locale pour une adresse. */
export async function simulateLocalDelivery(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin("shipping");
  const { delivery } = await getSettings();
  const geo = await geocodeFR({ line1: text(fd, "address") });
  if (!geo) return { error: "Adresse introuvable." };
  if (delivery.originLat === null || delivery.originLon === null) return { error: "Enregistrez d'abord l'adresse de la boutique." };
  const km = await roadDistanceKm({ lat: delivery.originLat, lon: delivery.originLon }, geo);
  const price = localPrice(km, delivery.localTiers);
  const kmText = km.toLocaleString("fr-FR", { maximumFractionDigits: 1 });
  return price === null
    ? { ok: `${geo.label} : ${kmText} km par la route → hors zone locale, envoi Colissimo.` }
    : { ok: `${geo.label} : ${kmText} km par la route → livraison locale à ${(price / 100).toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €${delivery.localFreeAbove !== null ? ` (offerte dès ${(delivery.localFreeAbove / 100).toLocaleString("fr-FR")} €)` : ""}.` };
}

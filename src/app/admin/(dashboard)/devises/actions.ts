"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { audit, requireAdmin, revalidateSite } from "@/lib/admin-auth";
import { adminDb } from "@/lib/supabase";
import { parseMoney } from "@/lib/currency";
import { countryName } from "@/config/countries";
import { fetchEcbRates } from "@/lib/rates";

export type ActionState = { error?: string; ok?: string } | undefined;

const done = (ok: string): ActionState => {
  revalidatePath("/admin", "layout");
  revalidateSite();
  return { ok };
};

const rateSchema = z.coerce.number({ error: "Taux invalide." }).positive("Le taux doit être positif.").max(1_000_000);

/** Arrondi saisi en unités « normales » (500 FCFA, 1 $, 0,10 $) → unités mineures. */
function roundingFromForm(formData: FormData, decimals: number) {
  const step = parseMoney(String(formData.get("rounding_step") ?? "") || "0", { decimals });
  const ending = parseMoney(String(formData.get("rounding_ending") ?? "") || "0", { decimals });
  if (step === null || ending === null) return null;
  return { rounding_step: Math.max(1, step), rounding_ending: ending };
}

export async function updateCurrency(code: string, _: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireAdmin("currencies");
  const db = adminDb();
  const { data: current } = await db.from("currencies").select("*").eq("code", code).maybeSingle();
  if (!current) return { error: "Devise introuvable." };

  const name = String(formData.get("name") ?? "").trim();
  const symbol = String(formData.get("symbol") ?? "").trim();
  if (!name || !symbol) return { error: "Nom et symbole requis." };

  const rounding = roundingFromForm(formData, current.decimals);
  if (!rounding) return { error: "Arrondi invalide." };
  if (rounding.rounding_ending >= rounding.rounding_step && rounding.rounding_ending > 0) {
    return { error: "La terminaison doit être inférieure au palier d'arrondi." };
  }

  const update: Record<string, unknown> = { name, symbol, ...rounding };
  if (!current.is_base) {
    update.active = formData.get("active") === "on";
    update.rate_locked = formData.get("rate_locked") === "on";
    const rate = rateSchema.safeParse(String(formData.get("rate") ?? "").replace(",", "."));
    if (!rate.success) return { error: rate.error.issues[0].message };
    if (Number(current.rate) !== rate.data) {
      update.rate = rate.data;
      update.rate_updated_at = new Date().toISOString();
    }
  }

  const { error } = await db.from("currencies").update(update).eq("code", code);
  if (error) return { error: "Enregistrement impossible." };
  await audit(user, "update", "currency", code, `Devise ${code} modifiée`);
  return done("Enregistré.");
}

const newCurrencySchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{3}$/, "Code ISO à 3 lettres (ex. GBP)."),
  name: z.string().trim().min(2, "Nom requis.").max(60),
  symbol: z.string().trim().min(1, "Symbole requis.").max(8),
  decimals: z.coerce.number().int().min(0).max(3),
  rate: rateSchema,
});

export async function addCurrency(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireAdmin("currencies");
  const parsed = newCurrencySchema.safeParse({
    code: formData.get("code"),
    name: formData.get("name"),
    symbol: formData.get("symbol"),
    decimals: formData.get("decimals"),
    rate: String(formData.get("rate") ?? "").replace(",", "."),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const db = adminDb();
  const { count } = await db.from("currencies").select("code", { count: "exact", head: true });
  const { error } = await db.from("currencies").insert({
    ...parsed.data,
    rounding_step: parsed.data.decimals > 0 ? 10 ** parsed.data.decimals : 1,
    rounding_ending: 0,
    rate_updated_at: new Date().toISOString(),
    position: count ?? 0,
  });
  if (error) return { error: error.code === "23505" ? "Cette devise existe déjà." : "Ajout impossible." };
  await audit(user, "create", "currency", parsed.data.code, `Devise ${parsed.data.code} ajoutée`);
  return done(`${parsed.data.code} ajoutée.`);
}

export async function deleteCurrency(code: string) {
  const user = await requireAdmin("currencies");
  const db = adminDb();
  const { count } = await db.from("orders").select("id", { count: "exact", head: true }).eq("currency_code", code);
  if (count) throw new Error("Cette devise a déjà servi pour des commandes : désactivez-la plutôt.");
  await db.from("country_currencies").delete().eq("currency_code", code);
  await db.from("currencies").delete().eq("code", code).eq("is_base", false);
  await audit(user, "delete", "currency", code, `Devise ${code} supprimée`);
  done("");
}

/** Met à jour les taux variables depuis la Banque centrale européenne (via Frankfurter). */
export async function refreshRates(): Promise<ActionState> {
  const user = await requireAdmin("currencies");
  const db = adminDb();
  const { data: currencies } = await db.from("currencies").select("code, rate_locked, is_base");
  const targets = (currencies ?? []).filter((c) => !c.is_base && !c.rate_locked).map((c) => c.code);
  if (!targets.length) return { ok: "Aucune devise à taux variable." };

  const rates = await fetchEcbRates(targets);
  if (!rates) return { error: "Le service des taux ne répond pas. Réessayez plus tard ou saisissez le taux à la main." };

  const now = new Date().toISOString();
  const updated: string[] = [];
  for (const code of targets) {
    if (!rates[code]) continue;
    await db.from("currencies").update({ rate: rates[code], rate_updated_at: now }).eq("code", code);
    updated.push(`${code} ${rates[code]}`);
  }
  await audit(user, "update", "currency", null, `Taux mis à jour : ${updated.join(", ")}`);
  const missing = targets.filter((c) => !rates[c]);
  return done(
    `Taux mis à jour : ${updated.join(" · ") || "aucun"}.${missing.length ? ` Non fournis par la BCE : ${missing.join(", ")}.` : ""}`,
  );
}

export async function setCountryCurrency(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireAdmin("currencies");
  const country = String(formData.get("country_code") ?? "").toUpperCase();
  const currency = String(formData.get("currency_code") ?? "").toUpperCase();
  if (!/^[A-Z]{2}$/.test(country)) return { error: "Choisissez un pays." };
  if (!/^[A-Z]{3}$/.test(currency)) return { error: "Choisissez une devise." };

  const { error } = await adminDb()
    .from("country_currencies")
    .upsert({ country_code: country, country_name: countryName(country), currency_code: currency });
  if (error) return { error: "Enregistrement impossible." };
  await audit(user, "update", "country_currency", country, `${countryName(country)} → ${currency}`);
  return done(`${countryName(country)} : prix en ${currency}.`);
}

export async function removeCountry(country: string) {
  const user = await requireAdmin("currencies");
  await adminDb().from("country_currencies").delete().eq("country_code", country);
  await audit(user, "delete", "country_currency", country, `${countryName(country)} retiré (devise par défaut)`);
  done("");
}

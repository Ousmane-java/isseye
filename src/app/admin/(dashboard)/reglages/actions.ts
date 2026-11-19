"use server";

import { revalidatePath } from "next/cache";
import { audit, requireAdmin, revalidateSite } from "@/lib/admin-auth";
import { adminDb } from "@/lib/supabase";
import { settingsSchema, type Settings } from "@/lib/settings-schema";
import { parseMoney } from "@/lib/currency";

export type ActionState = { error?: string; ok?: string } | undefined;
type Section = keyof Settings;

const text = (formData: FormData, key: string) => String(formData.get(key) ?? "");
const bool = (formData: FormData, key: string) => formData.get(key) === "on";

/** Lit les champs d'une section du formulaire (noms identiques aux clés du schéma). */
function readSection(section: Section, formData: FormData): unknown {
  switch (section) {
    case "brand":
      return { name: text(formData, "name"), tagline: text(formData, "tagline"), description: text(formData, "description") };
    case "contact":
      return {
        email: text(formData, "email"),
        phone: text(formData, "phone"),
        whatsapp: text(formData, "whatsapp").replace(/[\s+]/g, ""),
        instagram: text(formData, "instagram"),
        tiktok: text(formData, "tiktok"),
        facebook: text(formData, "facebook"),
        snapchat: text(formData, "snapchat"),
      };
    case "store":
      return {
        open: bool(formData, "open"),
        closedMessage: text(formData, "closedMessage"),
        defaultCurrency: text(formData, "defaultCurrency"),
        currencySwitcher: bool(formData, "currencySwitcher"),
        lowStockEmail: bool(formData, "lowStockEmail"),
        notifyEmail: text(formData, "notifyEmail"),
        exportPricing: text(formData, "exportPricing") === "ht" ? "ht" : "ttc",
        giftWrap: bool(formData, "giftWrap"),
        giftWrapPrice: parseMoney(text(formData, "giftWrapPrice") || "0", { decimals: 2 }) ?? -1,
      };
    case "delivery":
      return null; // réglé depuis Admin › Livraison (géolocalisation de l'adresse)
    case "legal":
      return {
        companyName: text(formData, "companyName"),
        status: text(formData, "status"),
        siret: text(formData, "siret"),
        vatNumber: text(formData, "vatNumber"),
        address: text(formData, "address"),
        mediator: text(formData, "mediator"),
        vatRate: Number(text(formData, "vatRate").replace(",", ".")),
      };
  }
}

export async function saveSettings(section: Section, _: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireAdmin("settings");
  const parsed = settingsSchema.shape[section].safeParse(readSection(section, formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const db = adminDb();
  const { data: row } = await db.from("site_settings").select("data").eq("id", 1).maybeSingle();
  const data = { ...((row?.data as object) ?? {}), [section]: parsed.data };
  const { error } = await db.from("site_settings").upsert({ id: 1, data });
  if (error) return { error: "Enregistrement impossible." };

  await audit(user, "update", "settings", section, `Réglages modifiés : ${section}`);
  revalidatePath("/admin", "layout");
  revalidateSite();
  return { ok: "Enregistré." };
}

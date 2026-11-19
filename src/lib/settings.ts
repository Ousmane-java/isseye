import "server-only";
import { siteCache } from "@/lib/cache";
import { adminDb, isSupabaseConfigured } from "@/lib/supabase";
import { defaultSettings, mergeSettings, type Settings } from "@/lib/settings-schema";

/** Réglages du site (valeurs par défaut si la base n'est pas configurée). */
export const getSettings = siteCache(async (): Promise<Settings> => {
  if (!isSupabaseConfigured) return defaultSettings;
  const { data, error } = await adminDb().from("site_settings").select("data").eq("id", 1).maybeSingle();
  if (error) throw new Error(error.message);
  return mergeSettings(data?.data);
}, "reglages", () => defaultSettings);

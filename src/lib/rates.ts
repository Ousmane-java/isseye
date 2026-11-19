import "server-only";
import { adminDb } from "@/lib/supabase";

/** Taux de la Banque centrale européenne (service Frankfurter, deux adresses de secours). */
export async function fetchEcbRates(codes: string[]): Promise<Record<string, number> | null> {
  const query = `base=EUR&symbols=${codes.join(",")}`;
  for (const url of [`https://api.frankfurter.dev/v1/latest?${query}`, `https://api.frankfurter.app/latest?${query.replace("base=", "from=")}`]) {
    try {
      const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(8000) });
      if (!res.ok) continue;
      const json = (await res.json()) as { rates?: Record<string, number> };
      if (json.rates) return json.rates;
    } catch {
      // service suivant
    }
  }
  return null;
}

/** Met à jour les devises à taux variable (le FCFA, à parité fixe, n'est jamais touché). */
export async function refreshVariableRates() {
  const db = adminDb();
  const { data } = await db.from("currencies").select("code, rate_locked, is_base");
  const targets = (data ?? []).filter((c) => !c.is_base && !c.rate_locked).map((c) => c.code);
  if (!targets.length) return [];
  const rates = await fetchEcbRates(targets);
  if (!rates) return [];
  const now = new Date().toISOString();
  const updated: string[] = [];
  for (const code of targets) {
    if (!rates[code]) continue;
    await db.from("currencies").update({ rate: rates[code], rate_updated_at: now }).eq("code", code);
    updated.push(`${code} ${rates[code]}`);
  }
  return updated;
}

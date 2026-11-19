import "server-only";
import { cache } from "react";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { AdminRole } from "@/config/admin";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const isSupabaseConfigured = Boolean(url && anonKey && serviceKey);

/** Client serveur avec la clé secrète : contourne la RLS. Ne jamais l'exposer au navigateur. */
export function adminDb() {
  if (!url || !serviceKey) throw new Error("Supabase n'est pas configuré (voir .env.example).");
  return createClient(url, serviceKey, {
    auth: { persistSession: false },
    // Jamais de cache Next.js sur les lectures : l'admin modifie ces données en direct
    global: { fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }) },
  });
}

/** Client sans session ni cookies : sert uniquement à vérifier un mot de passe. */
export function passwordVerifier() {
  if (!url || !anonKey) throw new Error("Supabase n'est pas configuré (voir .env.example).");
  return createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

/** Client lié à la session de l'utilisateur connecté (cookies). */
export async function authClient() {
  if (!url || !anonKey) throw new Error("Supabase n'est pas configuré (voir .env.example).");
  const cookieStore = await cookies();
  return createServerClient(url, anonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (toSet) => {
        try {
          toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Appelé depuis un Server Component : le proxy se charge de rafraîchir la session.
        }
      },
    },
  });
}

const ownerEmails = (process.env.ADMIN_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export type AdminUser = { id: string; email: string; role: AdminRole };

/**
 * Rôle admin d'un compte : propriétaire si son email est dans ADMIN_EMAILS,
 * sinon le rôle enregistré dans l'équipe (Admin › Équipe), sinon null.
 */
export async function adminRoleFor(userId: string, email: string): Promise<AdminRole | null> {
  if (ownerEmails.includes(email.toLowerCase())) return "owner";
  const { data } = await adminDb().from("admin_users").select("role").eq("user_id", userId).maybeSingle<{ role: AdminRole }>();
  return data?.role ?? null;
}

/** Membre de l'équipe admin connecté, ou null. Mis en cache pour la durée de la requête. */
export const getAdminUser = cache(async (): Promise<AdminUser | null> => {
  if (!isSupabaseConfigured) return null;
  const supabase = await authClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user?.email) return null;
  const role = await adminRoleFor(user.id, user.email);
  return role ? { id: user.id, email: user.email, role } : null;
});

/**
 * Journalise une erreur de lecture en base. Ignore le signal interne de Next.js
 * « Dynamic server usage » (émis pendant la compilation, sans gravité).
 */
export function logDbError(scope: string, message: string) {
  if (message.includes("Dynamic server usage")) return;
  console.error(`[${scope}]`, message);
}

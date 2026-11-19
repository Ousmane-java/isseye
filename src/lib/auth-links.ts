import "server-only";
import { adminDb, adminRoleFor, authClient } from "@/lib/supabase";
import { adminUrl, sendTemplate, siteUrl } from "@/lib/email";

// Emails liés aux comptes, envoyés par ISSEYE avec Resend (en français, à nos couleurs) :
// confirmation de l'adresse des clientes, mot de passe oublié (clientes et équipe).
// Sans clé Resend, on se rabat sur les emails de Supabase pour que tout continue de fonctionner.

const lastSent = new Map<string, number>();

const dev = process.env.NODE_ENV !== "production";

/** Développement sans Resend : le lien est affiché dans le terminal (aucun email envoyé). */
async function devLink(type: "magiclink" | "recovery", email: string, build: (token: string) => string) {
  const { data, error } = await adminDb().auth.admin.generateLink({ type, email });
  if (error || !data.properties?.hashed_token) return false;
  console.info(`\n[ISSEYE · lien de test pour ${email}]\n${build(data.properties.hashed_token)}\n`);
  return true;
}

/** Anti-abus : un email de chaque sorte par adresse et par minute. */
function tooSoon(key: string) {
  const now = Date.now();
  if ((lastSent.get(key) ?? 0) > now - 60_000) return true;
  lastSent.set(key, now);
  return false;
}

/** Bienvenue + lien de confirmation de l'adresse email (donne accès aux commandes passées sans compte). */
export async function sendCustomerVerifyEmail(email: string, firstName = "") {
  if (tooSoon(`verify:${email}`)) return false;
  const next = encodeURIComponent("/compte?verifie=1");
  if (!process.env.RESEND_API_KEY && dev) return devLink("magiclink", email, (t) => `${siteUrl}/auth/confirm?token_hash=${t}&type=magiclink&next=${next}`);
  if (!process.env.RESEND_API_KEY) {
    const supabase = await authClient();
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: `${siteUrl}/auth/confirm?next=${next}`, shouldCreateUser: false } });
    return !error;
  }
  const { data, error } = await adminDb().auth.admin.generateLink({ type: "magiclink", email });
  if (error || !data.properties?.hashed_token) return false;
  const url = `${siteUrl}/auth/confirm?token_hash=${data.properties.hashed_token}&type=magiclink&next=${next}`;
  return sendTemplate("customer_verify", email, { prenom: firstName, virgule_prenom: firstName ? `, ${firstName}` : "" }, { ctaUrl: url });
}

/** Mot de passe oublié (cliente) : même réponse que le compte existe ou non. */
export async function sendCustomerResetLink(email: string) {
  if (tooSoon(`reset-client:${email}`)) return;
  const next = encodeURIComponent("/compte/mot-de-passe");
  if (!process.env.RESEND_API_KEY && dev) {
    await devLink("recovery", email, (t) => `${siteUrl}/auth/confirm?token_hash=${t}&type=recovery&next=${next}`);
    return;
  }
  if (!process.env.RESEND_API_KEY) {
    const supabase = await authClient();
    await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${siteUrl}/auth/confirm?next=${next}` });
    return;
  }
  const { data, error } = await adminDb().auth.admin.generateLink({ type: "recovery", email });
  if (error || !data.properties?.hashed_token) return;
  await sendTemplate("customer_reset", email, {}, { ctaUrl: `${siteUrl}/auth/confirm?token_hash=${data.properties.hashed_token}&type=recovery&next=${next}` });
}

/**
 * Mot de passe oublié (admin). Envoie le lien seulement si l'adresse appartient à l'équipe ;
 * la réponse est la même dans tous les cas (on ne révèle pas qui a un accès).
 */
export async function sendAdminResetLink(email: string) {
  if (tooSoon(`reset:${email}`)) return;
  if (!process.env.RESEND_API_KEY) {
    const supabase = await authClient();
    await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${adminUrl}/auth/reset` });
    return;
  }
  const { data, error } = await adminDb().auth.admin.generateLink({ type: "recovery", email });
  if (error || !data.user || !data.properties?.hashed_token) return;
  if (!(await adminRoleFor(data.user.id, email))) return;
  const url = `${adminUrl}/auth/reset?token_hash=${data.properties.hashed_token}&type=recovery`;
  await sendTemplate("admin_reset", email, {}, { ctaUrl: url });
}

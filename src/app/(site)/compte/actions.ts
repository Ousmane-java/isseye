"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { adminDb, authClient, isSupabaseConfigured, passwordVerifier } from "@/lib/supabase";
import { getCustomer, saveDefaultAddress } from "@/lib/customer";
import { sendCustomerResetLink, sendCustomerVerifyEmail } from "@/lib/auth-links";

// Compte cliente : email + mot de passe, informations complétées ensuite dans l'espace.

export type AccountState = { ok?: string; error?: string; fieldErrors?: Record<string, string> } | undefined;

const emailSchema = z.email("Adresse email invalide.").max(200);
const passwordSchema = z.string().min(8, "Mot de passe : 8 caractères minimum.").max(72, "Mot de passe trop long.");
const text = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const unavailable: AccountState = { error: "L'espace cliente ouvre très bientôt." };

/** Adresse de retour après connexion (chemin interne uniquement). */
function safeNext(value: string) {
  return value.startsWith("/") && !value.startsWith("//") ? value : "/compte";
}

async function createAccount(email: string, password: string) {
  const { data, error } = await adminDb().auth.admin.createUser({ email, password, email_confirm: true });
  if (error) {
    const exists = error.status === 422 || /already|registered|exists/i.test(error.message);
    return { error: exists ? "Un compte existe déjà avec cet email. Connectez-vous, ou utilisez « Mot de passe oublié »." : "Création du compte impossible pour le moment." } as const;
  }
  const session = await (await authClient()).auth.signInWithPassword({ email, password });
  if (session.error) return { error: "Compte créé : connectez-vous avec votre email et votre mot de passe." } as const;
  return { id: data.user.id } as const;
}

export async function signUp(_: AccountState, fd: FormData): Promise<AccountState> {
  if (!isSupabaseConfigured) return unavailable;
  if (fd.get("website")) return { ok: "Bienvenue !" };
  const email = emailSchema.safeParse(text(fd, "email").toLowerCase());
  const password = passwordSchema.safeParse(String(fd.get("password") ?? ""));
  if (!email.success) return { error: email.error.issues[0].message, fieldErrors: { email: email.error.issues[0].message } };
  if (!password.success) return { error: password.error.issues[0].message, fieldErrors: { password: password.error.issues[0].message } };
  const firstName = text(fd, "firstName").slice(0, 80);

  const account = await createAccount(email.data, password.data);
  if ("error" in account) return { error: account.error };
  await adminDb().from("customers").upsert({ id: account.id, first_name: firstName || null, marketing_consent: fd.get("marketing") === "on" }, { onConflict: "id" });
  if (fd.get("marketing") === "on") {
    await adminDb().from("newsletter_subscribers").upsert({ email: email.data, first_name: firstName || null, source: "compte", unsubscribed_at: null }, { onConflict: "email" });
  }
  await sendCustomerVerifyEmail(email.data, firstName);
  redirect(`${safeNext(text(fd, "next"))}${safeNext(text(fd, "next")) === "/compte" ? "?bienvenue=1" : ""}`);
}

export async function signIn(_: AccountState, fd: FormData): Promise<AccountState> {
  if (!isSupabaseConfigured) return unavailable;
  const email = text(fd, "email").toLowerCase();
  const password = String(fd.get("password") ?? "");
  if (!email || !password) return { error: "Email ou mot de passe incorrect." };
  const { error } = await (await authClient()).auth.signInWithPassword({ email, password });
  if (error) return { error: error.status === 429 ? "Trop de tentatives : patientez quelques minutes." : "Email ou mot de passe incorrect." };
  redirect(safeNext(text(fd, "next")));
}

export async function requestReset(_: AccountState, fd: FormData): Promise<AccountState> {
  if (!isSupabaseConfigured) return unavailable;
  const email = emailSchema.safeParse(text(fd, "email").toLowerCase());
  if (!email.success) return { error: email.error.issues[0].message };
  await sendCustomerResetLink(email.data);
  return { ok: "Si un compte existe avec cette adresse, un lien pour choisir un nouveau mot de passe vient d'être envoyé. Il est valable une heure." };
}

/** Après le lien « mot de passe oublié » (session ouverte par le lien). */
export async function setPassword(_: AccountState, fd: FormData): Promise<AccountState> {
  const customer = await getCustomer();
  if (!customer) return { error: "Le lien a expiré : demandez-en un nouveau." };
  const password = passwordSchema.safeParse(String(fd.get("password") ?? ""));
  if (!password.success) return { error: password.error.issues[0].message };
  if (password.data !== String(fd.get("confirm") ?? "")) return { error: "Les deux mots de passe ne correspondent pas." };
  const { error } = await adminDb().auth.admin.updateUserById(customer.id, { password: password.data });
  if (error) return { error: "Enregistrement impossible." };
  redirect("/compte?mdp=1");
}

export async function changePassword(_: AccountState, fd: FormData): Promise<AccountState> {
  const customer = await getCustomer();
  if (!customer) return { error: "Reconnectez-vous." };
  const next = passwordSchema.safeParse(String(fd.get("next") ?? ""));
  if (!next.success) return { error: next.error.issues[0].message };
  const { error: wrong } = await passwordVerifier().auth.signInWithPassword({ email: customer.email, password: String(fd.get("current") ?? "") });
  if (wrong) return { error: "Mot de passe actuel incorrect." };
  const { error } = await adminDb().auth.admin.updateUserById(customer.id, { password: next.data });
  return error ? { error: "Enregistrement impossible." } : { ok: "Mot de passe changé." };
}

/** Informations de l'espace : nom, téléphone, adresse de livraison par défaut. */
export async function saveProfile(_: AccountState, fd: FormData): Promise<AccountState> {
  const customer = await getCustomer();
  if (!customer) return { error: "Reconnectez-vous." };
  const firstName = text(fd, "firstName").slice(0, 80);
  const lastName = text(fd, "lastName").slice(0, 80);
  const phone = text(fd, "phone").slice(0, 30);
  const { error } = await adminDb().from("customers").update({ first_name: firstName || null, last_name: lastName || null, phone: phone || null }).eq("id", customer.id);
  if (error) return { error: "Enregistrement impossible." };
  const address = { line1: text(fd, "line1").slice(0, 200), line2: text(fd, "line2").slice(0, 200), postalCode: text(fd, "postalCode").slice(0, 20), city: text(fd, "city").slice(0, 100), country: text(fd, "country") || "FR" };
  if (address.line1 && address.city) {
    if (!/^[A-Z]{2}$/.test(address.country)) return { error: "Pays invalide." };
    await saveDefaultAddress({ id: customer.id, firstName, lastName, phone }, address);
  }
  return { ok: "Informations enregistrées : elles seront proposées à votre prochaine commande." };
}

export async function resendVerification(): Promise<AccountState> {
  const customer = await getCustomer();
  if (!customer) return { error: "Reconnectez-vous." };
  if (customer.verified) return { ok: "Votre adresse est déjà confirmée." };
  const sent = await sendCustomerVerifyEmail(customer.email, customer.firstName);
  return sent ? { ok: `Email envoyé à ${customer.email}.` } : { error: "Un email vient déjà de partir : patientez une minute." };
}

/**
 * Après une commande : créer son compte en choisissant seulement un mot de passe.
 * La commande y est rattachée et ses informations (nom, téléphone, adresse) sont reprises.
 */
export async function createAccountFromOrder(token: string, _: AccountState, fd: FormData): Promise<AccountState> {
  if (!isSupabaseConfigured || !/^[a-f0-9]{32,64}$/.test(token)) return { error: "Lien invalide." };
  const password = passwordSchema.safeParse(String(fd.get("password") ?? ""));
  if (!password.success) return { error: password.error.issues[0].message };
  const db = adminDb();
  const { data: order } = await db
    .from("orders")
    .select("id, email, first_name, last_name, phone, ship_line1, ship_line2, ship_postal_code, ship_city, ship_country, delivery_type, paid_at, marketing_consent")
    .eq("access_token", token)
    .maybeSingle();
  if (!order?.paid_at) return { error: "Commande introuvable." };

  const account = await createAccount(order.email, password.data);
  if ("error" in account) return { error: account.error };
  const profile = { id: account.id, firstName: order.first_name, lastName: order.last_name, phone: order.phone ?? "" };
  await db.from("customers").upsert({ id: account.id, first_name: order.first_name, last_name: order.last_name, phone: order.phone, marketing_consent: order.marketing_consent }, { onConflict: "id" });
  await db.from("orders").update({ customer_id: account.id }).eq("id", order.id);
  if (order.delivery_type !== "pickup") {
    await saveDefaultAddress(profile, { line1: order.ship_line1, line2: order.ship_line2 ?? "", postalCode: order.ship_postal_code ?? "", city: order.ship_city, country: order.ship_country });
  }
  await sendCustomerVerifyEmail(order.email, order.first_name);
  redirect("/compte?bienvenue=1");
}

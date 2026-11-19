"use server";

import { redirect } from "next/navigation";
import { adminRoleFor, authClient } from "@/lib/supabase";
import { sendAdminResetLink } from "@/lib/auth-links";

export type LoginState = { error?: string } | undefined;

export async function login(_: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Identifiants incorrects." };

  const supabase = await authClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) return { error: "Identifiants incorrects." };

  // Compte client sans accès admin : on referme la session aussitôt
  const role = await adminRoleFor(data.user.id, data.user.email ?? email);
  if (!role) {
    await supabase.auth.signOut();
    return { error: "Identifiants incorrects." };
  }
  redirect("/");
}

export async function logout() {
  const supabase = await authClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export type ResetState = { ok?: string; error?: string } | undefined;

export async function requestPasswordReset(_: ResetState, formData: FormData): Promise<ResetState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Adresse email invalide." };
  await sendAdminResetLink(email);
  return { ok: "Si cette adresse a un accès à l'espace de gestion, un lien vient de lui être envoyé. Il est valable une heure." };
}

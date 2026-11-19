"use server";

import { audit, requireAdmin } from "@/lib/admin-auth";
import { adminDb, passwordVerifier } from "@/lib/supabase";

export type ActionState = { error?: string; ok?: string } | undefined;

export async function changePassword(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireAdmin("dashboard");
  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("next") ?? "");
  if (next.length < 10) return { error: "Le nouveau mot de passe doit faire au moins 10 caractères." };
  if (next !== String(formData.get("confirm") ?? "")) return { error: "Les deux mots de passe ne correspondent pas." };

  // Vérifie le mot de passe actuel sans toucher à la session en cours
  const { error: wrong } = await passwordVerifier().auth.signInWithPassword({ email: user.email, password: current });
  if (wrong) return { error: "Mot de passe actuel incorrect." };

  const { error } = await adminDb().auth.admin.updateUserById(user.id, { password: next });
  if (error) return { error: "Changement impossible." };
  await audit(user, "update", "admin_user", user.id, "Mot de passe changé");
  return { ok: "Mot de passe changé." };
}

/** Après un lien « mot de passe oublié » : nouveau mot de passe sans l'ancien (session ouverte par le lien). */
export async function setNewPassword(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireAdmin("dashboard");
  const next = String(formData.get("next") ?? "");
  if (next.length < 10) return { error: "Le mot de passe doit faire au moins 10 caractères." };
  if (next !== String(formData.get("confirm") ?? "")) return { error: "Les deux mots de passe ne correspondent pas." };
  const { error } = await adminDb().auth.admin.updateUserById(user.id, { password: next });
  if (error) return { error: "Enregistrement impossible." };
  await audit(user, "update", "admin_user", user.id, "Mot de passe réinitialisé");
  return { ok: "Mot de passe enregistré." };
}

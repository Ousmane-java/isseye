"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { audit, requireAdmin } from "@/lib/admin-auth";
import { adminDb } from "@/lib/supabase";
import { roleLabels, type AdminRole } from "@/config/admin";

export type ActionState = { error?: string; ok?: string } | undefined;

const roles = Object.keys(roleLabels) as [AdminRole, ...AdminRole[]];

const memberSchema = z.object({
  email: z.email("Email invalide.").transform((e) => e.toLowerCase()),
  role: z.enum(roles),
  password: z.string().min(10, "Mot de passe provisoire : 10 caractères minimum.").or(z.literal("")),
});

/** Retrouve un compte existant (cliente ou ancien membre) par email. */
async function findUserId(email: string) {
  const db = adminDb();
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
    if (error) return null;
    const user = data.users.find((u) => u.email?.toLowerCase() === email);
    if (user) return user.id;
    if (data.users.length < 200) return null;
  }
  return null;
}

export async function addMember(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireAdmin("team");
  const parsed = memberSchema.safeParse({ email: formData.get("email"), role: formData.get("role"), password: formData.get("password") ?? "" });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { email, role, password } = parsed.data;

  const db = adminDb();
  let userId = await findUserId(email);
  if (!userId) {
    if (!password) return { error: "Aucun compte avec cet email : indiquez un mot de passe provisoire pour le créer." };
    const { data, error } = await db.auth.admin.createUser({ email, password, email_confirm: true });
    if (error || !data.user) return { error: "Création du compte impossible." };
    userId = data.user.id;
  }

  const { error } = await db.from("admin_users").upsert({ user_id: userId, email, role });
  if (error) return { error: "Enregistrement impossible." };
  await audit(user, "create", "admin_user", userId, `${email} ajouté(e) à l'équipe (${roleLabels[role]})`);
  revalidatePath("/admin/equipe");
  return { ok: password ? `${email} peut se connecter avec le mot de passe provisoire.` : `${email} a maintenant accès à l'admin.` };
}

export async function changeRole(userId: string, role: AdminRole) {
  const user = await requireAdmin("team");
  if (!roles.includes(role)) throw new Error("Rôle invalide.");
  if (userId === user.id) throw new Error("Vous ne pouvez pas modifier votre propre rôle.");
  await adminDb().from("admin_users").update({ role }).eq("user_id", userId);
  await audit(user, "update", "admin_user", userId, `Rôle changé : ${roleLabels[role]}`);
  revalidatePath("/admin/equipe");
}

export async function removeMember(userId: string) {
  const user = await requireAdmin("team");
  if (userId === user.id) throw new Error("Vous ne pouvez pas vous retirer vous-même.");
  const db = adminDb();
  const { data } = await db.from("admin_users").delete().eq("user_id", userId).select("email").maybeSingle();
  // Le compte reste (il peut aussi servir de compte cliente) ; seul l'accès admin est retiré
  await audit(user, "delete", "admin_user", userId, `${data?.email ?? "Membre"} retiré(e) de l'équipe`);
  revalidatePath("/admin/equipe");
}

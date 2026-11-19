"use server";

import { revalidatePath } from "next/cache";
import { audit, requireAdmin } from "@/lib/admin-auth";
import { adminDb } from "@/lib/supabase";
import { getTemplate, sendTemplate, siteUrl, type EmailTemplate } from "@/lib/email";
import type { ActionState } from "@/lib/admin-types";

const text = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const sample = { prenom: "Awa", nom: "Diop", numero: "ISY-1042", total: "64 €", transporteur: "DHL", suivi: "1234567890", produit: "Luna", montant: "35 €", lien_suivi: `${siteUrl}/suivi` };

export async function saveTemplate(key: string, _: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireAdmin("emails");
  const subject = text(fd, "subject");
  const heading = text(fd, "heading");
  const body = text(fd, "body");
  if (!subject || !heading || !body) return { error: "Objet, titre et texte requis." };
  const { error } = await adminDb().from("email_templates").update({ subject, heading, body, cta_label: text(fd, "cta_label") || null, enabled: fd.get("enabled") === "on" }).eq("key", key);
  if (error) return { error: "Enregistrement impossible." };
  await audit(user, "update", "email_template", key, `Email modifié : ${key}`);
  revalidatePath("/admin/emails");
  return { ok: "Enregistré." };
}

export async function sendTest(key: string): Promise<ActionState> {
  const user = await requireAdmin("emails");
  const template = await getTemplate(key);
  if (!template) return { error: "Modèle introuvable." };
  if (!process.env.RESEND_API_KEY) return { error: "RESEND_API_KEY n'est pas configurée : aucun email ne peut partir." };
  const ok = await sendTemplate(key, user.email, sample, { ctaUrl: siteUrl, template: { ...template, enabled: true } as EmailTemplate });
  return ok ? { ok: `Test envoyé à ${user.email}.` } : { error: "Envoi impossible : vérifiez le domaine d'envoi dans Resend." };
}

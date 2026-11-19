import "server-only";
import { adminDb, isSupabaseConfigured } from "@/lib/supabase";
import { getSettings } from "@/lib/settings";
import { fillTemplate, markdownToHtml } from "@/lib/markdown";

// Emails transactionnels envoyés avec Resend. Les textes viennent d'Admin › Emails
// (table email_templates) ; la mise en page reprend l'identité ISSEYE (crème, or, noir).

export const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
export const adminUrl = (process.env.NEXT_PUBLIC_ADMIN_URL ?? "http://admin.localhost:3000").replace(/\/$/, "");

export type EmailTemplate = { key: string; name: string; subject: string; heading: string; body: string; cta_label: string | null; enabled: boolean };

const escape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Envoie un email. Sans clé Resend, l'email est seulement affiché dans la console du serveur. */
export async function sendEmail({ to, subject, html, replyTo }: { to: string; subject: string; html: string; replyTo?: string }) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM ?? "ISSEYE <bonjour@isseye.com>";
  if (!key) {
    console.info(`[email non envoyé : RESEND_API_KEY absente] à ${to} — ${subject}`);
    return false;
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [to], subject, html, ...(replyTo ? { reply_to: replyTo } : {}) }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) console.error("[email]", res.status, await res.text());
    return res.ok;
  } catch (err) {
    console.error("[email]", err);
    return false;
  }
}

/** Gabarit HTML commun : monogramme doré, titre, texte, bouton, contenu additionnel. */
export function emailLayout({ heading, bodyHtml, cta, extraHtml = "", footer }: { heading: string; bodyHtml: string; cta?: { label: string; url: string }; extraHtml?: string; footer: string }) {
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escape(heading)}</title></head>
<body style="margin:0;background:#f6f1ea;font-family:Helvetica,Arial,sans-serif;color:#2a2622">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f1ea;padding:32px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:4px;overflow:hidden">
<tr><td align="center" style="background:#1b1917;padding:28px 24px">
<img src="${siteUrl}/images/monogramme.png" width="34" alt="" style="display:block;height:auto;margin:0 auto 10px">
<div style="font-family:Georgia,'Times New Roman',serif;font-size:20px;letter-spacing:8px;color:#f6f1ea;padding-left:8px">ISSEYE</div>
</td></tr>
<tr><td style="padding:36px 32px 8px">
<h1 style="margin:0 0 18px;font-family:Georgia,'Times New Roman',serif;font-weight:normal;font-size:28px;line-height:1.2;color:#1b1917">${escape(heading)}</h1>
<div style="font-size:15px;line-height:1.65;color:#4a433d">${bodyHtml}</div>
${cta ? `<p style="margin:28px 0 8px"><a href="${cta.url}" style="display:inline-block;background:#1b1917;color:#f6f1ea;text-decoration:none;padding:14px 26px;border-radius:999px;font-size:12px;letter-spacing:2px;text-transform:uppercase;font-weight:bold">${escape(cta.label)}</a></p>` : ""}
</td></tr>
${extraHtml ? `<tr><td style="padding:8px 32px 8px">${extraHtml}</td></tr>` : ""}
<tr><td style="padding:28px 32px 32px;border-top:1px solid #eee5db;font-size:12px;line-height:1.6;color:#7a6e64">${footer}</td></tr>
</table></td></tr></table></body></html>`;
}

async function footerHtml() {
  const { brand, contact } = await getSettings();
  return `${escape(brand.name)} · ${escape(brand.tagline)}<br>Une question ? Répondez simplement à cet email${contact.email ? ` ou écrivez à <a href="mailto:${contact.email}" style="color:#8b693e">${escape(contact.email)}</a>` : ""}.`;
}

export async function getTemplate(key: string): Promise<EmailTemplate | null> {
  if (!isSupabaseConfigured) return null;
  const { data } = await adminDb().from("email_templates").select("*").eq("key", key).maybeSingle();
  return (data as EmailTemplate | null) ?? null;
}

/** HTML d'un modèle d'email avec ses variables (envoi et aperçu dans l'admin). */
export async function renderTemplate(template: EmailTemplate, vars: Record<string, string | number | null | undefined>, opts: { ctaUrl?: string; extraHtml?: string } = {}) {
  return {
    subject: fillTemplate(template.subject, vars),
    html: emailLayout({
      heading: fillTemplate(template.heading, vars),
      bodyHtml: markdownToHtml(fillTemplate(template.body, vars)),
      cta: template.cta_label && opts.ctaUrl ? { label: fillTemplate(template.cta_label, vars), url: opts.ctaUrl } : undefined,
      extraHtml: opts.extraHtml,
      footer: await footerHtml(),
    }),
  };
}

/**
 * Envoie un modèle d'email (Admin › Emails) avec ses variables.
 * `ctaUrl` : lien du bouton ; `extraHtml` : récapitulatif de commande, code…
 */
export async function sendTemplate(key: string, to: string, vars: Record<string, string | number | null | undefined>, opts: { ctaUrl?: string; extraHtml?: string; template?: EmailTemplate } = {}) {
  const template = opts.template ?? (await getTemplate(key));
  if (!template || !template.enabled) return false;
  const { contact } = await getSettings();
  const { subject, html } = await renderTemplate(template, vars, opts);
  return sendEmail({ to, subject, html, replyTo: contact.email || undefined });
}

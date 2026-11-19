import "server-only";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { getSettings } from "@/lib/settings";
import { getCurrencies } from "@/lib/currencies";
import { formatMoney } from "@/lib/currency";
import { countryName } from "@/config/countries";
import { siteUrl } from "@/lib/email";
import { scheduleLabel, type OrderRow } from "@/lib/order-types";

// Facture PDF d'une commande payée (numéro F-AAAA-NNNN attribué au paiement).
// Polices standard du PDF (Times pour les titres, Helvetica pour le texte) : aucun fichier à embarquer.

const NOIR = rgb(0.106, 0.098, 0.09);
const OR = rgb(0.769, 0.592, 0.31);
const BRONZE = rgb(0.545, 0.412, 0.243);
const GRIS = rgb(0.478, 0.431, 0.392);
const CREME = rgb(0.965, 0.945, 0.918);
const LIN = rgb(0.933, 0.898, 0.859);

/** Les polices standard ne connaissent que l'alphabet Windows-1252 : on remplace le reste. */
const W1252 = "€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ";
function clean(text: string) {
  return text
    .replace(/[   ]/g, " ")
    .split("")
    .map((c) => (c >= " " && c <= "ÿ") || W1252.includes(c) ? c : "?")
    .join("");
}

export async function buildInvoicePdf(order: OrderRow) {
  const [settings, currencies] = await Promise.all([getSettings(), getCurrencies()]);
  const cur = currencies.find((c) => c.code === order.currency_code) ?? currencies[0];
  const m = (v: number) => clean(formatMoney(v, cur));
  const { legal, brand, contact } = settings;
  const pdf = await PDFDocument.create();
  pdf.setTitle(`Facture ${order.invoice_number} · ${brand.name}`);
  pdf.setAuthor(legal.companyName || brand.name);
  const page = pdf.addPage([595.28, 841.89]);
  const serif = await pdf.embedFont(StandardFonts.TimesRoman);
  const sans = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const W = page.getWidth();
  const M = 48;

  const text = (p: PDFPage, s: string, x: number, y: number, size = 9.5, font: PDFFont = sans, color = NOIR) => p.drawText(clean(s), { x, y, size, font, color });
  const right = (p: PDFPage, s: string, xRight: number, y: number, size = 9.5, font: PDFFont = sans, color = NOIR) =>
    p.drawText(clean(s), { x: xRight - font.widthOfTextAtSize(clean(s), size), y, size, font, color });

  // Bandeau noir : monogramme doré et nom de la marque
  page.drawRectangle({ x: 0, y: 842 - 104, width: W, height: 104, color: NOIR });
  try {
    const png = await fetch(`${siteUrl}/images/monogramme.png`, { signal: AbortSignal.timeout(4000) }).then((r) => (r.ok ? r.arrayBuffer() : null));
    if (png) {
      const img = await pdf.embedPng(png);
      const h = 52;
      page.drawImage(img, { x: M, y: 842 - 78, width: (img.width / img.height) * h, height: h });
    }
  } catch {
    // facture sans logo plutôt que pas de facture
  }
  text(page, brand.name.toUpperCase().split("").join(" "), M + 46, 842 - 58, 20, serif, CREME);
  right(page, "FACTURE", W - M, 842 - 50, 22, serif, OR);
  right(page, order.invoice_number ?? "", W - M, 842 - 70, 10, sans, CREME);

  // Références
  let y = 842 - 140;
  const date = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeZone: "Europe/Paris" });
  const meta: [string, string][] = [
    ["Date de facture", date.format(new Date(order.invoiced_at ?? order.paid_at ?? order.created_at))],
    ["Commande", `${order.number} du ${date.format(new Date(order.created_at))}`],
    ["Paiement", order.paid_at ? `Acquittée le ${date.format(new Date(order.paid_at))} · ${order.payment_provider === "stripe" ? "carte bancaire (Stripe)" : order.payment_provider}` : "En attente"],
  ];
  for (const [k, v] of meta) {
    text(page, k.toUpperCase(), M, y, 7.5, bold, GRIS);
    text(page, v, M + 110, y, 9.5);
    y -= 15;
  }

  // Vendeur / cliente
  y -= 16;
  const colW = (W - 2 * M - 24) / 2;
  const block = (x: number, title: string, lines: string[]) => {
    page.drawRectangle({ x, y: y - 14 - lines.length * 13 - 12, width: colW, height: lines.length * 13 + 40, color: LIN });
    text(page, title.toUpperCase(), x + 14, y - 4, 7.5, bold, BRONZE);
    lines.forEach((l, i) => text(page, l, x + 14, y - 22 - i * 13, 9.5, i === 0 ? bold : sans));
  };
  const missing = "[à compléter dans Réglages]";
  const seller = [
    legal.companyName || brand.name,
    legal.status || missing,
    legal.address || missing,
    `SIRET : ${legal.siret || missing}`,
    ...(legal.vatNumber ? [`TVA : ${legal.vatNumber}`] : []),
    ...(contact.email ? [contact.email] : []),
  ];
  const pickup = order.delivery_type === "pickup";
  const customer = [
    `${order.first_name} ${order.last_name}`,
    order.email,
    ...(pickup ? ["Retrait à la boutique"] : [order.ship_line1, ...(order.ship_line2 ? [order.ship_line2] : []), `${order.ship_postal_code ?? ""} ${order.ship_city}`.trim(), countryName(order.ship_country)]),
    ...(scheduleLabel(order) ? [scheduleLabel(order)!] : []),
  ];
  block(M, "Vendeur", seller);
  block(M + colW + 24, "Facturé à", customer);
  y -= Math.max(seller.length, customer.length) * 13 + 64;

  // Articles
  const cols = { qty: W - M - 200, unit: W - M - 90, total: W - M };
  page.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: 1, color: OR });
  y -= 14;
  text(page, "DÉSIGNATION", M, y, 7.5, bold, GRIS);
  right(page, "QTÉ", cols.qty, y, 7.5, bold, GRIS);
  right(page, "PRIX UNITAIRE", cols.unit, y, 7.5, bold, GRIS);
  right(page, "TOTAL", cols.total, y, 7.5, bold, GRIS);
  y -= 8;
  page.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: 0.5, color: LIN });
  const row = (label: string, sub: string | null, qty: string, unit: string, total: string) => {
    y -= 18;
    text(page, label, M, y, 10, bold);
    right(page, qty, cols.qty, y);
    right(page, unit, cols.unit, y);
    right(page, total, cols.total, y);
    if (sub) {
      y -= 12;
      text(page, sub, M, y, 8.5, sans, GRIS);
    }
    y -= 8;
    page.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: 0.5, color: LIN });
  };
  for (const i of order.items ?? []) row(i.product_name, [i.variant_label, i.sku].filter(Boolean).join(" · ") || null, String(i.quantity), m(i.unit_price), m(i.line_total));
  if (order.shipping > 0 || !pickup) row(order.shipping_method ?? "Livraison", null, "1", m(order.shipping), order.shipping ? m(order.shipping) : "Offerte");
  if (order.gift_wrap > 0) row("Emballage cadeau", null, "1", m(order.gift_wrap), m(order.gift_wrap));
  if (order.discount > 0) row(`Réduction${order.promo_code ? ` (${order.promo_code})` : ""}`, null, "", "", `-${m(order.discount)}`);

  // Totaux
  y -= 22;
  const ht = order.total - order.tax_included;
  const totals: [string, string, boolean][] =
    order.tax_mode === "ttc"
      ? [
          ["Total HT", m(ht), false],
          [`TVA ${legal.vatRate.toLocaleString("fr-FR")} %`, m(order.tax_included), false],
          [`Total TTC (${order.currency_code})`, m(order.total), true],
        ]
      : [
          ["Total HT", m(order.total), false],
          ["TVA", "Non applicable", false],
          [`Total (${order.currency_code})`, m(order.total), true],
        ];
  const boxX = W - M - 230;
  page.drawRectangle({ x: boxX, y: y - totals.length * 20 + 6, width: 230, height: totals.length * 20 + 8, color: CREME });
  totals.forEach(([k, v, strong], i) => {
    const yy = y - i * 20;
    text(page, k, boxX + 14, yy - 6, strong ? 11 : 9.5, strong ? bold : sans, strong ? NOIR : GRIS);
    right(page, v, W - M - 14, yy - 6, strong ? 13 : 9.5, strong ? serif : sans, strong ? BRONZE : NOIR);
  });
  y -= totals.length * 20 + 24;
  if (order.tax_mode === "export") {
    text(page, "Exonération de TVA : livraison hors de l'Union européenne (article 262 I du CGI).", M, y, 8.5, sans, GRIS);
    y -= 13;
  }
  if (order.currency_code !== "EUR") {
    text(page, `Taux de change appliqué : 1 € = ${Number(order.fx_rate).toLocaleString("fr-FR")} ${cur.symbol}`, M, y, 8.5, sans, GRIS);
    y -= 13;
  }
  if (order.refunded_amount > 0) {
    text(page, `Montant remboursé : ${m(order.refunded_amount)}${order.refunded_at ? ` le ${date.format(new Date(order.refunded_at))}` : ""}.`, M, y, 8.5, bold, BRONZE);
    y -= 13;
  }

  // Pied de page
  page.drawLine({ start: { x: M, y: 70 }, end: { x: W - M, y: 70 }, thickness: 0.5, color: OR });
  const foot = [legal.companyName || brand.name, legal.status, legal.address, legal.siret ? `SIRET ${legal.siret}` : "", legal.vatNumber ? `TVA ${legal.vatNumber}` : ""].filter(Boolean).join(" · ");
  const footText = clean(foot);
  page.drawText(footText, { x: (W - sans.widthOfTextAtSize(footText, 7.5)) / 2, y: 54, size: 7.5, font: sans, color: GRIS });
  const thanks = clean(`Merci pour votre confiance · ${brand.name} · ${brand.tagline}`);
  page.drawText(thanks, { x: (W - serif.widthOfTextAtSize(thanks, 10)) / 2, y: 36, size: 10, font: serif, color: BRONZE });

  return pdf.save();
}

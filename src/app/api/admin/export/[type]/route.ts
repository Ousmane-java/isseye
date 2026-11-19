import { NextResponse } from "next/server";
import { adminDb, getAdminUser } from "@/lib/supabase";
import { canAccess, type AdminSectionKey } from "@/config/admin";
import { getCurrencies } from "@/lib/currencies";
import { statusLabels, type OrderStatus } from "@/lib/order-types";
import { countryName } from "@/config/countries";

// Exports CSV de l'admin (ouverts dans Excel ou Numbers : séparateur « ; », encodage UTF-8 avec BOM).

const sections: Record<string, AdminSectionKey> = { commandes: "orders", clientes: "customers", newsletter: "customers", produits: "products" };

function csv(rows: (string | number | null | undefined)[][]) {
  const cell = (v: string | number | null | undefined) => {
    const s = v === null || v === undefined ? "" : String(v);
    // Évite l'interprétation de formules par le tableur
    const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
    return /[;"\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
  };
  return "﻿" + rows.map((r) => r.map(cell).join(";")).join("\n");
}

export async function GET(_: Request, { params }: RouteContext<"/api/admin/export/[type]">) {
  const { type } = await params;
  const user = await getAdminUser();
  const section = sections[type];
  if (!user || !section || !canAccess(user.role, section)) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  const db = adminDb();
  const currencies = await getCurrencies();
  const fmt = (amount: number, code: string) => {
    const d = currencies.find((c) => c.code === code)?.decimals ?? 2;
    return (amount / 10 ** d).toFixed(d).replace(".", ",");
  };
  let rows: (string | number | null)[][] = [];

  if (type === "commandes") {
    const { data } = await db.from("orders").select("*").not("status", "in", "(abandonnee,en_attente_paiement)").order("created_at", { ascending: false }).limit(10000);
    rows = [["Numéro", "Date", "Statut", "Prénom", "Nom", "Email", "Téléphone", "Adresse", "Code postal", "Ville", "Pays", "Devise", "Sous-total", "Réduction", "Code promo", "Livraison", "Mode", "Total", "TVA incluse", "Remboursé", "Transporteur", "Suivi"]];
    for (const o of data ?? []) {
      rows.push([o.number, new Date(o.created_at).toLocaleString("fr-FR"), statusLabels[o.status as OrderStatus], o.first_name, o.last_name, o.email, o.phone, [o.ship_line1, o.ship_line2].filter(Boolean).join(", "), o.ship_postal_code, o.ship_city, countryName(o.ship_country), o.currency_code, fmt(o.subtotal, o.currency_code), fmt(o.discount, o.currency_code), o.promo_code, fmt(o.shipping, o.currency_code), o.shipping_method, fmt(o.total, o.currency_code), fmt(o.tax_included, o.currency_code), fmt(o.refunded_amount, o.currency_code), o.carrier, o.tracking_number]);
    }
  } else if (type === "clientes") {
    const { data } = await db.from("orders").select("email, first_name, last_name, phone, ship_country, total, refunded_amount, currency_code, created_at, marketing_consent").in("status", ["payee", "en_preparation", "prete_retrait", "expediee", "livree"]).order("created_at", { ascending: false }).limit(20000);
    const map = new Map<string, { row: (typeof data extends (infer T)[] | null ? T : never); count: number; spent: Map<string, number> }>();
    for (const o of data ?? []) {
      const e = map.get(o.email) ?? { row: o, count: 0, spent: new Map<string, number>() };
      e.count++;
      e.spent.set(o.currency_code, (e.spent.get(o.currency_code) ?? 0) + o.total - o.refunded_amount);
      map.set(o.email, e);
    }
    rows = [["Email", "Prénom", "Nom", "Téléphone", "Pays", "Commandes", "Total dépensé", "Dernière commande", "Newsletter"]];
    for (const [email, e] of map) rows.push([email, e.row.first_name, e.row.last_name, e.row.phone, countryName(e.row.ship_country), e.count, [...e.spent].map(([c, a]) => `${fmt(a, c)} ${c}`).join(" + "), new Date(e.row.created_at).toLocaleDateString("fr-FR"), e.row.marketing_consent ? "oui" : "non"]);
  } else if (type === "newsletter") {
    const { data } = await db.from("newsletter_subscribers").select("*").is("unsubscribed_at", null).order("subscribed_at", { ascending: false });
    rows = [["Email", "Prénom", "Source", "Inscription"]];
    for (const s of data ?? []) rows.push([s.email, s.first_name, s.source, new Date(s.subscribed_at).toLocaleDateString("fr-FR")]);
  } else if (type === "produits") {
    const { data } = await db.from("products").select("name, slug, status, category:categories(name), variants:product_variants(sku, label, price, compare_at_price, stock, active)").is("deleted_at", null).order("position");
    rows = [["Produit", "Adresse", "Statut", "Catégorie", "SKU", "Format", "Prix (€)", "Prix barré (€)", "Stock", "Actif"]];
    for (const p of data ?? []) {
      for (const v of (p.variants ?? []) as { sku: string | null; label: string | null; price: number; compare_at_price: number | null; stock: number; active: boolean }[]) {
        rows.push([p.name, p.slug, p.status, (p.category as unknown as { name: string } | null)?.name ?? "", v.sku, v.label, fmt(v.price, "EUR"), v.compare_at_price === null ? "" : fmt(v.compare_at_price, "EUR"), v.stock, v.active ? "oui" : "non"]);
      }
    }
  }

  const date = new Date().toISOString().slice(0, 10);
  return new NextResponse(csv(rows), {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="isseye-${type}-${date}.csv"`, "Cache-Control": "no-store" },
  });
}

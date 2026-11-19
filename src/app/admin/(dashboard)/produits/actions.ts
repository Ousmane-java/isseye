"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { audit, requireAdmin, revalidateSite } from "@/lib/admin-auth";
import { adminDb } from "@/lib/supabase";
import { getCurrencies } from "@/lib/currencies";
import { parseMoney } from "@/lib/currency";
import { slugify, type ActionState } from "@/lib/admin-types";
import type { ProductPayload } from "@/lib/product-admin";
import { notifyBackInStock } from "@/lib/stock";

const refresh = () => {
  revalidatePath("/admin", "layout");
  revalidateSite();
};

export async function createProduct(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireAdmin("products");
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Donnez un nom au parfum." };
  const db = adminDb();
  let slug = slugify(name) || "parfum";
  const { data: clash } = await db.from("products").select("id").eq("slug", slug).maybeSingle();
  if (clash) slug = `${slug}-${Date.now().toString(36).slice(-4)}`;
  const { data: category } = await db.from("categories").select("id").eq("slug", "parfums").maybeSingle();
  const { data, error } = await db
    .from("products")
    .insert({ name, slug, status: "draft", category_id: category?.id ?? null, subtitle: "Eau de parfum" })
    .select("id")
    .single();
  if (error) return { error: "Création impossible." };
  await db.from("product_variants").insert({ product_id: data.id, label: "30 ml · Eau de parfum", price: 0, stock: 0 });
  await audit(user, "create", "product", data.id, `Produit créé : ${name}`);
  redirect(`/produits/${data.id}`);
}

export async function saveProduct(id: string, p: ProductPayload): Promise<ActionState> {
  const user = await requireAdmin("products");
  const db = adminDb();
  const currencies = await getCurrencies();
  const base = currencies.find((c) => c.is_base) ?? currencies[0];

  const name = p.name.trim();
  const slug = slugify(p.slug || p.name);
  if (!name) return { error: "Le nom est requis." };
  if (!slug) return { error: "L'adresse (slug) est invalide." };
  const { data: clash } = await db.from("products").select("id").eq("slug", slug).neq("id", id).maybeSingle();
  if (clash) return { error: `L'adresse « ${slug} » est déjà utilisée par un autre produit.` };

  // Variantes : contrôle des prix avant toute écriture
  const variants = [];
  for (const [i, v] of p.variants.entries()) {
    const price = parseMoney(v.price || "", base);
    if (price === null) return { error: `Variante ${i + 1} : prix invalide.` };
    const compare = v.compare_at_price.trim() ? parseMoney(v.compare_at_price, base) : null;
    if (v.compare_at_price.trim() && compare === null) return { error: `Variante ${i + 1} : prix barré invalide.` };
    const overrides = [];
    for (const o of v.prices) {
      if (!o.amount.trim()) continue;
      const cur = currencies.find((c) => c.code === o.currency_code);
      if (!cur) continue;
      const amount = parseMoney(o.amount, cur);
      const cmp = o.compare.trim() ? parseMoney(o.compare, cur) : null;
      if (amount === null || (o.compare.trim() && cmp === null)) return { error: `Variante ${i + 1} : prix en ${cur.code} invalide.` };
      overrides.push({ currency_code: cur.code, amount, compare_at_amount: cmp });
    }
    variants.push({ input: v, price, compare, overrides, position: i });
  }
  if (!variants.length) return { error: "Ajoutez au moins une variante (format)." };
  if (p.status === "active" && variants.every((v) => v.price === 0)) return { error: "Indiquez un prix avant de mettre le produit en ligne." };

  const { data: before } = await db.from("products").select("status, published_at").eq("id", id).maybeSingle();
  if (!before) return { error: "Produit introuvable." };

  const { error } = await db
    .from("products")
    .update({
      name,
      slug,
      subtitle: p.subtitle.trim() || null,
      description: p.description.trim() || null,
      story: p.story.trim() || null,
      usage: p.usage.trim() || null,
      ingredients: p.ingredients.trim() || null,
      allergens: p.allergens.trim() || null,
      category_id: p.category_id || null,
      status: p.status,
      featured: p.featured,
      badge: p.badge.trim() || null,
      position: Number.isFinite(p.position) ? p.position : 0,
      seo_title: p.seo_title.trim() || null,
      seo_description: p.seo_description.trim() || null,
      published_at: p.status === "active" && !before.published_at ? new Date().toISOString() : before.published_at,
    })
    .eq("id", id);
  if (error) return { error: "Enregistrement impossible." };

  // Variantes : mise à jour, création, suppression ; le stock modifié est tracé comme ajustement
  const { data: existing } = await db.from("product_variants").select("id, stock").eq("product_id", id);
  const keep = new Set<string>();
  for (const v of variants) {
    const row = {
      product_id: id,
      label: v.input.label.trim() || null,
      sku: v.input.sku.trim() || null,
      price: v.price,
      compare_at_price: v.compare,
      track_stock: v.input.track_stock,
      allow_backorder: v.input.allow_backorder,
      low_stock_threshold: Math.max(0, Math.floor(v.input.low_stock_threshold || 0)),
      weight_grams: v.input.weight_grams.trim() ? Math.max(0, Math.floor(Number(v.input.weight_grams) || 0)) : null,
      active: v.input.active,
      position: v.position,
    };
    let variantId = v.input.id && existing?.some((e) => e.id === v.input.id) ? v.input.id : null;
    if (variantId) {
      const { error: upErr } = await db.from("product_variants").update(row).eq("id", variantId);
      if (upErr) return { error: upErr.code === "23505" ? `La référence (SKU) « ${row.sku} » existe déjà.` : "Variante : enregistrement impossible." };
      const current = existing!.find((e) => e.id === variantId)!.stock;
      const target = Math.floor(v.input.stock || 0);
      if (target !== current) {
        await db.rpc("adjust_stock", { p_variant: variantId, p_delta: target - current, p_reason: target > current ? "reassort" : "ajustement", p_note: "Fiche produit", p_by: user.email });
        if (current <= 0 && target > 0) await notifyBackInStock(variantId);
      }
    } else {
      const { data: created, error: insErr } = await db.from("product_variants").insert({ ...row, stock: Math.floor(v.input.stock || 0) }).select("id").single();
      if (insErr) return { error: insErr.code === "23505" ? `La référence (SKU) « ${row.sku} » existe déjà.` : "Variante : création impossible." };
      variantId = created.id as string;
    }
    keep.add(variantId!);
    await db.from("variant_prices").delete().eq("variant_id", variantId);
    if (v.overrides.length) await db.from("variant_prices").insert(v.overrides.map((o) => ({ ...o, variant_id: variantId })));
  }
  const removed = (existing ?? []).filter((e) => !keep.has(e.id)).map((e) => e.id);
  if (removed.length) {
    const { error: delErr } = await db.from("product_variants").delete().in("id", removed);
    if (delErr) await db.from("product_variants").update({ active: false }).in("id", removed); // utilisée par un coffret : simplement désactivée
  }

  // Médias, caractéristiques, notes, produits associés : remplacés par la nouvelle liste
  await db.from("product_media").delete().eq("product_id", id);
  const media = p.media.filter((m) => m.url.trim());
  if (media.length) await db.from("product_media").insert(media.map((m, i) => ({ product_id: id, url: m.url.trim(), alt: m.alt.trim() || null, kind: m.kind, position: i })));

  await db.from("product_facet_values").delete().eq("product_id", id);
  if (p.facetValueIds.length) await db.from("product_facet_values").insert([...new Set(p.facetValueIds)].map((v) => ({ product_id: id, facet_value_id: v })));

  await db.from("product_notes").delete().eq("product_id", id);
  const noteRows: { product_id: string; note_id: string; layer: string; position: number }[] = [];
  for (const layer of ["tete", "coeur", "fond"] as const) {
    for (const [i, raw] of p.notes[layer].entries()) {
      const label = raw.trim();
      const noteSlug = slugify(label);
      if (!noteSlug) continue;
      const { data: note } = await db.from("notes").upsert({ slug: noteSlug, name: label }, { onConflict: "slug", ignoreDuplicates: false }).select("id").single();
      if (note && !noteRows.some((r) => r.note_id === note.id && r.layer === layer)) noteRows.push({ product_id: id, note_id: note.id, layer, position: i });
    }
  }
  if (noteRows.length) await db.from("product_notes").insert(noteRows);

  await db.from("product_relations").delete().eq("product_id", id);
  const related = [...new Set(p.relatedIds)].filter((r) => r !== id);
  if (related.length) await db.from("product_relations").insert(related.map((r, i) => ({ product_id: id, related_id: r, position: i })));

  await audit(user, "update", "product", id, `Produit modifié : ${name}`);
  refresh();
  return { ok: p.status === "active" ? "Enregistré et en ligne." : "Enregistré." };
}

export async function duplicateProduct(id: string) {
  const user = await requireAdmin("products");
  const db = adminDb();
  const { data: src } = await db.from("products").select("*").eq("id", id).single();
  if (!src) throw new Error("Produit introuvable.");
  const { id: _id, created_at: _c, updated_at: _u, published_at: _p, ...rest } = src;
  const { data: copy, error } = await db
    .from("products")
    .insert({ ...rest, name: `${src.name} (copie)`, slug: `${src.slug}-copie-${Date.now().toString(36).slice(-4)}`, status: "draft", deleted_at: null })
    .select("id")
    .single();
  if (error) throw new Error("Duplication impossible.");
  const [{ data: variants }, { data: media }, { data: facets }, { data: notes }] = await Promise.all([
    db.from("product_variants").select("*, prices:variant_prices(currency_code, amount, compare_at_amount)").eq("product_id", id),
    db.from("product_media").select("url, alt, kind, position, poster_url").eq("product_id", id),
    db.from("product_facet_values").select("facet_value_id").eq("product_id", id),
    db.from("product_notes").select("note_id, layer, position").eq("product_id", id),
  ]);
  for (const v of variants ?? []) {
    const { id: _vid, created_at: _vc, updated_at: _vu, prices, ...vrest } = v;
    const { data: nv } = await db.from("product_variants").insert({ ...vrest, product_id: copy.id, sku: null, stock: 0 }).select("id").single();
    if (nv && prices?.length) await db.from("variant_prices").insert(prices.map((pr: { currency_code: string; amount: number; compare_at_amount: number | null }) => ({ ...pr, variant_id: nv.id })));
  }
  if (media?.length) await db.from("product_media").insert(media.map((m) => ({ ...m, product_id: copy.id })));
  if (facets?.length) await db.from("product_facet_values").insert(facets.map((f) => ({ ...f, product_id: copy.id })));
  if (notes?.length) await db.from("product_notes").insert(notes.map((n) => ({ ...n, product_id: copy.id })));
  await audit(user, "create", "product", copy.id, `Produit dupliqué depuis ${src.name}`);
  refresh();
  redirect(`/produits/${copy.id}`);
}

export async function trashProduct(id: string): Promise<ActionState> {
  const user = await requireAdmin("products");
  await adminDb().from("products").update({ deleted_at: new Date().toISOString(), status: "archived" }).eq("id", id);
  await audit(user, "delete", "product", id, "Produit mis à la corbeille");
  refresh();
  return { ok: "Mis à la corbeille." };
}

export async function restoreProduct(id: string): Promise<ActionState> {
  const user = await requireAdmin("products");
  await adminDb().from("products").update({ deleted_at: null, status: "draft" }).eq("id", id);
  await audit(user, "restore", "product", id, "Produit restauré (brouillon)");
  refresh();
  return { ok: "Restauré en brouillon." };
}

export async function deleteProductForever(id: string): Promise<ActionState> {
  const user = await requireAdmin("products");
  const { error } = await adminDb().from("products").delete().eq("id", id).not("deleted_at", "is", null);
  if (error) return { error: "Suppression impossible : ce produit est utilisé (coffret)." };
  await audit(user, "delete", "product", id, "Produit supprimé définitivement");
  refresh();
  return { ok: "Supprimé." };
}

export async function setProductStatus(id: string, status: "draft" | "active" | "archived"): Promise<ActionState> {
  const user = await requireAdmin("products");
  await adminDb().from("products").update({ status, ...(status === "active" ? { published_at: new Date().toISOString() } : {}) }).eq("id", id);
  await audit(user, "update", "product", id, `Statut : ${status}`);
  refresh();
  return { ok: "Statut mis à jour." };
}

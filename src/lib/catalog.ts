import "server-only";
import { adminDb, isSupabaseConfigured } from "@/lib/supabase";
import { siteCache } from "@/lib/cache";
import { getPricingContext } from "@/lib/shop";
import { displayPrice, type PricingContext } from "@/lib/pricing";
import { demoProducts, demoRelations } from "@/lib/demo-data";
import {
  MAX_QTY,
  type FacetTag,
  type MediaView,
  type ProductDetail,
  type ProductSummary,
  type RawProduct,
  type RawVariant,
  type ReviewView,
  type VariantView,
} from "@/lib/catalog-types";

// Lecture du catalogue public : produits actifs, prix dans la devise de la visiteuse.
// Sans Supabase configuré, les parfums de démonstration (lib/demo-data.ts) sont servis.

export const productSelect = `id, slug, name, subtitle, description, story, usage, ingredients, allergens, badge, featured, position, created_at, category_id, seo_title, seo_description,
  category:categories(id, slug, name),
  variants:product_variants(id, sku, label, price, compare_at_price, stock, track_stock, allow_backorder, low_stock_threshold, active, position, weight_grams, prices:variant_prices(currency_code, amount, compare_at_amount)),
  media:product_media(url, alt, kind, position, poster_url),
  facets:product_facet_values(value:facet_values(slug, label, position, facet:facets(slug, name, position, filterable))),
  notes:product_notes(layer, position, note:notes(slug, name))`;

const byPosition = <T extends { position: number }>(a: T, b: T) => a.position - b.position;

export function variantAvailable(v: Pick<RawVariant, "track_stock" | "allow_backorder" | "stock">) {
  return !v.track_stock || v.allow_backorder || v.stock > 0;
}

function toVariant(v: RawVariant, ctx: PricingContext): VariantView {
  const { price, compareAt } = displayPrice(v, ctx);
  const available = variantAvailable(v);
  const limited = v.track_stock && !v.allow_backorder;
  return {
    id: v.id,
    sku: v.sku,
    label: v.label ?? "",
    price,
    compareAt,
    available,
    maxQty: limited ? Math.max(0, Math.min(MAX_QTY, v.stock)) : MAX_QTY,
    lowStock: limited && v.stock > 0 && v.stock <= v.low_stock_threshold ? v.stock : null,
  };
}

function toMedia(raw: RawProduct): MediaView[] {
  return [...raw.media].sort(byPosition).map((m) => ({ url: m.url, alt: m.alt ?? raw.name, kind: m.kind, poster: m.poster_url }));
}

function toFacets(raw: RawProduct): FacetTag[] {
  return raw.facets
    .map((f) => f.value)
    .filter((v): v is NonNullable<typeof v> => Boolean(v?.facet))
    .sort((a, b) => a.facet.position - b.facet.position || a.position - b.position)
    .map((v) => ({ facet: v.facet.slug, facetName: v.facet.name, value: v.slug, label: v.label }));
}

export function toSummary(raw: RawProduct, ctx: PricingContext): ProductSummary {
  const variants = raw.variants.filter((v) => v.active).sort(byPosition).map((v) => toVariant(v, ctx));
  const sellable = variants.filter((v) => v.available);
  const cheapest = [...(sellable.length ? sellable : variants)].sort((a, b) => a.price - b.price)[0];
  return {
    id: raw.id,
    slug: raw.slug,
    name: raw.name,
    subtitle: raw.subtitle,
    badge: raw.badge,
    featured: raw.featured,
    position: raw.position,
    createdAt: raw.created_at,
    categoryId: raw.category_id,
    categorySlug: raw.category?.slug ?? null,
    media: toMedia(raw),
    price: cheapest?.price ?? 0,
    compareAt: cheapest?.compareAt ?? null,
    fromPrice: new Set(variants.map((v) => v.price)).size > 1,
    available: sellable.length > 0,
    facets: toFacets(raw),
    defaultVariantId: (sellable[0] ?? variants[0])?.id ?? null,
  };
}

function toDetail(raw: RawProduct, ctx: PricingContext): ProductDetail {
  const notes: ProductDetail["notes"] = { tete: [], coeur: [], fond: [] };
  for (const n of [...raw.notes].sort(byPosition)) if (n.note) notes[n.layer].push({ slug: n.note.slug, name: n.note.name });
  return {
    ...toSummary(raw, ctx),
    description: raw.description,
    story: raw.story,
    usage: raw.usage,
    ingredients: raw.ingredients,
    allergens: raw.allergens,
    seoTitle: raw.seo_title,
    seoDescription: raw.seo_description,
    categoryName: raw.category?.name ?? null,
    variants: raw.variants.filter((v) => v.active).sort(byPosition).map((v) => toVariant(v, ctx)),
    notes,
  };
}

/** Produits publiés (bruts), lus directement en base : sert à la commande (stock exact). */
export async function loadRawProducts(): Promise<RawProduct[]> {
  if (!isSupabaseConfigured) return demoProducts;
  const { data, error } = await adminDb()
    .from("products")
    .select(productSelect)
    .eq("status", "active")
    .is("deleted_at", null)
    .order("position")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data as unknown as RawProduct[];
}

/** Produits publiés, gardés en cache (affichage du site). */
export const getRawProducts = siteCache(loadRawProducts, "catalogue", () => []);

export type ProductQuery = { categorySlug?: string; ids?: string[]; featured?: boolean; search?: string; excludeId?: string; limit?: number };

const normalize = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

export async function getProducts(query: ProductQuery = {}): Promise<ProductSummary[]> {
  const [raws, ctx] = await Promise.all([getRawProducts(), getPricingContext()]);
  let list = raws;
  if (query.categorySlug) list = list.filter((p) => p.category?.slug === query.categorySlug);
  if (query.ids) {
    const order = new Map(query.ids.map((id, i) => [id, i]));
    list = list.filter((p) => order.has(p.id)).sort((a, b) => order.get(a.id)! - order.get(b.id)!);
  }
  if (query.featured) list = list.filter((p) => p.featured);
  if (query.excludeId) list = list.filter((p) => p.id !== query.excludeId);
  if (query.search) {
    const terms = normalize(query.search).split(/\s+/).filter(Boolean);
    list = list.filter((p) => {
      const haystack = normalize(
        [p.name, p.subtitle, p.description, p.category?.name, ...p.notes.map((n) => n.note?.name), ...p.facets.map((f) => f.value?.label)].filter(Boolean).join(" "),
      );
      return terms.every((t) => haystack.includes(t));
    });
  }
  const summaries = list.map((p) => toSummary(p, ctx));
  return query.limit ? summaries.slice(0, query.limit) : summaries;
}

export async function getProduct(slug: string): Promise<ProductDetail | null> {
  const [raws, ctx] = await Promise.all([getRawProducts(), getPricingContext()]);
  const raw = raws.find((p) => p.slug === slug);
  return raw ? toDetail(raw, ctx) : null;
}

/** « Elle aime aussi » : produits associés dans l'admin, sinon même catégorie. */
export async function getRelated(product: ProductSummary, limit = 4): Promise<ProductSummary[]> {
  let ids: string[] = [];
  if (!isSupabaseConfigured) ids = demoRelations[product.id] ?? [];
  else {
    ids = await getRelationIds(product.id);
  }
  const related = ids.length ? await getProducts({ ids }) : [];
  if (related.length >= limit) return related.slice(0, limit);
  const more = await getProducts({ categorySlug: product.categorySlug ?? undefined, excludeId: product.id });
  return [...related, ...more.filter((p) => !related.some((r) => r.id === p.id))].slice(0, limit);
}

const getRelationIds = siteCache(
  async (productId: string) => {
    const { data, error } = await adminDb().from("product_relations").select("related_id").eq("product_id", productId).order("position");
    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => r.related_id as string);
  },
  "relations",
  () => [],
);

export type Category = { id: string; slug: string; name: string; description: string | null; banner_url: string | null; seo_title: string | null; seo_description: string | null };

export const getCategories = siteCache(
  async (): Promise<Category[]> => {
    if (!isSupabaseConfigured) {
      return [{ id: "demo-parfums", slug: "parfums", name: "Parfums", description: "Les eaux de parfum ISSEYE, en format Pocket Parfum 30 ml.", banner_url: null, seo_title: null, seo_description: null }];
    }
    const { data, error } = await adminDb()
      .from("categories")
      .select("id, slug, name, description, banner_url, seo_title, seo_description")
      .eq("active", true)
      .is("deleted_at", null)
      .order("position");
    if (error) throw new Error(error.message);
    return (data ?? []) as Category[];
  },
  "categories",
  () => [],
);

export type Collection = Category & { productIds: string[] };

export async function getCollection(slug: string): Promise<Collection | null> {
  if (!isSupabaseConfigured) return null;
  const now = new Date().toISOString();
  const data = await loadCollection(slug);
  if (!data) return null;
  if ((data.starts_at && data.starts_at > now) || (data.ends_at && data.ends_at < now)) return null;
  const productIds = [...(data.products as { product_id: string; position: number }[])].sort(byPosition).map((p) => p.product_id);
  return { ...(data as unknown as Category), productIds };
}

const loadCollection = siteCache(async (slug: string) => {
  const { data, error } = await adminDb()
    .from("collections")
    .select("id, slug, name, description, banner_url, seo_title, seo_description, starts_at, ends_at, products:collection_products(product_id, position)")
    .eq("slug", slug)
    .eq("active", true)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}, "collection", () => null);

/** Filtres de la boutique : caractéristiques filtrables réellement portées par des produits. */
export function filtersFor(products: ProductSummary[]) {
  const map = new Map<string, { slug: string; name: string; values: Map<string, string> }>();
  for (const p of products) {
    for (const f of p.facets) {
      const entry = map.get(f.facet) ?? { slug: f.facet, name: f.facetName, values: new Map<string, string>() };
      entry.values.set(f.value, f.label);
      map.set(f.facet, entry);
    }
  }
  return [...map.values()].map((f) => ({ slug: f.slug, name: f.name, values: [...f.values].map(([slug, label]) => ({ slug, label })) }));
}

/** Avis publiés d'un produit, et la note moyenne. */
export const getReviews = siteCache(async (productId: string): Promise<{ reviews: ReviewView[]; average: number; count: number }> => {
  if (!isSupabaseConfigured) return { reviews: [], average: 0, count: 0 };
  const { data, error } = await adminDb()
    .from("reviews")
    .select("id, author_name, rating, title, body, verified, admin_reply, created_at")
    .eq("product_id", productId)
    .eq("status", "publie")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw new Error(error.message);
  const reviews = (data ?? []).map((r) => ({
    id: r.id,
    author: r.author_name,
    rating: r.rating,
    title: r.title,
    body: r.body,
    verified: r.verified,
    reply: r.admin_reply,
    date: r.created_at,
  }));
  const average = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
  return { reviews, average, count: reviews.length };
}, "avis", () => ({ reviews: [], average: 0, count: 0 }));

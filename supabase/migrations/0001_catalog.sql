-- ISSEYE — catalogue, devises
-- À exécuter dans Supabase > SQL Editor, dans l'ordre des numéros.
-- Montants : toujours en unités mineures entières (centimes pour EUR/USD, francs pour FCFA).

create extension if not exists pgcrypto;

-- Date de mise à jour automatique
create or replace function public.set_updated_at() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ─────────────────────────────────────────────────────────────
-- Devises
-- ─────────────────────────────────────────────────────────────

-- rate : combien d'unités de la devise pour 1 € (EUR = 1, XOF = 655.957, USD ≈ 1.08)
-- rounding_step : arrondi au supérieur en unités mineures (FCFA : 500 → 24 597 devient 25 000)
-- rounding_ending : retranché après l'arrondi (USD : step 100 + ending 10 → 37,42 $ devient 37,90 $)
create table if not exists public.currencies (
  code text primary key check (code ~ '^[A-Z]{3}$'),
  name text not null,
  symbol text not null,
  decimals integer not null default 2 check (decimals between 0 and 3),
  rate numeric(14, 6) not null check (rate > 0),
  rate_locked boolean not null default false,  -- parité fixe (FCFA) : jamais modifiée par la mise à jour auto
  rate_updated_at timestamptz,
  rounding_step integer not null default 1 check (rounding_step >= 1),
  rounding_ending integer not null default 0 check (rounding_ending >= 0),
  is_base boolean not null default false,
  active boolean not null default true,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists currencies_one_base on public.currencies (is_base) where is_base;
create or replace trigger currencies_updated_at before update on public.currencies
  for each row execute function public.set_updated_at();

-- Devise affichée selon le pays de la visiteuse (code ISO à 2 lettres).
-- Pays absent de la liste → devise par défaut (Réglages).
create table if not exists public.country_currencies (
  country_code text primary key check (country_code ~ '^[A-Z]{2}$'),
  country_name text not null,
  currency_code text not null references public.currencies (code) on update cascade
);

-- ─────────────────────────────────────────────────────────────
-- Catégories (arborescence)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references public.categories (id) on delete set null,
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null,
  description text,
  image_url text,
  banner_url text,
  position integer not null default 0,
  active boolean not null default true,
  seo_title text,
  seo_description text,
  deleted_at timestamptz,  -- corbeille
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists categories_parent_idx on public.categories (parent_id, position);
create or replace trigger categories_updated_at before update on public.categories
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- Attributs de variantes, créés par l'admin (Contenance, Concentration…)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.attributes (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create or replace trigger attributes_updated_at before update on public.attributes
  for each row execute function public.set_updated_at();

create table if not exists public.attribute_values (
  id uuid primary key default gen_random_uuid(),
  attribute_id uuid not null references public.attributes (id) on delete cascade,
  slug text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  label text not null,
  position integer not null default 0,
  unique (attribute_id, slug)
);

-- ─────────────────────────────────────────────────────────────
-- Caractéristiques filtrables (Famille olfactive, Saison, Intensité…)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.facets (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null,
  multiple boolean not null default true,  -- plusieurs valeurs par produit
  filterable boolean not null default true, -- proposé dans les filtres de la boutique
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create or replace trigger facets_updated_at before update on public.facets
  for each row execute function public.set_updated_at();

create table if not exists public.facet_values (
  id uuid primary key default gen_random_uuid(),
  facet_id uuid not null references public.facets (id) on delete cascade,
  slug text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  label text not null,
  color text,  -- pastille facultative (#RRGGBB)
  position integer not null default 0,
  unique (facet_id, slug)
);

-- Notes olfactives (bibliothèque réutilisable : Rose, Vanille, Oud…)
create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null,
  image_url text,
  description text,
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- Produits
-- ─────────────────────────────────────────────────────────────
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null,
  subtitle text,                 -- « Eau de parfum florale »
  description text,              -- texte riche (Markdown)
  story text,                    -- l'histoire du parfum
  usage text,                    -- conseils d'utilisation
  ingredients text,              -- liste INCI
  allergens text,                -- allergènes réglementaires
  kind text not null default 'simple' check (kind in ('simple', 'bundle')),  -- bundle = coffret
  category_id uuid references public.categories (id) on delete set null,
  status text not null default 'draft' check (status in ('draft', 'active', 'archived')),
  featured boolean not null default false,
  badge text,                    -- « Nouveau », « Best-seller »…
  position integer not null default 0,
  seo_title text,
  seo_description text,
  published_at timestamptz,
  deleted_at timestamptz,        -- corbeille (30 jours)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists products_category_idx on public.products (category_id, position);
create index if not exists products_status_idx on public.products (status) where deleted_at is null;
create or replace trigger products_updated_at before update on public.products
  for each row execute function public.set_updated_at();

create table if not exists public.product_facet_values (
  product_id uuid not null references public.products (id) on delete cascade,
  facet_value_id uuid not null references public.facet_values (id) on delete cascade,
  primary key (product_id, facet_value_id)
);
create index if not exists product_facet_values_value_idx on public.product_facet_values (facet_value_id);

-- Pyramide olfactive
create table if not exists public.product_notes (
  product_id uuid not null references public.products (id) on delete cascade,
  note_id uuid not null references public.notes (id) on delete cascade,
  layer text not null check (layer in ('tete', 'coeur', 'fond')),
  position integer not null default 0,
  primary key (product_id, note_id, layer)
);

-- Produits associés (« Elle aime aussi »)
create table if not exists public.product_relations (
  product_id uuid not null references public.products (id) on delete cascade,
  related_id uuid not null references public.products (id) on delete cascade,
  position integer not null default 0,
  primary key (product_id, related_id),
  check (product_id <> related_id)
);

-- Variantes : chaque combinaison vendable (50 ml EDP…), avec son stock et son prix de référence en euros
create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  sku text unique,
  label text,                          -- libellé calculé (« 50 ml · Eau de parfum »)
  price integer not null check (price >= 0),           -- prix de référence (devise de base)
  compare_at_price integer check (compare_at_price >= 0), -- prix barré
  stock integer not null default 0,
  track_stock boolean not null default true,
  allow_backorder boolean not null default false,
  low_stock_threshold integer not null default 3 check (low_stock_threshold >= 0),
  weight_grams integer check (weight_grams >= 0),
  position integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists product_variants_product_idx on public.product_variants (product_id, position);
create or replace trigger product_variants_updated_at before update on public.product_variants
  for each row execute function public.set_updated_at();

create table if not exists public.variant_attribute_values (
  variant_id uuid not null references public.product_variants (id) on delete cascade,
  attribute_value_id uuid not null references public.attribute_values (id) on delete cascade,
  primary key (variant_id, attribute_value_id)
);

-- Prix fixés à la main dans une autre devise. Sans ligne ici, le prix est calculé
-- automatiquement depuis le prix de référence (taux + arrondi de la devise).
create table if not exists public.variant_prices (
  variant_id uuid not null references public.product_variants (id) on delete cascade,
  currency_code text not null references public.currencies (code) on update cascade on delete cascade,
  amount integer not null check (amount >= 0),
  compare_at_amount integer check (compare_at_amount >= 0),
  primary key (variant_id, currency_code)
);

-- Composition des coffrets : le stock du coffret dépend de celui de ses composants
create table if not exists public.bundle_items (
  bundle_variant_id uuid not null references public.product_variants (id) on delete cascade,
  component_variant_id uuid not null references public.product_variants (id) on delete restrict,
  quantity integer not null default 1 check (quantity > 0),
  primary key (bundle_variant_id, component_variant_id),
  check (bundle_variant_id <> component_variant_id)
);

-- Photos et vidéos du produit (éventuellement propres à une variante)
create table if not exists public.product_media (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  variant_id uuid references public.product_variants (id) on delete set null,
  kind text not null default 'image' check (kind in ('image', 'video')),
  url text not null,
  storage_path text,
  poster_url text,
  alt text,
  position integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists product_media_product_idx on public.product_media (product_id, position);

-- ─────────────────────────────────────────────────────────────
-- Collections (manuelles, ou automatiques par règles)
-- rules : { match: "all" | "any", conditions: [{ field, op, value }] }
-- ─────────────────────────────────────────────────────────────
create table if not exists public.collections (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null,
  description text,
  image_url text,
  banner_url text,
  kind text not null default 'manual' check (kind in ('manual', 'auto')),
  rules jsonb not null default '{"match":"all","conditions":[]}',
  sort text not null default 'manual' check (sort in ('manual', 'newest', 'price_asc', 'price_desc', 'name', 'best_selling')),
  active boolean not null default true,
  starts_at timestamptz,
  ends_at timestamptz,
  position integer not null default 0,
  seo_title text,
  seo_description text,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create or replace trigger collections_updated_at before update on public.collections
  for each row execute function public.set_updated_at();

create table if not exists public.collection_products (
  collection_id uuid not null references public.collections (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  position integer not null default 0,
  primary key (collection_id, product_id)
);
create index if not exists collection_products_product_idx on public.collection_products (product_id);

-- ─────────────────────────────────────────────────────────────
-- Données de départ
-- ─────────────────────────────────────────────────────────────
insert into public.currencies (code, name, symbol, decimals, rate, rate_locked, rounding_step, rounding_ending, is_base, position) values
  ('EUR', 'Euro', '€', 2, 1, true, 1, 0, true, 0),
  ('XOF', 'Franc CFA (UEMOA)', 'FCFA', 0, 655.957, true, 500, 0, false, 1),
  ('XAF', 'Franc CFA (CEMAC)', 'FCFA', 0, 655.957, true, 500, 0, false, 2),
  ('USD', 'Dollar américain', '$', 2, 1.08, false, 100, 10, false, 3)
on conflict (code) do nothing;

insert into public.country_currencies (country_code, country_name, currency_code) values
  -- Union européenne
  ('FR', 'France', 'EUR'), ('BE', 'Belgique', 'EUR'), ('LU', 'Luxembourg', 'EUR'), ('DE', 'Allemagne', 'EUR'),
  ('ES', 'Espagne', 'EUR'), ('IT', 'Italie', 'EUR'), ('PT', 'Portugal', 'EUR'), ('NL', 'Pays-Bas', 'EUR'),
  ('AT', 'Autriche', 'EUR'), ('IE', 'Irlande', 'EUR'), ('FI', 'Finlande', 'EUR'), ('GR', 'Grèce', 'EUR'),
  ('SK', 'Slovaquie', 'EUR'), ('SI', 'Slovénie', 'EUR'), ('EE', 'Estonie', 'EUR'), ('LV', 'Lettonie', 'EUR'),
  ('LT', 'Lituanie', 'EUR'), ('MT', 'Malte', 'EUR'), ('CY', 'Chypre', 'EUR'), ('HR', 'Croatie', 'EUR'),
  ('MC', 'Monaco', 'EUR'),
  -- France d'outre-mer
  ('GP', 'Guadeloupe', 'EUR'), ('MQ', 'Martinique', 'EUR'), ('GF', 'Guyane', 'EUR'), ('RE', 'La Réunion', 'EUR'), ('YT', 'Mayotte', 'EUR'),
  -- UEMOA (FCFA XOF)
  ('SN', 'Sénégal', 'XOF'), ('CI', 'Côte d''Ivoire', 'XOF'), ('ML', 'Mali', 'XOF'), ('BF', 'Burkina Faso', 'XOF'),
  ('BJ', 'Bénin', 'XOF'), ('TG', 'Togo', 'XOF'), ('NE', 'Niger', 'XOF'), ('GW', 'Guinée-Bissau', 'XOF'),
  -- CEMAC (FCFA XAF)
  ('CM', 'Cameroun', 'XAF'), ('GA', 'Gabon', 'XAF'), ('CG', 'Congo', 'XAF'), ('TD', 'Tchad', 'XAF'),
  ('CF', 'Centrafrique', 'XAF'), ('GQ', 'Guinée équatoriale', 'XAF'),
  -- États-Unis
  ('US', 'États-Unis', 'USD')
on conflict (country_code) do nothing;

insert into public.attributes (slug, name, position) values
  ('contenance', 'Contenance', 0),
  ('concentration', 'Concentration', 1)
on conflict (slug) do nothing;

insert into public.attribute_values (attribute_id, slug, label, position)
select a.id, v.slug, v.label, v.position
from public.attributes a
join (values
  ('contenance', '10-ml', '10 ml', 0), ('contenance', '30-ml', '30 ml', 1),
  ('contenance', '50-ml', '50 ml', 2), ('contenance', '100-ml', '100 ml', 3),
  ('concentration', 'extrait', 'Extrait de parfum', 0), ('concentration', 'edp', 'Eau de parfum', 1),
  ('concentration', 'edt', 'Eau de toilette', 2), ('concentration', 'brume', 'Brume', 3)
) as v(attr, slug, label, position) on v.attr = a.slug
on conflict (attribute_id, slug) do nothing;

insert into public.facets (slug, name, multiple, position) values
  ('pour', 'Pour', false, 0),
  ('famille', 'Famille olfactive', true, 1),
  ('moment', 'Moment', true, 2),
  ('saison', 'Saison', true, 3),
  ('intensite', 'Intensité', false, 4)
on conflict (slug) do nothing;

insert into public.facet_values (facet_id, slug, label, position)
select f.id, v.slug, v.label, v.position
from public.facets f
join (values
  ('pour', 'elle', 'Pour elle', 0), ('pour', 'lui', 'Pour lui', 1), ('pour', 'mixte', 'Mixte', 2),
  ('famille', 'florale', 'Florale', 0), ('famille', 'orientale', 'Orientale', 1), ('famille', 'boisee', 'Boisée', 2),
  ('famille', 'gourmande', 'Gourmande', 3), ('famille', 'fruitee', 'Fruitée', 4), ('famille', 'musquee', 'Musquée', 5),
  ('famille', 'fraiche', 'Fraîche', 6),
  ('moment', 'jour', 'Jour', 0), ('moment', 'soir', 'Soir', 1),
  ('saison', 'printemps-ete', 'Printemps · Été', 0), ('saison', 'automne-hiver', 'Automne · Hiver', 1),
  ('intensite', 'legere', 'Légère', 0), ('intensite', 'moderee', 'Modérée', 1), ('intensite', 'intense', 'Intense', 2)
) as v(facet, slug, label, position) on v.facet = f.slug
on conflict (facet_id, slug) do nothing;

-- Au lancement, la maison ne vend que ses parfums. D'autres catégories (coffrets, brumes…)
-- se créent dans Admin › Catégories.
insert into public.categories (slug, name, description, position) values
  ('parfums', 'Parfums', 'Les eaux de parfum ISSEYE, en format Pocket Parfum 30 ml.', 0)
on conflict (slug) do nothing;

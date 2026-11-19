-- ISSEYE — contenu du site (pages par sections, menus, annonces), médiathèque, emails,
-- équipe admin, journal des modifications, réglages, droits d'accès

-- ─────────────────────────────────────────────────────────────
-- Pages construites par sections
-- sections : [{ id, type: "hero" | "product_carousel" | …, visible, starts_at, ends_at, props: {…} }]
-- Le brouillon (draft_sections) est publié d'un clic ; chaque publication est archivée.
-- ─────────────────────────────────────────────────────────────
create table if not exists public.pages (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug = '' or slug ~ '^[a-z0-9]+(-[a-z0-9]+)*(/[a-z0-9]+(-[a-z0-9]+)*)*$'),  -- '' = accueil
  title text not null,
  kind text not null default 'sections' check (kind in ('sections', 'legal')),  -- legal : texte riche simple
  sections jsonb not null default '[]',
  draft_sections jsonb,
  body text,          -- texte riche des pages légales
  status text not null default 'draft' check (status in ('draft', 'published')),
  system boolean not null default false,  -- page indispensable : ne peut pas être supprimée
  seo_title text,
  seo_description text,
  og_image_url text,
  published_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create or replace trigger pages_updated_at before update on public.pages
  for each row execute function public.set_updated_at();

create table if not exists public.page_versions (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.pages (id) on delete cascade,
  sections jsonb,
  body text,
  created_by text,
  created_at timestamptz not null default now()
);
create index if not exists page_versions_page_idx on public.page_versions (page_id, created_at desc);

-- Menus : items = [{ id, label, href, children: [...] , image_url? }]
create table if not exists public.menus (
  slug text primary key,   -- header, footer
  name text not null,
  items jsonb not null default '[]',
  updated_at timestamptz not null default now()
);
create or replace trigger menus_updated_at before update on public.menus
  for each row execute function public.set_updated_at();

-- Bandeaux d'annonce et pop-ups programmés
-- content : { text, link_label, link_href, image_url, code, countdown… }
-- targeting : { pages: [...], currencies: [...], trigger: "delay" | "exit" | "scroll", delay_s, once_per_days }
create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('bar', 'popup')),
  name text not null,
  content jsonb not null default '{}',
  targeting jsonb not null default '{}',
  tone text not null default 'noir' check (tone in ('noir', 'or', 'creme')),
  priority integer not null default 0,
  starts_at timestamptz,
  ends_at timestamptz,
  active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create or replace trigger announcements_updated_at before update on public.announcements
  for each row execute function public.set_updated_at();

create table if not exists public.faqs (
  id uuid primary key default gen_random_uuid(),
  topic text not null default 'general',  -- commande, livraison, produits…
  question text not null,
  answer text not null,
  position integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- Médiathèque (toutes les images et vidéos déposées dans l'admin)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.media (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('image', 'video')),
  url text not null,
  storage_path text,
  poster_url text,
  poster_path text,
  alt text,
  focal text not null default 'center center',  -- point de cadrage (CSS object-position)
  width integer,
  height integer,
  size_bytes integer,
  folder text not null default 'general',
  created_at timestamptz not null default now()
);
create index if not exists media_folder_idx on public.media (folder, created_at desc);

-- ─────────────────────────────────────────────────────────────
-- Modèles d'emails modifiables. Variables : {{prenom}}, {{numero}}, {{lien_suivi}}…
-- ─────────────────────────────────────────────────────────────
create table if not exists public.email_templates (
  key text primary key,
  name text not null,
  subject text not null,
  heading text not null,
  body text not null,
  cta_label text,
  enabled boolean not null default true,
  updated_at timestamptz not null default now()
);
create or replace trigger email_templates_updated_at before update on public.email_templates
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- Réglages (une seule ligne, sections JSON validées côté serveur)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.site_settings (
  id integer primary key default 1 check (id = 1),
  data jsonb not null default '{}',
  updated_at timestamptz not null default now()
);
create or replace trigger site_settings_updated_at before update on public.site_settings
  for each row execute function public.set_updated_at();
insert into public.site_settings (id) values (1) on conflict (id) do nothing;

-- ─────────────────────────────────────────────────────────────
-- Équipe admin et journal des modifications
-- owner : tout · manager : commandes, catalogue, stock, clientes · editor : contenu et médias
-- ─────────────────────────────────────────────────────────────
create table if not exists public.admin_users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  role text not null check (role in ('owner', 'manager', 'editor')),
  created_at timestamptz not null default now()
);

create table if not exists public.audit_log (
  id bigint generated always as identity primary key,
  actor_email text,
  action text not null,        -- create, update, delete, restore, publish…
  entity text not null,        -- product, order, page…
  entity_id text,
  summary text,
  created_at timestamptz not null default now()
);
create index if not exists audit_log_created_idx on public.audit_log (created_at desc);
create index if not exists audit_log_entity_idx on public.audit_log (entity, entity_id);

-- ─────────────────────────────────────────────────────────────
-- Stockage des fichiers : bucket public, photos et vidéos uniquement (50 Mo max)
-- ─────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', true, 52428800,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif', 'image/svg+xml', 'video/mp4', 'video/quicktime', 'video/webm'])
on conflict (id) do nothing;

-- ─────────────────────────────────────────────────────────────
-- Données de départ
-- ─────────────────────────────────────────────────────────────
insert into public.pages (slug, title, kind, status, system, published_at) values
  ('', 'Accueil', 'sections', 'published', true, now()),
  ('cgv', 'Conditions générales de vente', 'legal', 'published', true, now()),
  ('mentions-legales', 'Mentions légales', 'legal', 'published', true, now()),
  ('confidentialite', 'Politique de confidentialité', 'legal', 'published', true, now()),
  ('livraison-retours', 'Livraison & retours', 'legal', 'published', true, now()),
  ('maison', 'La Maison ISSEYE', 'sections', 'published', true, now())
on conflict (slug) do nothing;

insert into public.menus (slug, name, items) values
  ('header', 'Menu principal', '[
    {"id":"m1","label":"Parfums","href":"/boutique"},
    {"id":"m2","label":"Pour elle","href":"/boutique?pour=elle"},
    {"id":"m3","label":"Pour lui","href":"/boutique?pour=lui"},
    {"id":"m4","label":"La Maison","href":"/maison"}
  ]'),
  ('footer', 'Pied de page', '[
    {"id":"f1","label":"Boutique","href":"/boutique","children":[
      {"id":"f11","label":"Tous les parfums","href":"/boutique"},
      {"id":"f12","label":"Pour elle","href":"/boutique?pour=elle"},
      {"id":"f13","label":"Pour lui","href":"/boutique?pour=lui"},
      {"id":"f14","label":"La Maison ISSEYE","href":"/maison"}
    ]},
    {"id":"f2","label":"Service client","href":"/contact","children":[
      {"id":"f21","label":"Suivre ma commande","href":"/suivi"},
      {"id":"f22","label":"Livraison & retours","href":"/livraison-retours"},
      {"id":"f23","label":"Questions fréquentes","href":"/faq"},
      {"id":"f24","label":"Contact","href":"/contact"}
    ]},
    {"id":"f3","label":"Informations","href":"/mentions-legales","children":[
      {"id":"f31","label":"CGV","href":"/cgv"},
      {"id":"f32","label":"Mentions légales","href":"/mentions-legales"},
      {"id":"f33","label":"Confidentialité","href":"/confidentialite"}
    ]}
  ]')
on conflict (slug) do nothing;

insert into public.email_templates (key, name, subject, heading, body, cta_label) values
  ('order_confirmation', 'Confirmation de commande', 'Votre commande {{numero}} est confirmée',
    'Merci {{prenom}}', 'Nous avons bien reçu votre commande {{numero}}. Nous la préparons avec soin et vous écrirons dès son expédition.', 'Suivre ma commande'),
  ('order_shipped', 'Commande expédiée', 'Votre commande {{numero}} est en route',
    'Elle arrive, {{prenom}}', 'Votre commande {{numero}} a été confiée à {{transporteur}}. Numéro de suivi : {{suivi}}.', 'Suivre le colis'),
  ('order_delivered', 'Commande livrée', 'Votre commande {{numero}} est arrivée',
    'Belle découverte, {{prenom}}', 'Votre commande {{numero}} a été livrée. Nous espérons que vos senteurs vous plairont.', 'Voir ma commande'),
  ('order_cancelled', 'Commande annulée', 'Votre commande {{numero}} a été annulée',
    'Commande annulée', 'Votre commande {{numero}} a été annulée. Si un paiement a été effectué, il vous sera remboursé sous quelques jours.', null),
  ('review_request', 'Demande d''avis', '{{prenom}}, que pensez-vous de votre parfum ?',
    'Votre avis compte', 'Quelques jours ont passé depuis la réception de votre commande. Partagez votre ressenti en une minute.', 'Donner mon avis'),
  ('abandoned_cart', 'Panier abandonné', 'Votre sélection vous attend',
    'Vous avez oublié quelque chose', 'Les senteurs que vous avez choisies sont toujours dans votre panier.', 'Reprendre mon panier'),
  ('back_in_stock', 'Retour en stock', '{{produit}} est de retour',
    'Il est de retour', '{{produit}} est à nouveau disponible. Les quantités sont limitées.', 'Le découvrir'),
  ('admin_new_order', 'Alerte nouvelle commande (admin)', 'Nouvelle commande {{numero}} · {{total}}',
    'Nouvelle commande', '{{prenom}} {{nom}} vient de commander pour {{total}}.', 'Ouvrir dans l''admin')
on conflict (key) do nothing;

-- ─────────────────────────────────────────────────────────────
-- Droits d'accès : le site n'accède à la base que depuis le serveur (clé secrète, rôle
-- service_role). Les visiteurs (anon) et comptes connectés n'ont aucun accès direct.
-- ─────────────────────────────────────────────────────────────
do $$
declare
  t record;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', t.tablename);
  end loop;
end;
$$;

grant usage on schema public to service_role;
grant select, insert, update, delete on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;

revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on all functions in schema public to service_role;

-- ISSEYE — clientes, livraison, commandes, stock, promotions, avis

-- ─────────────────────────────────────────────────────────────
-- Clientes
-- ─────────────────────────────────────────────────────────────
create table if not exists public.customers (
  id uuid primary key references auth.users (id) on delete cascade,
  first_name text,
  last_name text,
  phone text,
  birthday date,
  marketing_consent boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create or replace trigger customers_updated_at before update on public.customers
  for each row execute function public.set_updated_at();

create table if not exists public.addresses (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers (id) on delete cascade,
  label text,
  first_name text not null,
  last_name text not null,
  line1 text not null,
  line2 text,
  postal_code text,
  city text not null,
  country_code text not null check (country_code ~ '^[A-Z]{2}$'),
  phone text,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists addresses_customer_idx on public.addresses (customer_id);

-- ─────────────────────────────────────────────────────────────
-- Livraison : zones (liste de pays) et modes de livraison avec un tarif par devise
-- ─────────────────────────────────────────────────────────────
create table if not exists public.shipping_zones (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  countries text[] not null default '{}',
  -- ttc : prix TVA comprise (France, UE) · export : vente hors UE, facturée hors TVA
  tax_mode text not null default 'ttc' check (tax_mode in ('ttc', 'export')),
  customs_notice text,  -- message affiché (droits de douane à la charge de la cliente…)
  active boolean not null default true,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create or replace trigger shipping_zones_updated_at before update on public.shipping_zones
  for each row execute function public.set_updated_at();

create table if not exists public.shipping_methods (
  id uuid primary key default gen_random_uuid(),
  zone_id uuid not null references public.shipping_zones (id) on delete cascade,
  name text not null,           -- « Colissimo suivi »
  description text,
  eta text,                     -- « 2 à 4 jours ouvrés »
  carrier text,
  tracking_url_template text,   -- https://…/{tracking}
  active boolean not null default true,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.shipping_method_prices (
  method_id uuid not null references public.shipping_methods (id) on delete cascade,
  currency_code text not null references public.currencies (code) on update cascade on delete cascade,
  amount integer not null check (amount >= 0),
  free_above integer check (free_above >= 0),  -- livraison offerte dès ce montant
  primary key (method_id, currency_code)
);

-- ─────────────────────────────────────────────────────────────
-- Codes promo
-- ─────────────────────────────────────────────────────────────
create table if not exists public.promo_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code = upper(code) and code ~ '^[A-Z0-9_-]{3,24}$'),
  kind text not null check (kind in ('percent', 'amount', 'free_shipping')),
  percent integer check (percent between 1 and 90),
  category_ids uuid[] not null default '{}',     -- vide = tout le catalogue
  collection_ids uuid[] not null default '{}',
  starts_at timestamptz,
  ends_at timestamptz,
  max_uses integer check (max_uses > 0),
  uses integer not null default 0,
  first_order_only boolean not null default false,
  once_per_customer boolean not null default false,
  active boolean not null default true,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create or replace trigger promo_codes_updated_at before update on public.promo_codes
  for each row execute function public.set_updated_at();

-- Montants par devise (réduction fixe, minimum d'achat)
create table if not exists public.promo_code_amounts (
  promo_code_id uuid not null references public.promo_codes (id) on delete cascade,
  currency_code text not null references public.currencies (code) on update cascade on delete cascade,
  amount integer check (amount > 0),
  min_subtotal integer check (min_subtotal >= 0),
  primary key (promo_code_id, currency_code)
);

-- Promotions automatiques (sans code) :
-- kind = percent_off | gift_with_purchase | buy_x_get_y | free_shipping
-- rules : conditions et effet, interprétés par le serveur
create table if not exists public.promotions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kind text not null check (kind in ('percent_off', 'gift_with_purchase', 'buy_x_get_y', 'free_shipping')),
  rules jsonb not null default '{}',
  priority integer not null default 0,
  starts_at timestamptz,
  ends_at timestamptz,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create or replace trigger promotions_updated_at before update on public.promotions
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- Commandes
-- ─────────────────────────────────────────────────────────────
create sequence if not exists public.order_number_seq start 1001;

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  number text unique not null default ('ISY-' || nextval('public.order_number_seq')::text),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- en_attente_paiement → payee → en_preparation → expediee → livree
  -- (ou annulee / remboursee, ou abandonnee si le paiement n'a jamais abouti)
  status text not null default 'en_attente_paiement' check (status in (
    'en_attente_paiement', 'payee', 'en_preparation', 'expediee', 'livree', 'annulee', 'remboursee', 'abandonnee'
  )),

  customer_id uuid references auth.users (id) on delete set null,
  email text not null,
  phone text,
  first_name text not null,
  last_name text not null,

  -- Adresse de livraison
  ship_line1 text not null,
  ship_line2 text,
  ship_postal_code text,
  ship_city text not null,
  ship_country text not null check (ship_country ~ '^[A-Z]{2}$'),

  -- Devise de la commande et taux appliqué (unités pour 1 € au moment de l'achat)
  currency_code text not null references public.currencies (code) on update cascade,
  fx_rate numeric(14, 6) not null,
  tax_mode text not null default 'ttc' check (tax_mode in ('ttc', 'export')),

  subtotal integer not null check (subtotal >= 0),
  discount integer not null default 0 check (discount >= 0),
  shipping integer not null default 0 check (shipping >= 0),
  gift_wrap integer not null default 0 check (gift_wrap >= 0),
  total integer not null check (total >= 0),
  tax_included integer not null default 0,  -- part de TVA incluse (pour la facture)

  promo_code text,
  promotions jsonb not null default '[]',   -- promotions automatiques appliquées
  shipping_method text,
  gift_message text,
  notes text,

  payment_provider text not null default 'stripe',
  payment_session_id text unique,
  payment_intent_id text,
  paid_at timestamptz,

  carrier text,
  tracking_number text,
  tracking_url text,
  shipped_at timestamptz,
  delivered_at timestamptz,

  refunded_amount integer not null default 0 check (refunded_amount >= 0),
  refunded_at timestamptz,
  stock_committed boolean not null default false,  -- stock déjà retiré (évite un double décompte)
  review_requested_at timestamptz,

  -- Lien de suivi envoyé par email (commandes sans compte comprises)
  access_token text not null default (replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')),
  admin_notes text
);
create index if not exists orders_status_idx on public.orders (status);
create index if not exists orders_created_idx on public.orders (created_at desc);
create index if not exists orders_customer_idx on public.orders (customer_id);
create index if not exists orders_email_idx on public.orders (lower(email));
create or replace trigger orders_updated_at before update on public.orders
  for each row execute function public.set_updated_at();

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  variant_id uuid references public.product_variants (id) on delete set null,
  -- Copie au moment de l'achat : la commande reste lisible même si le produit change
  sku text,
  product_name text not null,
  variant_label text,
  image_url text,
  unit_price integer not null check (unit_price >= 0),
  quantity integer not null check (quantity > 0),
  line_total integer not null check (line_total >= 0),
  is_gift boolean not null default false  -- article offert par une promotion
);
create index if not exists order_items_order_idx on public.order_items (order_id);
create index if not exists order_items_variant_idx on public.order_items (variant_id);

-- ─────────────────────────────────────────────────────────────
-- Stock : chaque mouvement est historisé
-- ─────────────────────────────────────────────────────────────
create table if not exists public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid not null references public.product_variants (id) on delete cascade,
  delta integer not null check (delta <> 0),
  stock_after integer not null,
  reason text not null check (reason in ('vente', 'annulation', 'retour', 'reassort', 'ajustement', 'casse')),
  order_id uuid references public.orders (id) on delete set null,
  note text,
  created_by text,
  created_at timestamptz not null default now()
);
create index if not exists stock_movements_variant_idx on public.stock_movements (variant_id, created_at desc);

-- Mouvement de stock atomique (verrou sur la ligne de la variante)
create or replace function public.adjust_stock(
  p_variant uuid, p_delta integer, p_reason text, p_order uuid default null, p_note text default null, p_by text default null
) returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_stock integer;
begin
  update public.product_variants set stock = stock + p_delta
  where id = p_variant
  returning stock into v_stock;
  if v_stock is null then raise exception 'Variante introuvable'; end if;
  insert into public.stock_movements (variant_id, delta, stock_after, reason, order_id, note, created_by)
  values (p_variant, p_delta, v_stock, p_reason, p_order, p_note, p_by);
  return v_stock;
end;
$$;

-- Retire du stock les articles d'une commande payée (une seule fois). Les coffrets
-- décomptent leurs composants. Renvoie false si la commande était déjà décomptée.
create or replace function public.commit_order_stock(p_order uuid) returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  item record;
  part record;
  done boolean;
begin
  update public.orders set stock_committed = true
  where id = p_order and not stock_committed
  returning true into done;
  if done is null then return false; end if;

  for item in
    select oi.variant_id, sum(oi.quantity)::integer as qty
    from public.order_items oi
    join public.product_variants v on v.id = oi.variant_id
    where oi.order_id = p_order and v.track_stock
    group by oi.variant_id
  loop
    perform public.adjust_stock(item.variant_id, -item.qty, 'vente', p_order);
    for part in select component_variant_id, quantity from public.bundle_items where bundle_variant_id = item.variant_id loop
      perform public.adjust_stock(part.component_variant_id, -(part.quantity * item.qty), 'vente', p_order, 'Composant de coffret');
    end loop;
  end loop;
  return true;
end;
$$;

-- Remet en stock les articles d'une commande annulée (si elle avait été décomptée)
create or replace function public.release_order_stock(p_order uuid) returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  item record;
  part record;
  done boolean;
begin
  update public.orders set stock_committed = false
  where id = p_order and stock_committed
  returning true into done;
  if done is null then return false; end if;

  for item in
    select oi.variant_id, sum(oi.quantity)::integer as qty
    from public.order_items oi
    join public.product_variants v on v.id = oi.variant_id
    where oi.order_id = p_order and v.track_stock
    group by oi.variant_id
  loop
    perform public.adjust_stock(item.variant_id, item.qty, 'annulation', p_order);
    for part in select component_variant_id, quantity from public.bundle_items where bundle_variant_id = item.variant_id loop
      perform public.adjust_stock(part.component_variant_id, part.quantity * item.qty, 'annulation', p_order, 'Composant de coffret');
    end loop;
  end loop;
  return true;
end;
$$;

create or replace function public.use_promo_code(p_code text) returns void
language sql
security invoker
set search_path = ''
as $$
  update public.promo_codes set uses = uses + 1 where code = p_code;
$$;

create or replace function public.release_promo_code(p_code text) returns void
language sql
security invoker
set search_path = ''
as $$
  update public.promo_codes set uses = greatest(uses - 1, 0) where code = p_code;
$$;

-- ─────────────────────────────────────────────────────────────
-- Avis, favoris, alertes retour en stock, newsletter, paniers abandonnés
-- ─────────────────────────────────────────────────────────────
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  customer_id uuid references auth.users (id) on delete set null,
  order_id uuid references public.orders (id) on delete set null,
  author_name text not null,
  rating integer not null check (rating between 1 and 5),
  title text,
  body text,
  verified boolean not null default false,  -- achat vérifié
  status text not null default 'en_attente' check (status in ('en_attente', 'publie', 'refuse')),
  admin_reply text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists reviews_product_idx on public.reviews (product_id, status);
create or replace trigger reviews_updated_at before update on public.reviews
  for each row execute function public.set_updated_at();

create table if not exists public.wishlists (
  customer_id uuid not null references public.customers (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (customer_id, product_id)
);

create table if not exists public.stock_alerts (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid not null references public.product_variants (id) on delete cascade,
  email text not null,
  notified_at timestamptz,
  created_at timestamptz not null default now(),
  unique (variant_id, email)
);

create table if not exists public.newsletter_subscribers (
  email text primary key,
  first_name text,
  source text,                   -- popup, footer, commande…
  subscribed_at timestamptz not null default now(),
  unsubscribed_at timestamptz,
  unsubscribe_token text not null default replace(gen_random_uuid()::text, '-', '')
);

create table if not exists public.carts (
  id uuid primary key default gen_random_uuid(),
  email text,
  customer_id uuid references auth.users (id) on delete set null,
  currency_code text not null,
  lines jsonb not null default '[]',
  reminder_count integer not null default 0,
  last_reminded_at timestamptz,
  recovered_order_id uuid references public.orders (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists carts_reminder_idx on public.carts (updated_at) where recovered_order_id is null and email is not null;
create or replace trigger carts_updated_at before update on public.carts
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- Données de départ : zones de livraison (tarifs à ajuster dans l'admin)
-- ─────────────────────────────────────────────────────────────
insert into public.shipping_zones (name, countries, tax_mode, customs_notice, position)
select * from (values
  ('France métropolitaine', array['FR', 'MC'], 'ttc', null::text, 0),
  ('Union européenne', array['BE', 'LU', 'DE', 'ES', 'IT', 'PT', 'NL', 'AT', 'IE'], 'ttc', null, 1),
  ('Afrique de l''Ouest et centrale', array['SN', 'CI', 'ML', 'BF', 'BJ', 'TG', 'NE', 'CM', 'GA', 'CG'], 'export',
    'Commande expédiée hors Union européenne : prix hors TVA. Les éventuels droits et taxes d''importation sont à la charge de la destinataire.', 2),
  ('États-Unis', array['US'], 'export',
    'Commande expédiée hors Union européenne : prix hors TVA. Les éventuels droits et taxes d''importation sont à la charge de la destinataire.', 3)
) as z(name, countries, tax_mode, customs_notice, position)
where not exists (select 1 from public.shipping_zones);

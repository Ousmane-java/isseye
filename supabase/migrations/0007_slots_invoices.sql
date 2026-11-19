-- ISSEYE — créneaux de retrait / livraison locale, factures numérotées, emails de connexion
-- Réexécutable.

-- Créneau choisi par la cliente (retrait ou livraison locale)
alter table public.orders add column if not exists scheduled_date date;
alter table public.orders add column if not exists scheduled_slot text;

-- Factures : numéro chronologique sans trou, attribué au paiement (F-2026-0001…)
alter table public.orders add column if not exists invoice_number text;
alter table public.orders add column if not exists invoiced_at timestamptz;
create unique index if not exists orders_invoice_number_idx on public.orders (invoice_number) where invoice_number is not null;

create table if not exists public.invoice_counters (
  year integer primary key,
  last_number integer not null default 0
);
alter table public.invoice_counters enable row level security;
revoke all on public.invoice_counters from anon, authenticated;
grant select, insert, update, delete on public.invoice_counters to service_role;

-- Attribue (une seule fois) le numéro de facture d'une commande payée
create or replace function public.assign_invoice_number(p_order uuid) returns text
language plpgsql
security invoker
set search_path = ''
as $$
declare
  existing text;
  y integer := extract(year from now() at time zone 'Europe/Paris')::integer;
  n integer;
begin
  select invoice_number into existing from public.orders where id = p_order for update;
  if existing is not null then return existing; end if;
  insert into public.invoice_counters (year, last_number) values (y, 1)
  on conflict (year) do update set last_number = public.invoice_counters.last_number + 1
  returning last_number into n;
  update public.orders set invoice_number = 'F-' || y || '-' || lpad(n::text, 4, '0'), invoiced_at = now() where id = p_order;
  return 'F-' || y || '-' || lpad(n::text, 4, '0');
end;
$$;
revoke execute on function public.assign_invoice_number(uuid) from public, anon, authenticated;
grant execute on function public.assign_invoice_number(uuid) to service_role;

-- Factures des commandes déjà payées
do $$
declare o record;
begin
  for o in select id from public.orders where paid_at is not null and invoice_number is null order by paid_at loop
    perform public.assign_invoice_number(o.id);
  end loop;
end $$;

insert into public.email_templates (key, name, subject, heading, body, cta_label) values
  ('admin_reset', 'Mot de passe oublié (admin)', 'Réinitialiser votre mot de passe ISSEYE',
    'Nouveau mot de passe', 'Vous avez demandé à changer le mot de passe de votre accès à l''espace de gestion ISSEYE. Ce lien est valable une heure. Si vous n''êtes pas à l''origine de cette demande, ignorez cet email.', 'Choisir un nouveau mot de passe')
on conflict (key) do nothing;
update public.email_templates
  set subject = 'Votre lien de connexion ISSEYE', heading = 'Bonjour',
      body = 'Voici votre lien pour accéder à votre espace ISSEYE : vos commandes, vos favoris et vos préférences. Il est valable une heure et ne sert qu''une fois.',
      cta_label = 'Accéder à mon espace'
  where key = 'customer_login';

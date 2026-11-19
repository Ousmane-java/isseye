-- ISSEYE — historique des commandes (chaque étape, qui l'a faite, email envoyé ou non)
-- Réexécutable.

create table if not exists public.order_events (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.orders (id) on delete cascade,
  kind text not null,              -- statut atteint (payee, en_preparation…) ou action (note, remboursement…)
  label text not null,             -- texte affiché dans l'historique
  notified boolean not null default false, -- la cliente a reçu un email
  actor text,                      -- email de l'admin, ou « système »
  created_at timestamptz not null default now()
);
create index if not exists order_events_order_idx on public.order_events (order_id, created_at);
alter table public.order_events enable row level security;
grant select, insert, update, delete on public.order_events to service_role;
grant usage, select on all sequences in schema public to service_role;
revoke all on public.order_events from anon, authenticated;

insert into public.email_templates (key, name, subject, heading, body, cta_label) values
  ('order_preparing', 'Commande en préparation', 'Votre commande {{numero}} est en préparation',
    'Nous la préparons, {{prenom}}', 'Votre commande {{numero}} est entre nos mains : nous la préparons avec soin. Nous vous écrivons dès la prochaine étape.', 'Suivre ma commande'),
  ('order_picked_up', 'Commande retirée', 'Merci pour votre visite, {{prenom}}',
    'Belle découverte, {{prenom}}', 'Vous avez retiré votre commande {{numero}} à la boutique. Merci de votre confiance : nous espérons que votre parfum vous accompagnera longtemps.', 'Voir ma commande')
on conflict (key) do nothing;

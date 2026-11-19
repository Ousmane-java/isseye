-- ISSEYE — modes de livraison : retrait en boutique, livraison locale (au km), envoi postal
-- Réexécutable.

-- Type de livraison de la commande
--   postal : Colissimo, DHL… (zones et modes de Admin › Livraison)
--   local  : livraison à domicile autour de la boutique, prix selon la distance par la route
--   pickup : retrait à la boutique
alter table public.orders add column if not exists delivery_type text not null default 'postal';
alter table public.orders drop constraint if exists orders_delivery_type_check;
alter table public.orders add constraint orders_delivery_type_check check (delivery_type in ('postal', 'local', 'pickup'));
alter table public.orders add column if not exists delivery_distance_km numeric(7, 2);
alter table public.orders add column if not exists ready_at timestamptz;

-- Nouveau statut « prête à retirer » (retrait en boutique)
alter table public.orders drop constraint if exists orders_status_check;
alter table public.orders add constraint orders_status_check check (status in (
  'en_attente_paiement', 'payee', 'en_preparation', 'prete_retrait', 'expediee', 'livree', 'annulee', 'remboursee', 'abandonnee'
));

insert into public.email_templates (key, name, subject, heading, body, cta_label) values
  ('order_ready_pickup', 'Commande prête à retirer', 'Votre commande {{numero}} vous attend',
    'Elle est prête, {{prenom}}', 'Votre commande {{numero}} est prête. Vous pouvez venir la retirer à la boutique : **{{adresse_retrait}}**.

{{horaires_retrait}}

Munissez-vous de votre numéro de commande.', 'Voir ma commande'),
  ('order_local_delivery', 'Commande en livraison (locale)', 'Votre commande {{numero}} arrive',
    'En route, {{prenom}}', 'Votre commande {{numero}} part en livraison à votre adresse. Nous vous contactons au besoin au numéro indiqué.', 'Suivre ma commande')
on conflict (key) do nothing;

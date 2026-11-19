-- ISSEYE — lancement : compléments de schéma et contenu de départ
-- (parfums Luna et Noir, notes olfactives, livraison, FAQ, bandeau d'annonce)
-- Réexécutable : chaque insertion ignore ce qui existe déjà.

-- ─────────────────────────────────────────────────────────────
-- Commandes : consentement newsletter, relance de panier
-- ─────────────────────────────────────────────────────────────
alter table public.orders add column if not exists marketing_consent boolean not null default false;
alter table public.orders add column if not exists reminder_sent_at timestamptz;   -- relance « votre sélection vous attend »
alter table public.orders add column if not exists cancelled_at timestamptz;
alter table public.orders add column if not exists shipping_zone text;
create index if not exists orders_pending_idx on public.orders (created_at) where status = 'en_attente_paiement';

-- ─────────────────────────────────────────────────────────────
-- Messages du formulaire de contact
-- ─────────────────────────────────────────────────────────────
create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text,
  subject text not null,
  order_number text,
  message text not null,
  handled_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists contact_messages_created_idx on public.contact_messages (created_at desc);

-- ─────────────────────────────────────────────────────────────
-- Modèles d'emails supplémentaires
-- ─────────────────────────────────────────────────────────────
insert into public.email_templates (key, name, subject, heading, body, cta_label) values
  ('order_refunded', 'Remboursement', 'Remboursement de votre commande {{numero}}',
    'Remboursement effectué', 'Nous avons remboursé {{montant}} sur votre moyen de paiement pour la commande {{numero}}. Le délai d''apparition sur votre compte dépend de votre banque (5 à 10 jours).', 'Voir ma commande'),
  ('contact_received', 'Accusé de réception (contact)', 'Nous avons bien reçu votre message',
    'Merci {{prenom}}', 'Votre message est entre de bonnes mains. Nous vous répondons sous 48 heures ouvrées.', null),
  ('customer_login', 'Connexion à l''espace cliente', 'Votre code de connexion ISSEYE',
    'Votre code', 'Utilisez ce lien pour accéder à votre espace et à vos commandes.', 'Me connecter')
on conflict (key) do nothing;

-- ─────────────────────────────────────────────────────────────
-- Bibliothèque de notes olfactives
-- ─────────────────────────────────────────────────────────────
insert into public.notes (slug, name) values
  ('bergamote', 'Bergamote'), ('poire', 'Poire'), ('mandarine', 'Mandarine'), ('poivre-rose', 'Poivre rose'),
  ('poivre-noir', 'Poivre noir'), ('cardamome', 'Cardamome'), ('fleur-d-oranger', 'Fleur d''oranger'),
  ('rose', 'Rose'), ('jasmin', 'Jasmin'), ('iris', 'Iris'), ('pivoine', 'Pivoine'), ('lavande', 'Lavande'),
  ('cuir', 'Cuir'), ('musc-blanc', 'Musc blanc'), ('vanille', 'Vanille'), ('santal', 'Santal'),
  ('ambre', 'Ambre'), ('vetiver', 'Vétiver'), ('cedre', 'Cèdre'), ('patchouli', 'Patchouli'),
  ('feve-tonka', 'Fève tonka'), ('oud', 'Oud')
on conflict (slug) do nothing;

-- ─────────────────────────────────────────────────────────────
-- Parfums de lancement : Luna (pour elle) et Noir (pour lui)
-- Textes et prix de départ, à ajuster dans Admin › Produits.
-- ─────────────────────────────────────────────────────────────
insert into public.products (slug, name, subtitle, description, story, usage, ingredients, allergens, category_id, status, featured, badge, position, published_at, seo_title, seo_description)
select v.slug, v.name, v.subtitle, v.description, v.story, v.usage, v.ingredients, v.allergens,
  (select id from public.categories where slug = 'parfums'), 'active', true, 'Nouveau', v.position, now(), v.seo_title, v.seo_description
from (values
  ('luna', 'Luna', 'Eau de parfum · Pour elle',
   'Luna est une caresse lumineuse : une fleur d''oranger nimbée de poire, posée sur un fond de musc blanc et de vanille. Une signature douce et magnétique, qui accompagne chaque geste.',
   'Née d''une nuit de pleine lune, Luna capture l''instant où la lumière se pose sur la peau. Un parfum intime, tendre et lumineux, pensé pour être porté près de soi, partout.',
   'Vaporisez à 15 cm de la peau, sur les points de pulsation : poignets, cou, creux du coude. Le format Pocket Parfum se glisse dans le sac pour une retouche à tout moment.',
   'Alcohol denat., Parfum (Fragrance), Aqua (Water).',
   'Limonene, Linalool, Coumarin, Citral, Geraniol.',
   0, 'Luna · Eau de parfum pour elle', 'Luna, eau de parfum ISSEYE pour elle : fleur d''oranger, poire, musc blanc et vanille. Format Pocket Parfum 30 ml.'),
  ('noir', 'Noir', 'Eau de parfum · Pour lui',
   'Noir s''ouvre sur l''éclat du poivre noir et de la bergamote, avant un cœur de lavande et de cuir. Le fond de vétiver, de cèdre et d''ambre laisse un sillage profond et élégant.',
   'Noir est l''élégance du soir : une silhouette sombre, un regard assuré. Un boisé ambré au caractère affirmé, pour ceux qui laissent une trace sans rien dire.',
   'Vaporisez sur le cou et le torse, à 15 cm de la peau. Le format Pocket Parfum vous suit du matin au soir.',
   'Alcohol denat., Parfum (Fragrance), Aqua (Water).',
   'Limonene, Linalool, Coumarin, Citral.',
   1, 'Noir · Eau de parfum pour lui', 'Noir, eau de parfum ISSEYE pour lui : poivre noir, lavande, cuir, vétiver et ambre. Format Pocket Parfum 30 ml.')
) as v(slug, name, subtitle, description, story, usage, ingredients, allergens, position, seo_title, seo_description)
on conflict (slug) do nothing;

insert into public.product_variants (product_id, sku, label, price, stock, weight_grams, position)
select p.id, v.sku, '30 ml · Eau de parfum', 3500, 50, 180, 0
from public.products p
join (values ('luna', 'ISY-LUNA-30'), ('noir', 'ISY-NOIR-30')) as v(slug, sku) on v.slug = p.slug
on conflict (sku) do nothing;

insert into public.variant_attribute_values (variant_id, attribute_value_id)
select pv.id, av.id
from public.product_variants pv
join public.attribute_values av on av.slug in ('30-ml', 'edp')
where pv.sku in ('ISY-LUNA-30', 'ISY-NOIR-30')
on conflict do nothing;

insert into public.product_media (product_id, url, alt, position)
select p.id, v.url, v.alt, 0
from public.products p
join (values
  ('luna', '/images/luna.jpg', 'Flacon Luna, eau de parfum ISSEYE pour elle, verre rose poudré et bouchon en bois'),
  ('noir', '/images/noir.jpg', 'Flacon Noir, eau de parfum ISSEYE pour lui, verre fumé et bouchon en bois noir')
) as v(slug, url, alt) on v.slug = p.slug
where not exists (select 1 from public.product_media m where m.product_id = p.id);

insert into public.product_facet_values (product_id, facet_value_id)
select p.id, fv.id
from (values
  ('luna', 'pour', 'elle'), ('luna', 'famille', 'florale'), ('luna', 'famille', 'musquee'), ('luna', 'moment', 'jour'),
  ('luna', 'saison', 'printemps-ete'), ('luna', 'intensite', 'moderee'),
  ('noir', 'pour', 'lui'), ('noir', 'famille', 'boisee'), ('noir', 'famille', 'orientale'), ('noir', 'moment', 'soir'),
  ('noir', 'saison', 'automne-hiver'), ('noir', 'intensite', 'intense')
) as v(product, facet, value)
join public.products p on p.slug = v.product
join public.facets f on f.slug = v.facet
join public.facet_values fv on fv.facet_id = f.id and fv.slug = v.value
on conflict do nothing;

insert into public.product_notes (product_id, note_id, layer, position)
select p.id, n.id, v.layer, v.position
from (values
  ('luna', 'poire', 'tete', 0), ('luna', 'bergamote', 'tete', 1),
  ('luna', 'fleur-d-oranger', 'coeur', 0), ('luna', 'jasmin', 'coeur', 1), ('luna', 'rose', 'coeur', 2),
  ('luna', 'musc-blanc', 'fond', 0), ('luna', 'vanille', 'fond', 1), ('luna', 'santal', 'fond', 2),
  ('noir', 'poivre-noir', 'tete', 0), ('noir', 'bergamote', 'tete', 1),
  ('noir', 'lavande', 'coeur', 0), ('noir', 'cuir', 'coeur', 1),
  ('noir', 'vetiver', 'fond', 0), ('noir', 'cedre', 'fond', 1), ('noir', 'ambre', 'fond', 2)
) as v(product, note, layer, position)
join public.products p on p.slug = v.product
join public.notes n on n.slug = v.note
on conflict do nothing;

insert into public.product_relations (product_id, related_id)
select a.id, b.id from public.products a join public.products b on a.slug = 'luna' and b.slug = 'noir'
union all
select b.id, a.id from public.products a join public.products b on a.slug = 'luna' and b.slug = 'noir'
on conflict do nothing;

-- ─────────────────────────────────────────────────────────────
-- Modes de livraison (tarifs en euros ; les autres devises sont calculées
-- automatiquement, ou fixées à la main dans Admin › Livraison)
-- ─────────────────────────────────────────────────────────────
insert into public.shipping_methods (zone_id, name, description, eta, carrier, tracking_url_template, position)
select z.id, v.name, v.description, v.eta, v.carrier, v.tracking, v.position
from public.shipping_zones z
join (values
  ('France métropolitaine', 'Colissimo à domicile', 'Remise contre signature', '2 à 3 jours ouvrés', 'Colissimo', 'https://www.laposte.fr/outils/suivre-vos-envois?code={tracking}', 0),
  ('France métropolitaine', 'Point relais', 'Retrait dans le point relais de votre choix', '3 à 5 jours ouvrés', 'Mondial Relay', 'https://www.mondialrelay.fr/suivi-de-colis/?numeroExpedition={tracking}', 1),
  ('Union européenne', 'Colissimo International', 'Livraison à domicile', '4 à 7 jours ouvrés', 'Colissimo', 'https://www.laposte.fr/outils/suivre-vos-envois?code={tracking}', 0),
  ('Afrique de l''Ouest et centrale', 'DHL Express', 'Livraison express à domicile', '3 à 6 jours ouvrés', 'DHL', 'https://www.dhl.com/fr-fr/home/tracking.html?tracking-id={tracking}', 0),
  ('États-Unis', 'DHL Express', 'Livraison express à domicile', '3 à 5 jours ouvrés', 'DHL', 'https://www.dhl.com/us-en/home/tracking.html?tracking-id={tracking}', 0)
) as v(zone, name, description, eta, carrier, tracking, position) on v.zone = z.name
where not exists (select 1 from public.shipping_methods m where m.zone_id = z.id and m.name = v.name);

insert into public.shipping_method_prices (method_id, currency_code, amount, free_above)
select m.id, 'EUR', v.amount, v.free_above
from public.shipping_methods m
join public.shipping_zones z on z.id = m.zone_id
join (values
  ('France métropolitaine', 'Colissimo à domicile', 690, 6000),
  ('France métropolitaine', 'Point relais', 490, 6000),
  ('Union européenne', 'Colissimo International', 1290, 10000),
  ('Afrique de l''Ouest et centrale', 'DHL Express', 2900, null),
  ('États-Unis', 'DHL Express', 2400, null)
) as v(zone, method, amount, free_above) on v.zone = z.name and v.method = m.name
on conflict do nothing;

-- ─────────────────────────────────────────────────────────────
-- FAQ
-- ─────────────────────────────────────────────────────────────
insert into public.faqs (topic, question, answer, position)
select * from (values
  ('commande', 'Dois-je créer un compte pour commander ?', 'Non. Vous pouvez commander en quelques instants avec votre seule adresse email. Un lien de suivi vous est envoyé après le paiement. Si vous le souhaitez, votre espace cliente retrouve ensuite toutes vos commandes passées avec la même adresse.', 0),
  ('commande', 'Comment suivre ma commande ?', 'Le lien de suivi figure dans l''email de confirmation. Vous pouvez aussi saisir votre numéro de commande et votre email sur la page « Suivre ma commande ».', 1),
  ('commande', 'Puis-je modifier ou annuler ma commande ?', 'Tant qu''elle n''est pas expédiée, écrivez-nous depuis la page Contact en indiquant votre numéro de commande : nous faisons le nécessaire.', 2),
  ('paiement', 'Quels moyens de paiement acceptez-vous ?', 'Cartes bancaires (CB, Visa, Mastercard, American Express), Apple Pay et Google Pay. Le paiement est entièrement sécurisé par Stripe : nous ne voyons jamais vos coordonnées bancaires.', 0),
  ('paiement', 'Dans quelle devise vais-je payer ?', 'Les prix s''affichent et se règlent dans la devise de votre pays : euros en France et en Europe, francs CFA en Afrique de l''Ouest et centrale, dollars aux États-Unis.', 1),
  ('livraison', 'Où livrez-vous ?', 'En France métropolitaine, dans l''Union européenne, en Afrique de l''Ouest et centrale (Sénégal, Côte d''Ivoire, Cameroun, Gabon…) et aux États-Unis.', 0),
  ('livraison', 'Quels sont les délais et les frais de livraison ?', 'Ils dépendent du pays et du mode choisi ; ils sont affichés avant le paiement. La livraison est offerte en France dès 60 € d''achat.', 1),
  ('livraison', 'Y a-t-il des droits de douane hors Union européenne ?', 'Pour les envois hors Union européenne, des droits et taxes d''importation peuvent être demandés par le pays de destination. Ils restent à la charge de la destinataire.', 2),
  ('produits', 'Que signifie « Pocket Parfum » ?', 'C''est notre format signature : un flacon de 30 ml en verre givré, pensé pour vous suivre partout. Même concentration qu''un grand flacon : une eau de parfum.', 0),
  ('produits', 'Combien de temps tient le parfum ?', 'Nos eaux de parfum sont concentrées pour durer plusieurs heures sur la peau, et plus longtemps encore sur les vêtements. La tenue varie selon la peau de chacune.', 1),
  ('produits', 'Comment conserver mon parfum ?', 'À l''abri de la lumière et de la chaleur, flacon bien fermé. Évitez la salle de bain : un tiroir ou une étagère fraîche lui conviennent mieux.', 2),
  ('retours', 'Puis-je retourner un article ?', 'Vous disposez de 14 jours après réception pour nous retourner un article non ouvert, dans son emballage d''origine scellé. Pour des raisons d''hygiène, un parfum ouvert ne peut être ni repris ni échangé.', 0)
) as v(topic, question, answer, position)
where not exists (select 1 from public.faqs);

-- ─────────────────────────────────────────────────────────────
-- Bandeau d'annonce de départ
-- ─────────────────────────────────────────────────────────────
insert into public.announcements (kind, name, content, targeting, tone, priority, active)
select 'bar', 'Livraison offerte', '{"text":"Livraison offerte en France dès 60 € d''achat","link_label":"Découvrir","link_href":"/boutique"}', '{}', 'noir', 0, true
where not exists (select 1 from public.announcements);

-- ─────────────────────────────────────────────────────────────
-- Droits d'accès (mêmes règles que 0003, pour les nouvelles tables)
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

grant select, insert, update, delete on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on all functions in schema public to service_role;

-- ISSEYE — comptes clientes avec email et mot de passe
-- Réexécutable.

-- Adresse email confirmée (lien reçu par email) : donne accès aux commandes passées sans compte
alter table public.customers add column if not exists email_verified_at timestamptz;
create index if not exists orders_customer_id_idx on public.orders (customer_id);
create unique index if not exists addresses_one_default on public.addresses (customer_id) where is_default;

insert into public.email_templates (key, name, subject, heading, body, cta_label) values
  ('customer_verify', 'Bienvenue · confirmation de l''email', 'Bienvenue chez ISSEYE, {{prenom}}',
    'Bienvenue{{virgule_prenom}}', 'Votre espace ISSEYE est prêt. Confirmez votre adresse email pour y retrouver aussi les commandes passées sans compte.', 'Confirmer mon email'),
  ('customer_reset', 'Mot de passe oublié (cliente)', 'Votre nouveau mot de passe ISSEYE',
    'Nouveau mot de passe', 'Vous avez demandé à changer le mot de passe de votre espace ISSEYE. Ce lien est valable une heure. Si vous n''êtes pas à l''origine de cette demande, ignorez simplement cet email.', 'Choisir un nouveau mot de passe')
on conflict (key) do nothing;

-- Les liens de connexion sans mot de passe ne sont plus utilisés
update public.email_templates set enabled = false where key = 'customer_login';

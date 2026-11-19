# ISSEYE — boutique en ligne & admin

Maison de parfums ISSEYE (Pocket Parfum 30 ml : Luna, Noir…), multi-devises (EUR, FCFA, USD), entièrement pilotée depuis l'admin.

**Stack :** Next.js 16 · Tailwind CSS 4 · Motion + Lenis · Supabase (base, connexion, médias) · Stripe (paiement) · Resend (emails) · Vercel.

## Identité

Palette officielle (`src/app/globals.css`), tirée du logo et des flacons :

| Rôle | Nom | Couleur |
|---|---|---|
| Fond principal | Crème | `#F6F1EA` |
| Fond secondaire | Lin | `#E4D6C9` |
| Accent signature | Or ISSEYE | `#C4974F` (reflet `#E5B65A`, texte `#8B693E`) |
| Accent féminin | Rose Luna | `#E6CBBD` |
| Contraste | Noir fumé | `#1B1917` |
| Texte | Encre | `#2A2622` |

Logo : monogramme IS (`public/images/monogramme.png`), icône d'onglet `src/app/icon.png`, icône iPhone `src/app/apple-icon.png`.

## Lancer en local

```bash
npm install
cp .env.example .env.local   # puis remplir les clés (voir ci-dessous)
npm run dev                  # site : http://localhost:3000 · admin : http://admin.localhost:3000
npm test                     # tests : prix multi-devises, panier, codes promo, textes
```

Sans aucune clé, le site s'affiche avec les parfums de démonstration (Luna, Noir). L'admin et les commandes demandent Supabase.
Sans clé Stripe **en développement**, le paiement est simulé : tout le parcours de commande se teste.

## Mise en route (une seule fois)

1. **Supabase** : créer un projet (région Europe), puis dans **SQL Editor** exécuter dans l'ordre
   `supabase/migrations/0001_catalog.sql` à `0006_order_events.sql`, dans l'ordre (réexécutables sans risque).
   La 0004 crée Luna et Noir (textes et prix de départ à ajuster), les notes, la livraison, la FAQ ;
   la 0005 ajoute le retrait en boutique et la livraison locale ; la 0006 l'historique des commandes.
2. **Authentication › Users › Add user** : créer le compte de la propriétaire ; mettre son email dans `ADMIN_EMAILS`.
3. **Authentication › URL Configuration** : ajouter `https://isseye.com/auth/confirm` (et `http://localhost:3000/auth/confirm`) aux Redirect URLs — lien de connexion de l'espace cliente.
4. **Project Settings › API** : copier l'URL, la clé `anon` et la clé `service_role` dans `.env.local`.
5. **Stripe** : clé secrète dans `STRIPE_SECRET_KEY`. Webhook vers `https://isseye.com/api/stripe/webhook` avec les événements
   `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `checkout.session.expired` ;
   son secret dans `STRIPE_WEBHOOK_SECRET`.
6. **Resend** : vérifier le domaine isseye.com, clé dans `RESEND_API_KEY`.
7. **Vercel** : ajouter `isseye.com` et `admin.isseye.com` au projet, renseigner toutes les variables, `CRON_SECRET` compris (tâches quotidiennes de `vercel.json`).
8. **Admin › Réglages** : identité légale (mentions légales, CGV), email d'alerte, prix export, emballage cadeau.

## Parcours cliente

Accueil → boutique (filtres Pour elle / Pour lui / famille…) → fiche parfum → panier (tiroir) → **commande sans compte** :

1. **Retrait ou livraison ?**
   - *Retrait* : gratuit, « Rue de la Ronde, Metz » ; l'adresse exacte et les horaires ne sont donnés qu'après le paiement (emails).
   - *Livraison* : l'adresse est proposée pendant la saisie (géocodage IGN, adresses proches de Metz d'abord) ; la distance par la route
     depuis la boutique donne le prix de la **livraison locale** (tranches de km, Admin › Livraison) ; hors zone : **Colissimo / point relais** ;
     étranger : saisie manuelle et zones postales (DHL…).
2. **Coordonnées**, puis **cadeau** et code promo → paiement Stripe dans la devise de la cliente → confirmation et email
   → suivi par lien (`/suivi/…`) ou numéro + email (`/suivi`).

Espace cliente facultatif (`/compte`, connexion par lien email), favoris sans compte.

## Admin (admin.isseye.com)

| Section | Ce qu'on y fait |
|---|---|
| Tableau de bord | Commandes à traiter, ventes du mois par devise, stock bas, avis, mise en route |
| Commandes | Fiche commande avec frise des étapes selon le mode (en préparation → prête à retirer / en livraison / expédiée → retirée / livrée), email à la cliente à chaque étape (au choix), historique, itinéraire, remboursement Stripe, annulation, bon de préparation, export CSV |
| Clientes / Messages | Historique par cliente, newsletter, formulaire de contact |
| Promotions / Avis | Codes promo (%, montant par devise, livraison offerte), modération et réponse aux avis |
| Produits | Textes, photos et vidéos, formats, prix en € + prix fixés par devise, stock, pyramide olfactive, caractéristiques, SEO, duplication, corbeille |
| Catégories / Collections / Caractéristiques / Stock | Organisation du catalogue, filtres, réassorts et historique |
| Pages | Accueil, La Maison et nouvelles pages composées de blocs animés ; pages légales ; brouillon, publication, versions |
| Menus / Annonces / Médiathèque / FAQ / Emails | Tout le contenu du site, sans code |
| Devises & pays / Livraison / Réglages / Équipe / Journal | Configuration, rôles, traçabilité |

Rôles : Propriétaire (tout), Gestion boutique (commandes, catalogue, clientes, livraison), Contenu (pages, médias, FAQ, avis).

## Performances

Les lectures du site (réglages, devises, catalogue, pages, menus, livraison, FAQ, annonces) sont gardées en cache
(`src/lib/cache.ts`) et invalidées à chaque modification dans l'admin : les pages publiques répondent en quelques millisecondes.
En développement (`npm run dev`), la première visite d'une page reste plus lente : elle est compilée à la volée.

## Automatique

- Stock retiré à chaque commande payée, remis à l'annulation ; alerte email de stock bas.
- Emails : confirmation, nouvelle commande (équipe), expédition, livraison, annulation, remboursement, retour en stock, accusé de contact.
- Chaque matin (`/api/cron`) : taux du dollar (BCE), paiements non aboutis, relance « votre sélection vous attend » (une fois), demande d'avis 7 jours après livraison.

## Devises et TVA

- Prix saisis en euros ; FCFA (parité fixe, arrondi aux 500 FCFA) et dollar (taux BCE, prix en ,90) calculés, ou fixés à la main.
- Devise selon le pays de la visiteuse (`?pays=SN` pour prévisualiser, `?pays=auto` pour revenir).
- Zones « export » (hors UE) : vente sans TVA française. **Réglages › Prix hors UE** : même prix qu'en France (défaut) ou prix hors TVA.
- Chaque commande garde sa devise et le taux appliqué.

## À savoir

- Les textes de Luna et Noir, les prix (35 €), les tarifs de livraison et les textes légaux sont **des propositions à vérifier** ;
  les textes légaux sont à faire relire avant l'ouverture.
- Expédition de parfums (liquide inflammable, UN1266) : conditions à confirmer avec chaque transporteur, surtout en aérien.
- Non inclus pour l'instant : Mobile Money, promotions automatiques sans code, collections automatiques par règles, import CSV.

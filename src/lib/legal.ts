// Textes légaux de départ, remplis avec l'identité légale saisie dans Admin › Réglages.
// Ils servent tant que la page n'a pas été rédigée dans Admin › Pages ; à faire relire
// par un professionnel avant l'ouverture.

import type { Settings } from "./settings-schema.ts";

const missing = "[à compléter dans Admin › Réglages]";
const or = (v: string) => (v.trim() ? v.trim() : missing);

export function defaultLegalBody(slug: string, settings: Settings) {
  const { legal, contact, brand } = settings;
  const company = or(legal.companyName);
  const site = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://isseyes.com").replace(/^https?:\/\//, "").replace(/\/$/, "");

  switch (slug) {
    case "mentions-legales":
      return `## Éditeur du site
Le site ${site} est édité par **${company}**, ${or(legal.status)}.
- Siège social : ${or(legal.address)}
- SIRET : ${or(legal.siret)}
${legal.vatNumber ? `- TVA intracommunautaire : ${legal.vatNumber}\n` : ""}- Email : ${or(contact.email)}${contact.phone ? `\n- Téléphone : ${contact.phone}` : ""}

## Directeur de la publication
Le représentant légal de ${company}.

## Hébergement
Vercel Inc., 440 N Barranca Avenue #4133, Covina, CA 91723, États-Unis — vercel.com.
Les données de la boutique sont hébergées par Supabase, sur des serveurs situés dans l'Union européenne.

## Propriété intellectuelle
La marque ${brand.name}, son logo, les photographies et les textes du site sont la propriété exclusive de ${company}. Toute reproduction sans autorisation écrite est interdite.

## Médiation de la consommation
Conformément à l'article L.612-1 du Code de la consommation, vous pouvez recourir gratuitement au médiateur suivant : ${or(legal.mediator)}.
Plateforme européenne de règlement des litiges : https://ec.europa.eu/consumers/odr`;

    case "cgv":
      return `## Article 1 — Objet
Les présentes conditions générales de vente régissent les ventes conclues sur le site ${site} entre **${company}** (ci-après « ${brand.name} ») et toute personne effectuant un achat (ci-après « la cliente »).

## Article 2 — Produits
Les produits proposés sont des eaux de parfum de la marque ${brand.name}. Les photographies sont aussi fidèles que possible mais n'engagent pas ${brand.name} sur des variations mineures de teinte. La liste des ingrédients et des allergènes figure sur chaque fiche produit.

## Article 3 — Prix
Les prix sont indiqués dans la devise du pays de livraison (euros, francs CFA ou dollars). Pour les livraisons en France et dans l'Union européenne, les prix s'entendent toutes taxes comprises (TVA française de ${legal.vatRate} %). Pour les livraisons hors Union européenne, la vente est réalisée hors TVA française ; les droits et taxes d'importation éventuels sont à la charge de la destinataire. Les frais de livraison sont indiqués avant la validation de la commande.

## Article 4 — Commande
La commande est passée sans création de compte obligatoire. Elle est définitive après acceptation des présentes conditions et confirmation du paiement. Un email de confirmation récapitule la commande et contient un lien de suivi.

## Article 5 — Paiement
Le paiement est exigible à la commande. Il s'effectue par carte bancaire, Apple Pay ou Google Pay via la plateforme sécurisée Stripe. ${brand.name} n'a jamais accès aux coordonnées bancaires.

## Article 6 — Livraison
Les produits sont livrés à l'adresse indiquée lors de la commande, dans les zones desservies : France, Union européenne, Afrique de l'Ouest et centrale, États-Unis. Les délais indicatifs sont précisés pour chaque mode de livraison. En cas de retard important, la cliente peut contacter le service client.

## Article 7 — Droit de rétractation
Conformément à l'article L.221-18 du Code de la consommation, la cliente dispose de 14 jours à compter de la réception pour exercer son droit de rétractation, sans avoir à se justifier. Pour des raisons d'hygiène et de protection de la santé (article L.221-28 du Code de la consommation), ce droit ne peut s'exercer que sur les produits **non descellés** : un parfum dont l'emballage a été ouvert ne peut être ni repris ni échangé. Le remboursement intervient sous 14 jours à compter de la réception du retour ; les frais de retour sont à la charge de la cliente.

## Article 8 — Garanties
Les produits bénéficient de la garantie légale de conformité (articles L.217-3 et suivants du Code de la consommation) et de la garantie des vices cachés (articles 1641 et suivants du Code civil).

## Article 9 — Données personnelles
Les données collectées sont traitées conformément à la politique de confidentialité.

## Article 10 — Médiation et droit applicable
Les présentes conditions sont soumises au droit français. En cas de litige, la cliente peut recourir gratuitement au médiateur de la consommation : ${or(legal.mediator)}.

## Vendeur
${company}, ${or(legal.status)} — ${or(legal.address)} — SIRET ${or(legal.siret)} — ${or(contact.email)}.`;

    case "confidentialite":
      return `## Responsable du traitement
${company}, ${or(legal.address)} — ${or(contact.email)}.

## Données collectées
- **Commande** : nom, prénom, adresse de livraison, email, téléphone, articles achetés. Base légale : exécution du contrat. Conservation : 10 ans (obligations comptables).
- **Paiement** : traité directement par Stripe ; nous ne conservons aucune donnée bancaire.
- **Newsletter** : email et prénom, uniquement avec votre accord. Désinscription à tout moment par le lien présent dans chaque email.
- **Contact** : les informations transmises via le formulaire, conservées 3 ans.
- **Espace cliente** : votre email, pour vous connecter et retrouver vos commandes.

## Destinataires
Nos prestataires techniques, dans la stricte limite de leur mission : Stripe (paiement), Supabase (hébergement des données, Union européenne), Vercel (hébergement du site), Resend (envoi des emails) et les transporteurs (livraison).

## Cookies
Le site utilise uniquement des cookies nécessaires à son fonctionnement : panier, devise affichée, connexion à l'espace cliente. Aucun cookie publicitaire n'est déposé.

## Vos droits
Vous disposez d'un droit d'accès, de rectification, d'effacement, d'opposition et de portabilité de vos données. Écrivez à ${or(contact.email)}. Vous pouvez aussi saisir la CNIL (cnil.fr).`;

    case "livraison-retours":
      return `## Zones et délais
Nous livrons en France métropolitaine, dans l'Union européenne, en Afrique de l'Ouest et centrale et aux États-Unis. Les modes de livraison, délais et tarifs disponibles pour votre pays sont affichés au moment de la commande.

- **France** : livraison offerte dès 60 € d'achat.
- **Hors Union européenne** : les prix sont facturés hors TVA française ; les éventuels droits et taxes d'importation restent à la charge de la destinataire.

## Préparation
Les commandes sont préparées avec soin sous 1 à 2 jours ouvrés. Vous recevez un email avec le numéro de suivi dès l'expédition.

## Retours
Vous disposez de 14 jours après réception pour nous retourner un article **non ouvert, dans son emballage d'origine scellé**. Pour des raisons d'hygiène, un parfum ouvert ne peut être ni repris ni échangé.

Pour organiser un retour, écrivez-nous depuis la page [Contact](/contact) en indiquant votre numéro de commande. Le remboursement est effectué sur le moyen de paiement d'origine sous 14 jours après réception du colis.

## Colis endommagé
Si votre colis arrive abîmé, émettez des réserves auprès du transporteur et contactez-nous sous 48 heures avec une photo : nous trouvons une solution.`;

    default:
      return "";
  }
}

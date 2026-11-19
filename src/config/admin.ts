// Sections de l'admin et droits par rôle. Partagé entre le serveur (contrôle d'accès)
// et le navigateur (menu) : aucune donnée sensible ici.

export type AdminRole = "owner" | "manager" | "editor";

export const roleLabels: Record<AdminRole, string> = {
  owner: "Propriétaire",
  manager: "Gestion boutique",
  editor: "Contenu",
};

export const roleDescriptions: Record<AdminRole, string> = {
  owner: "Accès complet, y compris devises, paiements, réglages et équipe.",
  manager: "Commandes, catalogue, stock, clientes, promotions et livraison.",
  editor: "Pages, menus, annonces, médias, FAQ et avis.",
};

export type AdminSectionKey =
  | "dashboard"
  | "orders"
  | "products"
  | "categories"
  | "collections"
  | "attributes"
  | "stock"
  | "customers"
  | "messages"
  | "promotions"
  | "reviews"
  | "pages"
  | "menus"
  | "announcements"
  | "media"
  | "faq"
  | "emails"
  | "currencies"
  | "shipping"
  | "settings"
  | "team"
  | "activity";

export type AdminSection = {
  key: AdminSectionKey;
  href: string;
  label: string;
  group: "Boutique" | "Catalogue" | "Contenu" | "Configuration";
  roles: AdminRole[];
  /** Phase du projet où l'écran devient disponible (sert à l'écran « bientôt »). */
  phase: number;
};

const all: AdminRole[] = ["owner", "manager", "editor"];
const shop: AdminRole[] = ["owner", "manager"];
const content: AdminRole[] = ["owner", "editor"];
const owner: AdminRole[] = ["owner"];

export const adminSections: AdminSection[] = [
  { key: "dashboard", href: "/", label: "Tableau de bord", group: "Boutique", roles: all, phase: 1 },
  { key: "orders", href: "/commandes", label: "Commandes", group: "Boutique", roles: shop, phase: 3 },
  { key: "customers", href: "/clientes", label: "Clientes", group: "Boutique", roles: shop, phase: 4 },
  { key: "messages", href: "/messages", label: "Messages", group: "Boutique", roles: shop, phase: 4 },
  { key: "promotions", href: "/promotions", label: "Promotions", group: "Boutique", roles: shop, phase: 4 },
  { key: "reviews", href: "/avis", label: "Avis", group: "Boutique", roles: all, phase: 5 },

  { key: "products", href: "/produits", label: "Produits", group: "Catalogue", roles: shop, phase: 2 },
  { key: "categories", href: "/categories", label: "Catégories", group: "Catalogue", roles: shop, phase: 2 },
  { key: "collections", href: "/collections", label: "Collections", group: "Catalogue", roles: shop, phase: 2 },
  { key: "attributes", href: "/caracteristiques", label: "Caractéristiques", group: "Catalogue", roles: shop, phase: 2 },
  { key: "stock", href: "/stock", label: "Stock", group: "Catalogue", roles: shop, phase: 3 },

  { key: "pages", href: "/pages", label: "Pages", group: "Contenu", roles: content, phase: 2 },
  { key: "menus", href: "/menus", label: "Menus", group: "Contenu", roles: content, phase: 2 },
  { key: "announcements", href: "/annonces", label: "Annonces & pop-ups", group: "Contenu", roles: content, phase: 4 },
  { key: "media", href: "/medias", label: "Médiathèque", group: "Contenu", roles: content, phase: 2 },
  { key: "faq", href: "/faq", label: "FAQ", group: "Contenu", roles: content, phase: 4 },
  { key: "emails", href: "/emails", label: "Emails", group: "Contenu", roles: owner, phase: 3 },

  { key: "currencies", href: "/devises", label: "Devises & pays", group: "Configuration", roles: owner, phase: 1 },
  { key: "shipping", href: "/livraison", label: "Livraison", group: "Configuration", roles: shop, phase: 3 },
  { key: "settings", href: "/reglages", label: "Réglages", group: "Configuration", roles: owner, phase: 1 },
  { key: "team", href: "/equipe", label: "Équipe", group: "Configuration", roles: owner, phase: 1 },
  { key: "activity", href: "/journal", label: "Journal", group: "Configuration", roles: owner, phase: 1 },
];

export function canAccess(role: AdminRole, key: AdminSectionKey) {
  return adminSections.find((s) => s.key === key)?.roles.includes(role) ?? false;
}

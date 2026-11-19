import { z } from "zod";

// Réglages modifiables depuis l'admin (Réglages). Les valeurs par défaut servent
// tant que rien n'a été enregistré.

const optionalUrl = (label: string) => z.url(`${label} : lien invalide.`).or(z.literal(""));

export const settingsSchema = z.object({
  brand: z.object({
    name: z.string().trim().min(1, "Nom requis.").max(60),
    tagline: z.string().trim().max(120),
    description: z.string().trim().max(300), // texte pour Google et les partages
  }),
  contact: z.object({
    email: z.email("Email invalide.").or(z.literal("")),
    phone: z.string().trim().max(30),
    whatsapp: z
      .string()
      .trim()
      .regex(/^\d{8,15}$/, "WhatsApp : numéro au format international sans + ni espaces (ex. 33612345678).")
      .or(z.literal("")),
    instagram: optionalUrl("Instagram"),
    tiktok: optionalUrl("TikTok"),
    facebook: optionalUrl("Facebook"),
    snapchat: optionalUrl("Snapchat"),
  }),
  store: z.object({
    open: z.boolean(), // boutique ouverte aux commandes
    closedMessage: z.string().trim().max(200),
    defaultCurrency: z.string().regex(/^[A-Z]{3}$/), // pays absent de la liste « Devises & pays »
    currencySwitcher: z.boolean(), // laisser la visiteuse changer de devise
    lowStockEmail: z.boolean(),
    notifyEmail: z.email("Email d'alerte invalide.").or(z.literal("")), // reçoit les nouvelles commandes et messages
    // Ventes hors UE (zones « export ») : même prix qu'en France, ou prix hors TVA
    exportPricing: z.enum(["ttc", "ht"]),
    giftWrap: z.boolean(), // proposer l'emballage cadeau
    giftWrapPrice: z.number().int().min(0).max(100_000), // en unités mineures de la devise de base (0 = offert)
  }),
  // Retrait en boutique et livraison locale (prix selon la distance par la route)
  delivery: z.object({
    originAddress: z.string().trim().max(200), // adresse de la boutique (départ des livraisons, point de retrait)
    originLat: z.number().min(-90).max(90).nullable(),
    originLon: z.number().min(-180).max(180).nullable(),
    pickupEnabled: z.boolean(),
    pickupHours: z.string().trim().max(300),
    pickupInstructions: z.string().trim().max(300),
    localEnabled: z.boolean(),
    // Tranches croissantes : jusqu'à maxKm (par la route) → prix en unités mineures (devise de base)
    localTiers: z.array(z.object({ maxKm: z.number().positive().max(500), price: z.number().int().min(0).max(100_000) })).max(12),
    localFreeAbove: z.number().int().min(0).nullable(), // livraison locale offerte dès ce montant (devise de base)
    localEta: z.string().trim().max(120),
    // Créneaux proposés à la caisse (retrait et livraison locale)
    slotsEnabled: z.boolean(),
    slotDays: z.array(z.number().int().min(0).max(6)).max(7), // 0 = dimanche
    pickupSlots: z.array(z.string().regex(/^\d{2}:\d{2}-\d{2}:\d{2}$/)).max(12),
    localSlots: z.array(z.string().regex(/^\d{2}:\d{2}-\d{2}:\d{2}$/)).max(12),
    slotLeadHours: z.number().int().min(0).max(240),
    slotHorizonDays: z.number().int().min(1).max(60),
    closedDates: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).max(100),
  }),
  // Identité légale (mentions légales, CGV, factures)
  legal: z.object({
    companyName: z.string().trim().max(120),
    status: z.string().trim().max(120), // SAS, micro-entreprise…
    siret: z
      .string()
      .transform((v) => v.replace(/\s/g, ""))
      .pipe(z.string().regex(/^\d{14}$/, "SIRET : 14 chiffres.").or(z.literal(""))),
    vatNumber: z.string().trim().max(20),
    address: z.string().trim().max(200),
    mediator: z.string().trim().max(300), // médiateur de la consommation (obligatoire)
    vatRate: z.number().min(0).max(30), // TVA France (%)
  }),
});

export type Settings = z.infer<typeof settingsSchema>;
type Section = keyof Settings;

export const defaultSettings: Settings = {
  brand: {
    name: "ISSEYE",
    tagline: "L'élégance à emporter",
    description:
      "ISSEYE, maison de parfums : eaux de parfum Pocket Parfum 30 ml, Luna pour elle et Noir pour lui. Livraison en France, en Europe, en Afrique et aux États-Unis.",
  },
  contact: { email: "bonjour@isseye.com", phone: "", whatsapp: "", instagram: "", tiktok: "", facebook: "", snapchat: "" },
  store: {
    open: true,
    closedMessage: "",
    defaultCurrency: "USD",
    currencySwitcher: false,
    lowStockEmail: true,
    notifyEmail: "",
    exportPricing: "ttc",
    giftWrap: true,
    giftWrapPrice: 0,
  },
  delivery: {
    originAddress: "7 Rue de la Ronde 57050 Metz",
    originLat: 49.127456,
    originLon: 6.159235,
    pickupEnabled: true,
    pickupHours: "",
    pickupInstructions: "Nous vous prévenons par email dès que votre commande est prête.",
    localEnabled: true,
    localTiers: [
      { maxKm: 5, price: 500 },
      { maxKm: 10, price: 800 },
      { maxKm: 20, price: 1200 },
    ],
    localFreeAbove: 6000,
    localEta: "Livraison sous 24 à 48 h ouvrées",
    slotsEnabled: true,
    slotDays: [1, 2, 3, 4, 5, 6],
    pickupSlots: ["10:00-12:00", "14:00-19:00"],
    localSlots: ["10:00-13:00", "14:00-19:00"],
    slotLeadHours: 24,
    slotHorizonDays: 14,
    closedDates: [],
  },
  legal: { companyName: "", status: "", siret: "", vatNumber: "", address: "7 Rue de la Ronde, 57050 Metz", mediator: "", vatRate: 20 },
};

/** Fusionne les réglages enregistrés avec les valeurs par défaut (section par section). */
export function mergeSettings(raw: unknown): Settings {
  const data = (raw ?? {}) as Partial<Record<Section, unknown>>;
  const section = <K extends Section>(key: K): Settings[K] => {
    const merged = { ...defaultSettings[key], ...((data[key] as object) ?? {}) };
    const parsed = settingsSchema.shape[key].safeParse(merged);
    return parsed.success ? (parsed.data as Settings[K]) : defaultSettings[key];
  };
  return { brand: section("brand"), contact: section("contact"), store: section("store"), delivery: section("delivery"), legal: section("legal") };
}

/** Informations légales manquantes (affichées en alerte dans l'admin). */
export function missingLegal(legal: Settings["legal"]) {
  const labels = { companyName: "raison sociale", status: "statut", siret: "SIRET", address: "adresse", mediator: "médiateur" } as const;
  return (Object.keys(labels) as (keyof typeof labels)[]).filter((k) => !legal[k].trim()).map((k) => labels[k]);
}

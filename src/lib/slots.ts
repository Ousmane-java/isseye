// Créneaux de retrait et de livraison locale (module pur, testé).
// Tous les horaires sont ceux de Paris, quel que soit le fuseau du serveur.

export type SlotSettings = {
  /** Jours ouverts : 0 = dimanche … 6 = samedi */
  days: number[];
  /** Plages horaires « 10:00-12:00 » */
  slots: string[];
  /** Délai minimum avant le début d'un créneau, en heures */
  leadHours: number;
  /** Nombre de jours proposés */
  horizonDays: number;
  /** Jours fermés « 2026-12-25 » */
  closedDates: string[];
};

export type SlotDay = { date: string; label: string; slots: string[] };

const SLOT = /^([01]\d|2[0-3]):([0-5]\d)-([01]\d|2[0-3]):([0-5]\d)$/;

export function isValidSlot(slot: string) {
  const m = SLOT.exec(slot);
  return Boolean(m) && Number(m![1]) * 60 + Number(m![2]) < Number(m![3]) * 60 + Number(m![4]);
}

const startMinutes = (slot: string) => {
  const m = SLOT.exec(slot)!;
  return Number(m[1]) * 60 + Number(m[2]);
};

/** Date et heure de Paris pour un instant donné. */
export function parisNow(now: Date) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
      .formatToParts(now)
      .map((p) => [p.type, p.value]),
  );
  return { date: `${parts.year}-${parts.month}-${parts.day}`, minutes: Number(parts.hour) * 60 + Number(parts.minute) };
}

/** « 2026-11-21 » + n jours (calcul sur le calendrier, sans fuseau). */
export function addDays(date: string, n: number) {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

const labelFormat = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
export const slotDayLabel = (date: string) => labelFormat.format(new Date(`${date}T12:00:00Z`));
export const slotLabel = (slot: string) => slot.replace(":", " h ").replace("-", " – ").replace(":", " h ").replace(/ h 00/g, " h");

/** Jours et créneaux encore réservables à partir de maintenant. */
export function availableDays(settings: SlotSettings, now = new Date()): SlotDay[] {
  const today = parisNow(now);
  const slots = settings.slots.filter(isValidSlot).sort((a, b) => startMinutes(a) - startMinutes(b));
  const earliest = today.minutes + Math.max(0, settings.leadHours) * 60; // en minutes depuis aujourd'hui 0 h
  const days: SlotDay[] = [];
  for (let i = 0; i < Math.min(60, Math.max(1, settings.horizonDays)); i++) {
    const date = addDays(today.date, i);
    const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
    if (!settings.days.includes(weekday) || settings.closedDates.includes(date)) continue;
    const open = slots.filter((s) => i * 1440 + startMinutes(s) >= earliest);
    if (open.length) days.push({ date, label: slotDayLabel(date), slots: open });
  }
  return days;
}

/** Le créneau choisi est-il encore proposé ? */
export function isSlotAvailable(settings: SlotSettings, date: string, slot: string, now = new Date()) {
  return availableDays(settings, now).some((d) => d.date === date && d.slots.includes(slot));
}

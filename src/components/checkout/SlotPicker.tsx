"use client";

import { CalendarDays } from "lucide-react";
import clsx from "clsx";
import { slotLabel, type SlotDay } from "@/lib/slots";

const short = new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });

/** Choix du jour puis du créneau (retrait ou livraison locale). */
export function SlotPicker({ days, date, slot, onChange, title }: { days: SlotDay[]; date: string; slot: string; onChange: (date: string, slot: string) => void; title: string }) {
  if (!days.length) return <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">Aucun créneau disponible pour le moment. Écrivez-nous depuis la page Contact.</p>;
  const current = days.find((d) => d.date === date);
  return (
    <div className="space-y-3">
      <p className="flex items-center gap-2 text-[14px] font-medium text-encre">
        <CalendarDays className="size-4 text-bronze" strokeWidth={1.5} /> {title}
      </p>
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:thin]">
        {days.map((d) => {
          const on = d.date === date;
          const [weekday, ...rest] = short.format(new Date(`${d.date}T12:00:00Z`)).replace(".", "").split(" ");
          return (
            <button
              key={d.date}
              type="button"
              onClick={() => onChange(d.date, d.slots.length === 1 ? d.slots[0] : on ? slot : "")}
              aria-pressed={on}
              title={d.label}
              className={clsx("flex min-w-[4.5rem] shrink-0 flex-col items-center rounded-xl border px-3 py-2.5 transition", on ? "border-noir bg-noir text-creme" : "border-encre/12 bg-white text-encre hover:border-encre/40")}
            >
              <span className={clsx("text-[11px] font-semibold tracking-[0.12em] uppercase", on ? "text-or" : "text-gris")}>{weekday}</span>
              <span className="mt-0.5 font-display text-xl leading-none">{rest.join(" ")}</span>
            </button>
          );
        })}
      </div>
      {current && (
        <div className="flex flex-wrap gap-2">
          {current.slots.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onChange(current.date, s)}
              aria-pressed={s === slot}
              className={clsx("rounded-full border px-4 py-2 text-sm transition", s === slot ? "border-or bg-or/15 font-medium text-encre" : "border-encre/12 bg-white text-encre hover:border-encre/40")}
            >
              {slotLabel(s)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

import type { ReactNode } from "react";
import clsx from "clsx";
import { Download } from "lucide-react";

/** En-tête de page admin : titre, description, actions à droite. */
export function PageHeader({ title, description, actions }: { title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="font-display text-4xl font-light text-encre sm:text-[2.75rem]">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-[15px] text-gris">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ title, description, children, className, actions }: { title?: string; description?: ReactNode; children: ReactNode; className?: string; actions?: ReactNode }) {
  return (
    <section className={clsx("rounded-2xl bg-white p-5 shadow-[0_1px_2px_rgba(26,22,25,0.04)] ring-1 ring-encre/5 sm:p-7", className)}>
      {(title || actions) && (
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            {title && <h2 className="text-[17px] font-semibold text-encre">{title}</h2>}
            {description && <p className="mt-1 text-sm text-gris">{description}</p>}
          </div>
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

export function Notice({ tone = "info", children }: { tone?: "info" | "warning" | "success" | "error"; children: ReactNode }) {
  return (
    <div
      className={clsx(
        "rounded-xl px-4 py-3 text-sm",
        tone === "info" && "bg-lin-clair text-encre",
        tone === "warning" && "bg-amber-50 text-amber-900",
        tone === "success" && "bg-emerald-50 text-emerald-900",
        tone === "error" && "bg-red-50 text-red-800",
      )}
    >
      {children}
    </div>
  );
}

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: ReactNode }) {
  return (
    <div className="rounded-2xl bg-white p-5 ring-1 ring-encre/5">
      <p className="text-[12px] font-medium tracking-wide text-gris uppercase">{label}</p>
      <p className="mt-2 font-display text-[2.1rem] leading-none text-encre">{value}</p>
      {hint && <p className="mt-2 text-[13px] text-gris">{hint}</p>}
    </div>
  );
}

/** Interrupteur accessible (case à cocher stylée), utilisable dans un formulaire. */
export function Toggle({ name, defaultChecked, label, description }: { name: string; defaultChecked?: boolean; label: string; description?: string }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4">
      <span>
        <span className="block text-sm font-medium text-encre">{label}</span>
        {description && <span className="mt-0.5 block text-[13px] text-gris">{description}</span>}
      </span>
      <span className="relative mt-0.5 inline-flex shrink-0">
        <input type="checkbox" name={name} defaultChecked={defaultChecked} className="peer sr-only" />
        <span className="h-6 w-11 rounded-full bg-encre/15 transition peer-checked:bg-noir peer-focus-visible:ring-4 peer-focus-visible:ring-or/20" />
        <span className="absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow transition peer-checked:translate-x-5" />
      </span>
    </label>
  );
}

const badgeTones = {
  neutral: "bg-encre/6 text-encre/70",
  gold: "bg-or/15 text-bronze",
  dark: "bg-noir text-creme",
  green: "bg-emerald-50 text-emerald-800",
  red: "bg-red-50 text-red-700",
  blue: "bg-sky-50 text-sky-800",
} as const;

export function Badge({ tone = "neutral", children }: { tone?: keyof typeof badgeTones; children: ReactNode }) {
  return <span className={clsx("inline-flex items-center rounded-full px-2.5 py-0.5 text-[12px] font-semibold whitespace-nowrap", badgeTones[tone])}>{children}</span>;
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-encre/15 px-6 py-14 text-center">
      <p className="font-display text-2xl text-encre">{title}</p>
      {children && <div className="mt-2 text-sm text-gris">{children}</div>}
    </div>
  );
}

export function Field({ label, hint, children, className }: { label: string; hint?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <label className={clsx("block", className)}>
      <span className="label">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[13px] text-gris">{hint}</span>}
    </label>
  );
}

/** Classes communes des tableaux de l'admin */
export const table = {
  wrap: "-mx-5 overflow-x-auto sm:-mx-7",
  table: "w-full min-w-[640px] text-left text-sm",
  th: "border-b border-encre/8 px-5 py-3 text-[11px] font-semibold tracking-wide text-gris uppercase sm:px-7",
  td: "border-b border-encre/5 px-5 py-3.5 align-middle sm:px-7",
};

/** Bouton de téléchargement d'un export CSV (route API, pas une page). */
export function ExportLink({ href }: { href: string }) {
  return (
    <a href={href} className="btn-outline !px-4 !py-2.5 text-encre">
      <Download className="size-4" /> Export CSV
    </a>
  );
}

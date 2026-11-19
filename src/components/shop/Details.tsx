"use client";

import { useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Plus } from "lucide-react";
import clsx from "clsx";

/** Rubriques repliables de la fiche produit (description, notes, ingrédients…). */
export function Details({ sections }: { sections: { title: string; content: ReactNode; open?: boolean }[] }) {
  const [open, setOpen] = useState<number | null>(sections.findIndex((s) => s.open));
  return (
    <div className="divide-y divide-encre/10 border-y border-encre/10">
      {sections.map((s, i) => (
        <div key={s.title}>
          <button onClick={() => setOpen(open === i ? null : i)} aria-expanded={open === i} className="flex w-full items-center justify-between py-5 text-left">
            <span className="text-[11px] font-semibold tracking-[0.22em] text-encre uppercase">{s.title}</span>
            <Plus className={clsx("size-4 text-encre transition duration-500", open === i && "rotate-45 text-bronze")} strokeWidth={1.5} />
          </button>
          <AnimatePresence initial={false}>
            {open === i && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }} className="overflow-hidden">
                <div className="pb-6">{s.content}</div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
}

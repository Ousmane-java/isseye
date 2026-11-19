"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Plus } from "lucide-react";
import clsx from "clsx";
import { markdownToHtml } from "@/lib/markdown";

export type FaqItem = { id: string; question: string; answer: string };

/** Accordéon des questions : une réponse ouverte à la fois. */
export function FaqList({ items }: { items: FaqItem[] }) {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <ul className="divide-y divide-encre/10 border-y border-encre/10">
      {items.map((item) => {
        const isOpen = open === item.id;
        return (
          <li key={item.id}>
            <button
              onClick={() => setOpen(isOpen ? null : item.id)}
              aria-expanded={isOpen}
              className="flex w-full items-center justify-between gap-6 py-6 text-left"
            >
              <span className="font-display text-[1.45rem] leading-snug text-encre">{item.question}</span>
              <span className={clsx("grid size-9 shrink-0 place-items-center rounded-full border border-encre/15 transition duration-500", isOpen && "rotate-45 border-or bg-or text-noir")}>
                <Plus className="size-4" strokeWidth={1.5} />
              </span>
            </button>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }} className="overflow-hidden">
                  <div className="prose-isseye max-w-2xl pb-7" dangerouslySetInnerHTML={{ __html: markdownToHtml(item.answer) }} />
                </motion.div>
              )}
            </AnimatePresence>
          </li>
        );
      })}
    </ul>
  );
}

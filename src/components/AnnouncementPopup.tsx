"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";
import { NewsletterForm } from "@/components/NewsletterForm";
import type { Announcement } from "@/lib/content";

/** Pop-up programmée dans Admin › Annonces : apparaît après un délai, une fois tous les N jours. */
export function AnnouncementPopup({ popup }: { popup: Announcement }) {
  const [open, setOpen] = useState(false);
  const storageKey = `isseye-popup-${popup.id}`;

  useEffect(() => {
    const days = popup.targeting.once_per_days ?? 7;
    try {
      const seen = Number(localStorage.getItem(storageKey) ?? 0);
      if (seen && Date.now() - seen < days * 86_400_000) return;
    } catch {
      return;
    }
    const timer = setTimeout(() => setOpen(true), (popup.targeting.delay_s ?? 8) * 1000);
    return () => clearTimeout(timer);
  }, [popup, storageKey]);

  const close = () => {
    setOpen(false);
    try {
      localStorage.setItem(storageKey, String(Date.now()));
    } catch {
      // navigation privée : la pop-up pourra réapparaître
    }
  };

  const { content } = popup;
  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[80] grid place-items-center bg-noir/45 p-4 backdrop-blur-sm" onClick={close}>
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={content.title ?? "Annonce"}
            initial={{ y: 40, opacity: 0, scale: 0.97 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 20, opacity: 0 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="relative grid w-full max-w-3xl overflow-hidden bg-creme shadow-2xl sm:grid-cols-2"
          >
            {content.image_url && (
              <div className="relative hidden aspect-[4/5] bg-lin sm:block">
                <Image src={content.image_url} alt="" fill sizes="400px" className="object-cover" />
              </div>
            )}
            <div className={content.image_url ? "p-8 sm:p-10" : "p-8 sm:col-span-2 sm:p-12"}>
              <button onClick={close} className="absolute top-3 right-3 grid size-10 place-items-center text-encre" aria-label="Fermer">
                <X className="size-5" strokeWidth={1.5} />
              </button>
              {content.title && <p className="font-display text-4xl leading-tight text-encre">{content.title}</p>}
              {content.text && <p className="mt-4 text-[15px] leading-relaxed text-gris">{content.text}</p>}
              {content.code && (
                <p className="mt-6 inline-block border border-dashed border-or px-5 py-3 font-display text-2xl tracking-[0.2em] text-bronze">{content.code}</p>
              )}
              {content.newsletter && <NewsletterForm source="popup" className="mt-6" />}
              {content.link_href && content.link_label && (
                <Link href={content.link_href} onClick={close} className="btn-primary mt-8">
                  {content.link_label}
                </Link>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

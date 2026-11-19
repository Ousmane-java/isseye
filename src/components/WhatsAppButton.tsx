"use client";

import { usePathname } from "next/navigation";
import { motion } from "motion/react";

/** Bouton WhatsApp flottant (numéro de Admin › Réglages › Contact). Masqué à la caisse. */
export function WhatsAppButton({ number, brand }: { number: string; brand: string }) {
  const pathname = usePathname();
  if (!number || pathname.startsWith("/commande")) return null;
  const message = encodeURIComponent(`Bonjour ${brand}, j'ai une question :`);
  return (
    <motion.a
      href={`https://wa.me/${number}?text=${message}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Nous écrire sur WhatsApp"
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 2, type: "spring", stiffness: 260, damping: 18 }}
      className="group fixed right-4 bottom-4 z-40 flex items-center gap-2 rounded-full bg-noir py-3 pr-3 pl-3 text-creme shadow-[0_14px_40px_-12px_rgba(27,25,23,0.7)] transition hover:pr-5 sm:right-6 sm:bottom-6"
    >
      <svg viewBox="0 0 24 24" className="size-6 fill-or" aria-hidden>
        <path d="M17.5 14.4c-.3-.1-1.8-.9-2-1-.3-.1-.5-.1-.7.1-.2.3-.8 1-.9 1.2-.2.2-.3.2-.6.1-.3-.1-1.3-.5-2.4-1.5-.9-.8-1.5-1.8-1.7-2.1-.2-.3 0-.5.1-.6l.4-.5c.2-.2.2-.3.3-.5.1-.2 0-.4 0-.5l-.9-2.2c-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.1.2 2.1 3.2 5.1 4.5.7.3 1.3.5 1.7.6.7.2 1.4.2 1.9.1.6-.1 1.8-.7 2-1.4.2-.7.2-1.3.2-1.4-.1-.1-.3-.2-.6-.3M12 21.8c-1.8 0-3.5-.5-5-1.4l-.4-.2-3.7 1 1-3.6-.2-.4C2.7 15.6 2.2 13.8 2.2 12 2.2 6.6 6.6 2.2 12 2.2c2.6 0 5.1 1 6.9 2.9 1.8 1.8 2.9 4.3 2.9 6.9 0 5.4-4.4 9.8-9.8 9.8M20.5 3.5C18.2 1.2 15.2 0 12 0 5.4 0 .1 5.3.1 11.9c0 2.1.6 4.1 1.6 5.9L0 24l6.3-1.7c1.7.9 3.7 1.4 5.7 1.4 6.6 0 11.9-5.3 11.9-11.9 0-3.2-1.2-6.2-3.4-8.3" />
      </svg>
      <span className="max-w-0 overflow-hidden text-[12px] font-semibold tracking-[0.14em] whitespace-nowrap uppercase transition-all duration-500 group-hover:max-w-40">Une question ?</span>
    </motion.a>
  );
}

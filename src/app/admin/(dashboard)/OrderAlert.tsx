"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { BellRing, Volume2, VolumeX, X } from "lucide-react";
import { newOrdersSince, type NewOrder } from "./alerts";

const SOUND_KEY = "isseye-admin-son";

// Réglage du son, gardé dans le navigateur
const soundOn = () => {
  try {
    return localStorage.getItem(SOUND_KEY) !== "off";
  } catch {
    return true;
  }
};
const onSoundChange = (cb: () => void) => {
  window.addEventListener("isseye-son", cb);
  return () => window.removeEventListener("isseye-son", cb);
};

/** Petite mélodie dorée (deux notes douces), sans fichier audio. */
function chime() {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    [880, 1318.5].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      const t = ctx.currentTime + i * 0.18;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.18, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.9);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 1);
    });
    setTimeout(() => ctx.close(), 1500);
  } catch {
    // son indisponible (navigateur, autorisation)
  }
}

/**
 * Alerte des nouvelles commandes : toutes les 30 secondes, une notification apparaît
 * (avec un son, désactivable) dès qu'une commande est payée.
 */
export function OrderAlert({ startAt }: { startAt: string }) {
  const router = useRouter();
  const since = useRef(startAt);
  const [alerts, setAlerts] = useState<NewOrder[]>([]);
  const sound = useSyncExternalStore(onSoundChange, soundOn, () => true);

  useEffect(() => {
    const check = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const { orders, now } = await newOrdersSince(since.current);
        since.current = now;
        if (!orders.length) return;
        setAlerts((a) => [...orders, ...a].slice(0, 4));
        if (soundOn()) chime();
        document.title = `(${orders.length}) Nouvelle commande · Admin ISSEYE`;
        router.refresh();
      } catch {
        // réseau momentanément indisponible
      }
    };
    const timer = setInterval(check, 30_000);
    document.addEventListener("visibilitychange", check);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", check);
    };
  }, [router]);

  const toggleSound = () => {
    const next = !sound;
    try {
      localStorage.setItem(SOUND_KEY, next ? "on" : "off");
    } catch {
      // ignoré
    }
    window.dispatchEvent(new Event("isseye-son"));
    if (next) chime();
  };

  return (
    <div className="pointer-events-none fixed right-4 bottom-4 z-[95] flex w-[min(22rem,calc(100vw-2rem))] flex-col items-end gap-3 print:hidden">
      <AnimatePresence>
        {alerts.map((o) => (
          <motion.div
            key={o.id}
            layout
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: 40 }}
            className="pointer-events-auto w-full overflow-hidden rounded-2xl bg-noir text-creme shadow-[0_20px_50px_-15px_rgba(27,25,23,0.8)]"
          >
            <div className="h-1 bg-gradient-to-r from-bronze via-or to-or-clair" />
            <div className="flex items-start gap-3 p-4">
              <BellRing className="mt-0.5 size-5 shrink-0 text-or" strokeWidth={1.5} />
              <Link
                href={`/commandes/${o.id}`}
                onClick={() => {
                  setAlerts((a) => a.filter((x) => x.id !== o.id));
                  document.title = "Admin ISSEYE";
                }}
                className="min-w-0 flex-1"
              >
                <p className="text-[11px] font-semibold tracking-[0.16em] text-or uppercase">Nouvelle commande</p>
                <p className="mt-0.5 font-display text-xl">
                  {o.number} · {o.total}
                </p>
                <p className="text-[13px] text-creme/70">
                  {o.name} · {o.mode}
                </p>
              </Link>
              <button type="button" onClick={() => setAlerts((a) => a.filter((x) => x.id !== o.id))} className="text-creme/50 hover:text-creme" aria-label="Fermer">
                <X className="size-4" />
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
      <button
        type="button"
        onClick={toggleSound}
        className="pointer-events-auto grid size-9 place-items-center rounded-full bg-white/90 text-gris shadow ring-1 ring-encre/5 hover:text-encre"
        title={sound ? "Son des nouvelles commandes : activé" : "Son des nouvelles commandes : coupé"}
        aria-label={sound ? "Couper le son des nouvelles commandes" : "Activer le son des nouvelles commandes"}
      >
        {sound ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}
      </button>
    </div>
  );
}

"use client";

import { useActionState, useState, useTransition } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, Loader2, Mail, Printer, X } from "lucide-react";
import clsx from "clsx";
import { carriers, orderWorkflow, statusLabel, type OrderRow, type OrderStatus } from "@/lib/order-types";
import type { ActionState } from "@/lib/admin-types";
import { Feedback, SubmitButton } from "@/components/admin/forms";
import { advanceOrder, cancelOrderAction, refundOrderAction, saveAdminNotes, updateTracking } from "../actions";

/** Ce que l'email de chaque étape annonce à la cliente (affiché dans la confirmation). */
const emailHint: Partial<Record<OrderStatus, string>> = {
  en_preparation: "« Votre commande est en préparation »",
  prete_retrait: "« Votre commande vous attend », avec l'adresse exacte et les horaires",
  livree: "« Belle découverte », avec le lien pour donner son avis",
};

/**
 * Étapes de la commande, cliquables dans l'ordre (comme sur Délices by Leina) :
 * payée → en préparation → prête à retirer / en livraison / expédiée → retirée / livrée.
 */
export function OrderStepper({ order }: { order: Pick<OrderRow, "id" | "status" | "delivery_type" | "paid_at" | "carrier" | "tracking_number"> }) {
  const flow = orderWorkflow(order.delivery_type);
  const current = flow.indexOf(order.status);
  const active = current >= 0;
  const [notify, setNotify] = useState(true);
  const [target, setTarget] = useState<OrderStatus | null>(null);
  const [pending, start] = useTransition();
  const [result, setResult] = useState<ActionState>();
  const [shipment, setShipment] = useState({ carrier: order.carrier ?? "Colissimo", tracking: order.tracking_number ?? "", trackingUrl: "" });
  const [cancelling, setCancelling] = useState(false);
  const [refund, setRefund] = useState(true);

  const label = (s: OrderStatus) => statusLabel({ status: s, delivery_type: order.delivery_type });
  const needsShipment = (s: OrderStatus) => s === "expediee" && order.delivery_type === "postal";

  const go = (s: OrderStatus) =>
    start(async () => {
      setResult(undefined);
      const r = await advanceOrder(order.id, s, notify, needsShipment(s) ? shipment : undefined);
      setResult(r);
      if (!r?.error) setTarget(null);
    });

  return (
    <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-encre/5 print:hidden">
      {active ? (
        <ol className="grid grid-cols-4">
          {flow.map((s, i) => {
            const done = i <= current;
            const isCurrent = i === current;
            const next = i > current;
            return (
              <li key={s} className="relative">
                <button
                  type="button"
                  disabled={!next || pending}
                  onClick={() => {
                    setResult(undefined);
                    setTarget(target === s ? null : s);
                  }}
                  className={clsx(
                    "group flex w-full flex-col items-center gap-2.5 px-2 pt-6 pb-5 text-center transition",
                    next && "cursor-pointer hover:bg-lin-clair/70",
                    target === s && "bg-lin-clair",
                  )}
                >
                  {/* Trait de progression */}
                  <span className={clsx("absolute top-0 inset-x-0 h-1", done ? "bg-gradient-to-r from-bronze via-or to-or-clair" : "bg-encre/6")} />
                  <span
                    className={clsx(
                      "grid size-10 place-items-center rounded-full text-sm font-semibold transition",
                      isCurrent ? "bg-noir text-or shadow-[0_8px_24px_-10px_rgba(27,25,23,0.8)]" : done ? "bg-or text-noir" : "border border-encre/15 text-gris group-hover:border-or group-hover:text-bronze",
                    )}
                  >
                    {pending && target === s ? <Loader2 className="size-4 animate-spin" /> : done ? <Check className="size-4" strokeWidth={2.5} /> : i + 1}
                  </span>
                  <span className={clsx("text-[12px] font-semibold tracking-[0.12em] uppercase sm:text-[13px]", isCurrent ? "text-encre" : done ? "text-bronze" : "text-gris")}>{label(s)}</span>
                  {isCurrent && <span className="text-[11px] text-gris">Étape actuelle</span>}
                  {next && i === current + 1 && <span className="text-[11px] text-bronze">Étape suivante</span>}
                </button>
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="px-6 py-5 text-sm text-gris">
          {order.status === "en_attente_paiement" || order.status === "abandonnee"
            ? "Paiement non abouti : la commande n'est pas à traiter."
            : "Commande annulée : plus aucune étape à suivre."}
        </p>
      )}

      {/* Confirmation de l'étape choisie */}
      <AnimatePresence initial={false}>
        {target && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden border-t border-encre/5 bg-lin-clair/60">
            <div className="space-y-4 px-6 py-5">
              <p className="font-display text-2xl text-encre">Passer à « {label(target)} » ?</p>
              {needsShipment(target) && (
                <div className="grid gap-3 sm:grid-cols-3">
                  <select value={shipment.carrier} onChange={(e) => setShipment({ ...shipment, carrier: e.target.value })} className="field !py-2.5" aria-label="Transporteur">
                    {carriers.map((c) => (
                      <option key={c.name}>{c.name}</option>
                    ))}
                    <option value="Autre">Autre</option>
                  </select>
                  <input value={shipment.tracking} onChange={(e) => setShipment({ ...shipment, tracking: e.target.value })} placeholder="Numéro de suivi" className="field !py-2.5" />
                  <input value={shipment.trackingUrl} onChange={(e) => setShipment({ ...shipment, trackingUrl: e.target.value })} placeholder="Lien de suivi (auto si connu)" className="field !py-2.5" />
                </div>
              )}
              <label className="flex cursor-pointer items-center gap-2.5 text-sm text-encre">
                <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} className="size-4 accent-noir" />
                <Mail className="size-4 text-bronze" strokeWidth={1.5} />
                Prévenir la cliente par email
                {notify && <span className="text-gris">{needsShipment(target) ? "« Votre commande est en route », avec le suivi" : target === "expediee" ? "« Votre commande arrive »" : emailHint[target] ?? ""}</span>}
              </label>
              <div className="flex flex-wrap items-center gap-3">
                <button type="button" disabled={pending} onClick={() => go(target)} className="btn-primary !px-6 !py-2.5">
                  {pending && <Loader2 className="size-4 animate-spin" />} Confirmer
                </button>
                <button type="button" onClick={() => setTarget(null)} className="text-sm text-gris hover:text-encre">
                  Annuler
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-encre/5 px-6 py-3.5 text-sm">
        <Feedback state={result} />
        <span className="ml-auto flex items-center gap-5">
          <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-1.5 text-gris hover:text-encre">
            <Printer className="size-4" /> Bon de préparation
          </button>
          {active && order.status !== "livree" && order.status !== "expediee" && (
            <button type="button" onClick={() => setCancelling(true)} className="text-red-700 hover:underline">
              Annuler la commande
            </button>
          )}
        </span>
      </div>

      <AnimatePresence>
        {cancelling && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[90] grid place-items-center bg-noir/45 p-4 backdrop-blur-sm" onClick={() => setCancelling(false)}>
            <motion.div initial={{ y: 20, scale: 0.97 }} animate={{ y: 0, scale: 1 }} onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl" role="dialog" aria-modal="true">
              <div className="flex items-start justify-between">
                <p className="font-display text-3xl text-encre">Annuler la commande ?</p>
                <button type="button" onClick={() => setCancelling(false)} className="text-gris" aria-label="Fermer">
                  <X className="size-5" />
                </button>
              </div>
              <p className="mt-2 text-sm text-gris">Les articles reviennent en stock et le code promo est libéré.</p>
              <div className="mt-5 space-y-3 text-sm">
                {order.paid_at && (
                  <label className="flex items-center gap-2.5">
                    <input type="checkbox" checked={refund} onChange={(e) => setRefund(e.target.checked)} className="size-4 accent-noir" /> Rembourser intégralement la cliente (Stripe)
                  </label>
                )}
                <label className="flex items-center gap-2.5">
                  <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} className="size-4 accent-noir" /> Prévenir la cliente par email
                </label>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button type="button" onClick={() => setCancelling(false)} className="btn-outline !px-5 !py-2.5 text-encre">
                  Retour
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() =>
                    start(async () => {
                      const r = await cancelOrderAction(order.id, Boolean(order.paid_at) && refund, notify);
                      setResult(r);
                      setCancelling(false);
                    })
                  }
                  className="btn !bg-red-700 !px-5 !py-2.5 text-white hover:!bg-red-800"
                >
                  {pending && <Loader2 className="size-4 animate-spin" />} Annuler la commande
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function TrackingForm({ id, carrier, tracking }: { id: string; carrier: string | null; tracking: string | null }) {
  const [state, action] = useActionState(updateTracking.bind(null, id), undefined);
  return (
    <form action={action} className="mt-4 space-y-2 border-t border-encre/5 pt-4">
      <p className="text-[12px] font-semibold tracking-wide text-gris uppercase">Modifier le suivi</p>
      <div className="grid gap-2 sm:grid-cols-2">
        <select name="carrier" defaultValue={carrier ?? "Colissimo"} className="field !py-2 text-sm">
          {carriers.map((c) => (
            <option key={c.name}>{c.name}</option>
          ))}
          <option value="Autre">Autre</option>
        </select>
        <input name="tracking" defaultValue={tracking ?? ""} placeholder="Numéro de suivi" className="field !py-2 text-sm" />
      </div>
      <input name="tracking_url" placeholder="Lien de suivi (facultatif)" className="field !py-2 text-sm" />
      <div className="flex items-center gap-3">
        <SubmitButton variant="outline">Mettre à jour</SubmitButton>
        <Feedback state={state} />
      </div>
    </form>
  );
}

export function RefundForm({ id, remaining, symbol }: { id: string; remaining: string; symbol: string }) {
  const [state, action] = useActionState(refundOrderAction.bind(null, id), undefined);
  return (
    <form action={action} className="space-y-3">
      <div className="flex items-center gap-2">
        <input name="amount" defaultValue={remaining} inputMode="decimal" className="field !w-32 !py-2" aria-label="Montant à rembourser" />
        <span className="text-sm text-gris">{symbol} · au plus {remaining}</span>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="restock" className="size-4 accent-noir" /> Remettre les articles en stock
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="notify" defaultChecked className="size-4 accent-noir" /> Prévenir la cliente par email
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton variant="outline">Rembourser</SubmitButton>
        <Feedback state={state} />
      </div>
    </form>
  );
}

export function NotesForm({ id, notes }: { id: string; notes: string }) {
  const [state, action] = useActionState(saveAdminNotes.bind(null, id), undefined);
  return (
    <form action={action} className="space-y-3">
      <textarea name="admin_notes" defaultValue={notes} rows={4} className="field resize-y" placeholder="Visible uniquement par l'équipe" />
      <div className="flex items-center gap-3">
        <SubmitButton variant="outline">Enregistrer</SubmitButton>
        <Feedback state={state} />
      </div>
    </form>
  );
}

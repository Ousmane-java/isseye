"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, useTransition, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, Gift, Loader2, Lock, MapPin, ShoppingBag, Store, Truck } from "lucide-react";
import clsx from "clsx";
import { formatMoney } from "@/lib/currency";
import { placeOrder, type CheckoutInput } from "@/app/(site)/actions";
import { useCart } from "@/components/cart/store";
import { useCartQuote } from "@/components/cart/useCartQuote";
import { Notices } from "@/components/cart/CartLines";
import { PromoToggle } from "@/components/cart/PromoField";
import { Reassurance } from "@/components/cart/CartPage";
import { summaryCard, summaryGrid } from "@/components/cart/layout";
import type { AddressInput, DeliveryChoice } from "@/lib/cart-types";
import { AddressAutocomplete } from "./AddressAutocomplete";
import { SlotPicker } from "./SlotPicker";
import { slotDayLabel, slotLabel } from "@/lib/slots";
import type { CheckoutProfile } from "@/lib/customer";

type Country = { code: string; name: string };
type Form = { email: string; phone: string; firstName: string; lastName: string; line1: string; line2: string; postalCode: string; city: string; country: string; notes: string; marketing: boolean };

const STORAGE = "isseye-caisse";
const empty = (country: string): Form => ({ email: "", phone: "", firstName: "", lastName: "", line1: "", line2: "", postalCode: "", city: "", country, notes: "", marketing: false });

/**
 * Caisse sans compte : coordonnées, adresse, mode de livraison, cadeau, code promo,
 * puis paiement sécurisé Stripe. Les champs sont gardés dans le navigateur si la cliente revient.
 */
export function Checkout({
  countries,
  defaultCountry,
  cancelled,
  simulated,
  storeOpen,
  closedMessage,
  profile,
}: {
  countries: Country[];
  defaultCountry: string;
  cancelled: boolean;
  simulated: boolean;
  storeOpen: boolean;
  closedMessage: string;
  profile: CheckoutProfile | null;
}) {
  const lines = useCart((s) => s.lines);
  const promoCode = useCart((s) => s.promoCode);
  const giftWrap = useCart((s) => s.giftWrap);
  const giftMessage = useCart((s) => s.giftMessage);
  const setGift = useCart((s) => s.setGift);

  const [form, setForm] = useState<Form>(() => {
    const base = empty(countries.some((c) => c.code === defaultCountry) ? defaultCountry : (countries[0]?.code ?? "FR"));
    // Cliente connectée : ses coordonnées connues servent de départ
    const initial: Form = profile ? { ...base, ...Object.fromEntries(Object.entries(profile).filter(([, v]) => v)) } : base;
    if (typeof window === "undefined") return initial;
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE) ?? "null") as Partial<Form> | null;
      if (!saved) return initial;
      const filled = Object.fromEntries(Object.entries(saved).filter(([, v]) => v !== "" && v !== null && v !== undefined));
      return { ...initial, ...filled, country: countries.some((c) => c.code === saved.country) ? saved.country! : initial.country };
    } catch {
      return initial;
    }
  });
  const [methodId, setMethodId] = useState<string | null>(null);
  // Étape 1 : rien n'est choisi d'avance
  const [delivery, setDelivery] = useState<DeliveryChoice | null>(null);
  // Livraison : recherche d'adresse (France) ou saisie manuelle (étranger, adresse introuvable)
  const [manual, setManual] = useState(false);
  // Adresse envoyée au serveur pour calculer la livraison : après choix d'une suggestion (ou saisie manuelle complète)
  const [quotedAddress, setQuotedAddress] = useState<AddressInput | null>(null);
  // Étape 1 validée : on passe aux coordonnées
  const [confirmed, setConfirmed] = useState(false);
  // Créneau choisi (retrait ou livraison locale)
  const [slot, setSlot] = useState({ date: "", slot: "" });
  const [accept, setAccept] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email) ? form.email : null;
  const pickup = delivery === "retrait";
  const country = pickup ? "FR" : manual ? form.country : "FR";
  const { view, loading, empty: cartEmpty, hydrated } = useCartQuote({
    country,
    methodId,
    promoCode,
    giftWrap,
    email: validEmail,
    delivery: delivery ?? "livraison",
    address: pickup ? null : quotedAddress,
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE, JSON.stringify(form));
    } catch {
      // stockage indisponible : rien de grave
    }
  }, [form]);

  const set = <K extends keyof Form>(key: K, value: Form[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: "" }));
  };
  const choose = (choice: DeliveryChoice) => {
    setDelivery(choice);
    setConfirmed(false);
    setMethodId(null);
    setSlot({ date: "", slot: "" });
  };
  const quoteManual = (patch: Partial<Form> = {}) => {
    const next = { ...form, ...patch };
    setQuotedAddress(next.line1.trim() && next.city.trim() ? { line1: next.line1.trim(), postalCode: next.postalCode.trim(), city: next.city.trim() } : null);
    setMethodId(null);
    setConfirmed(false);
  };
  const selectedMethod = view?.shipping.options.find((o) => o.id === (methodId ?? view.shipping.selectedId)) ?? null;
  // Livraison : prix connu pour l'adresse saisie
  const addressReady = !pickup && Boolean(quotedAddress) && view !== null && !loading;
  // Tant que retrait/livraison n'est pas choisi, le total n'inclut pas de frais de port
  const shippingKnown = pickup || Boolean(delivery && quotedAddress);
  // Créneau à choisir : retrait, ou livraison à domicile autour de la boutique
  const slotDays = !view?.slots ? null : pickup ? view.slots.pickup : view.shipping.mode === "local" ? view.slots.local : null;
  const slotMissing = Boolean(slotDays) && (!slot.date || !slot.slot);

  const submit = () => {
    setError(null);
    if (!confirmed || !delivery) {
      setError("Choisissez d'abord le retrait ou la livraison.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    if (!accept) {
      setErrors((e) => ({ ...e, acceptTerms: "Merci d'accepter les conditions générales de vente." }));
      return;
    }
    const input: CheckoutInput = {
      ...form,
      delivery,
      country,
      methodId: selectedMethod?.id ?? "",
      scheduledDate: slotDays ? slot.date : "",
      scheduledSlot: slotDays ? slot.slot : "",
      promoCode: promoCode || "",
      giftWrap,
      giftMessage,
      acceptTerms: true,
      lines,
    };
    start(async () => {
      const result = await placeOrder(input);
      if (result.url) {
        window.location.assign(result.url);
        return;
      }
      setError(result.error ?? "Une erreur est survenue.");
      setErrors(result.fieldErrors ?? {});
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  };

  if (!hydrated) return <Spinner />;
  if (cartEmpty) {
    return (
      <div className="mx-auto max-w-xl px-4 pb-32 text-center">
        <ShoppingBag className="mx-auto size-10 text-or" strokeWidth={1} />
        <p className="mt-6 font-display text-4xl text-encre">Votre panier est vide.</p>
        <Link href="/boutique" className="btn-primary mt-10">
          Découvrir les parfums
        </Link>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className={clsx("mx-auto max-w-[1440px] px-4 pb-32 sm:px-8", summaryGrid)}
      noValidate
    >
      <div className="space-y-12">
        {cancelled && <p className="rounded-xl bg-or/10 px-4 py-3 text-sm text-bronze">Le paiement a été interrompu : votre panier est intact, vous pouvez réessayer.</p>}
        {!storeOpen && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">{closedMessage || "La boutique est momentanément fermée aux commandes."}</p>}
        {simulated && <p className="rounded-xl bg-lin px-4 py-3 text-[13px] text-encre">Mode développement : Stripe n&apos;est pas configuré, le paiement sera simulé.</p>}
        {error && (
          <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </p>
        )}

        {!profile && (
          <p className="text-[14px] text-gris">
            Déjà cliente ?{" "}
            <Link href="/compte?suite=/commande" className="text-bronze underline underline-offset-4">
              Connectez-vous
            </Link>{" "}
            pour retrouver vos informations. Sinon, continuez sans compte.
          </p>
        )}

        <Step n={1} title="Retrait ou livraison ?">
          {confirmed && delivery ? (
            // Étape validée : résumé et retour possible
            <div className="flex items-start gap-4 rounded-2xl border border-encre/10 bg-white p-5">
              {pickup ? <Store className="mt-0.5 size-5 shrink-0 text-bronze" strokeWidth={1.5} /> : <Truck className="mt-0.5 size-5 shrink-0 text-bronze" strokeWidth={1.5} />}
              <div className="min-w-0 flex-1 text-[14px]">
                <p className="font-medium text-encre">{pickup ? `Retrait à la boutique · ${view?.pickup.address ?? ""}` : selectedMethod?.name}</p>
                <p className="mt-0.5 text-gris">
                  {pickup ? "Gratuit · adresse exacte envoyée par email après votre achat" : `${[form.line1, form.postalCode, form.city].filter(Boolean).join(" ")}${manual ? ` · ${countries.find((c) => c.code === form.country)?.name ?? ""}` : ""}`}
                </p>
                {slotDays && slot.date && (
                  <p className="mt-1 text-bronze first-letter:uppercase">
                    {slotDayLabel(slot.date)} · {slotLabel(slot.slot)}
                  </p>
                )}
              </div>
              <button type="button" onClick={() => setConfirmed(false)} className="text-[13px] text-bronze underline underline-offset-4">
                Modifier
              </button>
            </div>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                {([
                  { value: "livraison" as const, title: "Livraison", text: view?.local.enabled ? `À domicile à Metz et alentours, ou par la poste partout ailleurs` : "À votre adresse", icon: Truck, show: true },
                  { value: "retrait" as const, title: "Retrait à la boutique", text: `Gratuit · ${view?.pickup.address ?? "Metz"}`, icon: Store, show: view?.pickup.enabled ?? false },
                ]).filter((o) => o.show).map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => choose(o.value)}
                    aria-pressed={delivery === o.value}
                    className={clsx("flex items-start gap-4 rounded-2xl border p-5 text-left transition", delivery === o.value ? "border-noir bg-white shadow-[0_10px_30px_-18px_rgba(27,25,23,0.5)]" : "border-encre/12 hover:border-encre/30")}
                  >
                    <o.icon className={clsx("mt-0.5 size-5 shrink-0", delivery === o.value ? "text-bronze" : "text-gris")} strokeWidth={1.5} />
                    <span>
                      <span className="block font-medium text-encre">{o.title}</span>
                      <span className="mt-1 block text-[13px] text-gris">{o.text}</span>
                    </span>
                  </button>
                ))}
              </div>

              {pickup && view && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-5 space-y-4">
                  <div className="flex gap-4 rounded-2xl bg-lin-clair p-5 text-[14px] text-encre/85">
                    <MapPin className="mt-0.5 size-5 shrink-0 text-bronze" strokeWidth={1.5} />
                    <div>
                      <p className="font-medium text-encre">{view.pickup.address} · Gratuit</p>
                      <p className="mt-1 text-gris">L&apos;adresse exacte et les horaires vous sont envoyés par email dès votre achat.{view.pickup.instructions ? ` ${view.pickup.instructions}` : ""}</p>
                    </div>
                  </div>
                  {slotDays && <SlotPicker title="Quand venez-vous la chercher ?" days={slotDays} date={slot.date} slot={slot.slot} onChange={(date, s) => setSlot({ date, slot: s })} />}
                  <button type="button" disabled={slotMissing} onClick={() => setConfirmed(true)} className="btn-primary">
                    {slotMissing ? "Choisissez un créneau" : "Continuer"}
                  </button>
                </motion.div>
              )}

              {delivery === "livraison" && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-6 space-y-4">
                  {!manual ? (
                    <div>
                      <span className="label">Votre adresse de livraison</span>
                      <AddressAutocomplete
                        enabled
                        autoFocus
                        near={view?.local.near}
                        value={form.line1}
                        onChange={(v) => {
                          set("line1", v);
                          if (quotedAddress) {
                            setQuotedAddress(null);
                            setConfirmed(false);
                          }
                        }}
                        onSelect={(a) => {
                          setForm((f) => ({ ...f, line1: a.line1, postalCode: a.postalCode, city: a.city, country: "FR" }));
                          setErrors((e) => ({ ...e, line1: "", postalCode: "", city: "" }));
                          setQuotedAddress({ line1: a.line1, postalCode: a.postalCode, city: a.city });
                          setMethodId(null);
                        }}
                      />
                      {quotedAddress && <p className="mt-2 text-[13px] text-gris">{[form.line1, form.postalCode, form.city].join(" ")}</p>}
                      <button
                        type="button"
                        onClick={() => {
                          setManual(true);
                          setQuotedAddress(null);
                        }}
                        className="mt-2 text-[13px] text-bronze underline underline-offset-4"
                      >
                        Je livre hors de France, ou je ne trouve pas mon adresse
                      </button>
                    </div>
                  ) : (
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="Pays" error={errors.country} className="sm:col-span-2">
                        <select autoComplete="country" value={form.country} onChange={(e) => { set("country", e.target.value); quoteManual({ country: e.target.value }); }} className="field">
                          {countries.map((c) => (
                            <option key={c.code} value={c.code}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Adresse" error={errors.line1} className="sm:col-span-2">
                        <input autoComplete="address-line1" value={form.line1} onChange={(e) => set("line1", e.target.value)} onBlur={() => quoteManual()} className="field" />
                      </Field>
                      <Field label="Code postal" error={errors.postalCode}>
                        <input autoComplete="postal-code" value={form.postalCode} onChange={(e) => set("postalCode", e.target.value)} onBlur={() => quoteManual()} className="field" />
                      </Field>
                      <Field label="Ville" error={errors.city}>
                        <input autoComplete="address-level2" value={form.city} onChange={(e) => set("city", e.target.value)} onBlur={() => quoteManual()} className="field" />
                      </Field>
                      <button type="button" onClick={() => { setManual(false); setQuotedAddress(null); set("country", "FR"); }} className="text-left text-[13px] text-bronze underline underline-offset-4 sm:col-span-2">
                        Revenir à la recherche d&apos;adresse (France)
                      </button>
                    </div>
                  )}

                  {quotedAddress && !addressReady && (
                    <p className="flex items-center gap-2 text-[14px] text-gris">
                      <Loader2 className="size-4 animate-spin text-or" /> Calcul des frais de livraison…
                    </p>
                  )}

                  {addressReady && view && (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                      {!view.shipping.served ? (
                        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">Nous ne livrons pas encore cette destination. Écrivez-nous depuis la page Contact.</p>
                      ) : view.shipping.mode === "local" ? (
                        <div className="rounded-2xl border border-or/50 bg-white p-5">
                          <p className="flex items-baseline justify-between gap-4">
                            <span className="font-medium text-encre">Livraison à domicile</span>
                            <span className="font-display text-2xl text-encre">{view.shipping.options[0]?.free ? "Offerte" : formatMoney(view.shipping.options[0]?.amount ?? 0, view.currency)}</span>
                          </p>
                          <p className="mt-1 text-[13px] text-gris">{[view.shipping.options[0]?.description, view.shipping.options[0]?.eta].filter(Boolean).join(" · ")}</p>
                          {view.freeShippingFrom !== null && !view.shipping.options[0]?.free && (
                            <p className="mt-2 text-[13px] text-bronze">Offerte dès {formatMoney(view.freeShippingFrom, view.currency)} d&apos;achat.</p>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {!manual && view.local.enabled && (
                            <p className="rounded-xl bg-lin-clair px-4 py-3 text-[14px] text-encre/85">
                              Votre adresse est en dehors de notre zone de livraison à domicile (Metz et alentours). Choisissez votre mode d&apos;envoi :
                            </p>
                          )}
                          {manual && <p className="text-[14px] text-encre/85">Choisissez votre mode d&apos;envoi :</p>}
                          {view.shipping.options.map((o) => {
                            const on = o.id === selectedMethod?.id;
                            return (
                              <label key={o.id} className={clsx("flex cursor-pointer items-center gap-4 rounded-2xl border px-5 py-4 transition", on ? "border-noir bg-white" : "border-encre/12 hover:border-encre/30")}>
                                <input type="radio" name="method" checked={on} onChange={() => setMethodId(o.id)} className="size-4 accent-noir" />
                                <span className="min-w-0 flex-1">
                                  <span className="block font-medium text-encre">{o.name}</span>
                                  <span className="block text-[13px] text-gris">{[o.eta, o.description].filter(Boolean).join(" · ")}</span>
                                </span>
                                <span className={clsx("text-sm font-medium", o.free ? "text-bronze" : "text-encre")}>{o.free ? "Offerte" : formatMoney(o.amount, view.currency)}</span>
                              </label>
                            );
                          })}
                          {view.shipping.customsNotice && <p className="rounded-xl bg-lin-clair px-4 py-3 text-[13px] text-encre/80">{view.shipping.customsNotice}</p>}
                        </div>
                      )}
                      {view.shipping.served && slotDays && (
                        <SlotPicker title="Quand souhaitez-vous être livrée ?" days={slotDays} date={slot.date} slot={slot.slot} onChange={(date, s) => setSlot({ date, slot: s })} />
                      )}
                      {view.shipping.served && (
                        <button type="button" disabled={slotMissing} onClick={() => setConfirmed(true)} className="btn-primary">
                          {slotMissing ? "Choisissez un créneau" : "Valider cette adresse"}
                        </button>
                      )}
                    </motion.div>
                  )}
                </motion.div>
              )}
            </>
          )}
        </Step>

        {confirmed && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }} className="space-y-12">
            <Step n={2} title="Vos coordonnées">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Prénom" error={errors.firstName}>
                  <input autoComplete="given-name" value={form.firstName} onChange={(e) => set("firstName", e.target.value)} className="field" required />
                </Field>
                <Field label="Nom" error={errors.lastName}>
                  <input autoComplete="family-name" value={form.lastName} onChange={(e) => set("lastName", e.target.value)} className="field" required />
                </Field>
                <Field label="Email" error={errors.email}>
                  <input type="email" autoComplete="email" value={form.email} onChange={(e) => set("email", e.target.value)} className="field" required />
                </Field>
                <Field label="Téléphone" hint={pickup ? "Pour vous prévenir si besoin." : "Pour la livraison uniquement."} error={errors.phone}>
                  <input type="tel" autoComplete="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} className="field" required />
                </Field>
                {!pickup && (
                  <>
                    <Field label="Complément d'adresse (facultatif)" className="sm:col-span-2">
                      <input autoComplete="address-line2" value={form.line2} onChange={(e) => set("line2", e.target.value)} className="field" placeholder="Bâtiment, étage, digicode…" />
                    </Field>
                    <Field label="Précision pour la livraison (facultatif)" className="sm:col-span-2">
                      <input value={form.notes} onChange={(e) => set("notes", e.target.value)} maxLength={500} className="field" placeholder="Code d'entrée, horaires…" />
                    </Field>
                  </>
                )}
              </div>
              <label className="mt-4 flex cursor-pointer items-start gap-3 text-[14px] text-encre/80">
                <input type="checkbox" checked={form.marketing} onChange={(e) => set("marketing", e.target.checked)} className="mt-0.5 size-4 accent-noir" />
                Je souhaite recevoir les nouveautés et offres ISSEYE (désinscription en un clic).
              </label>
              <p className="mt-3 text-[13px] text-gris">Aucun compte nécessaire : votre confirmation et votre lien de suivi arrivent par email.</p>
            </Step>

            <Step n={3} title="Une attention ?">
              {view?.giftWrap.enabled && (
                <label className="flex cursor-pointer items-center gap-3 text-[15px] text-encre">
                  <input type="checkbox" checked={giftWrap} onChange={(e) => setGift(e.target.checked)} className="size-4 accent-noir" />
                  <Gift className="size-4 text-bronze" strokeWidth={1.5} />
                  Emballage cadeau {view.giftWrap.price ? `(${formatMoney(view.giftWrap.price, view.currency)})` : "offert"}
                </label>
              )}
              <Field label="Message à joindre (facultatif)" error={errors.giftMessage} className="mt-4">
                <textarea value={giftMessage} onChange={(e) => setGift(giftWrap, e.target.value)} maxLength={300} rows={3} className="field resize-y" placeholder="Il sera imprimé sur une carte, sans aucun prix." />
              </Field>
            </Step>
          </motion.div>
        )}
      </div>

      {/* Récapitulatif */}
      <aside id="recapitulatif" className="scroll-mt-28 lg:sticky lg:top-[calc(var(--bar-h,0px)+7rem)]">
      <div className={summaryCard}>
        <h2 className="font-display text-3xl text-encre">Récapitulatif</h2>
        {!view ? (
          <Spinner small />
        ) : (
          <>
            <div className="mt-4">
              <Notices notices={view.notices} />
            </div>
            <ul className="mt-5 divide-y divide-encre/10 border-y border-encre/10">
              {view.lines.map((l) => (
                <li key={l.variantId} className="flex items-center gap-4 py-4">
                  <span className="relative aspect-[4/5] w-[4.5rem] shrink-0 overflow-hidden rounded-sm bg-lin">
                    {l.image && <Image src={l.image} alt="" fill sizes="72px" className="object-cover" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-display text-xl tracking-[0.08em] text-encre uppercase">{l.name}</span>
                    <span className="mt-0.5 block text-[12px] text-gris">{l.variantLabel}</span>
                    <span className="mt-1 block text-[12px] text-gris tabular-nums">
                      {l.quantity} × {formatMoney(l.unitPrice, view.currency)}
                    </span>
                  </span>
                  <span className="text-[15px] font-medium text-encre tabular-nums">{formatMoney(l.lineTotal, view.currency)}</span>
                </li>
              ))}
            </ul>
            <div className="mt-5">
              <PromoToggle view={view} />
              {errors.promoCode && <p className="mt-2 text-[13px] text-red-700">{errors.promoCode}</p>}
            </div>
            <dl className="mt-6 space-y-3 border-t border-encre/10 pt-6 text-[15px] tabular-nums">
              <Row label="Sous-total" value={formatMoney(view.quote.subtotal, view.currency)} />
              {view.quote.discount > 0 && <Row label={`Réduction ${view.promo?.code ?? ""}`} value={`−${formatMoney(view.quote.discount, view.currency)}`} accent />}
              <Row
                label={`Livraison${selectedMethod && (pickup || quotedAddress) ? ` · ${selectedMethod.name}` : ""}`}
                value={!delivery || !selectedMethod || (!pickup && !quotedAddress) ? "À l'étape 1" : selectedMethod.id === "retrait" ? "Gratuit" : view.quote.shipping === 0 ? "Offerte" : formatMoney(view.quote.shipping, view.currency)}
              />
              {view.quote.giftWrap > 0 && <Row label="Emballage cadeau" value={formatMoney(view.quote.giftWrap, view.currency)} />}
              <div className="flex items-baseline justify-between gap-4 border-t border-encre/10 pt-6">
                <dt className="text-[12px] font-semibold tracking-[0.2em] text-encre uppercase">Total</dt>
                <dd className="flex items-center gap-2 text-2xl font-medium text-encre">
                  {loading && <Loader2 className="size-4 animate-spin text-gris" />}
                  {formatMoney(shippingKnown ? view.quote.total : view.quote.subtotal - view.quote.discount + view.quote.giftWrap, view.currency)}
                </dd>
              </div>
              <p className="text-right text-[12px] text-gris">
                {!shippingKnown ? "Hors frais de livraison" : view.shipping.taxMode === "ttc" ? `Dont TVA ${formatMoney(view.quote.taxIncluded, view.currency)}` : "Vente à l'export, hors TVA française"}
              </p>
            </dl>

            <label className="mt-6 flex cursor-pointer items-start gap-3 text-[13px] leading-relaxed text-encre/80">
              <input
                type="checkbox"
                checked={accept}
                onChange={(e) => {
                  setAccept(e.target.checked);
                  setErrors((er) => ({ ...er, acceptTerms: "" }));
                }}
                className="mt-0.5 size-4 shrink-0 accent-noir"
              />
              <span>
                J&apos;accepte les{" "}
                <Link href="/cgv" target="_blank" className="underline underline-offset-4">
                  conditions générales de vente
                </Link>{" "}
                et j&apos;ai pris connaissance de la{" "}
                <Link href="/confidentialite" target="_blank" className="underline underline-offset-4">
                  politique de confidentialité
                </Link>
                .
              </span>
            </label>
            {errors.acceptTerms && <p className="mt-2 text-[13px] text-red-700">{errors.acceptTerms}</p>}

            <motion.button whileTap={{ scale: 0.98 }} disabled={pending || loading || !confirmed || !view.shipping.served || !storeOpen || view.lines.length === 0} className="btn-primary mt-6 w-full !py-4">
              {pending ? <Loader2 className="size-4 animate-spin" /> : <Lock className="size-4" strokeWidth={1.5} />}
              {pending ? "Redirection vers le paiement…" : !confirmed ? "Choisissez retrait ou livraison" : `Payer ${formatMoney(view.quote.total, view.currency)}`}
            </motion.button>
            <p className="mt-3 text-center text-[12px] text-gris">Paiement par Stripe · montant débité en {view.currency.code}</p>
          </>
        )}
      </div>
      {view && <Reassurance view={view} />}
      <Link href="/panier" className="mt-6 inline-flex items-center gap-2 px-2 text-[12px] font-semibold tracking-[0.18em] text-encre uppercase transition hover:text-bronze">
        <ArrowLeft className="size-4" strokeWidth={1.5} /> Modifier le panier
      </Link>
      {view && <MobileTotalBar total={formatMoney(shippingKnown ? view.quote.total : view.quote.subtotal - view.quote.discount + view.quote.giftWrap, view.currency)} />}
      </aside>
    </form>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="flex items-center gap-4 font-display text-3xl text-encre">
        <span className="grid size-9 place-items-center rounded-full border border-or text-sm font-sans font-semibold text-bronze">{n}</span>
        {title}
      </h2>
      <div className="mt-6">{children}</div>
    </section>
  );
}

function Field({ label, hint, error, className, children }: { label: string; hint?: string; error?: string; className?: string; children: ReactNode }) {
  return (
    <label className={clsx("block", className)}>
      <span className="label">{label}</span>
      {children}
      {error ? <span className="mt-1 block text-[13px] text-red-700">{error}</span> : hint ? <span className="mt-1 block text-[12px] text-gris">{hint}</span> : null}
    </label>
  );
}

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={clsx("flex justify-between gap-4", accent && "text-bronze")}>
      <dt className={accent ? "" : "text-gris"}>{label}</dt>
      <dd className={clsx("shrink-0 text-right", !accent && "text-encre")}>{value}</dd>
    </div>
  );
}

function Spinner({ small }: { small?: boolean }) {
  return (
    <div className={clsx("grid place-items-center", small ? "py-8" : "min-h-[40vh]")}>
      <Loader2 className="size-6 animate-spin text-or" />
    </div>
  );
}

/** Mobile : total toujours visible ; le bouton mène au récapitulatif (conditions et paiement). */
function MobileTotalBar({ total }: { total: string }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const summary = document.getElementById("recapitulatif");
    if (!summary) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(!entry.isIntersecting));
    observer.observe(summary);
    return () => observer.disconnect();
  }, []);
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-x-0 bottom-0 z-50 flex items-center gap-4 border-t border-encre/10 bg-creme/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur lg:hidden"
        >
          <div className="min-w-0">
            <p className="text-[11px] font-semibold tracking-[0.18em] text-gris uppercase">Total</p>
            <p className="text-lg font-medium text-encre tabular-nums">{total}</p>
          </div>
          <a href="#recapitulatif" className="btn-primary flex-1 !py-3">
            Voir le récapitulatif
          </a>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

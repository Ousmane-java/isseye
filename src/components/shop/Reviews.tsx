"use client";

import { useActionState, useState } from "react";
import { Loader2, Star } from "lucide-react";
import clsx from "clsx";
import { submitReview } from "@/app/(site)/actions";
import type { ReviewView } from "@/lib/catalog-types";

export function Stars({ rating, className }: { rating: number; className?: string }) {
  return (
    <span className={clsx("inline-flex gap-0.5", className)} aria-label={`${rating.toFixed(1).replace(".", ",")} sur 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className={clsx("size-3.5", i <= Math.round(rating) ? "fill-or text-or" : "text-encre/20")} strokeWidth={1.5} />
      ))}
    </span>
  );
}

const date = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" });

/** Avis publiés (modérés dans Admin › Avis) et formulaire pour en laisser un. */
export function Reviews({ productId, productName, reviews, average }: { productId: string; productName: string; reviews: ReviewView[]; average: number }) {
  const [writing, setWriting] = useState(false);
  return (
    <section id="avis" className="mx-auto max-w-[1440px] scroll-mt-32 px-4 py-24 sm:px-8">
      <div className="grid gap-12 lg:grid-cols-[1fr_1.6fr]">
        <div>
          <p className="eyebrow filet text-bronze">Avis</p>
          <h2 className="mt-5 font-display text-5xl font-light text-encre">Elles l&apos;ont porté.</h2>
          {reviews.length > 0 ? (
            <p className="mt-6 flex items-center gap-3 text-encre">
              <span className="font-display text-4xl">{average.toFixed(1).replace(".", ",")}</span>
              <Stars rating={average} />
              <span className="text-sm text-gris">
                {reviews.length} avis
              </span>
            </p>
          ) : (
            <p className="mt-6 text-[15px] text-gris">Soyez la première à partager votre ressenti sur {productName}.</p>
          )}
          <button onClick={() => setWriting((w) => !w)} className="btn-outline mt-8 text-encre">
            {writing ? "Fermer" : "Donner mon avis"}
          </button>
        </div>
        <div>
          {writing && <ReviewForm productId={productId} />}
          <ul className="divide-y divide-encre/10">
            {reviews.map((r) => (
              <li key={r.id} className="py-8 first:pt-0">
                <div className="flex flex-wrap items-center gap-3">
                  <Stars rating={r.rating} />
                  <span className="text-[13px] font-semibold text-encre">{r.author}</span>
                  {r.verified && <span className="text-[11px] font-semibold tracking-[0.14em] text-bronze uppercase">Achat vérifié</span>}
                  <span className="text-[12px] text-gris">{date.format(new Date(r.date))}</span>
                </div>
                {r.title && <p className="mt-3 font-display text-2xl text-encre">{r.title}</p>}
                {r.body && <p className="mt-2 text-[15px] leading-relaxed text-encre/80">{r.body}</p>}
                {r.reply && (
                  <div className="mt-4 border-l-2 border-or pl-4 text-[14px] text-gris">
                    <span className="font-semibold text-encre">Réponse d&apos;ISSEYE · </span>
                    {r.reply}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function ReviewForm({ productId }: { productId: string }) {
  const [state, action, pending] = useActionState(submitReview.bind(null, productId), undefined);
  const [rating, setRating] = useState(0);
  if (state?.ok) return <p className="mb-10 rounded-2xl bg-lin-clair p-6 font-display text-2xl text-bronze">{state.ok}</p>;
  return (
    <form action={action} className="mb-12 space-y-4 rounded-2xl bg-lin-clair p-6 sm:p-8">
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
      <input type="hidden" name="rating" value={rating} />
      <div>
        <span className="label">Votre note</span>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((i) => (
            <button key={i} type="button" onClick={() => setRating(i)} aria-label={`${i} sur 5`} className="p-1">
              <Star className={clsx("size-7 transition", i <= rating ? "fill-or text-or" : "text-encre/25 hover:text-or")} strokeWidth={1.25} />
            </button>
          ))}
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label>
          <span className="label">Prénom</span>
          <input name="author" required maxLength={60} className="field" />
        </label>
        <label>
          <span className="label">Email de commande (facultatif)</span>
          <input name="email" type="email" className="field" />
          <span className="mt-1 block text-[12px] text-gris">Pour afficher « Achat vérifié ». Jamais publié.</span>
        </label>
      </div>
      <label className="block">
        <span className="label">Titre</span>
        <input name="title" maxLength={120} className="field" />
      </label>
      <label className="block">
        <span className="label">Votre avis</span>
        <textarea name="body" required rows={4} maxLength={2000} className="field resize-y" />
      </label>
      {state?.error && <p className="text-sm text-red-700">{state.error}</p>}
      <button disabled={pending} className="btn-primary">
        {pending && <Loader2 className="size-4 animate-spin" />} Publier mon avis
      </button>
    </form>
  );
}

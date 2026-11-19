"use client";

import { useActionState, useState, useTransition, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import clsx from "clsx";
import type { ActionState } from "@/lib/admin-types";

export function Feedback({ state }: { state: ActionState }) {
  if (!state) return null;
  return <p className={clsx("text-sm", state.error ? "text-red-700" : "text-emerald-700")}>{state.error ?? state.ok}</p>;
}

export function SubmitButton({ children, className, variant = "primary" }: { children: ReactNode; className?: string; variant?: "primary" | "outline" }) {
  const { pending } = useFormStatus();
  return (
    <button disabled={pending} className={clsx(variant === "primary" ? "btn-primary" : "btn-outline text-encre", "!px-5 !py-2.5", className)}>
      {pending && <Loader2 className="size-4 animate-spin" />} {children}
    </button>
  );
}

/** Formulaire branché sur une action serveur, avec message de retour. */
export function ActionForm({
  action,
  children,
  submitLabel = "Enregistrer",
  className,
  footer,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  children: ReactNode;
  submitLabel?: string;
  className?: string;
  footer?: ReactNode;
}) {
  const [state, formAction] = useActionState(action, undefined);
  return (
    <form action={formAction} className={clsx("space-y-4", className)}>
      {children}
      <div className="flex flex-wrap items-center gap-3 pt-1">
        <SubmitButton>{submitLabel}</SubmitButton>
        <Feedback state={state} />
        {footer}
      </div>
    </form>
  );
}

/** Bouton qui lance une action serveur après confirmation (suppression, annulation…). */
export function ConfirmButton({
  action,
  confirm: question,
  children,
  className,
  danger,
}: {
  action: () => Promise<ActionState | void>;
  confirm?: string;
  children: ReactNode;
  className?: string;
  danger?: boolean;
}) {
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<ActionState>();
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (question && !window.confirm(question)) return;
          start(async () => {
            try {
              const result = await action();
              setMessage(result ?? undefined);
            } catch (err) {
              setMessage({ error: err instanceof Error ? err.message : "Action impossible." });
            }
          });
        }}
        className={clsx("inline-flex items-center gap-1.5 text-sm transition disabled:opacity-50", danger ? "text-gris hover:text-red-700" : "text-encre hover:text-bronze", className)}
      >
        {pending && <Loader2 className="size-3.5 animate-spin" />}
        {children}
      </button>
      <Feedback state={message} />
    </span>
  );
}

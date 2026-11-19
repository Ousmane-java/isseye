"use client";

import { useActionState, useState, useTransition } from "react";
import { Loader2, Trash2 } from "lucide-react";
import clsx from "clsx";
import { roleDescriptions, roleLabels, type AdminRole } from "@/config/admin";
import { addMember, changeRole, removeMember } from "./actions";

export type Member = { user_id: string; email: string; role: AdminRole };

const roles = Object.keys(roleLabels) as AdminRole[];

export function MemberList({ members, owners, selfId }: { members: Member[]; owners: string[]; selfId: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string>();
  const run = (fn: () => Promise<void>) =>
    start(async () => {
      setError(undefined);
      try {
        await fn();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Action impossible.");
      }
    });

  return (
    <div className={clsx("divide-y divide-encre/5", pending && "opacity-60")}>
      {owners.map((email) => (
        <div key={email} className="flex flex-wrap items-center gap-3 py-3.5">
          <span className="min-w-0 flex-1 truncate font-medium text-encre">{email}</span>
          <span className="rounded-full bg-noir px-3 py-1 text-[12px] font-semibold text-creme">Propriétaire</span>
          <span className="w-full text-[12px] text-gris sm:w-auto">défini dans la configuration du serveur</span>
        </div>
      ))}
      {members
        .filter((m) => !owners.includes(m.email.toLowerCase()))
        .map((m) => (
          <div key={m.user_id} className="flex flex-wrap items-center gap-3 py-3.5">
            <span className="min-w-0 flex-1 truncate font-medium text-encre">{m.email}</span>
            <select
              value={m.role}
              disabled={m.user_id === selfId}
              onChange={(e) => run(() => changeRole(m.user_id, e.target.value as AdminRole))}
              className="field !w-auto !py-2 text-sm"
            >
              {roles.map((r) => (
                <option key={r} value={r}>
                  {roleLabels[r]}
                </option>
              ))}
            </select>
            {m.user_id !== selfId && (
              <button
                onClick={() => confirm(`Retirer l'accès admin de ${m.email} ?`) && run(() => removeMember(m.user_id))}
                className="grid size-9 place-items-center rounded-full text-gris hover:bg-red-50 hover:text-red-700"
                aria-label={`Retirer ${m.email}`}
              >
                <Trash2 className="size-4" />
              </button>
            )}
          </div>
        ))}
      {error && <p className="pt-3 text-sm text-red-700">{error}</p>}
    </div>
  );
}

export function AddMemberForm() {
  const [state, action, pending] = useActionState(addMember, undefined);
  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label>
          <span className="label">Email</span>
          <input name="email" type="email" required className="field" />
        </label>
        <label>
          <span className="label">Rôle</span>
          <select name="role" defaultValue="manager" className="field">
            {roles.map((r) => (
              <option key={r} value={r}>
                {roleLabels[r]} — {roleDescriptions[r]}
              </option>
            ))}
          </select>
        </label>
        <label className="sm:col-span-2">
          <span className="label">Mot de passe provisoire</span>
          <input name="password" type="text" minLength={10} autoComplete="off" className="field" placeholder="Uniquement si la personne n'a pas encore de compte" />
          <span className="mt-1 block text-[13px] text-gris">Transmettez-le à la personne : elle pourra le changer dans « Mon compte ».</span>
        </label>
      </div>
      <div className="flex items-center gap-3">
        <button disabled={pending} className="btn-primary !px-5 !py-2.5">
          {pending && <Loader2 className="size-4 animate-spin" />} Ajouter à l&apos;équipe
        </button>
        {state && <p className={clsx("text-sm", state.error ? "text-red-700" : "text-emerald-700")}>{state.error ?? state.ok}</p>}
      </div>
    </form>
  );
}

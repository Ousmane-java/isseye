import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin-auth";
import { adminDb } from "@/lib/supabase";
import { faqTopics } from "@/lib/content";
import { Card, PageHeader } from "@/components/admin/ui";
import { ActionForm, ConfirmButton } from "@/components/admin/forms";
import { deleteFaq, saveFaq } from "./actions";

export const metadata: Metadata = { title: "FAQ" };
type Faq = { id: string; topic: string; question: string; answer: string; position: number; active: boolean };

function Fields({ f }: { f?: Faq }) {
  return (
    <div className="grid gap-4 sm:grid-cols-[1fr_180px_90px]">
      <label className="block"><span className="label">Question</span><input name="question" defaultValue={f?.question} required className="field" /></label>
      <label className="block">
        <span className="label">Thème</span>
        <select name="topic" defaultValue={f?.topic ?? "commande"} className="field">
          {Object.entries(faqTopics).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </label>
      <label className="block"><span className="label">Ordre</span><input name="position" type="number" defaultValue={f?.position ?? 0} className="field" /></label>
      <label className="block sm:col-span-3"><span className="label">Réponse</span><textarea name="answer" defaultValue={f?.answer} required rows={3} className="field resize-y" /></label>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="active" defaultChecked={f?.active ?? true} className="size-4 accent-noir" /> Visible</label>
    </div>
  );
}

export default async function FaqAdminPage() {
  await requireAdmin("faq");
  const { data } = await adminDb().from("faqs").select("*").order("topic").order("position");
  const faqs = (data ?? []) as Faq[];
  const topics = [...new Set(faqs.map((f) => f.topic))];
  return (
    <div className="space-y-8">
      <PageHeader title="FAQ" description="Questions affichées sur la page /faq (et dans le bloc « Questions fréquentes » des pages), regroupées par thème." />
      <Card title="Nouvelle question">
        <ActionForm action={saveFaq.bind(null, null)} submitLabel="Ajouter"><Fields /></ActionForm>
      </Card>
      {topics.map((t) => (
        <Card key={t} title={faqTopics[t] ?? t}>
          <div className="space-y-3">
            {faqs.filter((f) => f.topic === t).map((f) => (
              <details key={f.id} className="rounded-xl border border-encre/10 p-4">
                <summary className="cursor-pointer font-medium">{f.question} {!f.active && <span className="text-[12px] text-gris">(masquée)</span>}</summary>
                <ActionForm action={saveFaq.bind(null, f.id)} className="mt-4" footer={<ConfirmButton danger confirm="Supprimer cette question ?" action={deleteFaq.bind(null, f.id)}>Supprimer</ConfirmButton>}>
                  <Fields f={f} />
                </ActionForm>
              </details>
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}

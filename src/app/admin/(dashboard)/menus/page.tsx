import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin-auth";
import { getMenu } from "@/lib/menus";
import { Card, PageHeader } from "@/components/admin/ui";
import { MenuEditor } from "./MenuEditor";

export const metadata: Metadata = { title: "Menus" };

export default async function MenusPage() {
  await requireAdmin("menus");
  const [header, footer] = await Promise.all([getMenu("header"), getMenu("footer")]);
  return (
    <div className="space-y-8">
      <PageHeader title="Menus" description="Liens de l'en-tête et colonnes du pied de page. Les filtres fonctionnent aussi : /boutique?pour=elle, /boutique?famille=florale…" />
      <Card title="Menu principal (en-tête)">
        <MenuEditor slug="header" initial={header} />
      </Card>
      <Card title="Pied de page" description="Chaque colonne a un titre et ses liens.">
        <MenuEditor slug="footer" initial={footer.map((g) => ({ ...g, children: g.children ?? [] }))} />
      </Card>
    </div>
  );
}

import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin-auth";
import { getSettings } from "@/lib/settings";
import { getCurrencies } from "@/lib/currencies";
import { missingLegal } from "@/lib/settings-schema";
import { Notice, PageHeader } from "@/components/admin/ui";
import { SettingsForms } from "./SettingsForms";

export const metadata: Metadata = { title: "Réglages" };

export default async function SettingsPage() {
  await requireAdmin("settings");
  const [settings, currencies] = await Promise.all([getSettings(), getCurrencies()]);
  const missing = missingLegal(settings.legal);

  return (
    <div className="space-y-8">
      <PageHeader title="Réglages" description="Tout ce qui est modifié ici s'applique immédiatement sur le site." />
      {missing.length > 0 && <Notice tone="warning">Identité légale incomplète : {missing.join(", ")}. Indispensable avant d&apos;ouvrir les ventes.</Notice>}
      <SettingsForms settings={settings} currencies={currencies} />
    </div>
  );
}

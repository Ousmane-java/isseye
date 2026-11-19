import type { Metadata } from "next";
import Link from "next/link";
import { PageIntro } from "@/components/PageIntro";
import { OrderLookup } from "@/components/OrderLookup";

export const metadata: Metadata = { title: "Suivre ma commande", description: "Suivez votre commande ISSEYE avec votre numéro de commande et votre email." };

export default function TrackPage() {
  return (
    <div className="pb-32">
      <PageIntro center eyebrow="Service client" title="Suivre ma commande" text="Votre numéro de commande figure dans l'email de confirmation (ISY-…)." />
      <div className="px-4">
        <OrderLookup />
        <p className="mt-10 text-center text-sm text-gris">
          Vous avez un espace cliente ?{" "}
          <Link href="/compte" className="text-bronze underline underline-offset-4">
            Retrouvez toutes vos commandes
          </Link>
        </p>
      </div>
    </div>
  );
}

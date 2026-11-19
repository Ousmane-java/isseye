import type { Metadata } from "next";
import Link from "next/link";
import { faqTopics, getFaqs } from "@/lib/content";
import { PageIntro } from "@/components/PageIntro";
import { FaqList } from "@/components/blocks/FaqList";

export const metadata: Metadata = { title: "Questions fréquentes", description: "Commande sans compte, paiement, livraison en France, en Afrique et aux États-Unis, retours : toutes les réponses." };

export default async function FaqPage() {
  const faqs = await getFaqs();
  const topics = [...new Set(faqs.map((f) => f.topic))];
  // Données structurées FAQ pour Google
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.question, acceptedAnswer: { "@type": "Answer", text: f.answer } })),
  };
  return (
    <div className="pb-32">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <PageIntro eyebrow="Service client" title="Questions fréquentes" />
      <div className="mx-auto max-w-[1440px] space-y-16 px-4 sm:px-8">
        {topics.map((topic) => (
          <section key={topic} className="grid gap-8 lg:grid-cols-[1fr_2fr]">
            <h2 className="font-display text-4xl font-light text-encre">{faqTopics[topic] ?? topic}</h2>
            <FaqList items={faqs.filter((f) => f.topic === topic)} />
          </section>
        ))}
        <p className="text-center text-gris">
          Vous ne trouvez pas votre réponse ?{" "}
          <Link href="/contact" className="text-bronze underline underline-offset-4">
            Écrivez-nous
          </Link>
        </p>
      </div>
    </div>
  );
}

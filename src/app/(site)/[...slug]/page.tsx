import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPage } from "@/lib/content";
import { markdownToHtml } from "@/lib/markdown";
import { RenderSections } from "@/components/blocks/RenderSections";
import { PageIntro } from "@/components/PageIntro";

// Pages créées ou modifiées dans Admin › Pages : La Maison, pages légales, pages libres.
const dateFormat = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeZone: "Europe/Paris" });

export async function generateMetadata({ params }: PageProps<"/[...slug]">): Promise<Metadata> {
  const page = await getPage((await params).slug.join("/"));
  if (!page) return {};
  return {
    title: page.seo_title ?? page.title,
    description: page.seo_description ?? undefined,
    alternates: { canonical: `/${page.slug}` },
    openGraph: page.og_image_url ? { images: [{ url: page.og_image_url }] } : undefined,
  };
}

export default async function ContentPage({ params }: PageProps<"/[...slug]">) {
  const slug = (await params).slug.join("/");
  if (!slug) notFound();
  const page = await getPage(slug);
  if (!page) notFound();

  if (page.kind === "legal") {
    return (
      <div className="pb-32">
        <PageIntro eyebrow="Informations" title={page.title} text={page.updated_at ? `Mise à jour le ${dateFormat.format(new Date(page.updated_at))}` : undefined} />
        <article className="prose-isseye mx-auto max-w-3xl px-4 sm:px-8" dangerouslySetInnerHTML={{ __html: markdownToHtml(page.body) }} />
      </div>
    );
  }
  return <RenderSections sections={page.sections} />;
}

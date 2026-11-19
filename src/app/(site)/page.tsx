import type { Metadata } from "next";
import { getPage } from "@/lib/content";
import { RenderSections } from "@/components/blocks/RenderSections";

// L'accueil se compose dans Admin › Pages › Accueil (blocs, ordre, textes, photos).
export async function generateMetadata(): Promise<Metadata> {
  const page = await getPage("");
  return {
    ...(page?.seo_title ? { title: { absolute: page.seo_title } } : {}),
    ...(page?.seo_description ? { description: page.seo_description } : {}),
    alternates: { canonical: "/" },
  };
}

export default async function HomePage() {
  const page = await getPage("");
  return <RenderSections sections={page?.sections ?? []} />;
}

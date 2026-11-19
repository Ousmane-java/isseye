import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { requireAdmin } from "@/lib/admin-auth";
import { adminDb } from "@/lib/supabase";
import { getSettings } from "@/lib/settings";
import { defaultLegalBody } from "@/lib/legal";
import { defaultSections, type Section } from "@/lib/blocks";
import { PageHeader } from "@/components/admin/ui";
import { ConfirmButton } from "@/components/admin/forms";
import { PageEditor } from "./PageEditor";
import { deletePage, setPageStatus } from "../actions";

export const metadata: Metadata = { title: "Page" };
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export default async function PageEditPage({ params }: PageProps<"/admin/pages/[id]">) {
  await requireAdmin("pages");
  const { id } = await params;
  const db = adminDb();
  const [{ data: page }, { data: products }, { data: versions }, settings] = await Promise.all([
    db.from("pages").select("*").eq("id", id).maybeSingle(),
    db.from("products").select("id, name").is("deleted_at", null).order("name"),
    db.from("page_versions").select("id, created_at, created_by").eq("page_id", id).order("created_at", { ascending: false }).limit(10),
    getSettings(),
  ]);
  if (!page) notFound();
  const published = Array.isArray(page.sections) && page.sections.length ? (page.sections as Section[]) : (defaultSections[page.slug] ?? []);
  const sections = Array.isArray(page.draft_sections) ? (page.draft_sections as Section[]) : published;

  return (
    <div className="space-y-8">
      <Link href="/pages" className="inline-flex items-center gap-2 text-sm text-gris hover:text-encre">
        <ArrowLeft className="size-4" /> Pages
      </Link>
      <PageHeader
        title={page.title}
        description={`/${page.slug}${page.system ? " · page indispensable du site" : ""}`}
        actions={
          <span className="flex flex-wrap items-center gap-4">
            <a href={`${siteUrl}/${page.slug}`} target="_blank" className="inline-flex items-center gap-1.5 text-sm text-bronze">Voir sur le site <ExternalLink className="size-3.5" /></a>
            {!page.system && (
              <>
                <ConfirmButton action={setPageStatus.bind(null, page.id, page.status === "published" ? "draft" : "published")}>{page.status === "published" ? "Retirer du site" : "Mettre en ligne"}</ConfirmButton>
                <ConfirmButton danger confirm="Supprimer définitivement cette page ?" action={deletePage.bind(null, page.id)}>Supprimer</ConfirmButton>
              </>
            )}
          </span>
        }
      />
      <PageEditor
        id={page.id}
        kind={page.kind}
        system={page.system}
        initialSections={sections}
        initialBody={page.body ?? ""}
        defaultBody={page.kind === "legal" ? defaultLegalBody(page.slug, settings) : ""}
        meta={{ title: page.title, slug: page.slug, seo_title: page.seo_title ?? "", seo_description: page.seo_description ?? "", og_image_url: page.og_image_url ?? "" }}
        products={products ?? []}
        versions={versions ?? []}
        hasDraft={Array.isArray(page.draft_sections)}
      />
    </div>
  );
}

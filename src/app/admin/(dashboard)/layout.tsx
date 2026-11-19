import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { adminDb, getAdminUser } from "@/lib/supabase";
import { AdminNav, type NavCounts } from "./AdminNav";

export const metadata: Metadata = { title: { default: "Admin", template: "%s · Admin ISSEYE" }, robots: { index: false } };
export const dynamic = "force-dynamic";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const user = await getAdminUser();
  if (!user) redirect("/login");

  // Pastilles du menu : ce qui attend une action
  const db = adminDb();
  const [orders, reviews, messages] = await Promise.all([
    db.from("orders").select("id", { count: "exact", head: true }).in("status", ["payee", "en_preparation", "prete_retrait"]),
    db.from("reviews").select("id", { count: "exact", head: true }).eq("status", "en_attente"),
    db.from("contact_messages").select("id", { count: "exact", head: true }).is("handled_at", null),
  ]);
  const counts: NavCounts = { orders: orders.count ?? 0, reviews: reviews.count ?? 0, messages: messages.count ?? 0 };

  return (
    <div className="min-h-dvh bg-lin-clair lg:pl-64 print:bg-white print:pl-0">
      <AdminNav email={user.email} role={user.role} siteUrl={siteUrl} counts={counts} />
      <main className="mx-auto max-w-6xl px-4 pt-6 pb-20 sm:px-8 lg:pt-10">{children}</main>
    </div>
  );
}

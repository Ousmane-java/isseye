import "server-only";
import { redirect } from "next/navigation";
import { revalidatePath, revalidateTag } from "next/cache";
import { SITE_TAG } from "@/lib/cache";
import { adminDb, getAdminUser, type AdminUser } from "@/lib/supabase";
import { canAccess, type AdminSectionKey } from "@/config/admin";

/**
 * À appeler au début de chaque page et action admin : redirige vers la connexion si besoin,
 * et refuse l'accès si le rôle ne couvre pas la section.
 */
export async function requireAdmin(section: AdminSectionKey = "dashboard"): Promise<AdminUser> {
  const user = await getAdminUser();
  if (!user) redirect("/login");
  if (!canAccess(user.role, section)) redirect("/?acces=refuse");
  return user;
}

/** Trace une modification dans le journal (Admin › Journal). N'interrompt jamais l'action en cas d'échec. */
export async function audit(
  user: AdminUser,
  action: "create" | "update" | "delete" | "restore" | "publish",
  entity: string,
  entityId: string | null,
  summary: string,
) {
  try {
    await adminDb().from("audit_log").insert({ actor_email: user.email, action, entity, entity_id: entityId, summary });
  } catch (err) {
    console.error("[audit]", err);
  }
}

/** Applique immédiatement un changement sur tout le site public (pages et données en cache). */
export function revalidateSite() {
  revalidateTag(SITE_TAG, { expire: 0 });
  revalidatePath("/", "layout");
}

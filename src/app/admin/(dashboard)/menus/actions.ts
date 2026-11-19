"use server";

import { revalidatePath } from "next/cache";
import { audit, requireAdmin, revalidateSite } from "@/lib/admin-auth";
import { adminDb } from "@/lib/supabase";
import type { ActionState } from "@/lib/admin-types";
import type { MenuItem } from "@/lib/menus";

function clean(items: unknown, depth = 0): MenuItem[] {
  if (!Array.isArray(items)) return [];
  return items
    .filter((i) => i && typeof i === "object" && typeof i.label === "string" && i.label.trim())
    .slice(0, 30)
    .map((i, n) => ({
      id: String(i.id || `m${Date.now()}${n}`).slice(0, 40),
      label: String(i.label).trim().slice(0, 60),
      href: String(i.href ?? "/").trim().slice(0, 300) || "/",
      ...(depth === 0 && Array.isArray(i.children) ? { children: clean(i.children, 1) } : {}),
    }));
}

export async function saveMenu(slug: "header" | "footer", items: MenuItem[]): Promise<ActionState> {
  const user = await requireAdmin("menus");
  const { error } = await adminDb().from("menus").upsert({ slug, name: slug === "header" ? "Menu principal" : "Pied de page", items: clean(items) });
  if (error) return { error: "Enregistrement impossible." };
  await audit(user, "update", "menu", slug, `Menu ${slug} modifié`);
  revalidatePath("/admin/menus");
  revalidateSite();
  return { ok: "Menu enregistré et en ligne." };
}

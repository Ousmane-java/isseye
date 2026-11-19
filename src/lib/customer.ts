import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { adminDb, authClient, isSupabaseConfigured } from "@/lib/supabase";

// Comptes clientes (email + mot de passe). Une commande appartient à un compte quand elle y est
// rattachée (customer_id) ; les commandes passées sans compte avec la même adresse n'apparaissent
// qu'une fois l'email confirmé (sinon n'importe qui pourrait les voir en créant un compte à ce nom).

export type Customer = {
  id: string;
  email: string;
  verified: boolean;
  firstName: string;
  lastName: string;
  phone: string;
};

export type CustomerAddress = { line1: string; line2: string; postalCode: string; city: string; country: string };

/** Vrai si un cookie de session Supabase est présent (vérification rapide, sans appel réseau). */
export async function hasSessionCookie() {
  if (!isSupabaseConfigured) return false;
  return (await cookies()).getAll().some((c) => c.name.startsWith("sb-") && c.name.includes("auth-token"));
}

/** Cliente connectée (session vérifiée auprès de Supabase), avec sa fiche ; null sinon. */
export const getCustomer = cache(async (): Promise<Customer | null> => {
  if (!(await hasSessionCookie())) return null;
  const { data } = await (await authClient()).auth.getUser();
  const user = data.user;
  if (!user?.email) return null;
  const db = adminDb();
  await db.from("customers").upsert({ id: user.id }, { onConflict: "id", ignoreDuplicates: true });
  const { data: row } = await db.from("customers").select("first_name, last_name, phone, email_verified_at").eq("id", user.id).maybeSingle();
  return {
    id: user.id,
    email: user.email.toLowerCase(),
    verified: Boolean(row?.email_verified_at),
    firstName: row?.first_name ?? "",
    lastName: row?.last_name ?? "",
    phone: row?.phone ?? "",
  };
});

/** Filtre PostgREST des commandes visibles par la cliente. */
export function ordersFilter(customer: Customer) {
  return customer.verified ? `customer_id.eq.${customer.id},email.eq.${customer.email}` : `customer_id.eq.${customer.id}`;
}

export async function getDefaultAddress(customerId: string): Promise<CustomerAddress | null> {
  const { data } = await adminDb().from("addresses").select("line1, line2, postal_code, city, country_code").eq("customer_id", customerId).eq("is_default", true).maybeSingle();
  return data ? { line1: data.line1, line2: data.line2 ?? "", postalCode: data.postal_code ?? "", city: data.city, country: data.country_code } : null;
}

/** Enregistre l'adresse par défaut de la cliente (remplace la précédente). */
export async function saveDefaultAddress(customer: Pick<Customer, "id" | "firstName" | "lastName" | "phone">, address: CustomerAddress) {
  const db = adminDb();
  await db.from("addresses").delete().eq("customer_id", customer.id).eq("is_default", true);
  await db.from("addresses").insert({
    customer_id: customer.id,
    first_name: customer.firstName || "-",
    last_name: customer.lastName || "-",
    line1: address.line1,
    line2: address.line2 || null,
    postal_code: address.postalCode || null,
    city: address.city,
    country_code: address.country,
    phone: customer.phone || null,
    is_default: true,
  });
}

export type CheckoutProfile = { email: string; firstName: string; lastName: string; phone: string; line1: string; line2: string; postalCode: string; city: string; country: string };

/** Coordonnées pour pré-remplir la caisse : fiche et adresse du compte, sinon dernière commande. */
export async function getCheckoutProfile(customer: Customer): Promise<CheckoutProfile> {
  const [address, { data: orders }] = await Promise.all([
    getDefaultAddress(customer.id),
    adminDb()
      .from("orders")
      .select("first_name, last_name, phone, ship_line1, ship_line2, ship_postal_code, ship_city, ship_country, delivery_type")
      .or(ordersFilter(customer))
      .not("status", "in", "(en_attente_paiement,abandonnee)")
      .order("created_at", { ascending: false })
      .limit(5),
  ]);
  const last = orders?.[0];
  const shipped = orders?.find((o) => o.delivery_type !== "pickup");
  return {
    email: customer.email,
    firstName: customer.firstName || last?.first_name || "",
    lastName: customer.lastName || last?.last_name || "",
    phone: customer.phone || last?.phone || "",
    line1: address?.line1 ?? shipped?.ship_line1 ?? "",
    line2: address?.line2 ?? shipped?.ship_line2 ?? "",
    postalCode: address?.postalCode ?? shipped?.ship_postal_code ?? "",
    city: address?.city ?? shipped?.ship_city ?? "",
    country: address?.country ?? shipped?.ship_country ?? "FR",
  };
}

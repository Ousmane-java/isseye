import "server-only";
import Stripe from "stripe";

let client: Stripe | null = null;

/** Client Stripe, ou null tant que STRIPE_SECRET_KEY n'est pas renseignée. */
export function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  client ??= new Stripe(key);
  return client;
}

/**
 * Sans clé Stripe, en développement uniquement : le paiement est simulé pour tester
 * tout le parcours de commande. Jamais en production.
 */
export function paymentSimulated() {
  return !process.env.STRIPE_SECRET_KEY && process.env.NODE_ENV !== "production";
}

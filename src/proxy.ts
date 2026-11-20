import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// L'espace admin vit sur son propre sous-domaine : admin.isseyes.com (en local : admin.localhost:3000).
// Les pages sont rangées dans src/app/admin, mais s'affichent à la racine du sous-domaine :
// admin.…/commandes → /admin/commandes.

const ADMIN_PREFIX = "/admin";
const COUNTRY_COOKIE = "isy_country"; // même nom que dans lib/currencies.ts

function isAdminHost(host: string) {
  return host.toLowerCase().startsWith("admin.");
}

/** Origine réellement demandée (domaine + protocole), y compris derrière l'hébergeur. */
function requestOrigin(request: NextRequest) {
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? request.nextUrl.host;
  const proto = request.headers.get("x-forwarded-proto") ?? request.nextUrl.protocol.replace(":", "");
  return `${proto}://${host}`;
}

/** URL de l'admin : NEXT_PUBLIC_ADMIN_URL, sinon « admin. » + le domaine courant. */
function adminOrigin(request: NextRequest) {
  if (process.env.NEXT_PUBLIC_ADMIN_URL) return process.env.NEXT_PUBLIC_ADMIN_URL.replace(/\/$/, "");
  return requestOrigin(request).replace("://www.", "://").replace("://", "://admin.");
}

export async function proxy(request: NextRequest) {
  const { pathname, search, searchParams } = request.nextUrl;
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "";
  const origin = requestOrigin(request);

  // ── Site public
  if (!isAdminHost(host)) {
    if (pathname === ADMIN_PREFIX || pathname.startsWith(`${ADMIN_PREFIX}/`)) {
      return NextResponse.redirect(`${adminOrigin(request)}${pathname.slice(ADMIN_PREFIX.length) || "/"}${search}`);
    }
    // Aperçu « vu depuis un pays » : ?pays=SN affiche la boutique comme au Sénégal, ?pays=auto revient à la normale
    const preview = searchParams.get("pays");
    if (preview !== null) return previewCountry(request, preview);
    // Cliente connectée (cookie Supabase présent) : on garde sa session à jour
    if (request.cookies.getAll().some((c) => c.name.startsWith("sb-"))) return refreshSession(request);
    return NextResponse.next();
  }

  // ── Sous-domaine admin
  // Les API (webhooks, formulaires) restent accessibles telles quelles.
  if (pathname.startsWith("/api/")) return NextResponse.next();

  // Adresses propres : admin.…/admin/commandes → admin.…/commandes
  if (pathname === ADMIN_PREFIX || pathname.startsWith(`${ADMIN_PREFIX}/`)) {
    return NextResponse.redirect(`${origin}${pathname.slice(ADMIN_PREFIX.length) || "/"}${search}`);
  }

  const internalPath = pathname === "/" ? ADMIN_PREFIX : `${ADMIN_PREFIX}${pathname}`;
  const isLogin = internalPath === `${ADMIN_PREFIX}/login`;
  // Pages accessibles sans être connecté : mot de passe oublié et retour du lien de réinitialisation
  const isPublic = isLogin || internalPath === `${ADMIN_PREFIX}/mot-de-passe-oublie` || internalPath === `${ADMIN_PREFIX}/auth/reset`;

  // Rafraîchit la session Supabase et protège toutes les pages sauf la connexion.
  // (Le rôle de l'utilisateur est vérifié ensuite par chaque page : lib/admin-auth.ts)
  const cookiesToSet: { name: string; value: string; options?: Parameters<NextResponse["cookies"]["set"]>[2] }[] = [];
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  let loggedIn = false;
  if (url && anonKey) {
    const supabase = createServerClient(url, anonKey, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (toSet) => {
          toSet.forEach(({ name, value }) => request.cookies.set(name, value));
          cookiesToSet.push(...toSet);
        },
      },
    });
    const { data } = await supabase.auth.getUser();
    loggedIn = Boolean(data.user);
  }

  let response: NextResponse;
  if (!loggedIn && !isPublic) {
    response = NextResponse.redirect(`${origin}/login`);
  } else if (loggedIn && isLogin) {
    response = NextResponse.redirect(`${origin}/`);
  } else {
    response = NextResponse.rewrite(new URL(`${internalPath}${search}`, request.url), { request });
  }
  cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
  return response;
}

export const config = {
  // Tout sauf les fichiers statiques
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.[a-zA-Z0-9]+$).*)"],
};

/** Enregistre (ou efface) le pays d'aperçu, puis recharge la même page sans le paramètre. */
function previewCountry(request: NextRequest, value: string) {
  const target = request.nextUrl.clone();
  target.searchParams.delete("pays");
  const response = NextResponse.redirect(target);
  const code = value.trim().toUpperCase();
  if (/^[A-Z]{2}$/.test(code)) {
    response.cookies.set(COUNTRY_COOKIE, code, { path: "/", maxAge: 60 * 60 * 24, sameSite: "lax" });
  } else {
    response.cookies.delete(COUNTRY_COOKIE);
  }
  return response;
}

/** Rafraîchit la session Supabase de la cliente (cookies) sans bloquer l'accès à la page. */
async function refreshSession(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  let response = NextResponse.next({ request });
  if (!url || !anonKey) return response;
  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (toSet) => {
        toSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        toSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  await supabase.auth.getUser();
  return response;
}

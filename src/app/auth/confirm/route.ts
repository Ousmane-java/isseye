import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { authClient, isSupabaseConfigured } from "@/lib/supabase";

// Retour du lien de connexion envoyé par email (espace cliente) : ouvre la session puis redirige.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  // Redirection interne uniquement (« //domaine » renverrait vers un autre site)
  const wanted = searchParams.get("next") ?? "";
  const next = wanted.startsWith("/") && !wanted.startsWith("//") ? wanted : "/compte";
  if (!isSupabaseConfigured) return NextResponse.redirect(`${origin}/compte`);

  const supabase = await authClient();
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  const { error } = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : tokenHash && type
      ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
      : { error: new Error("Lien incomplet") };

  return NextResponse.redirect(`${origin}${error ? "/compte?erreur=lien" : next}`);
}

import { NextResponse, type NextRequest } from "next/server";
import { authClient, isSupabaseConfigured } from "@/lib/supabase";

// Retour du lien « mot de passe oublié » (admin) : ouvre la session puis mène au choix du nouveau mot de passe.
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const origin = (process.env.NEXT_PUBLIC_ADMIN_URL ?? request.nextUrl.origin).replace(/\/$/, "");
  if (!isSupabaseConfigured) return NextResponse.redirect(`${origin}/login`);
  const supabase = await authClient();
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const { error } = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : tokenHash
      ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "recovery" })
      : { error: new Error("Lien incomplet") };
  return NextResponse.redirect(`${origin}${error ? "/mot-de-passe-oublie?expire=1" : "/reinitialisation"}`);
}

import { NextResponse, type NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

// Magic-link landing: swap the one-time code for a session cookie, then go to the account page.
export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url); const code = searchParams.get("code"); const nextRaw = searchParams.get("next") ?? "/account"; const next = /^\/[a-z/]*$/i.test(nextRaw) ? nextRaw : "/account";
  const sb = await supabaseServer();
  if (!sb || !code) return NextResponse.redirect(`${origin}/account?error=${sb ? "missing_code" : "not_configured"}`);
  const { error } = await sb.auth.exchangeCodeForSession(code);
  return NextResponse.redirect(error ? `${origin}/account?error=signin_failed` : `${origin}${next}`);
}

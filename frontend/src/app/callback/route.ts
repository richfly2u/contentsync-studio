import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/videos";

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=no_code`);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.redirect(`${origin}/login?error=config_missing`);
  }

  const response = NextResponse.redirect(`${origin}${next}`);

  // Use basic createClient with cookie-like storage
  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      flowType: "pkce",
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: true,
      storage: {
        getItem(key: string) {
          const cookie = request.cookies.get(key);
          return cookie?.value ?? null;
        },
        setItem(key: string, value: string) {
          request.cookies.set(key, value);
          response.cookies.set(key, value, {
            path: "/",
            httpOnly: true,
            sameSite: "lax",
            secure: true,
          });
        },
        removeItem(key: string) {
          request.cookies.delete(key);
          response.cookies.set(key, "", { path: "/", maxAge: 0 });
        },
      },
    },
  });

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("Auth code exchange failed:", error.message);
    return NextResponse.redirect(`${origin}/login?error=auth_failed`);
  }

  return response;
}

import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    // Supabase handles the code exchange via PKCE flow.
    // The session cookie is set by the Supabase redirect.
    // Just redirect to dashboard.
    return NextResponse.redirect(`${origin}/videos`);
  }

  return NextResponse.redirect(`${origin}/`);
}

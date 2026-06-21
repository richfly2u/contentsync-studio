import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  if (code) {
    // In production, this exchanges the auth code for a session.
    // For Phase 1 MVP, redirect to dashboard.
    // Will be implemented with full Supabase SSR in Phase 2.
    console.log("Auth callback received code:", code.substring(0, 10) + "...");
  }

  return NextResponse.redirect(new URL("/dashboard", request.url));
}

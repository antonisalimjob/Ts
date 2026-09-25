import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const requestUrl = new URL(req.url);
  const origin = requestUrl.origin;

  // Supabase OAuth mengirimkan hash #access_token di fragment URL
  // Redirect ke client handler dengan mempertahankan query string jika ada
  return NextResponse.redirect(`${origin}/auth/callback/client${requestUrl.search}`);
}

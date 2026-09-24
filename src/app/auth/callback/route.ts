import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const requestUrl = new URL(req.url);
  const origin = requestUrl.origin;

  return NextResponse.redirect(`${origin}/auth/callback/client`);
}

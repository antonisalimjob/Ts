import { NextResponse } from "next/server";
import { SESSION_COOKIE, TWO_FACTOR_COOKIE } from "@/lib/constants";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(SESSION_COOKIE);
  response.cookies.delete(TWO_FACTOR_COOKIE);
  return response;
}

import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { jsonError } from "@/lib/http";

export async function GET() {
  const session = await getSession();
  if (!session) return jsonError("Unauthorized", 401);
  return NextResponse.json(session);
}

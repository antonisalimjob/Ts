import { NextResponse } from "next/server";

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function fromAuthError(error: unknown) {
  const status =
    typeof error === "object" && error && "status" in error
      ? Number((error as { status: unknown }).status)
      : undefined;
  if (status === 401) return jsonError("Unauthorized", 401);
  if (status === 403) return jsonError("Forbidden", 403);
  throw error;
}

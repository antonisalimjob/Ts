import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jwtVerify } from "jose";
import { SESSION_COOKIE } from "@/lib/constants";
import { authSecret } from "@/lib/env";

export const dynamic = "force-dynamic";

// Helper verifikasi hak akses ADMIN
async function verifyAdminAccess(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) {
    return { authorized: false, status: 401, error: "Unauthorized: Missing session token", payload: null };
  }

  try {
    const secret = new TextEncoder().encode(authSecret());
    const { payload } = await jwtVerify(token, secret);

    if (payload.role !== "ADMIN") {
      return { authorized: false, status: 403, error: "Forbidden: Admin access required", payload: null };
    }

    return { authorized: true, status: 200, error: null, payload };
  } catch (err: any) {
    return { authorized: false, status: 401, error: "Unauthorized: Invalid or expired session", payload: null };
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAdminAccess(req);
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    // Await params untuk kompatibilitas Next.js 15 App Router
    const { id: userId } = await params;
    const body = await req.json();
    const { role } = body;

    if (!role) {
      return NextResponse.json(
        { success: false, error: "Role is required" },
        { status: 400 }
      );
    }

    // Mencegah Admin menurunkan hak akses akunnya sendiri
    if (userId === auth.payload?.id && role !== "ADMIN") {
      return NextResponse.json(
        { success: false, error: "You cannot revoke your own Admin access." },
        { status: 400 }
      );
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        role: role as any,
      },
    });

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to update role" },
      { status: 500 }
    );
  }
}

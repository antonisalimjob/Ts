import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jwtVerify } from "jose";
import { SESSION_COOKIE } from "@/lib/constants";
import { authSecret } from "@/lib/env";

export const dynamic = "force-dynamic";

// Helper internal untuk verifikasi role ADMIN
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

// GET: Mengambil daftar seluruh user (Hanya ADMIN)
export async function GET(req: NextRequest) {
  const auth = await verifyAdminAccess(req);
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ success: true, users });
  } catch (error: any) {
    console.error("GET Users Error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to fetch users" },
      { status: 500 }
    );
  }
}

// PUT: Memperbarui nama dan role user (Hanya ADMIN)
export async function PUT(req: NextRequest) {
  const auth = await verifyAdminAccess(req);
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    const body = await req.json();
    const { id, name, role } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "User ID is required" },
        { status: 400 }
      );
    }

    // Proteksi: Mencegah Admin mengubah role dirinya sendiri menjadi non-ADMIN
    if (id === auth.payload?.id && role !== "ADMIN") {
      return NextResponse.json(
        { success: false, error: "You cannot revoke your own Admin access." },
        { status: 400 }
      );
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        name,
        role: role as any,
      },
    });

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to update user" },
      { status: 500 }
    );
  }
}

// DELETE: Menghapus user berdasarkan Query Param `?id=...` (Hanya ADMIN)
export async function DELETE(req: NextRequest) {
  const auth = await verifyAdminAccess(req);
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "User ID is required" },
        { status: 400 }
      );
    }

    // Proteksi: Mencegah Admin menghapus akunnya sendiri
    if (id === auth.payload?.id) {
      return NextResponse.json(
        { success: false, error: "You cannot delete your own account." },
        { status: 400 }
      );
    }

    await prisma.user.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to delete user" },
      { status: 500 }
    );
  }
}

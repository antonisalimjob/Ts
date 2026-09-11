import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { jsonError } from "@/lib/http";
import { canManageUsers } from "@/lib/permissions";

export async function GET() {
  try {
    const user = await requireSession();
    if (!canManageUsers(user.role)) return jsonError("Forbidden", 403);
    const users = await prisma.user.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        department: true,
        title: true,
        isActive: true,
        createdAt: true,
      },
    });
    return NextResponse.json(users);
  } catch {
    return jsonError("Unauthorized", 401);
  }
}

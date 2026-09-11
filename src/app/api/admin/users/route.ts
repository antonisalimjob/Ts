import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { fromAuthError, jsonError } from "@/lib/http";

export async function GET() {
  try {
    await requireAdmin();
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
        isTwoFactorEnabled: true,
        teamMemberships: {
          include: {
            team: { select: { id: true, name: true } },
          },
          orderBy: { team: { name: "asc" } },
        },
      },
    });

    return NextResponse.json(
      users.map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        title: user.title,
        isActive: user.isActive,
        createdAt: user.createdAt.toISOString(),
        isTwoFactorEnabled: user.isTwoFactorEnabled,
        teams: user.teamMemberships.map((membership) => ({
          id: membership.team.id,
          name: membership.team.name,
          teamRole: membership.role,
        })),
      })),
    );
  } catch (error) {
    try {
      return fromAuthError(error);
    } catch {
      return jsonError("Could not load users", 500);
    }
  }
}

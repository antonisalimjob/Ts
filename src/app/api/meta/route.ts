import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { jsonError } from "@/lib/http";
import { isAgent } from "@/lib/permissions";

export async function GET() {
  try {
    const user = await requireSession();
    const [categories, agents, templates, users] = await Promise.all([
      prisma.category.findMany({ orderBy: { sortOrder: "asc" } }),
      prisma.user.findMany({
        where: { role: { in: ["TECHNICIAN", "ADMIN"] }, isActive: true },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          avatarUrl: true,
          department: true,
          title: true,
        },
        orderBy: { name: "asc" },
      }),
      prisma.followUpTemplate.findMany({ orderBy: { name: "asc" } }),
      isAgent(user.role)
        ? prisma.user.findMany({
            where: { isActive: true },
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              avatarUrl: true,
              department: true,
              title: true,
            },
            orderBy: { name: "asc" },
          })
        : Promise.resolve([]),
    ]);

    return NextResponse.json({ me: user, categories, agents, templates, users });
  } catch {
    return jsonError("Unauthorized", 401);
  }
}

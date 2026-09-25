import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jwtVerify } from "jose";
import { SESSION_COOKIE } from "@/lib/constants";
import { authSecret } from "@/lib/env";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get(SESSION_COOKIE)?.value;
    if (!token) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const secret = new TextEncoder().encode(authSecret());
    const { payload } = await jwtVerify(token, secret);

    const userId = payload.id as string;
    const userRole = payload.role as string;

    let whereClause: any = {};

    // 1. END_USER: Hanya boleh melihat tiket buatan dirinya sendiri
    if (userRole === "END_USER") {
      whereClause = { createdById: userId };
    } 
    // 2. TECHNICIAN: Boleh melihat tiket yang ditugaskan ke dirinya atau timnya
    else if (userRole === "TECHNICIAN") {
      whereClause = {
        OR: [
          { assignedToId: userId },
          { status: "OPEN" }, // Tiket antrean publik yang siap ditangani
        ],
      };
    }
    // 3. ADMIN: Tidak ada pembatasan (whereClause = {} mencakup seluruh tiket)

    const tickets = await prisma.ticket.findMany({
      where: whereClause,
      include: {
        createdBy: { select: { name: true, email: true } },
        assignedTo: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, tickets });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to fetch tickets" },
      { status: 500 }
    );
  }
}

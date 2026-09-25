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

    // 1. END_USER: Hanya melihat tiket buatan sendiri
    if (userRole === "END_USER") {
      whereClause = {
        OR: [
          { createdById: userId },
          { userId: userId },
          { authorId: userId },
        ],
      };
    } 
    // 2. TECHNICIAN: Tiket assigned atau berstatus OPEN
    else if (userRole === "TECHNICIAN") {
      whereClause = {
        OR: [
          { assignedToId: userId },
          { status: "OPEN" },
        ],
      };
    }
    // 3. ADMIN: Mengakses seluruh tiket (whereClause tetap {})

    const tickets = await prisma.ticket.findMany({
      where: whereClause,
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

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { jsonError } from "@/lib/http";

export async function GET() {
  try {
    const session = await requireSession();
    const user = await prisma.user.findUnique({
      where: { id: session.id },
      select: {
        isTwoFactorEnabled: true,
        twoFactorBackupCodes: true,
      },
    });
    if (!user) return jsonError("Account not found", 404);

    const remainingBackupCodes = Array.isArray(user.twoFactorBackupCodes)
      ? user.twoFactorBackupCodes.length
      : 0;

    return NextResponse.json({
      enabled: user.isTwoFactorEnabled,
      remainingBackupCodes,
    });
  } catch {
    return jsonError("Unauthorized", 401);
  }
}

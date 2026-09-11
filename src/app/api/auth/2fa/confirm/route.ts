import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { jsonError } from "@/lib/http";
import { decryptSecret } from "@/lib/crypto";
import { generateBackupCodes, hashBackupCodes, verifyTotp } from "@/lib/totp";

const schema = z.object({
  code: z.string().min(6).max(8),
});

export async function POST(request: Request) {
  try {
    const session = await requireSession();
    const body = schema.safeParse(await request.json());
    if (!body.success) return jsonError("Enter the 6-digit authenticator code.");

    const user = await prisma.user.findUnique({ where: { id: session.id } });
    if (!user?.twoFactorSecret) return jsonError("Start setup before confirming.");
    if (user.isTwoFactorEnabled) return jsonError("Two-factor authentication is already enabled.");

    const secret = decryptSecret(user.twoFactorSecret);
    if (!(await verifyTotp(secret, body.data.code))) {
      return jsonError("That verification code is not valid.");
    }

    const backupCodes = generateBackupCodes(8);
    await prisma.user.update({
      where: { id: user.id },
      data: {
        isTwoFactorEnabled: true,
        twoFactorBackupCodes: await hashBackupCodes(backupCodes),
      },
    });

    return NextResponse.json({ backupCodes });
  } catch {
    return jsonError("Unauthorized", 401);
  }
}

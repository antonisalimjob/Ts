import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { jsonError } from "@/lib/http";
import { decryptSecret } from "@/lib/crypto";
import { verifyTotp } from "@/lib/totp";

const schema = z.object({
  code: z.string().min(6).max(8),
});

export async function POST(request: Request) {
  try {
    const session = await requireSession();
    const body = schema.safeParse(await request.json());
    if (!body.success) return jsonError("Enter your authenticator code to disable 2FA.");

    const user = await prisma.user.findUnique({ where: { id: session.id } });
    if (!user?.isTwoFactorEnabled || !user.twoFactorSecret) {
      return jsonError("Two-factor authentication is not enabled.");
    }

    if (!(await verifyTotp(decryptSecret(user.twoFactorSecret), body.data.code))) {
      return jsonError("That verification code is not valid.");
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        isTwoFactorEnabled: false,
        twoFactorSecret: null,
        twoFactorBackupCodes: [],
      },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return jsonError("Unauthorized", 401);
  }
}

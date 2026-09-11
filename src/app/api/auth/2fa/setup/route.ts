import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { jsonError } from "@/lib/http";
import { encryptSecret } from "@/lib/crypto";
import { generateTotpSecret, totpKeyUri, totpQrDataUrl } from "@/lib/totp";

export async function POST() {
  try {
    const session = await requireSession();
    const user = await prisma.user.findUnique({ where: { id: session.id } });
    if (!user) return jsonError("Account not found", 404);
    if (user.isTwoFactorEnabled) return jsonError("Two-factor authentication is already enabled.");

    const secret = generateTotpSecret();
    const otpauth = totpKeyUri(user.email, secret);
    const qrDataUrl = await totpQrDataUrl(otpauth);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        twoFactorSecret: encryptSecret(secret),
        isTwoFactorEnabled: false,
      },
    });

    return NextResponse.json({
      otpauth,
      qrDataUrl,
      secret,
      issuer: process.env.TWO_FACTOR_ISSUER || "Nexus SM",
    });
  } catch {
    return jsonError("Unauthorized", 401);
  }
}

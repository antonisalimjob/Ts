import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  createSessionToken,
  getTwoFactorChallengeUserId,
  sessionCookieOptions,
} from "@/lib/auth";
import { SESSION_COOKIE, TWO_FACTOR_COOKIE } from "@/lib/constants";
import { jsonError } from "@/lib/http";
import { decryptSecret } from "@/lib/crypto";
import { consumeBackupCode, verifyTotp } from "@/lib/totp";

const schema = z.object({
  code: z.string().min(6).max(16),
  backup: z.boolean().optional(),
});

export async function POST(request: Request) {
  const body = schema.safeParse(await request.json());
  if (!body.success) return jsonError("Enter a valid verification code.");

  const userId = await getTwoFactorChallengeUserId();
  if (!userId) return jsonError("Your verification session expired. Sign in again.", 401);

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.isActive || !user.isTwoFactorEnabled || !user.twoFactorSecret) {
    return jsonError("Two-factor authentication is not available for this account.", 401);
  }

  let valid = false;
  if (body.data.backup) {
    const hashes = Array.isArray(user.twoFactorBackupCodes)
      ? (user.twoFactorBackupCodes as string[])
      : [];
    const remaining = await consumeBackupCode(hashes, body.data.code);
    if (remaining) {
      valid = true;
      await prisma.user.update({
        where: { id: user.id },
        data: { twoFactorBackupCodes: remaining },
      });
    }
  } else {
    try {
      valid = await verifyTotp(decryptSecret(user.twoFactorSecret), body.data.code);
    } catch {
      valid = false;
    }
  }

  if (!valid) return jsonError("That verification code is not valid.", 401);

  const token = await createSessionToken({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    avatarUrl: user.avatarUrl,
    department: user.department,
    title: user.title,
  });

  const response = NextResponse.json({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  });
  response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions(60 * 60 * 24 * 7));
  response.cookies.delete(TWO_FACTOR_COOKIE);
  return response;
}

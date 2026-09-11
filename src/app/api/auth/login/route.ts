import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createSessionToken, createTwoFactorChallenge, sessionCookieOptions } from "@/lib/auth";
import { SESSION_COOKIE, TWO_FACTOR_COOKIE } from "@/lib/constants";
import { jsonError } from "@/lib/http";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export async function POST(request: Request) {
  const body = schema.safeParse(await request.json());
  if (!body.success) return jsonError("Invalid credentials", 400);

  const user = await prisma.user.findUnique({ where: { email: body.data.email.toLowerCase() } });
  if (!user || !user.isActive) return jsonError("Invalid credentials", 401);

  const matches = await bcrypt.compare(body.data.password, user.passwordHash);
  if (!matches) return jsonError("Invalid credentials", 401);

  if (user.isTwoFactorEnabled && user.twoFactorSecret) {
    const challenge = await createTwoFactorChallenge(user.id);
    const response = NextResponse.json({ requiresTwoFactor: true });
    response.cookies.set(TWO_FACTOR_COOKIE, challenge, sessionCookieOptions(60 * 5));
    return response;
  }

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

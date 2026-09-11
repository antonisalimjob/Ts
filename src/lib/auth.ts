import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { SESSION_COOKIE, TWO_FACTOR_COOKIE } from "@/lib/constants";
import { authSecret } from "@/lib/env";
import type { Role } from "@prisma/client";

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  avatarUrl: string | null;
  department: string | null;
  title: string | null;
}

function secret() {
  return new TextEncoder().encode(authSecret());
}

export function sessionCookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: maxAgeSeconds,
  };
}

export async function createSessionToken(user: SessionUser) {
  return new SignJWT({ ...user })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret());
}

export async function createTwoFactorChallenge(userId: string) {
  return new SignJWT({ userId, purpose: "2fa-login" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("5m")
    .sign(secret());
}

export async function readTwoFactorChallenge(token: string) {
  const { payload } = await jwtVerify(token, secret());
  if (payload.purpose !== "2fa-login" || typeof payload.userId !== "string") {
    throw new Error("Invalid 2FA challenge");
  }
  return payload.userId;
}

export async function readSessionToken(token: string) {
  const { payload } = await jwtVerify(token, secret());
  return payload as unknown as SessionUser;
}

export async function getSession(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const payload = await readSessionToken(token);
    const user = await prisma.user.findUnique({
      where: { id: payload.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        avatarUrl: true,
        department: true,
        title: true,
        isActive: true,
      },
    });
    if (!user?.isActive) return null;
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      avatarUrl: user.avatarUrl,
      department: user.department,
      title: user.title,
    };
  } catch {
    return null;
  }
}

export async function requireSession() {
  const session = await getSession();
  if (!session) {
    const error = new Error("Unauthorized");
    (error as Error & { status: number }).status = 401;
    throw error;
  }
  return session;
}

export async function requireAdmin() {
  const session = await requireSession();
  if (session.role !== "ADMIN") {
    const error = new Error("Forbidden");
    (error as Error & { status: number }).status = 403;
    throw error;
  }
  return session;
}

export async function getTwoFactorChallengeUserId() {
  const store = await cookies();
  const token = store.get(TWO_FACTOR_COOKIE)?.value;
  if (!token) return null;
  try {
    return await readTwoFactorChallenge(token);
  } catch {
    return null;
  }
}

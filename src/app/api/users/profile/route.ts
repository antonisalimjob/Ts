import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  createSessionToken,
  requireAdmin,
  requireSession,
  sessionCookieOptions,
  type SessionUser,
} from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { SESSION_COOKIE } from "@/lib/constants";
import { fromAuthError, jsonError } from "@/lib/http";

const schema = z
  .object({
    name: z.string().trim().min(2).max(80).optional(),
    email: z.string().trim().email().optional(),
    userId: z.string().min(1).optional(),
  })
  .refine((value) => Boolean(value.name || value.email), {
    message: "Provide a name or email to update.",
  });

function sessionFromUser(user: {
  id: string;
  email: string;
  name: string;
  role: SessionUser["role"];
  avatarUrl: string | null;
  department: string | null;
  title: string | null;
}): SessionUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    avatarUrl: user.avatarUrl,
    department: user.department,
    title: user.title,
  };
}

export async function PATCH(request: Request) {
  try {
    const session = await requireSession();
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return jsonError("Enter a valid name and/or email address.");

    const targetId = parsed.data.userId ?? session.id;
    if (targetId !== session.id) await requireAdmin();

    const user = await prisma.user.findUnique({ where: { id: targetId } });
    if (!user) return jsonError("User not found", 404);

    const data: { name?: string; email?: string } = {};
    if (parsed.data.name && parsed.data.name !== user.name) data.name = parsed.data.name;
    if (parsed.data.email) {
      const email = parsed.data.email.toLowerCase();
      if (email !== user.email) {
        const clash = await prisma.user.findFirst({
          where: { email, NOT: { id: targetId } },
          select: { id: true },
        });
        if (clash) return jsonError("That email address is already in use.", 409);
        data.email = email;
      }
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({
        id: user.id,
        name: user.name,
        email: user.email,
      });
    }

    const updated = await prisma.user.update({
      where: { id: targetId },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatarUrl: true,
        department: true,
        title: true,
      },
    });

    await writeAuditLog({
      actorId: session.id,
      action: "PROFILE_UPDATED",
      entityType: "USER",
      entityId: targetId,
      fromValue: `${user.name} <${user.email}>`,
      toValue: `${updated.name} <${updated.email}>`,
    });

    const response = NextResponse.json({
      id: updated.id,
      name: updated.name,
      email: updated.email,
    });
    if (targetId === session.id) {
      response.cookies.set(
        SESSION_COOKIE,
        await createSessionToken(sessionFromUser(updated)),
        sessionCookieOptions(60 * 60 * 24 * 7),
      );
    }
    return response;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return jsonError("That email address is already in use.", 409);
    }
    try {
      return fromAuthError(error);
    } catch {
      return jsonError("Could not update profile", 500);
    }
  }
}

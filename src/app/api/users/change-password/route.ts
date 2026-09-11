import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireSession } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { fromAuthError, jsonError } from "@/lib/http";
import { hashPassword, passwordMatches } from "@/lib/passwords";

const schema = z
  .object({
    currentPassword: z.string().min(1).optional(),
    newPassword: z.string().min(8).max(72),
    confirmPassword: z.string().optional(),
    userId: z.string().min(1).optional(),
  })
  .refine((value) => !value.confirmPassword || value.confirmPassword === value.newPassword, {
    message: "New password and confirmation do not match.",
    path: ["confirmPassword"],
  });

export async function PATCH(request: Request) {
  try {
    const session = await requireSession();
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) {
      const confirmMismatch = parsed.error.issues.some((issue) => issue.path.includes("confirmPassword"));
      return jsonError(
        confirmMismatch
          ? "New password and confirmation do not match."
          : "New password must be at least 8 characters.",
      );
    }

    const targetId = parsed.data.userId ?? session.id;
    const isOverride = targetId !== session.id;
    if (isOverride) await requireAdmin();

    const user = await prisma.user.findUnique({ where: { id: targetId } });
    if (!user) return jsonError("User not found", 404);

    if (!isOverride) {
      if (!parsed.data.currentPassword) return jsonError("Enter your current password.");
      const matches = await passwordMatches(parsed.data.currentPassword, user.passwordHash);
      if (!matches) return jsonError("Current password is incorrect.", 401);
    }

    await prisma.user.update({
      where: { id: targetId },
      data: { passwordHash: await hashPassword(parsed.data.newPassword) },
    });

    await writeAuditLog({
      actorId: session.id,
      action: "PASSWORD_CHANGED",
      entityType: "USER",
      entityId: targetId,
      metadata: { override: isOverride },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    try {
      return fromAuthError(error);
    } catch {
      return jsonError("Could not update password", 500);
    }
  }
}

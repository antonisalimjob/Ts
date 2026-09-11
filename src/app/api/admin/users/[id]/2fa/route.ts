import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { fromAuthError, jsonError } from "@/lib/http";

const schema = z
  .object({
    action: z.enum(["reset", "disable"]).optional(),
    enabled: z.boolean().optional(),
  })
  .refine((value) => value.action !== undefined || value.enabled !== undefined, {
    message: "Specify a 2FA action.",
  });

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireAdmin();
    const { id } = await params;
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return jsonError("Specify a 2FA action.");

    if (parsed.data.enabled === true) {
      return jsonError("The user must enable two-factor authentication from their account settings.");
    }

    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, isTwoFactorEnabled: true },
    });
    if (!user) return jsonError("User not found", 404);

    await prisma.user.update({
      where: { id },
      data: {
        isTwoFactorEnabled: false,
        twoFactorSecret: null,
        twoFactorBackupCodes: [],
      },
    });

    await writeAuditLog({
      actorId: actor.id,
      action: "TWO_FACTOR_RESET",
      entityType: "USER",
      entityId: id,
      fromValue: user.isTwoFactorEnabled ? "enabled" : "disabled",
      toValue: "disabled",
      metadata: { email: user.email },
    });

    return NextResponse.json({
      id: user.id,
      isTwoFactorEnabled: false,
    });
  } catch (error) {
    try {
      return fromAuthError(error);
    } catch {
      return jsonError("Could not update two-factor authentication", 500);
    }
  }
}

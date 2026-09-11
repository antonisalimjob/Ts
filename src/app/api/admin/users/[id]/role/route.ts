import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { fromAuthError, jsonError } from "@/lib/http";

const schema = z.object({
  role: z.enum(["ADMIN", "TECHNICIAN", "END_USER"]),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireAdmin();
    const { id } = await params;
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return jsonError("Choose a valid role.");

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return jsonError("User not found", 404);
    if (user.role === parsed.data.role) {
      return NextResponse.json({
        id: user.id,
        role: user.role,
      });
    }

    if (user.role === "ADMIN" && parsed.data.role !== "ADMIN") {
      const adminCount = await prisma.user.count({
        where: { role: "ADMIN", isActive: true },
      });
      if (adminCount <= 1) {
        return jsonError("The last administrator cannot be demoted.", 409);
      }
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { role: parsed.data.role },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    await writeAuditLog({
      actorId: actor.id,
      action: "ROLE_CHANGED",
      entityType: "USER",
      entityId: user.id,
      fromValue: user.role,
      toValue: updated.role,
      metadata: { email: user.email, name: user.name },
    });

    return NextResponse.json(updated);
  } catch (error) {
    try {
      return fromAuthError(error);
    } catch {
      return jsonError("Could not update role", 500);
    }
  }
}

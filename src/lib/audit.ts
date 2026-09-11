import type { AuditAction, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function writeAuditLog(input: {
  actorId?: string | null;
  action: AuditAction;
  entityType: "USER" | "TEAM";
  entityId: string;
  fromValue?: string | null;
  toValue?: string | null;
  metadata?: Prisma.InputJsonValue;
}) {
  await prisma.auditLog.create({
    data: {
      actorId: input.actorId ?? null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      fromValue: input.fromValue ?? null,
      toValue: input.toValue ?? null,
      metadata: input.metadata,
    },
  });
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { fromAuthError, jsonError } from "@/lib/http";
import { serializeTeam } from "@/lib/teams";

const schema = z
  .object({
    add: z
      .array(
        z.object({
          userId: z.string().min(1),
          teamRole: z.enum(["TEAM_LEAD", "MEMBER"]).default("MEMBER"),
        }),
      )
      .optional(),
    remove: z.array(z.string().min(1)).optional(),
  })
  .refine((value) => (value.add?.length ?? 0) + (value.remove?.length ?? 0) > 0, {
    message: "Add or remove at least one member.",
  });

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireAdmin();
    const { id } = await params;
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return jsonError("Add or remove at least one member.");

    const team = await prisma.team.findUnique({ where: { id } });
    if (!team) return jsonError("Team not found", 404);

    const add = parsed.data.add ?? [];
    const remove = parsed.data.remove ?? [];
    const addIds = add.map((member) => member.userId);

    if (addIds.length) {
      const users = await prisma.user.findMany({
        where: { id: { in: addIds } },
        select: { id: true },
      });
      if (users.length !== addIds.length) return jsonError("One or more users were not found.", 404);
    }

    await prisma.$transaction(async (tx) => {
      if (remove.length) {
        await tx.teamMember.deleteMany({
          where: { teamId: id, userId: { in: remove } },
        });
      }
      for (const member of add) {
        await tx.teamMember.upsert({
          where: { teamId_userId: { teamId: id, userId: member.userId } },
          create: { teamId: id, userId: member.userId, role: member.teamRole },
          update: { role: member.teamRole },
        });
      }
    });

    await writeAuditLog({
      actorId: actor.id,
      action: "TEAM_MEMBERS_CHANGED",
      entityType: "TEAM",
      entityId: id,
      toValue: team.name,
      metadata: {
        added: add,
        removed: remove,
      },
    });

    return NextResponse.json(await serializeTeam(id));
  } catch (error) {
    try {
      return fromAuthError(error);
    } catch {
      return jsonError("Could not update team members", 500);
    }
  }
}

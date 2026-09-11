import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { fromAuthError, jsonError } from "@/lib/http";
import { serializeTeam } from "@/lib/teams";

const updateSchema = z.object({
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(400).optional().nullable(),
});

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireAdmin();
    const { id } = await params;
    const parsed = updateSchema.safeParse(await request.json());
    if (!parsed.success) return jsonError("Enter a team name (2–80 characters).");

    const existing = await prisma.team.findUnique({ where: { id } });
    if (!existing) return jsonError("Team not found", 404);

    const clash = await prisma.team.findFirst({
      where: { name: parsed.data.name, NOT: { id } },
    });
    if (clash) return jsonError("A team with that name already exists.", 409);

    await prisma.team.update({
      where: { id },
      data: {
        name: parsed.data.name,
        description: parsed.data.description?.trim() ? parsed.data.description.trim() : null,
      },
    });

    await writeAuditLog({
      actorId: actor.id,
      action: "TEAM_UPDATED",
      entityType: "TEAM",
      entityId: id,
      fromValue: existing.name,
      toValue: parsed.data.name,
    });

    return NextResponse.json(await serializeTeam(id));
  } catch (error) {
    try {
      return fromAuthError(error);
    } catch {
      return jsonError("Could not update team", 500);
    }
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireAdmin();
    const { id } = await params;
    const existing = await prisma.team.findUnique({
      where: { id },
      include: { _count: { select: { members: true, tickets: true } } },
    });
    if (!existing) return jsonError("Team not found", 404);

    const [unassignedTickets, removedMembers] = await prisma.$transaction([
      prisma.ticket.updateMany({
        where: { teamId: id },
        data: { teamId: null },
      }),
      prisma.teamMember.deleteMany({ where: { teamId: id } }),
      prisma.team.delete({ where: { id } }),
    ]);

    await writeAuditLog({
      actorId: actor.id,
      action: "TEAM_DELETED",
      entityType: "TEAM",
      entityId: id,
      fromValue: existing.name,
      metadata: {
        unassignedTickets: unassignedTickets.count,
        removedMembers: removedMembers.count,
      },
    });

    return NextResponse.json({
      ok: true,
      unassignedTickets: unassignedTickets.count,
      removedMembers: removedMembers.count,
    });
  } catch (error) {
    try {
      return fromAuthError(error);
    } catch {
      return jsonError("Could not delete team", 500);
    }
  }
}

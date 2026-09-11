import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { fromAuthError, jsonError } from "@/lib/http";
import { serializeTeam, serializeTeams } from "@/lib/teams";

const createSchema = z.object({
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(400).optional().nullable(),
});

export async function GET() {
  try {
    await requireAdmin();
    return NextResponse.json(await serializeTeams());
  } catch (error) {
    try {
      return fromAuthError(error);
    } catch {
      return jsonError("Could not load teams", 500);
    }
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireAdmin();
    const parsed = createSchema.safeParse(await request.json());
    if (!parsed.success) return jsonError("Enter a team name (2–80 characters).");

    const existing = await prisma.team.findUnique({
      where: { name: parsed.data.name },
    });
    if (existing) return jsonError("A team with that name already exists.", 409);

    const team = await prisma.team.create({
      data: {
        name: parsed.data.name,
        description: parsed.data.description?.trim() ? parsed.data.description.trim() : null,
      },
    });

    await writeAuditLog({
      actorId: actor.id,
      action: "TEAM_CREATED",
      entityType: "TEAM",
      entityId: team.id,
      toValue: team.name,
      metadata: { description: team.description },
    });

    return NextResponse.json(await serializeTeam(team.id), { status: 201 });
  } catch (error) {
    try {
      return fromAuthError(error);
    } catch {
      return jsonError("Could not create team", 500);
    }
  }
}

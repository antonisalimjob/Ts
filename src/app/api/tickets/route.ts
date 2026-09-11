import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { jsonError } from "@/lib/http";
import { isAgent } from "@/lib/permissions";
import { nextTicketKey, slaDueDates } from "@/lib/sla";
import { buildSlaView } from "@/lib/sla";
import { logActivity } from "@/lib/tickets";

const createSchema = z.object({
  title: z.string().min(4),
  description: z.string().min(8),
  type: z.enum(["INCIDENT", "SERVICE_REQUEST", "PROBLEM", "CHANGE_REQUEST"]),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
  categoryId: z.string().min(1),
  requesterId: z.string().optional(),
  assigneeId: z.string().nullable().optional(),
});

export async function GET(request: Request) {
  try {
    const user = await requireSession();
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim();
    const status = searchParams.get("status");
    const type = searchParams.get("type");
    const priority = searchParams.get("priority");
    const mine = searchParams.get("mine") === "1";

    const tickets = await prisma.ticket.findMany({
      where: {
        ...(user.role === "END_USER" ? { requesterId: user.id } : {}),
        ...(mine && isAgent(user.role) ? { assigneeId: user.id } : {}),
        ...(status ? { status: status as never } : {}),
        ...(type ? { type: type as never } : {}),
        ...(priority ? { priority: priority as never } : {}),
        ...(q
          ? {
              OR: [
                { key: { contains: q, mode: "insensitive" } },
                { title: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      include: {
        category: true,
        requester: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            avatarUrl: true,
            department: true,
            title: true,
          },
        },
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            avatarUrl: true,
            department: true,
            title: true,
          },
        },
        slaPolicy: true,
      },
      orderBy: { lastActivityAt: "desc" },
    });

    return NextResponse.json(
      tickets.map((ticket) => ({
        ...ticket,
        createdAt: ticket.createdAt.toISOString(),
        lastActivityAt: ticket.lastActivityAt.toISOString(),
        sla: buildSlaView(ticket),
      })),
    );
  } catch {
    return jsonError("Unauthorized", 401);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireSession();
    const parsed = createSchema.safeParse(await request.json());
    if (!parsed.success) return jsonError("Check the ticket fields and try again.");

    const requesterId =
      isAgent(user.role) && parsed.data.requesterId ? parsed.data.requesterId : user.id;
    const slaPolicy = await prisma.slaPolicy.findUnique({
      where: { priority: parsed.data.priority },
    });
    if (!slaPolicy) return jsonError("No SLA policy for that priority.");

    const due = slaDueDates(parsed.data.priority);
    const key = await nextTicketKey(parsed.data.type);

    const ticket = await prisma.ticket.create({
      data: {
        key,
        title: parsed.data.title,
        description: parsed.data.description,
        type: parsed.data.type,
        priority: parsed.data.priority,
        categoryId: parsed.data.categoryId,
        requesterId,
        assigneeId: isAgent(user.role) ? parsed.data.assigneeId ?? null : null,
        slaPolicyId: slaPolicy.id,
        firstResponseDueAt: due.firstResponseDueAt,
        resolutionDueAt: due.resolutionDueAt,
        status: parsed.data.assigneeId ? "OPEN" : "NEW",
      },
    });

    await logActivity({
      ticketId: ticket.id,
      actorId: user.id,
      action: "CREATED",
      toValue: ticket.key,
    });

    return NextResponse.json({ key: ticket.key }, { status: 201 });
  } catch {
    return jsonError("Unauthorized", 401);
  }
}

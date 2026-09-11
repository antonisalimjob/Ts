import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { jsonError } from "@/lib/http";
import { canUpdateTicketFields } from "@/lib/permissions";
import { getTicketByKey, logActivity, ticketDetailInclude, serializeTicket } from "@/lib/tickets";
import { emitTicketEvent } from "@/lib/realtime";
import { slaDueDates } from "@/lib/sla";

const patchSchema = z.object({
  status: z.enum(["NEW", "OPEN", "IN_PROGRESS", "PENDING", "RESOLVED", "CLOSED"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  assigneeId: z.string().nullable().optional(),
  title: z.string().min(4).optional(),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ key: string }> },
) {
  try {
    const user = await requireSession();
    const { key } = await params;
    const ticket = await getTicketByKey(key, user);
    if (!ticket) return jsonError("Ticket not found", 404);

    const unread = (ticket.comments ?? []).filter((comment) => comment.author.id !== user.id);
    if (unread.length > 0) {
      await prisma.messageReadReceipt.createMany({
        data: unread.map((comment) => ({ commentId: comment.id, userId: user.id })),
        skipDuplicates: true,
      });
    }

    return NextResponse.json(ticket);
  } catch {
    return jsonError("Unauthorized", 401);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ key: string }> },
) {
  try {
    const user = await requireSession();
    if (!canUpdateTicketFields(user.role)) return jsonError("Forbidden", 403);
    const { key } = await params;
    const existing = await prisma.ticket.findUnique({ where: { key } });
    if (!existing) return jsonError("Ticket not found", 404);

    const parsed = patchSchema.safeParse(await request.json());
    if (!parsed.success) return jsonError("Invalid update");

    const data: Record<string, unknown> = { lastActivityAt: new Date() };
    if (parsed.data.title) data.title = parsed.data.title;
    if (parsed.data.assigneeId !== undefined) data.assigneeId = parsed.data.assigneeId;
    if (parsed.data.status) {
      data.status = parsed.data.status;
      if (parsed.data.status === "RESOLVED") data.resolvedAt = new Date();
      if (parsed.data.status === "CLOSED") data.closedAt = new Date();
    }
    if (parsed.data.priority && parsed.data.priority !== existing.priority) {
      data.priority = parsed.data.priority;
      const slaPolicy = await prisma.slaPolicy.findUnique({
        where: { priority: parsed.data.priority },
      });
      if (slaPolicy) {
        const due = slaDueDates(parsed.data.priority, existing.createdAt);
        data.slaPolicyId = slaPolicy.id;
        data.firstResponseDueAt = due.firstResponseDueAt;
        data.resolutionDueAt = due.resolutionDueAt;
      }
    }

    await prisma.ticket.update({ where: { id: existing.id }, data });

    if (parsed.data.status && parsed.data.status !== existing.status) {
      await logActivity({
        ticketId: existing.id,
        actorId: user.id,
        action: "STATUS_CHANGED",
        fromValue: existing.status,
        toValue: parsed.data.status,
      });
    }
    if (parsed.data.priority && parsed.data.priority !== existing.priority) {
      await logActivity({
        ticketId: existing.id,
        actorId: user.id,
        action: "PRIORITY_CHANGED",
        fromValue: existing.priority,
        toValue: parsed.data.priority,
      });
    }
    if (parsed.data.assigneeId !== undefined && parsed.data.assigneeId !== existing.assigneeId) {
      await logActivity({
        ticketId: existing.id,
        actorId: user.id,
        action: "ASSIGNED",
        toValue: parsed.data.assigneeId ?? "Unassigned",
      });
    }

    const ticket = await prisma.ticket.findUniqueOrThrow({
      where: { id: existing.id },
      include: ticketDetailInclude,
    });
    emitTicketEvent(existing.id, "ticket:updated", { key });
    return NextResponse.json(serializeTicket(ticket, user.role));
  } catch {
    return jsonError("Unauthorized", 401);
  }
}

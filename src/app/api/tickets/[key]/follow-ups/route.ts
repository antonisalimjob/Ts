import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { jsonError } from "@/lib/http";
import { logActivity } from "@/lib/tickets";
import { emitTicketEvent, emitUserEvent } from "@/lib/realtime";
import { interpolateTemplate } from "@/lib/utils";

const schema = z.object({
  templateId: z.string().optional(),
  subject: z.string().min(3),
  message: z.string().min(3),
  channel: z.enum(["EMAIL", "IN_APP", "BOTH"]).default("BOTH"),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ key: string }> },
) {
  try {
    const user = await requireSession();
    const { key } = await params;
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return jsonError("Follow-up message is required.");

    const ticket = await prisma.ticket.findUnique({
      where: { key },
      include: { requester: true, assignee: true },
    });
    if (!ticket) return jsonError("Ticket not found", 404);
    if (user.role === "END_USER" && ticket.requesterId !== user.id) {
      return jsonError("Forbidden", 403);
    }

    const recipients = new Set<string>();
    if (user.role === "END_USER") {
      if (ticket.assigneeId) recipients.add(ticket.assigneeId);
      const leads = await prisma.user.findMany({
        where: { role: "ADMIN", isActive: true },
        select: { id: true },
      });
      leads.forEach((lead) => recipients.add(lead.id));
    } else {
      recipients.add(ticket.requesterId);
      if (ticket.assigneeId && ticket.assigneeId !== user.id) recipients.add(ticket.assigneeId);
    }

    const vars = {
      ticketKey: ticket.key,
      title: ticket.title,
      requester: ticket.requester.name,
      assignee: ticket.assignee?.name ?? "Unassigned",
      sender: user.name,
      status: ticket.status,
    };

    const followUp = await prisma.ticketFollowUp.create({
      data: {
        ticketId: ticket.id,
        triggeredById: user.id,
        type: "MANUAL",
        channel: parsed.data.channel,
        templateId: parsed.data.templateId,
        subject: interpolateTemplate(parsed.data.subject, vars),
        message: interpolateTemplate(parsed.data.message, vars),
        sentToUserIds: [...recipients],
      },
    });

    await prisma.ticket.update({
      where: { id: ticket.id },
      data: { lastFollowUpAt: new Date() },
    });

    await logActivity({
      ticketId: ticket.id,
      actorId: user.id,
      action: "FOLLOW_UP_SENT",
      toValue: parsed.data.channel,
      metadata: { followUpId: followUp.id, recipientCount: recipients.size },
    });

    if (parsed.data.channel !== "EMAIL") {
      await prisma.notification.createMany({
        data: [...recipients].map((userId) => ({
          userId,
          title: followUp.subject,
          body: followUp.message.slice(0, 280),
          ticketKey: ticket.key,
        })),
      });
    }

    if (parsed.data.channel !== "IN_APP") {
      console.log("[email:dry-run]", {
        to: [...recipients],
        subject: followUp.subject,
        message: followUp.message,
      });
    }

    for (const userId of recipients) {
      emitUserEvent(userId, "notification:new", { ticketKey: ticket.key });
    }
    emitTicketEvent(ticket.id, "follow-up:sent", { ticketId: ticket.id });

    return NextResponse.json({ ok: true, id: followUp.id }, { status: 201 });
  } catch {
    return jsonError("Unauthorized", 401);
  }
}

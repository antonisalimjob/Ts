import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { buildSlaView } from "@/lib/sla";
import { canViewInternalNotes } from "@/lib/permissions";
import type { SessionUser } from "@/lib/auth";
import type { Role } from "@prisma/client";

const userSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  avatarUrl: true,
  department: true,
  title: true,
} satisfies Prisma.UserSelect;

export const ticketDetailInclude = {
  category: true,
  requester: { select: userSelect },
  assignee: { select: userSelect },
  slaPolicy: true,
  comments: {
    orderBy: { createdAt: "asc" as const },
    include: {
      author: { select: userSelect },
      attachments: true,
      mentions: { include: { user: { select: userSelect } } },
      receipts: {
        include: { user: { select: { id: true, name: true, avatarUrl: true } } },
      },
    },
  },
  followUps: {
    orderBy: { sentAt: "desc" as const },
    include: {
      triggeredBy: { select: userSelect },
      template: { select: { id: true, name: true } },
    },
  },
  activities: {
    orderBy: { createdAt: "desc" as const },
    take: 40,
    include: { actor: { select: userSelect } },
  },
};

export type TicketRecord = Prisma.TicketGetPayload<{
  include: typeof ticketDetailInclude;
}>;

export function serializeTicket(ticket: TicketRecord, role: Role) {
  const comments = canViewInternalNotes(role)
    ? ticket.comments
    : ticket.comments.filter((comment) => comment.visibility === "PUBLIC");

  return {
    ...ticket,
    firstResponseDueAt: ticket.firstResponseDueAt?.toISOString() ?? null,
    resolutionDueAt: ticket.resolutionDueAt?.toISOString() ?? null,
    firstRespondedAt: ticket.firstRespondedAt?.toISOString() ?? null,
    lastActivityAt: ticket.lastActivityAt.toISOString(),
    lastFollowUpAt: ticket.lastFollowUpAt?.toISOString() ?? null,
    reminderSentAt: ticket.reminderSentAt?.toISOString() ?? null,
    escalatedAt: ticket.escalatedAt?.toISOString() ?? null,
    resolvedAt: ticket.resolvedAt?.toISOString() ?? null,
    closedAt: ticket.closedAt?.toISOString() ?? null,
    createdAt: ticket.createdAt.toISOString(),
    updatedAt: ticket.updatedAt.toISOString(),
    sla: buildSlaView(ticket),
    comments: comments.map((comment) => ({
      ...comment,
      createdAt: comment.createdAt.toISOString(),
      updatedAt: comment.updatedAt.toISOString(),
      receipts: comment.receipts.map((receipt) => ({
        ...receipt,
        readAt: receipt.readAt.toISOString(),
      })),
    })),
    followUps: ticket.followUps.map((followUp) => ({
      ...followUp,
      sentAt: followUp.sentAt.toISOString(),
    })),
    activities: ticket.activities.map((activity) => ({
      ...activity,
      createdAt: activity.createdAt.toISOString(),
      metadata: (activity.metadata as Record<string, unknown> | null) ?? null,
    })),
  };
}

export async function getTicketByKey(key: string, user: SessionUser) {
  const ticket = await prisma.ticket.findUnique({
    where: { key },
    include: ticketDetailInclude,
  });
  if (!ticket) return null;
  if (user.role === "END_USER" && ticket.requesterId !== user.id) return null;
  return serializeTicket(ticket, user.role);
}

export async function logActivity(data: Prisma.TicketActivityUncheckedCreateInput) {
  return prisma.ticketActivity.create({ data });
}

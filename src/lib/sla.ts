import type { Priority, TicketStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { TYPE_PREFIX } from "@/lib/constants";
import type { TicketType } from "@prisma/client";

export async function nextTicketKey(type: TicketType) {
  const prefix = TYPE_PREFIX[type];
  const sequence = await prisma.ticketSequence.upsert({
    where: { prefix },
    create: { prefix, value: 1001 },
    update: { value: { increment: 1 } },
  });
  return `${prefix}-${sequence.value}`;
}

export function slaDueDates(priority: Priority, createdAt = new Date()) {
  const minutes = slaMinutes(priority);
  return {
    firstResponseDueAt: addMinutes(createdAt, minutes.firstResponse),
    resolutionDueAt: addMinutes(createdAt, minutes.resolution),
  };
}

export function slaMinutes(priority: Priority) {
  switch (priority) {
    case "URGENT":
      return { firstResponse: 15, resolution: 4 * 60 };
    case "HIGH":
      return { firstResponse: 60, resolution: 8 * 60 };
    case "MEDIUM":
      return { firstResponse: 4 * 60, resolution: 24 * 60 };
    default:
      return { firstResponse: 8 * 60, resolution: 72 * 60 };
  }
}

export function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

export function remainingMs(dueAt: Date | string | null) {
  if (!dueAt) return null;
  return new Date(dueAt).getTime() - Date.now();
}

export function isOpenStatus(status: TicketStatus) {
  return status !== "RESOLVED" && status !== "CLOSED";
}

export function buildSlaView(ticket: {
  firstResponseDueAt: Date | string | null;
  resolutionDueAt: Date | string | null;
  firstRespondedAt: Date | string | null;
  status: TicketStatus;
  resolvedAt: Date | string | null;
}) {
  const firstRemaining = remainingMs(ticket.firstResponseDueAt);
  const resolutionRemaining = remainingMs(ticket.resolutionDueAt);
  const resolved = Boolean(ticket.resolvedAt) || ticket.status === "CLOSED";

  return {
    firstResponseDueAt: ticket.firstResponseDueAt
      ? new Date(ticket.firstResponseDueAt).toISOString()
      : null,
    resolutionDueAt: ticket.resolutionDueAt
      ? new Date(ticket.resolutionDueAt).toISOString()
      : null,
    firstRespondedAt: ticket.firstRespondedAt
      ? new Date(ticket.firstRespondedAt).toISOString()
      : null,
    isFirstResponseBreached:
      !ticket.firstRespondedAt && firstRemaining !== null && firstRemaining < 0,
    isResolutionBreached:
      !resolved && resolutionRemaining !== null && resolutionRemaining < 0,
    firstResponseRemainingMs: ticket.firstRespondedAt ? 0 : firstRemaining,
    resolutionRemainingMs: resolved ? 0 : resolutionRemaining,
  };
}

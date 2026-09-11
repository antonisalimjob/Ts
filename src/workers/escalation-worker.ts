import cron from "node-cron";
import { FollowUpChannel, FollowUpType, type Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { OPEN_STATUSES } from "@/lib/constants";
import { emitTicketEvent, emitUserEvent } from "@/lib/realtime";

const globalWorker = globalThis as typeof globalThis & { __nexusWorker?: boolean };

export function startEscalationWorker() {
  if (globalWorker.__nexusWorker) return;
  globalWorker.__nexusWorker = true;

  cron.schedule("* * * * *", async () => {
    try {
      await runFollowUpSweep();
    } catch (error) {
      console.error("[sla-worker]", error);
    }
  });

  console.log("SLA follow-up worker started (every minute)");
}

export async function runFollowUpSweep() {
  const tickets = await prisma.ticket.findMany({
    where: { status: { in: OPEN_STATUSES } },
    include: {
      slaPolicy: true,
      requester: true,
      assignee: true,
    },
  });

  const now = Date.now();

  for (const ticket of tickets) {
    const inactiveMs = now - ticket.lastActivityAt.getTime();
    const reminderMs = ticket.slaPolicy.inactivityReminderMinutes * 60 * 1000;
    const escalateMs = ticket.slaPolicy.escalationMinutes * 60 * 1000;

    if (inactiveMs >= reminderMs && !hasFreshReminder(ticket.reminderSentAt, ticket.lastActivityAt)) {
      await sendAutomatedFollowUp(ticket, "SLA_REMINDER");
    }

    if (inactiveMs >= escalateMs && !ticket.escalatedAt) {
      await sendAutomatedFollowUp(ticket, "SLA_ESCALATION");
    }
  }
}

function hasFreshReminder(reminderSentAt: Date | null, lastActivityAt: Date) {
  if (!reminderSentAt) return false;
  return reminderSentAt.getTime() >= lastActivityAt.getTime();
}

type WorkerTicket = Prisma.TicketGetPayload<{
  include: { slaPolicy: true; requester: true; assignee: true };
}>;

async function sendAutomatedFollowUp(
  ticket: WorkerTicket,
  type: "SLA_REMINDER" | "SLA_ESCALATION",
) {
  const templates = await prisma.followUpTemplate.findMany({
    where: { name: type === "SLA_REMINDER" ? "SLA inactivity reminder" : "SLA escalation" },
  });
  const template = templates[0];
  const isEscalation = type === "SLA_ESCALATION";

  const recipients = new Set<string>();
  if (ticket.assigneeId) recipients.add(ticket.assigneeId);
  recipients.add(ticket.requesterId);

  if (isEscalation) {
    const leads = await prisma.user.findMany({
      where: { role: "ADMIN", isActive: true },
      select: { id: true },
    });
    leads.forEach((lead) => recipients.add(lead.id));
  }

  const subject = template?.subject ?? (isEscalation ? `Escalated: ${ticket.key}` : `Reminder: ${ticket.key}`);
  const message =
    template?.body ??
    (isEscalation
      ? `Ticket ${ticket.key} has been inactive beyond the escalation threshold and needs attention.`
      : `Ticket ${ticket.key} has had no activity for a while. Please follow up.`);

  const followUp = await prisma.ticketFollowUp.create({
    data: {
      ticketId: ticket.id,
      type: type as FollowUpType,
      channel: FollowUpChannel.BOTH,
      templateId: template?.id,
      subject: subject.replaceAll("{{ticketKey}}", ticket.key).replaceAll("{{title}}", ticket.title),
      message: message
        .replaceAll("{{ticketKey}}", ticket.key)
        .replaceAll("{{title}}", ticket.title)
        .replaceAll("{{requester}}", ticket.requester.name)
        .replaceAll("{{assignee}}", ticket.assignee?.name ?? "Unassigned"),
      sentToUserIds: [...recipients],
    },
  });

  await prisma.ticket.update({
    where: { id: ticket.id },
    data: isEscalation
      ? { escalatedAt: new Date(), lastFollowUpAt: new Date(), reminderSentAt: new Date() }
      : { reminderSentAt: new Date(), lastFollowUpAt: new Date() },
  });

  await prisma.ticketActivity.create({
    data: {
      ticketId: ticket.id,
      action: isEscalation ? "ESCALATED" : "FOLLOW_UP_SENT",
      toValue: type,
      metadata: { automated: true, followUpId: followUp.id },
    },
  });

  await prisma.notification.createMany({
    data: [...recipients].map((userId) => ({
      userId,
      title: isEscalation ? `Escalated ${ticket.key}` : `Follow-up on ${ticket.key}`,
      body: `${ticket.title} is waiting for a response.`,
      ticketKey: ticket.key,
    })),
  });

  emitTicketEvent(ticket.id, "follow-up:sent", { ticketId: ticket.id, type });
  for (const userId of recipients) {
    emitUserEvent(userId, "notification:new", { ticketKey: ticket.key, type });
  }

  console.log(`[sla-worker] ${type} sent for ${ticket.key}`);
}

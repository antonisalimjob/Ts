import type { Priority, TicketStatus, TicketType } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { PRIORITY_LABEL, STATUS_LABEL, TYPE_LABEL } from "@/lib/constants";

const statusTone = {
  NEW: "slate",
  OPEN: "blue",
  IN_PROGRESS: "teal",
  PENDING: "amber",
  RESOLVED: "green",
  CLOSED: "slate",
} as const;

const priorityTone = {
  LOW: "slate",
  MEDIUM: "blue",
  HIGH: "orange",
  URGENT: "rose",
} as const;

const typeTone = {
  INCIDENT: "rose",
  SERVICE_REQUEST: "teal",
  PROBLEM: "violet",
  CHANGE_REQUEST: "amber",
} as const;

export function StatusBadge({ status }: { status: TicketStatus }) {
  return <Badge tone={statusTone[status]}>{STATUS_LABEL[status]}</Badge>;
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  return <Badge tone={priorityTone[priority]}>{PRIORITY_LABEL[priority]}</Badge>;
}

export function TypeBadge({ type }: { type: TicketType }) {
  return <Badge tone={typeTone[type]}>{TYPE_LABEL[type]}</Badge>;
}

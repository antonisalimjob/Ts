import type { Priority, Role, TicketStatus, TicketType } from "@prisma/client";

export const SESSION_COOKIE = "nexus_session";
export const TWO_FACTOR_COOKIE = "nexus_2fa_pending";

export const TYPE_PREFIX: Record<TicketType, string> = {
  INCIDENT: "INC",
  SERVICE_REQUEST: "SR",
  PROBLEM: "PRB",
  CHANGE_REQUEST: "CHG",
};

export const TYPE_LABEL: Record<TicketType, string> = {
  INCIDENT: "Incident",
  SERVICE_REQUEST: "Service Request",
  PROBLEM: "Problem",
  CHANGE_REQUEST: "Change Request",
};

export const STATUS_LABEL: Record<TicketStatus, string> = {
  NEW: "New",
  OPEN: "Open",
  IN_PROGRESS: "In Progress",
  PENDING: "Pending",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
};

export const PRIORITY_LABEL: Record<Priority, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  URGENT: "Urgent",
};

export const ROLE_LABEL: Record<Role, string> = {
  END_USER: "End User",
  TECHNICIAN: "IT Technician",
  ADMIN: "IT Lead / Admin",
};

export const TEAM_ROLE_LABEL = {
  TEAM_LEAD: "Team lead",
  MEMBER: "Member",
} as const;

export const OPEN_STATUSES: TicketStatus[] = [
  "NEW",
  "OPEN",
  "IN_PROGRESS",
  "PENDING",
];

export const AGENT_ROLES: Role[] = ["TECHNICIAN", "ADMIN"];

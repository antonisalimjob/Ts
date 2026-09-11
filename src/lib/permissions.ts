import type { Role } from "@prisma/client";
import { AGENT_ROLES } from "@/lib/constants";
import type { SessionUser } from "@/lib/auth";
import type { Ticket } from "@/types/ticket";

export function isAgent(role: Role) {
  return AGENT_ROLES.includes(role);
}

export function canViewInternalNotes(role: Role) {
  return isAgent(role);
}

export function canManageUsers(role: Role) {
  return role === "ADMIN";
}

export function canUpdateTicketFields(role: Role) {
  return isAgent(role);
}

export function canAccessTicket(
  user: SessionUser,
  ticket: Pick<Ticket, "requester" | "assignee">,
) {
  if (isAgent(user.role)) return true;
  return ticket.requester.id === user.id;
}

export function canSendFollowUp(role: Role) {
  return role === "END_USER" || isAgent(role);
}

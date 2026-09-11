import type {
  ActivityAction,
  FollowUpChannel,
  FollowUpType,
  IssueCategory,
  Priority,
  Role,
  TicketStatus,
  TicketType,
} from "@prisma/client";
import type { ChatMessage } from "./chat";

export type { IssueCategory, Priority, Role, TicketStatus, TicketType };

export interface TicketUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatarUrl: string | null;
  department: string | null;
  title: string | null;
}

export interface TicketCategory {
  id: string;
  code: IssueCategory;
  name: string;
  slug: string;
  description: string | null;
  examples: string | null;
  sortOrder?: number;
}

export interface SlaPolicy {
  id: string;
  name: string;
  priority: Priority;
  firstResponseMinutes: number;
  resolutionMinutes: number;
  inactivityReminderMinutes: number;
  escalationMinutes: number;
}

export interface TicketSla {
  firstResponseDueAt: string | null;
  resolutionDueAt: string | null;
  firstRespondedAt: string | null;
  isFirstResponseBreached: boolean;
  isResolutionBreached: boolean;
  firstResponseRemainingMs: number | null;
  resolutionRemainingMs: number | null;
}

export interface TicketActivity {
  id: string;
  action: ActivityAction;
  fromValue: string | null;
  toValue: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  actor: TicketUser | null;
}

export interface TicketFollowUp {
  id: string;
  type: FollowUpType;
  channel: FollowUpChannel;
  subject: string;
  message: string;
  sentToUserIds: string[];
  sentAt: string;
  triggeredBy: TicketUser | null;
  template: { id: string; name: string } | null;
}

export interface Ticket {
  id: string;
  key: string;
  title: string;
  description: string;
  type: TicketType;
  status: TicketStatus;
  priority: Priority;
  category: TicketCategory;
  requester: TicketUser;
  assignee: TicketUser | null;
  slaPolicy: SlaPolicy;
  sla: TicketSla;
  firstResponseDueAt: string | null;
  resolutionDueAt: string | null;
  firstRespondedAt: string | null;
  lastActivityAt: string;
  lastFollowUpAt: string | null;
  reminderSentAt: string | null;
  escalatedAt: string | null;
  resolvedAt: string | null;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
  comments?: ChatMessage[];
  followUps?: TicketFollowUp[];
  activities?: TicketActivity[];
  _count?: {
    comments: number;
    followUps: number;
  };
}

export interface TicketListItem {
  id: string;
  key: string;
  title: string;
  type: TicketType;
  status: TicketStatus;
  priority: Priority;
  category: TicketCategory;
  requester: TicketUser;
  assignee: TicketUser | null;
  lastActivityAt: string;
  createdAt: string;
  sla: TicketSla;
}

export interface FollowUpTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  audience: Role;
  channel: FollowUpChannel;
  isDefault: boolean;
}

export interface CreateTicketInput {
  title: string;
  description: string;
  type: TicketType;
  priority: Priority;
  categoryId: string;
  requesterId?: string;
  assigneeId?: string | null;
}

export interface UpdateTicketInput {
  title?: string;
  description?: string;
  status?: TicketStatus;
  priority?: Priority;
  categoryId?: string;
  assigneeId?: string | null;
}

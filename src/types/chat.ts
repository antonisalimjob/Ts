import type { CommentVisibility, Role } from "@prisma/client";

export type { CommentVisibility };

export interface ChatAuthor {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatarUrl: string | null;
  title: string | null;
}

export interface ChatAttachment {
  id: string;
  filename: string;
  url: string;
  mimeType: string;
  sizeBytes: number;
}

export interface ChatMention {
  id: string;
  userId: string;
  user: ChatAuthor;
}

export interface ChatReadReceipt {
  id: string;
  userId: string;
  readAt: string;
  user: Pick<ChatAuthor, "id" | "name" | "avatarUrl">;
}

export interface ChatMessage {
  id: string;
  ticketId: string;
  body: string;
  bodyHtml: string | null;
  visibility: CommentVisibility;
  createdAt: string;
  updatedAt: string;
  author: ChatAuthor;
  attachments: ChatAttachment[];
  mentions: ChatMention[];
  receipts: ChatReadReceipt[];
}

export interface ChatChannelState {
  visibility: CommentVisibility;
  messages: ChatMessage[];
  typingUsers: TypingUser[];
}

export interface TypingUser {
  userId: string;
  name: string;
  visibility: CommentVisibility;
  isTyping: boolean;
}

export interface SendMessageInput {
  body: string;
  visibility: CommentVisibility;
  mentionedUserIds?: string[];
  attachmentIds?: string[];
}

export interface TicketSocketEvents {
  "comment:new": ChatMessage;
  "comment:receipts": { commentId: string; receipts: ChatReadReceipt[] };
  typing: TypingUser;
  "ticket:updated": { key: string };
  "follow-up:sent": { ticketId: string };
}

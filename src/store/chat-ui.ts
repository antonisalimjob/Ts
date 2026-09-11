"use client";

import { create } from "zustand";
import type { CommentVisibility } from "@prisma/client";

interface ChatUiState {
  channelByTicket: Record<string, CommentVisibility>;
  setChannel: (ticketId: string, channel: CommentVisibility) => void;
}

export const useChatUiStore = create<ChatUiState>((set) => ({
  channelByTicket: {},
  setChannel: (ticketId, channel) =>
    set((state) => ({
      channelByTicket: { ...state.channelByTicket, [ticketId]: channel },
    })),
}));

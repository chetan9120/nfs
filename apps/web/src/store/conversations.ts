import { create } from 'zustand';
import type { Conversation, Message, ParticipantStatus } from '../types';

interface StatusChangedPayload {
  conversationId: string;
  userId: string;
  status: ParticipantStatus;
  deliveredAt?: string | null;
  openedAt?: string | null;
  downloadedAt?: string | null;
}

interface MessageAddedPayload {
  conversationId: string;
  messages: Message[];
}

interface ConversationsState {
  byId: Record<string, Conversation>;
  setAll: (conversations: Conversation[]) => void;
  upsert: (conversation: Conversation) => void;
  applyMessageAdded: (payload: MessageAddedPayload) => void;
  applyStatusChanged: (payload: StatusChangedPayload) => void;
}

export const useConversationsStore = create<ConversationsState>()((set) => ({
  byId: {},
  setAll: (conversations) =>
    set({ byId: Object.fromEntries(conversations.map((c) => [c.id, c])) }),
  upsert: (conversation) => set((state) => ({ byId: { ...state.byId, [conversation.id]: conversation } })),
  applyMessageAdded: ({ conversationId, messages }) =>
    set((state) => {
      const existing = state.byId[conversationId];
      if (!existing) return state;
      return { byId: { ...state.byId, [conversationId]: { ...existing, messages } } };
    }),
  applyStatusChanged: ({ conversationId, userId, status, deliveredAt, openedAt, downloadedAt }) =>
    set((state) => {
      const existing = state.byId[conversationId];
      if (!existing) return state;
      const participants = existing.participants.map((p) =>
        p.userId === userId
          ? {
              ...p,
              status,
              deliveredAt: deliveredAt ?? p.deliveredAt,
              openedAt: openedAt ?? p.openedAt,
              downloadedAt: downloadedAt ?? p.downloadedAt,
            }
          : p,
      );
      return { byId: { ...state.byId, [conversationId]: { ...existing, participants } } };
    }),
}));

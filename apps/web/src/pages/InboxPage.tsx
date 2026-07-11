import { useEffect, useState } from 'react';
import { apiJson } from '../lib/api';
import { useAuthStore } from '../store/auth';
import { useConversationsStore } from '../store/conversations';
import type { ParticipantStatus } from '../types';

const STATUS_LABEL: Record<ParticipantStatus, string> = {
  PENDING: 'Pending',
  DELIVERED: 'Delivered',
  OPENED: 'Opened',
  DOWNLOADED: 'Downloaded',
};

const STATUS_CLASS: Record<ParticipantStatus, string> = {
  PENDING: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
  DELIVERED: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  OPENED: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
  DOWNLOADED: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
};

export function InboxPage({ onOpen }: { onOpen: (conversationId: string) => void }) {
  const user = useAuthStore((s) => s.user);
  const conversations = useConversationsStore((s) => s.byId);
  const setAll = useConversationsStore((s) => s.setAll);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiJson<{ conversations: import('../types').Conversation[] }>('/api/conversations/mine')
      .then((data) => setAll(data.conversations))
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load inbox'))
      .finally(() => setLoading(false));
  }, [setAll]);

  if (loading) return <p className="text-slate-500 dark:text-slate-400">Loading inbox…</p>;
  if (error) return <p className="text-red-500">{error}</p>;

  const received = Object.values(conversations)
    .filter((c) => c.participants.some((p) => p.userId === user?.id && p.role === 'RECIPIENT'))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  if (received.length === 0) {
    return <p className="text-slate-500 dark:text-slate-400">No files sent to you yet.</p>;
  }

  return (
    <ul className="flex flex-col gap-2">
      {received.map((conversation) => {
        const me = conversation.participants.find((p) => p.userId === user?.id)!;
        const sender = conversation.participants.find((p) => p.role === 'OWNER')?.user;
        return (
          <li key={conversation.id}>
            <button
              onClick={() => onOpen(conversation.id)}
              className="flex w-full items-center justify-between rounded border border-slate-200 px-4 py-3 text-left hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
            >
              <div>
                <p className="font-medium text-slate-900 dark:text-white">{conversation.file.originalName}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  from {sender?.displayName ?? 'Unknown'}
                </p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-medium ${STATUS_CLASS[me.status]}`}>
                {STATUS_LABEL[me.status]}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

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
  DOWNLOADED: 'bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300',
};

function InboxSkeleton() {
  return (
    <ul className="flex flex-col gap-2" aria-label="Loading inbox" aria-busy="true">
      {[0, 1, 2].map((i) => (
        <li
          key={i}
          className="flex items-center justify-between rounded border border-slate-200 px-4 py-3 dark:border-slate-700"
        >
          <div className="flex flex-col gap-2">
            <div className="h-4 w-40 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
            <div className="h-3 w-24 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
          </div>
          <div className="h-6 w-20 animate-pulse rounded-full bg-slate-100 dark:bg-slate-800" />
        </li>
      ))}
    </ul>
  );
}

function EmptyInbox({ onGoSend }: { onGoSend: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded border border-dashed border-slate-200 px-6 py-16 text-center dark:border-slate-700">
      <svg width="40" height="40" viewBox="0 0 28 28" fill="none" className="text-slate-300 dark:text-slate-600">
        <circle cx="14" cy="14" r="3" fill="currentColor" />
        <circle cx="14" cy="14" r="8" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="14" cy="14" r="13" stroke="currentColor" strokeWidth="1.5" opacity="0.5" />
      </svg>
      <p className="font-medium text-slate-700 dark:text-slate-200">Nothing here yet</p>
      <p className="max-w-xs text-sm text-slate-500 dark:text-slate-400">
        Files people send you will show up here the moment they arrive.
      </p>
      <button
        onClick={onGoSend}
        className="mt-1 rounded bg-teal-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-teal-600"
      >
        Send your first file
      </button>
    </div>
  );
}

export function InboxPage({
  onOpen,
  onGoSend,
}: {
  onOpen: (conversationId: string) => void;
  onGoSend: () => void;
}) {  const user = useAuthStore((s) => s.user);
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

  if (loading) return <InboxSkeleton />;

  if (error) {
    return (
      <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900 dark:bg-red-950 dark:text-red-400">
        Couldn't load your inbox — {error}
      </div>
    );
  }

  const received = Object.values(conversations)
    .filter((c) => c.participants.some((p) => p.userId === user?.id && p.role === 'RECIPIENT'))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  if (received.length === 0) {
  return <EmptyInbox onGoSend={onGoSend} />;
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
              className="flex w-full items-center justify-between rounded border border-slate-200 px-4 py-3 text-left transition hover:border-teal-300 hover:bg-slate-50 dark:border-slate-700 dark:hover:border-teal-700 dark:hover:bg-slate-800"
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
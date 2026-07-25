import { useEffect, useMemo, useState } from 'react';
import { apiJson } from '../lib/api';
import { useAuthStore } from '../store/auth';
import { useConversationsStore } from '../store/conversations';
import type { ParticipantStatus } from '../types';

type FilterKey = 'all' | 'new' | 'downloaded' | 'pending';

const STATUS_META: Record<ParticipantStatus, { label: string; pillClass: string; icon: string }> = {
  PENDING: { label: 'Pending', pillClass: 'bg-amber-100 text-amber-700', icon: '🕒' },
  DELIVERED: { label: 'New', pillClass: 'bg-violet-100 text-violet-700', icon: '✨' },
  OPENED: { label: 'New', pillClass: 'bg-violet-100 text-violet-700', icon: '✨' },
  DOWNLOADED: { label: 'Downloaded', pillClass: 'bg-emerald-100 text-emerald-700', icon: '✓' },
};

function filterKeyForStatus(status: ParticipantStatus): FilterKey {
  if (status === 'DOWNLOADED') return 'downloaded';
  if (status === 'PENDING') return 'pending';
  return 'new';
}

const TYPE_META: { match: RegExp; label: string; gradient: string }[] = [
  { match: /\.pdf$/i, label: 'PDF', gradient: 'from-rose-500 to-red-500' },
  { match: /\.(png|jpe?g|gif|webp)$/i, label: 'IMG', gradient: 'from-sky-500 to-blue-500' },
  { match: /\.(xlsx?|csv)$/i, label: 'XLS', gradient: 'from-emerald-500 to-teal-500' },
  { match: /\.(mp4|mov|avi)$/i, label: 'MP4', gradient: 'from-purple-500 to-violet-600' },
  { match: /\.(docx?|txt)$/i, label: 'DOC', gradient: 'from-blue-500 to-indigo-500' },
  { match: /\.(zip|rar|7z)$/i, label: 'ZIP', gradient: 'from-amber-500 to-orange-500' },
  { match: /\.svg$/i, label: 'SVG', gradient: 'from-pink-500 to-fuchsia-500' },
  { match: /\.(mp3|wav)$/i, label: 'MP3', gradient: 'from-orange-500 to-red-500' },
];

function typeMeta(fileName: string) {
  const found = TYPE_META.find((t) => t.match.test(fileName));
  if (found) return found;
  const ext = fileName.split('.').pop()?.slice(0, 3).toUpperCase() ?? 'FILE';
  return { label: ext, gradient: 'from-slate-400 to-slate-500' };
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function InboxSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2" aria-busy="true">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-4 rounded-2xl bg-white/70 p-4 shadow-sm ring-1 ring-slate-900/5">
          <div className="h-11 w-11 animate-pulse rounded-xl bg-slate-200" />
          <div className="flex flex-1 flex-col gap-2">
            <div className="h-4 w-32 animate-pulse rounded bg-slate-200" />
            <div className="h-3 w-20 animate-pulse rounded bg-slate-100" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyInbox({ onGoSend }: { onGoSend: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl bg-white/70 px-6 py-16 text-center shadow-sm ring-1 ring-slate-900/5">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-pink-500 text-xl text-white">
        📭
      </div>
      <p className="font-semibold text-slate-800">Nothing here yet</p>
      <p className="max-w-xs text-sm text-slate-500">Files people send you will show up here the moment they arrive.</p>
      <button
        onClick={onGoSend}
        className="mt-1 rounded-full bg-gradient-to-r from-violet-600 to-pink-500 px-5 py-2 text-sm font-medium text-white shadow transition hover:opacity-90"
      >
        Send your first file
      </button>
    </div>
  );
}

export function InboxPage({ onOpen, onGoSend }: { onOpen: (conversationId: string) => void; onGoSend: () => void }) {
  const user = useAuthStore((s) => s.user);
  const conversations = useConversationsStore((s) => s.byId);
  const setAll = useConversationsStore((s) => s.setAll);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<FilterKey>('all');

  useEffect(() => {
    apiJson<{ conversations: import('../types').Conversation[] }>('/api/conversations/mine')
      .then((data) => setAll(data.conversations))
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load inbox'))
      .finally(() => setLoading(false));
  }, [setAll]);

  const received = useMemo(
    () =>
      Object.values(conversations)
        .filter((c) => c.participants.some((p) => p.userId === user?.id && p.role === 'RECIPIENT'))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [conversations, user?.id],
  );

  const counts = useMemo(() => {
    const c = { all: received.length, new: 0, downloaded: 0, pending: 0 };
    for (const conv of received) {
      const me = conv.participants.find((p) => p.userId === user?.id);
      if (!me) continue;
      c[filterKeyForStatus(me.status)]++;
    }
    return c;
  }, [received, user?.id]);

  const visible = received.filter((conv) => {
    const me = conv.participants.find((p) => p.userId === user?.id);
    if (!me) return false;
    if (filter !== 'all' && filterKeyForStatus(me.status) !== filter) return false;
    if (query.trim()) {
      const sender = conv.participants.find((p) => p.role === 'OWNER')?.user;
      const haystack = `${conv.file.originalName} ${sender?.displayName ?? ''}`.toLowerCase();
      if (!haystack.includes(query.trim().toLowerCase())) return false;
    }
    return true;
  });

  if (loading) return <InboxSkeleton />;

  if (error) {
    return <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600 ring-1 ring-red-100">Couldn't load your inbox — {error}</div>;
  }

  if (received.length === 0) {
    return <EmptyInbox onGoSend={onGoSend} />;
  }

  const filters: { key: FilterKey; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'new', label: 'New' },
    { key: 'downloaded', label: 'Downloaded' },
    { key: 'pending', label: 'Pending' },
  ];

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-3xl font-bold tracking-tight text-slate-900">
          Your <span className="bg-gradient-to-r from-violet-600 to-pink-500 bg-clip-text text-transparent">inbox</span>
        </h2>
        <p className="mt-1 text-sm text-slate-500">Files shared with you land here. Preview, download, and clean up.</p>
      </div>

      <div className="mb-6 flex flex-col gap-3 rounded-2xl bg-white/70 p-3 shadow-sm ring-1 ring-slate-900/5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 rounded-full bg-slate-50 px-4 py-2 sm:w-72">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-slate-400">
            <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.4" />
            <path d="m11 11 3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or sender..."
            className="w-full bg-transparent text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
                filter === f.key ? 'bg-gradient-to-r from-violet-600 to-pink-500 text-white shadow' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {f.label}
              <span className={filter === f.key ? 'text-white/80' : 'text-slate-400'}>{counts[f.key]}</span>
            </button>
          ))}
        </div>
      </div>

      {visible.length === 0 ? (
        <p className="py-12 text-center text-sm text-slate-500">No files match your search.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {visible.map((conversation) => {
            const me = conversation.participants.find((p) => p.userId === user?.id)!;
            const sender = conversation.participants.find((p) => p.role === 'OWNER')?.user;
            const type = typeMeta(conversation.file.originalName);
            const status = STATUS_META[me.status];
            return (
              <button
                key={conversation.id}
                onClick={() => onOpen(conversation.id)}
                className="flex items-center gap-4 rounded-2xl bg-white/70 p-4 text-left shadow-sm ring-1 ring-slate-900/5 transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-[10px] font-bold text-white ${type.gradient}`}>
                  {type.label}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-slate-900">{conversation.file.originalName}</p>
                  <p className="text-xs text-slate-500">
                    from {sender?.displayName ?? 'Unknown'} · {formatSize(conversation.file.size)}
                  </p>
                </div>
                <span className={`flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${status.pillClass}`}>
                  {status.icon} {status.label}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
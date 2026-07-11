import { useEffect, useState } from 'react';
import { apiFetch, apiJson } from '../lib/api';
import { useAuthStore } from '../store/auth';
import { useConversationsStore } from '../store/conversations';
import type { Conversation } from '../types';

export function ConversationPage({ conversationId, onBack }: { conversationId: string; onBack: () => void }) {
  const user = useAuthStore((s) => s.user);
  const conversation = useConversationsStore((s) => s.byId[conversationId]);
  const upsert = useConversationsStore((s) => s.upsert);
  const [reply, setReply] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    apiJson<{ conversation: Conversation }>(`/api/conversations/${conversationId}`)
      .then((data) => upsert(data.conversation))
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load conversation'));
  }, [conversationId, upsert]);

  async function handleReply(e: React.FormEvent) {
    e.preventDefault();
    if (!reply.trim()) return;
    setSending(true);
    setError(null);
    try {
      const res = await apiFetch(`/api/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: reply }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: 'Failed to send message' }));
        throw new Error(body.error ?? 'Failed to send message');
      }
      setReply('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
    } finally {
      setSending(false);
    }
  }

  async function handleDownload() {
    if (!conversation) return;
    setDownloading(true);
    try {
      const res = await apiFetch(`/api/files/${conversation.file.id}/download`);
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = conversation.file.originalName;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Download failed');
    } finally {
      setDownloading(false);
    }
  }

  if (!conversation) return <p className="text-slate-500 dark:text-slate-400">Loading conversation…</p>;

  return (
    <div className="flex max-w-lg flex-col gap-4">
      <button onClick={onBack} className="w-fit text-sm text-slate-500 underline dark:text-slate-400">
        ← Back to Inbox
      </button>

      <div className="rounded border border-slate-200 p-4 dark:border-slate-700">
        <p className="font-medium text-slate-900 dark:text-white">{conversation.file.originalName}</p>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {(conversation.file.size / 1024).toFixed(1)} KB · {conversation.file.mimeType}
        </p>
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="mt-2 rounded bg-slate-900 px-3 py-1.5 text-sm text-white hover:bg-slate-700 disabled:opacity-50 dark:bg-white dark:text-slate-900"
        >
          {downloading ? 'Downloading…' : 'Download'}
        </button>
      </div>

      <div className="flex flex-col gap-1 text-xs text-slate-500 dark:text-slate-400">
        {conversation.participants.map((p) => (
          <span key={p.id}>
            {p.user.displayName} ({p.role.toLowerCase()}) — {p.status.toLowerCase()}
          </span>
        ))}
      </div>

      <div className="flex flex-col gap-2 rounded border border-slate-200 p-4 dark:border-slate-700">
        {conversation.messages.map((m) => (
          <div
            key={m.id}
            className={m.type === 'SYSTEM' ? 'text-xs italic text-slate-400' : 'text-sm text-slate-900 dark:text-white'}
          >
            {m.type === 'TEXT' && (
              <span className="font-medium">{m.senderId === user?.id ? 'You' : 'Them'}: </span>
            )}
            {m.body}
          </div>
        ))}
      </div>

      <form onSubmit={handleReply} className="flex gap-2">
        <input
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          placeholder="Write a reply…"
          className="flex-1 rounded border border-slate-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
        />
        <button
          type="submit"
          disabled={sending}
          className="rounded bg-slate-900 px-3 py-2 text-white hover:bg-slate-700 disabled:opacity-50 dark:bg-white dark:text-slate-900"
        >
          Send
        </button>
      </form>

      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}

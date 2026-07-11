import { useRef, useState } from 'react';
import { apiFetch } from '../lib/api';
import { useConversationsStore } from '../store/conversations';
import type { Conversation } from '../types';

export function SendFilePage({ onSent }: { onSent: (conversationId: string) => void }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const upsert = useConversationsStore((s) => s.upsert);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setError('Choose a file to send');
      return;
    }

    setSending(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('recipientEmail', recipientEmail);
      if (message.trim()) formData.append('message', message);

      const res = await apiFetch('/api/files/send', { method: 'POST', body: formData });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: 'Send failed' }));
        throw new Error(body.error ?? 'Send failed');
      }
      const data: { conversation: Conversation } = await res.json();
      upsert(data.conversation);
      onSent(data.conversation.id);
      setRecipientEmail('');
      setMessage('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Send failed');
    } finally {
      setSending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-md flex-col gap-4">
      <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Send a file to someone</h2>

      <input
        ref={fileInputRef}
        type="file"
        className="text-sm text-slate-700 dark:text-slate-300"
        required
      />
      <input
        type="email"
        placeholder="Recipient's email"
        value={recipientEmail}
        onChange={(e) => setRecipientEmail(e.target.value)}
        className="rounded border border-slate-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
        required
      />
      <textarea
        placeholder="Add a message (optional)"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        className="rounded border border-slate-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
        rows={3}
      />

      {error && <p className="text-sm text-red-500">{error}</p>}

      <button
        type="submit"
        disabled={sending}
        className="rounded bg-slate-900 px-3 py-2 text-white hover:bg-slate-700 disabled:opacity-50 dark:bg-white dark:text-slate-900"
      >
        {sending ? 'Sending…' : 'Send'}
      </button>
    </form>
  );
}

import { useRef, useState } from 'react';
import { apiFetch } from '../lib/api';
import { useConversationsStore } from '../store/conversations';
import type { Conversation } from '../types';

export function SendFilePage({ onSent }: { onSent: (conversationId: string) => void }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
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
      setFileName(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Send failed');
    } finally {
      setSending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-md flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Send a file to someone</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          They'll get it instantly, wherever they are.
        </p>
      </div>

      <label
        htmlFor="file-input"
        className="flex cursor-pointer flex-col items-center gap-2 rounded border border-dashed border-slate-300 px-4 py-8 text-center transition hover:border-teal-400 hover:bg-teal-50/50 dark:border-slate-600 dark:hover:border-teal-600 dark:hover:bg-teal-950/30"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-slate-400">
          <path
            d="M12 4v11m0-11 4 4m-4-4-4 4M5 17.5V19a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-1.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
          {fileName ?? 'Choose a file'}
        </span>
        {!fileName && <span className="text-xs text-slate-400">or drag it here</span>}
      </label>
      <input
        id="file-input"
        ref={fileInputRef}
        type="file"
        className="sr-only"
        required
        onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
      />

      <input
        type="email"
        placeholder="Recipient's email"
        value={recipientEmail}
        onChange={(e) => setRecipientEmail(e.target.value)}
        className="rounded border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
        required
      />
      <textarea
        placeholder="Add a message (optional)"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        className="rounded border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
        rows={3}
      />

      {error && (
        <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600 dark:border-red-900 dark:bg-red-950 dark:text-red-400">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={sending}
        className="flex items-center justify-center gap-2 rounded bg-teal-500 px-3 py-2 text-sm font-medium text-white transition hover:bg-teal-600 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {sending && (
          <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
        )}
        {sending ? 'Sending…' : 'Send'}
      </button>
    </form>
  );
}
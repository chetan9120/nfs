import { useRef, useState } from 'react';
import { apiFetch } from '../lib/api';
import { useConversationsStore } from '../store/conversations';
import type { Conversation } from '../types';

const MAX_MESSAGE_LENGTH = 280;

export function SendFilePage({ onSent }: { onSent: (conversationId: string) => void }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const upsert = useConversationsStore((s) => s.upsert);

  function setFileFromList(files: FileList | null) {
    const file = files?.[0];
    if (!file || !fileInputRef.current) return;
    const dt = new DataTransfer();
    dt.items.add(file);
    fileInputRef.current.files = dt.files;
    setFileName(file.name);
  }

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
    <div className="mx-auto max-w-xl">
      <div className="mb-6">
        <h2 className="text-3xl font-bold tracking-tight text-slate-900">
          Send a <span className="bg-gradient-to-r from-violet-600 to-pink-500 bg-clip-text text-transparent">file</span>
        </h2>
        <p className="mt-1 text-sm text-slate-500">Drop a file, add a recipient, hit send. That's it.</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label
          htmlFor="file-input"
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragActive(false);
            setFileFromList(e.dataTransfer.files);
          }}
          className={`flex cursor-pointer flex-col items-center gap-3 rounded-2xl border-2 border-dashed bg-white/70 px-6 py-12 text-center shadow-sm transition ${
            dragActive ? 'border-pink-400 bg-pink-50/60' : 'border-violet-200 hover:border-violet-300'
          }`}
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-pink-500 text-white shadow">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M10 13V4m0 0 3.5 3.5M10 4 6.5 7.5M4 14.5V16a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <p className="text-sm font-medium text-slate-700">
            {fileName ?? (
              <>
                Drag files here or <span className="text-violet-600">click to browse</span>
              </>
            )}
          </p>
          <p className="text-xs text-slate-400">Any file type · Up to 100 MB</p>
        </label>
        <input id="file-input" ref={fileInputRef} type="file" className="sr-only" required onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)} />

        <input
          type="email"
          placeholder="Recipient email"
          value={recipientEmail}
          onChange={(e) => setRecipientEmail(e.target.value)}
          className="rounded-2xl bg-white/70 px-4 py-3 text-sm shadow-sm ring-1 ring-slate-900/5 outline-none transition focus:ring-2 focus:ring-violet-300"
          required
        />

        <div className="rounded-2xl bg-white/70 px-4 py-3 shadow-sm ring-1 ring-slate-900/5 focus-within:ring-2 focus-within:ring-violet-300">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Message (optional)</p>
          <textarea
            placeholder="Add a note for the recipient..."
            value={message}
            maxLength={MAX_MESSAGE_LENGTH}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            className="w-full resize-none bg-transparent text-sm text-slate-700 placeholder:text-slate-400 outline-none"
          />
          <p className="text-right text-xs text-slate-300">
            {message.length}/{MAX_MESSAGE_LENGTH}
          </p>
        </div>

        {error && <p className="rounded-2xl bg-red-50 px-4 py-2 text-sm text-red-600 ring-1 ring-red-100">{error}</p>}

        <button
          type="submit"
          disabled={sending}
          className="ml-auto flex items-center gap-2 rounded-full bg-gradient-to-r from-violet-600 to-pink-500 px-6 py-2.5 text-sm font-medium text-white shadow transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {sending ? (
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M14 2 7 9M14 2 9.5 14l-2.3-5.2L2 6.5 14 2Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
            </svg>
          )}
          {sending ? 'Sending…' : 'Send file'}
        </button>
      </form>
    </div>
  );
}
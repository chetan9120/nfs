import { useState } from 'react';
import { useAuthStore } from './store/auth';
import { useRealtimeSync } from './lib/useRealtimeSync';
import { AuthPage } from './pages/AuthPage';
import { InboxPage } from './pages/InboxPage';
import { SendFilePage } from './pages/SendFilePage';
import { ConversationPage } from './pages/ConversationPage';

type View = { name: 'inbox' } | { name: 'send' } | { name: 'conversation'; conversationId: string };

function App() {
  const user = useAuthStore((s) => s.user);
  const clear = useAuthStore((s) => s.clear);
  const [view, setView] = useState<View>({ name: 'inbox' });

  useRealtimeSync();

  if (!user) return <AuthPage />;

  return (
    <main className="min-h-svh bg-white text-slate-900 dark:bg-slate-900 dark:text-white">
      <header className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-700">
        <h1 className="text-lg font-semibold">NFS — Narvee File Share OS</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-500 dark:text-slate-400">{user.displayName}</span>
          <button onClick={clear} className="text-sm text-slate-500 underline dark:text-slate-400">
            Log out
          </button>
        </div>
      </header>

      <nav className="flex gap-2 border-b border-slate-200 px-6 py-2 dark:border-slate-700">
        <button
          onClick={() => setView({ name: 'inbox' })}
          className={`rounded px-3 py-1.5 text-sm ${view.name === 'inbox' ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'text-slate-600 dark:text-slate-300'}`}
        >
          Inbox
        </button>
        <button
          onClick={() => setView({ name: 'send' })}
          className={`rounded px-3 py-1.5 text-sm ${view.name === 'send' ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'text-slate-600 dark:text-slate-300'}`}
        >
          Send a file
        </button>
      </nav>

      <section className="p-6">
        {view.name === 'inbox' && (
          <InboxPage onOpen={(conversationId) => setView({ name: 'conversation', conversationId })} />
        )}
        {view.name === 'send' && (
          <SendFilePage onSent={(conversationId) => setView({ name: 'conversation', conversationId })} />
        )}
        {view.name === 'conversation' && (
          <ConversationPage
            conversationId={view.conversationId}
            onBack={() => setView({ name: 'inbox' })}
          />
        )}
      </section>
    </main>
  );
}

export default App;

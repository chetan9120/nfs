import { useState } from 'react';
import { useAuthStore } from './store/auth';
import { useRealtimeSync } from './lib/useRealtimeSync';
import { AuthPage } from './pages/AuthPage';
import { InboxPage } from './pages/InboxPage';
import { SendFilePage } from './pages/SendFilePage';
import { ConversationPage } from './pages/ConversationPage';
import { Logo } from './components/Logo';

type View = { name: 'inbox' } | { name: 'send' } | { name: 'conversation'; conversationId: string };

function App() {
  const user = useAuthStore((s) => s.user);
  const clear = useAuthStore((s) => s.clear);
  const [view, setView] = useState<View>({ name: 'inbox' });
  const [menuOpen, setMenuOpen] = useState(false);

  useRealtimeSync();

  if (!user) return <AuthPage />;

  const initial = user.displayName?.[0]?.toUpperCase() ?? '?';

  return (
    <main className="min-h-svh bg-gradient-to-br from-violet-50 via-white to-amber-50 text-slate-900">
      <div className="mx-auto max-w-5xl px-6 py-6">
        <header className="flex items-center justify-between rounded-2xl bg-white/70 px-5 py-3 shadow-sm ring-1 ring-slate-900/5 backdrop-blur">
          <Logo />
          <p className="hidden items-center gap-1.5 text-sm text-slate-500 sm:flex">
            <span aria-hidden>✨</span> Nearby File Share
          </p>
          <div className="relative">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="flex items-center gap-2 rounded-full py-1 pl-1 pr-3 transition hover:bg-slate-100"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-pink-500 text-sm font-semibold text-white">
                {initial}
              </span>
              <span className="text-sm font-medium text-slate-700">{user.displayName}</span>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-slate-400">
                <path d="M3.5 5.25 7 8.75l3.5-3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            {menuOpen && (
              <div className="absolute right-0 z-10 mt-2 w-36 rounded-xl bg-white py-1 shadow-lg ring-1 ring-slate-900/5">
                <button onClick={clear} className="block w-full px-4 py-2 text-left text-sm text-slate-600 hover:bg-slate-50">
                  Log out
                </button>
              </div>
            )}
          </div>
        </header>

        <nav className="mx-auto mt-6 flex w-fit gap-1 rounded-full bg-white/70 p-1 shadow-sm ring-1 ring-slate-900/5 backdrop-blur">
          <button
            onClick={() => setView({ name: 'inbox' })}
            className={`flex items-center gap-2 rounded-full px-5 py-2 text-sm font-medium transition ${
              view.name === 'inbox' ? 'bg-gradient-to-r from-violet-600 to-pink-500 text-white shadow' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M2 5.5 8 9l6-3.5M2.5 4h11a.5.5 0 0 1 .5.5v7a1 1 0 0 1-1 1h-10a1 1 0 0 1-1-1v-7a.5.5 0 0 1 .5-.5Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
            </svg>
            Inbox
          </button>
          <button
            onClick={() => setView({ name: 'send' })}
            className={`flex items-center gap-2 rounded-full px-5 py-2 text-sm font-medium transition ${
              view.name === 'send' ? 'bg-gradient-to-r from-violet-600 to-pink-500 text-white shadow' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M14 2 7 9M14 2 9.5 14l-2.3-5.2L2 6.5 14 2Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
            </svg>
            Send a file
          </button>
        </nav>

        <section className="mt-8">
          {view.name === 'inbox' && (
            <InboxPage onOpen={(conversationId) => setView({ name: 'conversation', conversationId })} onGoSend={() => setView({ name: 'send' })} />
          )}
          {view.name === 'send' && <SendFilePage onSent={(conversationId) => setView({ name: 'conversation', conversationId })} />}
          {view.name === 'conversation' && (
            <ConversationPage conversationId={view.conversationId} onBack={() => setView({ name: 'inbox' })} />
          )}
        </section>
      </div>
    </main>
  );
}

export default App;
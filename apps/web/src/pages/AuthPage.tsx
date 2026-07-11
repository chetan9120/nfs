import { useState } from 'react';
import { apiJson } from '../lib/api';
import { useAuthStore } from '../store/auth';

interface AuthResponse {
  user: { id: string; email: string; displayName: string };
  device: { id: string; name: string };
  accessToken: string;
  refreshToken: string;
}

export function AuthPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const setSession = useAuthStore((s) => s.setSession);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const path = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const body =
        mode === 'login'
          ? { email, password, deviceName: 'Web browser' }
          : { email, password, displayName, deviceName: 'Web browser' };
      const data = await apiJson<AuthResponse>(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      setSession({
        user: data.user,
        deviceId: data.device.id,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-svh items-center justify-center bg-white dark:bg-slate-900">
      <form
        onSubmit={handleSubmit}
        className="flex w-full max-w-sm flex-col gap-4 rounded-lg border border-slate-200 p-6 dark:border-slate-700"
      >
        <h1 className="text-xl font-semibold text-slate-900 dark:text-white">
          {mode === 'login' ? 'Log in to NFS' : 'Create your NFS account'}
        </h1>

        {mode === 'register' && (
          <input
            className="rounded border border-slate-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
            placeholder="Display name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
          />
        )}
        <input
          className="rounded border border-slate-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          className="rounded border border-slate-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
        />

        {error && <p className="text-sm text-red-500">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="rounded bg-slate-900 px-3 py-2 text-white hover:bg-slate-700 disabled:opacity-50 dark:bg-white dark:text-slate-900"
        >
          {loading ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Register'}
        </button>

        <button
          type="button"
          onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
          className="text-sm text-slate-500 underline dark:text-slate-400"
        >
          {mode === 'login' ? "Don't have an account? Register" : 'Already have an account? Log in'}
        </button>
      </form>
    </main>
  );
}

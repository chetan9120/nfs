import { useEffect, useState } from 'react';
import type { HealthCheckResponse } from '@nfs/shared';

function App() {
  const [health, setHealth] = useState<HealthCheckResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/health')
      .then((res) => res.json())
      .then(setHealth)
      .catch(() => setError('Could not reach the API'));
  }, []);

  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-4 bg-white text-slate-900 dark:bg-slate-900 dark:text-white">
      <h1 className="text-3xl font-semibold">NFS — Narvee File Share OS</h1>
      <p className="text-slate-500 dark:text-slate-400">apps/web hello world</p>
      <div className="rounded-lg border border-slate-200 px-4 py-3 text-sm dark:border-slate-700">
        {error && <span className="text-red-500">{error}</span>}
        {!error && !health && <span>Checking API…</span>}
        {health && (
          <span>
            API says: <strong>{health.status}</strong> ({health.service} @ {health.timestamp})
          </span>
        )}
      </div>
    </main>
  );
}

export default App;

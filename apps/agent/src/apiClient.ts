import { config } from './config.js';
import { getLocalState, saveLocalState } from './db.js';

export class NetworkOfflineError extends Error {
  constructor(cause?: unknown) {
    super('Network unreachable');
    this.cause = cause;
  }
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function refreshAccessToken(): Promise<string | null> {
  const state = getLocalState();
  if (!state.refreshToken) return null;

  const res = await fetch(`${config.apiBaseUrl}/api/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: state.refreshToken }),
  });
  if (!res.ok) return null;

  const data = (await res.json()) as { accessToken: string; refreshToken: string };
  saveLocalState({ accessToken: data.accessToken, refreshToken: data.refreshToken });
  return data.accessToken;
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  auth?: boolean;
  headers?: Record<string, string>;
  responseType?: 'json' | 'arrayBuffer';
}

async function rawFetch(path: string, options: RequestOptions): Promise<Response> {
  if (config.forceOffline) {
    throw new NetworkOfflineError('AGENT_FORCE_OFFLINE=1 (simulated dead endpoint)');
  }

  const headers: Record<string, string> = { ...options.headers };
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';
  if (options.auth) {
    const { accessToken } = getLocalState();
    if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  }

  try {
    return await fetch(`${config.apiBaseUrl}${path}`, {
      method: options.method ?? 'GET',
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
  } catch (err) {
    // fetch() throws TypeError for DNS/connection failures — treat as "offline",
    // same as the simulated case, so callers handle both identically.
    throw new NetworkOfflineError(err);
  }
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  let res = await rawFetch(path, options);

  if (res.status === 401 && options.auth) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      res = await rawFetch(path, options);
    }
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new ApiError((body as { error?: string }).error ?? 'Request failed', res.status);
  }
  if (options.responseType === 'arrayBuffer') {
    return res.arrayBuffer() as Promise<T>;
  }
  return res.json() as Promise<T>;
}

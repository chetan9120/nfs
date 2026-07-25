import fs from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { config } from './config.js';

fs.mkdirSync(config.agentHome, { recursive: true });
fs.mkdirSync(config.filesDir, { recursive: true });

export const db = new DatabaseSync(config.dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS local_state (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    user_id TEXT,
    device_id TEXT,
    access_token TEXT,
    refresh_token TEXT,
    refresh_expires_at TEXT,
    last_synced_at TEXT
  );

  CREATE TABLE IF NOT EXISTS files_cache (
    id TEXT PRIMARY KEY,
    hash TEXT NOT NULL,
    size INTEGER NOT NULL,
    mime_type TEXT NOT NULL,
    original_name TEXT NOT NULL,
    local_path TEXT,
    sync_status TEXT NOT NULL DEFAULT 'metadata_only'
  );

  CREATE TABLE IF NOT EXISTS conversations_cache (
    id TEXT PRIMARY KEY,
    file_id TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS messages_cache (
    local_id INTEGER PRIMARY KEY AUTOINCREMENT,
    server_id TEXT UNIQUE,
    client_id TEXT UNIQUE,
    conversation_id TEXT NOT NULL,
    sender_id TEXT NOT NULL,
    body TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'TEXT',
    created_at TEXT NOT NULL,
    sync_state TEXT NOT NULL DEFAULT 'synced'
  );

  CREATE TABLE IF NOT EXISTS outbox (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    payload TEXT NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TEXT NOT NULL
  );
`);

export interface LocalState {
  userId: string | null;
  deviceId: string | null;
  accessToken: string | null;
  refreshToken: string | null;
  refreshExpiresAt: string | null;
  lastSyncedAt: string | null;
}

export function getLocalState(): LocalState {
  const row = db.prepare('SELECT * FROM local_state WHERE id = 1').get() as Record<string, unknown> | undefined;
  if (!row) {
    return {
      userId: null,
      deviceId: null,
      accessToken: null,
      refreshToken: null,
      refreshExpiresAt: null,
      lastSyncedAt: null,
    };
  }
  return {
    userId: (row.user_id as string) ?? null,
    deviceId: (row.device_id as string) ?? null,
    accessToken: (row.access_token as string) ?? null,
    refreshToken: (row.refresh_token as string) ?? null,
    refreshExpiresAt: (row.refresh_expires_at as string) ?? null,
    lastSyncedAt: (row.last_synced_at as string) ?? null,
  };
}

export function saveLocalState(patch: Partial<LocalState>): void {
  const current = getLocalState();
  const next = { ...current, ...patch };
  db.prepare(
    `INSERT INTO local_state (id, user_id, device_id, access_token, refresh_token, refresh_expires_at, last_synced_at)
     VALUES (1, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (id) DO UPDATE SET
       user_id = excluded.user_id,
       device_id = excluded.device_id,
       access_token = excluded.access_token,
       refresh_token = excluded.refresh_token,
       refresh_expires_at = excluded.refresh_expires_at,
       last_synced_at = excluded.last_synced_at`,
  ).run(next.userId, next.deviceId, next.accessToken, next.refreshToken, next.refreshExpiresAt, next.lastSyncedAt);
}

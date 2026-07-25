import { apiRequest, NetworkOfflineError } from './apiClient.js';
import { db, getLocalState, saveLocalState } from './db.js';
import { ensureFileDownloaded, upsertFileMetadata } from './fileCache.js';
import type { ApiConversation, ApiMessage } from './types.js';

function upsertConversation(conversation: ApiConversation): void {
  db.prepare(
    `INSERT INTO conversations_cache (id, file_id, created_at) VALUES (?, ?, ?)
     ON CONFLICT (id) DO UPDATE SET file_id = excluded.file_id`,
  ).run(conversation.id, conversation.fileId, conversation.createdAt);
}

function upsertMessage(message: ApiMessage): void {
  const byServerId = db.prepare('SELECT local_id FROM messages_cache WHERE server_id = ?').get(message.id);
  if (byServerId) return; // already have this message

  if (message.clientId) {
    const byClientId = db.prepare('SELECT local_id FROM messages_cache WHERE client_id = ?').get(message.clientId) as
      | { local_id: number }
      | undefined;
    if (byClientId) {
      // This is our own queued send, now confirmed by the server (e.g. discovered via
      // a pull rather than via the flush response that originally posted it).
      db.prepare(
        `UPDATE messages_cache SET server_id = ?, sender_id = ?, created_at = ?, sync_state = 'synced' WHERE local_id = ?`,
      ).run(message.id, message.senderId, message.createdAt, byClientId.local_id);
      return;
    }
  }

  db.prepare(
    `INSERT INTO messages_cache (server_id, client_id, conversation_id, sender_id, body, type, created_at, sync_state)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'synced')`,
  ).run(message.id, message.clientId ?? null, message.conversationId, message.senderId, message.body, message.type, message.createdAt);
}

export interface ReconcileResult {
  offline: boolean;
  conversationsTouched: number;
  messagesReceived: number;
  filesDownloaded: number;
}

export async function reconcile(): Promise<ReconcileResult> {
  const state = getLocalState();
  const since = state.lastSyncedAt ?? new Date(0).toISOString();

  let res: { conversations: ApiConversation[]; serverTime: string };
  try {
    res = await apiRequest(`/api/sync/updates?since=${encodeURIComponent(since)}`, { auth: true });
  } catch (err) {
    if (err instanceof NetworkOfflineError) {
      return { offline: true, conversationsTouched: 0, messagesReceived: 0, filesDownloaded: 0 };
    }
    throw err;
  }

  let messagesReceived = 0;
  let filesDownloaded = 0;

  for (const conversation of res.conversations) {
    upsertConversation(conversation);
    upsertFileMetadata(conversation.file);

    const { downloaded } = await ensureFileDownloaded(conversation.file.id);
    if (downloaded) filesDownloaded += 1;

    for (const message of conversation.messages) {
      upsertMessage(message);
      messagesReceived += 1;
    }
  }

  saveLocalState({ lastSyncedAt: res.serverTime });

  return {
    offline: false,
    conversationsTouched: res.conversations.length,
    messagesReceived,
    filesDownloaded,
  };
}

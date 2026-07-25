import crypto from 'node:crypto';
import { apiRequest, NetworkOfflineError } from './apiClient.js';
import { db } from './db.js';
import type { ApiConversation } from './types.js';

interface PostMessagePayload {
  conversationId: string;
  body: string;
  clientId: string;
}

export function enqueuePostMessage(conversationId: string, body: string, clientId?: string): string {
  const id = clientId ?? crypto.randomUUID();
  const now = new Date().toISOString();

  db.prepare(
    `INSERT INTO messages_cache (server_id, client_id, conversation_id, sender_id, body, type, created_at, sync_state)
     VALUES (NULL, ?, ?, '(pending-self)', ?, 'TEXT', ?, 'pending')`,
  ).run(id, conversationId, body, now);

  db.prepare(`INSERT INTO outbox (type, payload, created_at) VALUES ('post_message', ?, ?)`).run(
    JSON.stringify({ conversationId, body, clientId: id } satisfies PostMessagePayload),
    now,
  );

  return id;
}

export interface FlushResult {
  attempted: number;
  synced: number;
  offline: boolean;
  failed: number;
}

export async function flushOutbox(): Promise<FlushResult> {
  const pending = db.prepare("SELECT * FROM outbox WHERE status = 'pending' ORDER BY id ASC").all() as Array<{
    id: number;
    type: string;
    payload: string;
    attempts: number;
  }>;

  const result: FlushResult = { attempted: 0, synced: 0, offline: false, failed: 0 };

  for (const item of pending) {
    if (item.type !== 'post_message') continue;
    const payload = JSON.parse(item.payload) as PostMessagePayload;
    result.attempted += 1;

    try {
      const res = await apiRequest<{ conversation: ApiConversation | null; deduplicated: boolean }>(
        `/api/conversations/${payload.conversationId}/messages`,
        { method: 'POST', auth: true, body: { body: payload.body, clientId: payload.clientId } },
      );

      const serverMessage = res.conversation?.messages.find((m) => m.clientId === payload.clientId);
      db.prepare(
        `UPDATE messages_cache SET server_id = ?, sender_id = ?, created_at = COALESCE(?, created_at), sync_state = 'synced'
         WHERE client_id = ?`,
      ).run(serverMessage?.id ?? null, serverMessage?.senderId ?? null, serverMessage?.createdAt ?? null, payload.clientId);

      db.prepare("UPDATE outbox SET status = 'done' WHERE id = ?").run(item.id);
      result.synced += 1;
    } catch (err) {
      if (err instanceof NetworkOfflineError) {
        result.offline = true;
        break; // still offline — stop draining, leave remaining items queued
      }
      db.prepare('UPDATE outbox SET status = ?, attempts = attempts + 1 WHERE id = ?').run(
        item.attempts + 1 >= 3 ? 'failed' : 'pending',
        item.id,
      );
      result.failed += 1;
    }
  }

  return result;
}

// Deliberately re-sends a clientId directly against the API, bypassing the outbox —
// simulates the ambiguous-failure case where the agent believes a queued send never
// got a response and retries it. The server must treat this as a no-op, not a duplicate.
export async function resendClientId(
  conversationId: string,
  body: string,
  clientId: string,
): Promise<{ deduplicated: boolean; messageCount: number }> {
  const res = await apiRequest<{ conversation: ApiConversation | null; deduplicated: boolean }>(
    `/api/conversations/${conversationId}/messages`,
    { method: 'POST', auth: true, body: { body, clientId } },
  );
  return { deduplicated: res.deduplicated, messageCount: res.conversation?.messages.length ?? -1 };
}

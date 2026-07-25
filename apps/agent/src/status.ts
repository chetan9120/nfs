import { db, getLocalState } from './db.js';

export function statusSnapshot() {
  const state = getLocalState();
  const files = db.prepare('SELECT id, hash, sync_status, local_path FROM files_cache').all();
  const conversations = db.prepare('SELECT id, file_id, created_at FROM conversations_cache').all();
  const messages = db
    .prepare('SELECT local_id, server_id, client_id, conversation_id, body, sync_state, created_at FROM messages_cache ORDER BY local_id ASC')
    .all();
  const outbox = db.prepare('SELECT id, type, status, attempts, payload FROM outbox ORDER BY id ASC').all();

  return {
    localState: state,
    counts: { files: files.length, conversations: conversations.length, messages: messages.length },
    files,
    conversations,
    messages,
    outbox,
  };
}

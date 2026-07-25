import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { apiRequest } from './apiClient.js';
import { config } from './config.js';
import { db } from './db.js';
import type { ApiFile } from './types.js';

interface FileCacheRow {
  id: string;
  hash: string;
  local_path: string | null;
  sync_status: string;
}

export function upsertFileMetadata(file: ApiFile): void {
  const existing = db.prepare('SELECT * FROM files_cache WHERE id = ?').get(file.id) as FileCacheRow | undefined;
  if (existing) return;

  db.prepare(
    `INSERT INTO files_cache (id, hash, size, mime_type, original_name, local_path, sync_status)
     VALUES (?, ?, ?, ?, ?, NULL, 'metadata_only')`,
  ).run(file.id, file.hash, file.size, file.mimeType, file.originalName);
}

// Downloads file content only if this content hash isn't already cached locally —
// this is the "don't re-download a whole file" half of delta sync (the other half,
// not re-fetching unchanged conversation/message metadata, lives in reconcile.ts).
export async function ensureFileDownloaded(fileId: string): Promise<{ downloaded: boolean; localPath: string }> {
  const row = db.prepare('SELECT * FROM files_cache WHERE id = ?').get(fileId) as FileCacheRow | undefined;
  if (!row) throw new Error(`No cached metadata for file ${fileId} — call upsertFileMetadata first`);

  const existingByHash = db
    .prepare("SELECT * FROM files_cache WHERE hash = ? AND local_path IS NOT NULL AND sync_status = 'cached'")
    .get(row.hash) as FileCacheRow | undefined;

  if (existingByHash?.local_path && fs.existsSync(existingByHash.local_path)) {
    db.prepare("UPDATE files_cache SET local_path = ?, sync_status = 'cached' WHERE id = ?").run(
      existingByHash.local_path,
      fileId,
    );
    return { downloaded: false, localPath: existingByHash.local_path };
  }

  if (row.local_path && row.sync_status === 'cached' && fs.existsSync(row.local_path)) {
    return { downloaded: false, localPath: row.local_path };
  }

  const buffer = await apiRequest<ArrayBuffer>(`/api/files/${fileId}/download`, {
    auth: true,
    responseType: 'arrayBuffer',
  });
  const bytes = Buffer.from(buffer);

  const actualHash = crypto.createHash('sha256').update(bytes).digest('hex');
  if (actualHash !== row.hash) {
    throw new Error(`Downloaded content hash mismatch for file ${fileId}: expected ${row.hash}, got ${actualHash}`);
  }

  const localPath = path.join(config.filesDir, row.hash);
  fs.writeFileSync(localPath, bytes);
  db.prepare("UPDATE files_cache SET local_path = ?, sync_status = 'cached' WHERE id = ?").run(localPath, fileId);

  return { downloaded: true, localPath };
}

import path from 'node:path';
import { LocalDiskProvider } from './LocalDiskProvider.js';
import type { StorageProvider } from './StorageProvider.js';

export type { StorageProvider };

const STORAGE_ROOT = process.env.STORAGE_ROOT ?? path.resolve(process.cwd(), 'storage');

export const storageProvider: StorageProvider = new LocalDiskProvider(STORAGE_ROOT);

// Shard by hash prefix (git-style) so one directory doesn't accumulate every file.
export function storageKeyForHash(hash: string): string {
  return path.join(hash.slice(0, 2), hash.slice(2));
}

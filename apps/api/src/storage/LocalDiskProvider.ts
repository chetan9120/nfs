import fs from 'node:fs/promises';
import path from 'node:path';
import type { StorageProvider } from './StorageProvider.js';

export class LocalDiskProvider implements StorageProvider {
  constructor(private readonly baseDir: string) {}

  private resolveKey(key: string): string {
    return path.join(this.baseDir, key);
  }

  async save(key: string, data: Buffer): Promise<void> {
    const target = this.resolveKey(key);
    await fs.mkdir(path.dirname(target), { recursive: true });
    if (await this.exists(key)) return;
    await fs.writeFile(target, data);
  }

  async get(key: string): Promise<Buffer> {
    return fs.readFile(this.resolveKey(key));
  }

  async delete(key: string): Promise<void> {
    await fs.rm(this.resolveKey(key), { force: true });
  }

  async exists(key: string): Promise<boolean> {
    try {
      await fs.access(this.resolveKey(key));
      return true;
    } catch {
      return false;
    }
  }
}

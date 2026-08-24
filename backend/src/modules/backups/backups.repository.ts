import { createReadStream, createWriteStream } from 'node:fs';
import { mkdir, readdir, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';

import type { BackupFileInfo } from './backups.types.js';

const backupFilenamePattern = /^backup-[0-9]{8}-[0-9]{6}\.dump$/;

export class BackupsRepository {
  constructor(private readonly backupDir: string) {}

  async ensureDirectory(): Promise<void> {
    await mkdir(this.backupDir, { recursive: true });
  }

  async findAll(): Promise<BackupFileInfo[]> {
    await this.ensureDirectory();
    const entries = await readdir(this.backupDir, { withFileTypes: true });
    const backups = await Promise.all(
      entries
        .filter((entry) => entry.isFile() && backupFilenamePattern.test(entry.name))
        .map(async (entry) => {
          const filePath = this.resolveBackupPath(entry.name);
          const info = await stat(filePath);

          return {
            filename: entry.name,
            size_bytes: info.size,
            created_at: info.birthtime.toISOString(),
          } satisfies BackupFileInfo;
        }),
    );

    return backups.sort((first, second) => second.created_at.localeCompare(first.created_at));
  }

  async findByFilename(filename: string): Promise<BackupFileInfo | null> {
    if (!backupFilenamePattern.test(filename)) return null;

    const filePath = this.resolveBackupPath(filename);

    try {
      const info = await stat(filePath);
      if (!info.isFile()) return null;

      return {
        filename,
        size_bytes: info.size,
        created_at: info.birthtime.toISOString(),
      };
    } catch {
      return null;
    }
  }

  createReadStream(filename: string) {
    return createReadStream(this.resolveBackupPath(filename));
  }

  createWriteStream(filename: string) {
    return createWriteStream(this.resolveBackupPath(filename), { flags: 'wx' });
  }

  async writeTempRestoreFile(buffer: Buffer): Promise<string> {
    await this.ensureDirectory();
    const filePath = path.join(this.backupDir, `.restore-${Date.now()}-${Math.random().toString(36).slice(2)}.dump`);
    await writeFile(filePath, buffer, { flag: 'wx' });
    return filePath;
  }

  async removeTempFile(filePath: string): Promise<void> {
    await rm(filePath, { force: true });
  }

  async delete(filename: string): Promise<void> {
    await rm(this.resolveBackupPath(filename));
  }

  async pipeToBackup(filename: string, readable: NodeJS.ReadableStream): Promise<void> {
    await this.ensureDirectory();
    await pipeline(readable, this.createWriteStream(filename));
  }

  resolveBackupPath(filename: string): string {
    if (!backupFilenamePattern.test(filename)) {
      throw new Error('Nombre de backup invalido');
    }

    return path.join(this.backupDir, filename);
  }
}


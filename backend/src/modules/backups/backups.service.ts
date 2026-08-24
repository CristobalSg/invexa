import { spawn } from 'node:child_process';
import { createReadStream, createWriteStream } from 'node:fs';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';

import { env } from '../../config/env.js';
import { BadRequestError, NotFoundError } from '../../utils/errors.js';
import { BackupsRepository } from './backups.repository.js';
import type { BackupFileInfo } from './backups.types.js';

const restoreConfirmation = 'REEMPLAZAR_BASE_ACTUAL';
const postgresContainer = process.env.POSTGRES_CONTAINER ?? 'pos_postgres';

const pad = (value: number) => String(value).padStart(2, '0');

const createBackupFilename = () => {
  const now = new Date();
  const date = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
  const time = `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;

  return `backup-${date}-${time}.dump`;
};

const commandEnv = () => ({
  ...process.env,
  PGPASSWORD: new URL(env.databaseUrl).password,
});

const getDatabaseCredentials = () => {
  const url = new URL(env.databaseUrl);

  return {
    database: url.pathname.replace(/^\//, ''),
    password: url.password,
    user: url.username,
  };
};

const runCommand = (command: string, args: readonly string[]): Promise<void> =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      env: commandEnv(),
      stdio: ['ignore', 'ignore', 'pipe'],
    });
    let stderr = '';

    child.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    child.on('error', (error) => {
      reject(new BadRequestError(`No se pudo ejecutar ${command}. Verifica que este instalado en el contenedor API.`, error.message));
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new BadRequestError(`El comando ${command} fallo`, stderr.trim()));
    });
  });

const runCommandToFile = (command: string, args: readonly string[], filePath: string): Promise<void> =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      env: commandEnv(),
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stderr = '';

    child.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    child.on('error', (error) => {
      reject(new BadRequestError(`No se pudo ejecutar ${command}. Verifica que Docker este disponible o reconstruye el contenedor API.`, error.message));
    });

    const pipelinePromise = pipeline(child.stdout, createWriteStream(filePath, { flags: 'wx' }));

    child.on('close', (code) => {
      if (code === 0) {
        pipelinePromise.then(resolve).catch((error: unknown) => {
          reject(error instanceof Error ? error : new Error('No se pudo escribir el backup'));
        });
        return;
      }

      reject(new BadRequestError(`El comando ${command} fallo`, stderr.trim()));
    });
  });

const runCommandWithFileInput = (command: string, args: readonly string[], filePath: string): Promise<void> =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      env: commandEnv(),
      stdio: ['pipe', 'ignore', 'pipe'],
    });
    let stderr = '';

    child.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    child.on('error', (error) => {
      reject(new BadRequestError(`No se pudo ejecutar ${command}. Verifica que Docker este disponible o reconstruye el contenedor API.`, error.message));
    });

    const pipelinePromise = pipeline(createReadStream(filePath), child.stdin);

    child.on('close', (code) => {
      if (code === 0) {
        pipelinePromise.then(resolve).catch((error: unknown) => {
          reject(error instanceof Error ? error : new Error('No se pudo enviar el backup a restaurar'));
        });
        return;
      }

      reject(new BadRequestError(`El comando ${command} fallo`, stderr.trim()));
    });
  });

export class BackupsService {
  constructor(private readonly repository: BackupsRepository) {}

  static fromEnv(): BackupsService {
    const backupDir = process.env.BACKUP_DIR ?? path.resolve(process.cwd(), 'backups');
    return new BackupsService(new BackupsRepository(backupDir));
  }

  async list(): Promise<BackupFileInfo[]> {
    return this.repository.findAll();
  }

  async create(): Promise<BackupFileInfo> {
    const filename = createBackupFilename();
    const filePath = this.repository.resolveBackupPath(filename);

    try {
      await runCommand('pg_dump', [
        '--format=custom',
        '--blobs',
        '--no-owner',
        '--no-privileges',
        '--file',
        filePath,
        env.databaseUrl,
      ]);
    } catch (error) {
      await this.repository.removeTempFile(filePath);
      const credentials = getDatabaseCredentials();

      await runCommandToFile('docker', [
        'exec',
        '-e',
        `PGPASSWORD=${credentials.password}`,
        postgresContainer,
        'pg_dump',
        '-U',
        credentials.user,
        '-d',
        credentials.database,
        '--format=custom',
        '--blobs',
        '--no-owner',
        '--no-privileges',
      ], filePath).catch(() => {
        throw error;
      });
    }

    const backup = await this.repository.findByFilename(filename);
    if (!backup) {
      throw new NotFoundError('No se pudo encontrar el backup generado');
    }

    return backup;
  }

  async findForDownload(filename: string): Promise<BackupFileInfo> {
    const backup = await this.repository.findByFilename(filename);
    if (!backup) {
      throw new NotFoundError('Backup no encontrado');
    }

    return backup;
  }

  createReadStream(filename: string) {
    return this.repository.createReadStream(filename);
  }

  async delete(filename: string): Promise<BackupFileInfo> {
    const backup = await this.findForDownload(filename);
    await this.repository.delete(filename);
    return backup;
  }

  async restore(buffer: Buffer, confirmation: string | undefined): Promise<{ restored: true }> {
    if (confirmation !== restoreConfirmation) {
      throw new BadRequestError('Confirmacion de restauracion invalida');
    }

    if (buffer.length === 0) {
      throw new BadRequestError('Selecciona un archivo .dump valido');
    }

    const tempFile = await this.repository.writeTempRestoreFile(buffer);

    try {
      try {
        await runCommand('psql', [
          env.databaseUrl,
          '--set',
          'ON_ERROR_STOP=1',
          '--command',
          'DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;',
        ]);
        await runCommand('pg_restore', [
          '--dbname',
          env.databaseUrl,
          '--no-owner',
          '--no-privileges',
          '--single-transaction',
          tempFile,
        ]);
      } catch (error) {
        const credentials = getDatabaseCredentials();

        await runCommand('docker', [
          'exec',
          '-e',
          `PGPASSWORD=${credentials.password}`,
          postgresContainer,
          'psql',
          '-U',
          credentials.user,
          '-d',
          credentials.database,
          '--set',
          'ON_ERROR_STOP=1',
          '--command',
          'DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;',
        ]).catch(() => {
          throw error;
        });
        await runCommandWithFileInput('docker', [
          'exec',
          '-i',
          '-e',
          `PGPASSWORD=${credentials.password}`,
          postgresContainer,
          'pg_restore',
          '-U',
          credentials.user,
          '-d',
          credentials.database,
          '--no-owner',
          '--no-privileges',
          '--single-transaction',
        ], tempFile).catch(() => {
          throw error;
        });
      }

      return { restored: true };
    } finally {
      await this.repository.removeTempFile(tempFile);
    }
  }
}

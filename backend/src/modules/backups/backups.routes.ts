import type { FastifyPluginAsync } from 'fastify';

import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { roleMiddleware } from '../../middlewares/role.middleware.js';
import { created, ok } from '../../utils/responses.js';
import {
  backupFilenameSchema,
  createBackupSchema,
  deleteBackupSchema,
  listBackupsSchema,
  restoreBackupSchema,
} from './backups.schema.js';
import { BackupsService } from './backups.service.js';
import type { BackupParams } from './backups.types.js';

interface RestoreHeaders {
  readonly 'x-confirm-restore'?: string;
}

export const backupsRoutes: FastifyPluginAsync = async (fastify) => {
  const service = BackupsService.fromEnv();
  const ownerOnly = [authMiddleware, roleMiddleware(['OWNER'])];

  fastify.addContentTypeParser(
    'application/octet-stream',
    { parseAs: 'buffer' },
    (_request, body, done) => {
      done(null, body);
    },
  );

  fastify.get(
    '/',
    { preHandler: ownerOnly, schema: listBackupsSchema },
    async (_request, reply) => {
      const backups = await service.list();
      return ok(reply, backups);
    },
  );

  fastify.post(
    '/',
    { preHandler: ownerOnly, schema: createBackupSchema },
    async (_request, reply) => {
      const backup = await service.create();
      return created(reply, backup);
    },
  );

  fastify.get<{ Params: BackupParams }>(
    '/:filename',
    { preHandler: ownerOnly, schema: backupFilenameSchema },
    async (request, reply) => {
      const backup = await service.findForDownload(request.params.filename);

      reply
        .header('Content-Type', 'application/octet-stream')
        .header('Content-Disposition', `attachment; filename="${backup.filename}"`)
        .header('Content-Length', backup.size_bytes);

      return reply.send(service.createReadStream(backup.filename));
    },
  );

  fastify.delete<{ Params: BackupParams }>(
    '/:filename',
    { preHandler: ownerOnly, schema: deleteBackupSchema },
    async (request, reply) => {
      const backup = await service.delete(request.params.filename);
      return ok(reply, backup);
    },
  );

  fastify.post<{ Body: Buffer; Headers: RestoreHeaders }>(
    '/restaurar',
    { bodyLimit: 1024 * 1024 * 1024, preHandler: ownerOnly, schema: restoreBackupSchema },
    async (request, reply) => {
      const restored = await service.restore(
        Buffer.isBuffer(request.body) ? request.body : Buffer.from([]),
        request.headers['x-confirm-restore'],
      );

      return ok(reply, restored);
    },
  );
};

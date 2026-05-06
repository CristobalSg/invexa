import fp from 'fastify-plugin';
import type { FastifyPluginAsync } from 'fastify';
import type { Pool } from 'pg';

import { createPostgresPool } from '../config/db.js';

declare module 'fastify' {
  interface FastifyInstance {
    pg: Pool;
  }
}

export const postgresPlugin: FastifyPluginAsync = fp(async (fastify) => {
  const pool = createPostgresPool();

  fastify.decorate('pg', pool);

  fastify.addHook('onClose', async () => {
    await pool.end();
  });
});

import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import fp from 'fastify-plugin';
import type { FastifyPluginAsync } from 'fastify';

import { env } from '../config/env.js';

export const securityPlugin: FastifyPluginAsync = fp(async (fastify) => {
  await fastify.register(helmet);

  await fastify.register(cors, {
    origin:
      env.corsOrigin === '*' ? true : env.corsOrigin.split(',').map((origin) => origin.trim()),
    credentials: true,
  });

  await fastify.register(rateLimit, {
    max: env.rateLimitMax,
    timeWindow: env.rateLimitTimeWindow,
  });
});

import type { FastifyPluginAsync } from 'fastify';

import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { ok } from '../../utils/responses.js';
import { loginSchema, meSchema } from './auth.schema.js';
import { AuthService } from './auth.service.js';
import type { LoginBody } from './auth.types.js';

export const authRoutes: FastifyPluginAsync = async (fastify) => {
  const service = new AuthService(fastify);

  fastify.post<{ Body: LoginBody }>('/login', { schema: loginSchema }, async (request, reply) => {
    const result = await service.login(request.body);
    return ok(reply, result);
  });

  fastify.get('/me', { preHandler: [authMiddleware], schema: meSchema }, async (request, reply) => {
    const result = await service.getProfile(request.user.id);
    return ok(reply, result);
  });
};

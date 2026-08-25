import type { FastifyPluginAsync } from 'fastify';

import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { assertValidOwnerPassword } from '../../utils/master-authorization.js';
import { created, ok } from '../../utils/responses.js';
import {
  authorizeDeviceSchema,
  authorizeOwnerSchema,
  listProfilesSchema,
  loginSchema,
  meSchema,
  profileLoginSchema,
  recoverProfilePasswordSchema,
  setupAdminSchema,
  setupStatusSchema,
} from './auth.schema.js';
import { AuthService } from './auth.service.js';
import type {
  AuthorizeDeviceBody,
  LoginBody,
  ProfileLoginBody,
  RecoverProfilePasswordBody,
  SetupAdminBody,
} from './auth.types.js';

export const authRoutes: FastifyPluginAsync = async (fastify) => {
  const service = new AuthService(fastify);
  const getDeviceToken = (request: { headers: Record<string, string | string[] | undefined> }) => {
    const value = request.headers['x-device-token'];
    return Array.isArray(value) ? value[0] : value;
  };

  fastify.post<{ Body: LoginBody }>('/login', { schema: loginSchema }, async (request, reply) => {
    const result = await service.login(request.body);
    return ok(reply, result);
  });

  fastify.get('/setup/estado', { schema: setupStatusSchema }, async (_request, reply) => {
    const result = await service.setupStatus();
    return ok(reply, result);
  });

  fastify.post<{ Body: SetupAdminBody }>(
    '/setup/admin',
    { schema: setupAdminSchema },
    async (request, reply) => {
      const result = await service.setupInitialAdmin(request.body);
      return created(reply, result);
    },
  );

  fastify.post<{ Body: AuthorizeDeviceBody }>(
    '/dispositivo/autorizar',
    { schema: authorizeDeviceSchema },
    async (request, reply) => {
      const result = await service.authorizeDevice(request.body);
      return ok(reply, result);
    },
  );

  fastify.get(
    '/perfiles',
    { schema: listProfilesSchema },
    async (request, reply) => {
      const result = await service.listProfiles(getDeviceToken(request));
      return ok(reply, result);
    },
  );

  fastify.post<{ Body: ProfileLoginBody }>(
    '/perfiles/login',
    { schema: profileLoginSchema },
    async (request, reply) => {
      const result = await service.loginProfile(getDeviceToken(request), request.body);
      return ok(reply, result);
    },
  );

  fastify.post<{ Body: RecoverProfilePasswordBody }>(
    '/perfiles/recuperar-contrasena',
    { schema: recoverProfilePasswordSchema },
    async (request, reply) => {
      const result = await service.recoverProfilePassword(getDeviceToken(request), request.body);
      return ok(reply, result);
    },
  );

  fastify.get('/me', { preHandler: [authMiddleware], schema: meSchema }, async (request, reply) => {
    const result = await service.getProfile(request.user.id);
    return ok(reply, result);
  });

  fastify.post<{ Body: { readonly master_password: string } }>(
    '/autorizar-admin',
    { preHandler: [authMiddleware], schema: authorizeOwnerSchema },
    async (request, reply) => {
      await assertValidOwnerPassword(fastify.pg, request.body.master_password);
      return ok(reply, { authorized: true });
    },
  );
};

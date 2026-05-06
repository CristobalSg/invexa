import type { FastifyPluginAsync } from 'fastify';

import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { roleMiddleware } from '../../middlewares/role.middleware.js';
import { created, ok } from '../../utils/responses.js';
import { UsuariosRepository } from './usuarios.repository.js';
import {
  createUsuarioSchema,
  deactivateUsuarioSchema,
  getUsuarioSchema,
  listUsuariosSchema,
  updateUsuarioSchema,
} from './usuarios.schema.js';
import { UsuariosService } from './usuarios.service.js';
import type { CreateUsuarioBody, UpdateUsuarioBody, UsuarioParams } from './usuarios.types.js';

export const usuariosRoutes: FastifyPluginAsync = async (fastify) => {
  const repository = new UsuariosRepository(fastify.pg);
  const service = new UsuariosService(repository);
  const ownerOnly = [authMiddleware, roleMiddleware(['OWNER'])];

  fastify.get(
    '/',
    { preHandler: ownerOnly, schema: listUsuariosSchema },
    async (_request, reply) => {
      const usuarios = await service.findAll();
      return ok(reply, usuarios);
    },
  );

  fastify.get<{ Params: UsuarioParams }>(
    '/:id',
    { preHandler: ownerOnly, schema: getUsuarioSchema },
    async (request, reply) => {
      const usuario = await service.findById(request.params.id);
      return ok(reply, usuario);
    },
  );

  fastify.post<{ Body: CreateUsuarioBody }>(
    '/',
    { preHandler: ownerOnly, schema: createUsuarioSchema },
    async (request, reply) => {
      const usuario = await service.create(request.body);
      return created(reply, usuario);
    },
  );

  fastify.patch<{ Params: UsuarioParams; Body: UpdateUsuarioBody }>(
    '/:id',
    { preHandler: ownerOnly, schema: updateUsuarioSchema },
    async (request, reply) => {
      const usuario = await service.update(request.params.id, request.body);
      return ok(reply, usuario);
    },
  );

  fastify.patch<{ Params: UsuarioParams }>(
    '/:id/desactivar',
    { preHandler: ownerOnly, schema: deactivateUsuarioSchema },
    async (request, reply) => {
      const usuario = await service.deactivate(request.params.id);
      return ok(reply, usuario);
    },
  );
};

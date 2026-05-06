import type { FastifyPluginAsync } from 'fastify';

import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { roleMiddleware } from '../../middlewares/role.middleware.js';
import { created, ok } from '../../utils/responses.js';
import { CategoriasRepository } from './categorias.repository.js';
import {
  createCategoriaSchema,
  listCategoriasSchema,
  updateCategoriaSchema,
} from './categorias.schema.js';
import { CategoriasService } from './categorias.service.js';
import type {
  CategoriaParams,
  CreateCategoriaBody,
  PaginationQuery,
  UpdateCategoriaBody,
} from './categorias.types.js';

export const categoriasRoutes: FastifyPluginAsync = async (fastify) => {
  const repository = new CategoriasRepository(fastify.pg);
  const service = new CategoriasService(repository);
  const authenticated = [authMiddleware];
  const ownerOnly = [authMiddleware, roleMiddleware(['OWNER'])];

  fastify.get<{ Querystring: PaginationQuery }>(
    '/',
    { preHandler: authenticated, schema: listCategoriasSchema },
    async (request, reply) => {
      const result = await service.findAll(request.query);
      return ok(reply, result);
    },
  );

  fastify.post<{ Body: CreateCategoriaBody }>(
    '/',
    { preHandler: ownerOnly, schema: createCategoriaSchema },
    async (request, reply) => {
      const categoria = await service.create(request.body);
      return created(reply, categoria);
    },
  );

  fastify.patch<{ Params: CategoriaParams; Body: UpdateCategoriaBody }>(
    '/:id',
    { preHandler: ownerOnly, schema: updateCategoriaSchema },
    async (request, reply) => {
      const categoria = await service.update(request.params.id, request.body);
      return ok(reply, categoria);
    },
  );
};

import type { FastifyPluginAsync } from 'fastify';

import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { roleMiddleware } from '../../middlewares/role.middleware.js';
import { created, ok } from '../../utils/responses.js';
import { ComprasRepository } from './compras.repository.js';
import { createCompraSchema, getCompraSchema, listComprasSchema } from './compras.schema.js';
import { ComprasService } from './compras.service.js';
import type { CompraParams, CreateCompraBody, PaginationQuery } from './compras.types.js';

export const comprasRoutes: FastifyPluginAsync = async (fastify) => {
  const repository = new ComprasRepository(fastify.pg);
  const service = new ComprasService(repository, fastify.pg);
  const ownerOnly = [authMiddleware, roleMiddleware(['OWNER'])];

  fastify.post<{ Body: CreateCompraBody }>(
    '/',
    { preHandler: ownerOnly, schema: createCompraSchema },
    async (request, reply) => {
      const compra = await service.create(request.user.id, request.body);
      return created(reply, compra);
    },
  );

  fastify.get<{ Querystring: PaginationQuery }>(
    '/',
    { preHandler: ownerOnly, schema: listComprasSchema },
    async (request, reply) => {
      const result = await service.findAll(request.query);
      return ok(reply, result);
    },
  );

  fastify.get<{ Params: CompraParams }>(
    '/:id',
    { preHandler: ownerOnly, schema: getCompraSchema },
    async (request, reply) => {
      const compra = await service.findById(request.params.id);
      return ok(reply, compra);
    },
  );
};

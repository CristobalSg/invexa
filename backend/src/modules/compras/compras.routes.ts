import type { FastifyPluginAsync } from 'fastify';

import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { roleMiddleware } from '../../middlewares/role.middleware.js';
import { created, ok } from '../../utils/responses.js';
import { ComprasRepository } from './compras.repository.js';
import {
  anularCompraSchema,
  createCompraSchema,
  getCompraSchema,
  listComprasSchema,
} from './compras.schema.js';
import { ComprasService } from './compras.service.js';
import type {
  AnularCompraBody,
  CompraParams,
  CreateCompraBody,
  PaginationQuery,
} from './compras.types.js';

export const comprasRoutes: FastifyPluginAsync = async (fastify) => {
  const repository = new ComprasRepository(fastify.pg);
  const service = new ComprasService(repository, fastify.pg);
  const comprasAccess = [authMiddleware, roleMiddleware(['OWNER', 'CASHIER'])];

  fastify.post<{ Body: CreateCompraBody }>(
    '/',
    { preHandler: comprasAccess, schema: createCompraSchema },
    async (request, reply) => {
      const compra = await service.create(request.user.id, request.body);
      return created(reply, compra);
    },
  );

  fastify.get<{ Querystring: PaginationQuery }>(
    '/',
    { preHandler: comprasAccess, schema: listComprasSchema },
    async (request, reply) => {
      const result = await service.findAll(request.query);
      return ok(reply, result);
    },
  );

  fastify.patch<{ Params: CompraParams; Body: AnularCompraBody }>(
    '/:id/anular',
    { preHandler: comprasAccess, schema: anularCompraSchema },
    async (request, reply) => {
      const compra = await service.anular(request.params.id, request.user.id, request.body);
      return ok(reply, compra);
    },
  );

  fastify.get<{ Params: CompraParams }>(
    '/:id',
    { preHandler: comprasAccess, schema: getCompraSchema },
    async (request, reply) => {
      const compra = await service.findById(request.params.id);
      return ok(reply, compra);
    },
  );
};

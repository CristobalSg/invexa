import type { FastifyPluginAsync } from 'fastify';

import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { roleMiddleware } from '../../middlewares/role.middleware.js';
import { created, ok } from '../../utils/responses.js';
import { VentasRepository } from './ventas.repository.js';
import {
  anularVentaSchema,
  createVentaSchema,
  getVentaSchema,
  listVentasSchema,
} from './ventas.schema.js';
import { VentasService } from './ventas.service.js';
import type {
  AnularVentaBody,
  CreateVentaBody,
  PaginationQuery,
  VentaParams,
} from './ventas.types.js';

export const ventasRoutes: FastifyPluginAsync = async (fastify) => {
  const repository = new VentasRepository(fastify.pg);
  const service = new VentasService(repository, fastify.pg);
  const posAccess = [authMiddleware, roleMiddleware(['OWNER', 'CASHIER'])];
  const ownerOnly = [authMiddleware, roleMiddleware(['OWNER'])];

  fastify.post<{ Body: CreateVentaBody }>(
    '/',
    { preHandler: posAccess, schema: createVentaSchema },
    async (request, reply) => {
      const venta = await service.create(request.user.id, request.body);
      return created(reply, venta);
    },
  );

  fastify.get<{ Querystring: PaginationQuery }>(
    '/',
    { preHandler: posAccess, schema: listVentasSchema },
    async (request, reply) => {
      const result = await service.findAll(request.query);
      return ok(reply, result);
    },
  );

  fastify.patch<{ Params: VentaParams; Body: AnularVentaBody }>(
    '/:id/anular',
    { preHandler: ownerOnly, schema: anularVentaSchema },
    async (request, reply) => {
      const venta = await service.anular(request.params.id, request.user.id, request.body);
      return ok(reply, venta);
    },
  );

  fastify.get<{ Params: VentaParams }>(
    '/:id',
    { preHandler: posAccess, schema: getVentaSchema },
    async (request, reply) => {
      const venta = await service.findById(request.params.id);
      return ok(reply, venta);
    },
  );
};

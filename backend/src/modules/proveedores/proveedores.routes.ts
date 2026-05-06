import type { FastifyPluginAsync } from 'fastify';

import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { roleMiddleware } from '../../middlewares/role.middleware.js';
import { created, ok } from '../../utils/responses.js';
import { ProveedoresRepository } from './proveedores.repository.js';
import {
  createProveedorSchema,
  listProveedoresSchema,
  updateProveedorSchema,
} from './proveedores.schema.js';
import { ProveedoresService } from './proveedores.service.js';
import type {
  CreateProveedorBody,
  PaginationQuery,
  ProveedorParams,
  UpdateProveedorBody,
} from './proveedores.types.js';

export const proveedoresRoutes: FastifyPluginAsync = async (fastify) => {
  const repository = new ProveedoresRepository(fastify.pg);
  const service = new ProveedoresService(repository);
  const authenticated = [authMiddleware];
  const ownerOnly = [authMiddleware, roleMiddleware(['OWNER'])];

  fastify.get<{ Querystring: PaginationQuery }>(
    '/',
    { preHandler: authenticated, schema: listProveedoresSchema },
    async (request, reply) => {
      const result = await service.findAll(request.query);
      return ok(reply, result);
    },
  );

  fastify.post<{ Body: CreateProveedorBody }>(
    '/',
    { preHandler: ownerOnly, schema: createProveedorSchema },
    async (request, reply) => {
      const proveedor = await service.create(request.body);
      return created(reply, proveedor);
    },
  );

  fastify.patch<{ Params: ProveedorParams; Body: UpdateProveedorBody }>(
    '/:id',
    { preHandler: ownerOnly, schema: updateProveedorSchema },
    async (request, reply) => {
      const proveedor = await service.update(request.params.id, request.body);
      return ok(reply, proveedor);
    },
  );
};

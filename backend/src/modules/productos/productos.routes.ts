import type { FastifyPluginAsync } from 'fastify';

import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { roleMiddleware } from '../../middlewares/role.middleware.js';
import { created, ok } from '../../utils/responses.js';
import { ProductosRepository } from './productos.repository.js';
import {
  createProductoSchema,
  deactivateProductoSchema,
  getProductoByCodigoSchema,
  getProductoSchema,
  listProductosSchema,
  resetProduceProductsSchema,
  updateProductoSchema,
} from './productos.schema.js';
import { ProductosService } from './productos.service.js';
import type {
  CreateProductoBody,
  DeactivateProductoBody,
  PaginationQuery,
  ProductoCodigoParams,
  ProductoParams,
  ResetProduceProductsBody,
  UpdateProductoBody,
} from './productos.types.js';

export const productosRoutes: FastifyPluginAsync = async (fastify) => {
  const repository = new ProductosRepository(fastify.pg);
  const service = new ProductosService(repository, fastify.pg);
  const readProducts = [authMiddleware, roleMiddleware(['OWNER', 'CASHIER'])];
  const createProducts = [authMiddleware, roleMiddleware(['OWNER', 'CASHIER'])];
  const ownerOnly = [authMiddleware, roleMiddleware(['OWNER'])];

  fastify.get<{ Querystring: PaginationQuery }>(
    '/',
    { preHandler: readProducts, schema: listProductosSchema },
    async (request, reply) => {
      const result = await service.findAll(request.query);
      return ok(reply, result);
    },
  );

  fastify.get<{ Params: ProductoCodigoParams }>(
    '/codigo/:codigo',
    { preHandler: readProducts, schema: getProductoByCodigoSchema },
    async (request, reply) => {
      const producto = await service.findByCodigo(request.params.codigo);
      return ok(reply, producto);
    },
  );

  fastify.get<{ Params: ProductoParams }>(
    '/:id',
    { preHandler: readProducts, schema: getProductoSchema },
    async (request, reply) => {
      const producto = await service.findById(request.params.id);
      return ok(reply, producto);
    },
  );

  fastify.post<{ Body: CreateProductoBody }>(
    '/',
    { preHandler: createProducts, schema: createProductoSchema },
    async (request, reply) => {
      const producto = await service.create(request.body, request.user.rol);
      return created(reply, producto);
    },
  );

  fastify.post<{ Body: ResetProduceProductsBody }>(
    '/frutas-verduras/reset',
    { preHandler: ownerOnly, schema: resetProduceProductsSchema },
    async (request, reply) => {
      const result = await service.resetProduceProducts(request.body);
      return ok(reply, result);
    },
  );

  fastify.patch<{ Params: ProductoParams; Body: UpdateProductoBody }>(
    '/:id',
    { preHandler: createProducts, schema: updateProductoSchema },
    async (request, reply) => {
      const producto = await service.update(request.params.id, request.body, request.user.rol);
      return ok(reply, producto);
    },
  );

  fastify.patch<{ Params: ProductoParams; Body: DeactivateProductoBody }>(
    '/:id/desactivar',
    { preHandler: createProducts, schema: deactivateProductoSchema },
    async (request, reply) => {
      const producto = await service.deactivate(request.params.id, request.body ?? {}, request.user.rol);
      return ok(reply, producto);
    },
  );
};

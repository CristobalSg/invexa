import type { FastifyPluginAsync } from 'fastify';

import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { roleMiddleware } from '../../middlewares/role.middleware.js';
import { ok } from '../../utils/responses.js';
import { ReportesRepository } from './reportes.repository.js';
import {
  bajoStockSchema,
  cierreCajaDiarioSchema,
  paginatedReporteSchema,
  productoReporteSchema,
  ventasMensualSchema,
  ventasResumenSchema,
} from './reportes.schema.js';
import { ReportesService } from './reportes.service.js';
import type {
  BajoStockQuery,
  DateRangeQuery,
  PaginationQuery,
  ProductoParams,
} from './reportes.types.js';

export const reportesRoutes: FastifyPluginAsync = async (fastify) => {
  const repository = new ReportesRepository(fastify.pg);
  const service = new ReportesService(repository);
  const ownerOnly = [authMiddleware, roleMiddleware(['OWNER'])];

  fastify.get<{ Querystring: DateRangeQuery }>(
    '/ventas/resumen',
    { preHandler: ownerOnly, schema: ventasResumenSchema },
    async (request, reply) => {
      const result = await service.ventasResumen(request.query);
      return ok(reply, result);
    },
  );

  fastify.get<{ Querystring: DateRangeQuery }>(
    '/ventas/mensual',
    { preHandler: ownerOnly, schema: ventasMensualSchema },
    async (request, reply) => {
      const result = await service.ventasMensual(request.query);
      return ok(reply, result);
    },
  );

  fastify.get<{ Querystring: DateRangeQuery }>(
    '/caja/cierre-diario',
    { preHandler: ownerOnly, schema: cierreCajaDiarioSchema },
    async (request, reply) => {
      const result = await service.cierreCajaDiario(request.query);
      return ok(reply, result);
    },
  );

  fastify.get<{ Querystring: PaginationQuery }>(
    '/productos/top',
    { preHandler: ownerOnly, schema: paginatedReporteSchema },
    async (request, reply) => {
      const result = await service.productosTop(request.query);
      return ok(reply, result);
    },
  );

  fastify.get<{ Querystring: PaginationQuery }>(
    '/inventario',
    { preHandler: ownerOnly, schema: paginatedReporteSchema },
    async (request, reply) => {
      const result = await service.inventario(request.query);
      return ok(reply, result);
    },
  );

  fastify.get<{ Querystring: BajoStockQuery }>(
    '/bajo-stock',
    { preHandler: ownerOnly, schema: bajoStockSchema },
    async (request, reply) => {
      const result = await service.bajoStock(request.query);
      return ok(reply, result);
    },
  );

  fastify.get<{ Querystring: PaginationQuery }>(
    '/consignacion',
    { preHandler: ownerOnly, schema: paginatedReporteSchema },
    async (request, reply) => {
      const result = await service.consignacion(request.query);
      return ok(reply, result);
    },
  );

  fastify.get<{ Params: ProductoParams; Querystring: DateRangeQuery }>(
    '/producto/:id',
    { preHandler: ownerOnly, schema: productoReporteSchema },
    async (request, reply) => {
      const result = await service.producto(request.params.id, request.query);
      return ok(reply, result);
    },
  );
};

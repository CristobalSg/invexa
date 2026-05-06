import type { FastifyPluginAsync } from 'fastify';

import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { roleMiddleware } from '../../middlewares/role.middleware.js';
import { ok } from '../../utils/responses.js';
import { InventarioRepository } from './inventario.repository.js';
import { listMovimientosSchema } from './inventario.schema.js';
import { InventarioService } from './inventario.service.js';
import type { MovimientosQuery } from './inventario.types.js';

export const inventarioRoutes: FastifyPluginAsync = async (fastify) => {
  const repository = new InventarioRepository(fastify.pg);
  const service = new InventarioService(repository);
  const readInventory = [authMiddleware, roleMiddleware(['OWNER', 'CASHIER'])];

  fastify.get<{ Querystring: MovimientosQuery }>(
    '/movimientos',
    { preHandler: readInventory, schema: listMovimientosSchema },
    async (request, reply) => {
      const result = await service.findMovimientos(request.query);
      return ok(reply, result);
    },
  );
};

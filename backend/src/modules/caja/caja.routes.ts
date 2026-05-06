import type { FastifyPluginAsync } from 'fastify';

import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { roleMiddleware } from '../../middlewares/role.middleware.js';
import { created, ok } from '../../utils/responses.js';
import { CajaRepository } from './caja.repository.js';
import {
  abrirCajaSchema,
  cajaActualSchema,
  cerrarCajaSchema,
  getCajaSessionSchema,
  listCajaSessionsSchema,
} from './caja.schema.js';
import { CajaService } from './caja.service.js';
import type { AbrirCajaBody, CajaSessionParams, CajaSessionsQuery } from './caja.types.js';

export const cajaRoutes: FastifyPluginAsync = async (fastify) => {
  const repository = new CajaRepository(fastify.pg);
  const service = new CajaService(repository, fastify.pg);
  const cajaAccess = [authMiddleware, roleMiddleware(['OWNER', 'CASHIER'])];

  fastify.post<{ Body: AbrirCajaBody }>(
    '/abrir',
    { preHandler: cajaAccess, schema: abrirCajaSchema },
    async (request, reply) => {
      const session = await service.abrir(request.user.id, request.body);
      return created(reply, session);
    },
  );

  fastify.post(
    '/cerrar',
    { preHandler: cajaAccess, schema: cerrarCajaSchema },
    async (request, reply) => {
      const session = await service.cerrar(request.user.id);
      return ok(reply, session);
    },
  );

  fastify.get(
    '/actual',
    { preHandler: cajaAccess, schema: cajaActualSchema },
    async (request, reply) => {
      const session = await service.actual(request.user.id);
      return ok(reply, session);
    },
  );

  fastify.get<{ Querystring: CajaSessionsQuery }>(
    '/sesiones',
    { preHandler: cajaAccess, schema: listCajaSessionsSchema },
    async (request, reply) => {
      const result = await service.findAll(
        {
          id: request.user.id,
          rol: request.user.rol,
        },
        request.query,
      );

      return ok(reply, result);
    },
  );

  fastify.get<{ Params: CajaSessionParams }>(
    '/sesiones/:id',
    { preHandler: cajaAccess, schema: getCajaSessionSchema },
    async (request, reply) => {
      const session = await service.findById(
        {
          id: request.user.id,
          rol: request.user.rol,
        },
        request.params.id,
      );

      return ok(reply, session);
    },
  );
};

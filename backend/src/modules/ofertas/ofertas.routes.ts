import type { FastifyPluginAsync } from 'fastify';

import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { roleMiddleware } from '../../middlewares/role.middleware.js';
import { created, ok } from '../../utils/responses.js';
import { OfertasRepository } from './ofertas.repository.js';
import {
  createOfertaSchema,
  deactivateOfertaSchema,
  listOfertasActivasSchema,
  listOfertasSchema,
  updateOfertaSchema,
} from './ofertas.schema.js';
import { OfertasService } from './ofertas.service.js';
import type {
  CreateOfertaBody,
  OfertaParams,
  PaginationQuery,
  UpdateOfertaBody,
} from './ofertas.types.js';

export const ofertasRoutes: FastifyPluginAsync = async (fastify) => {
  const repository = new OfertasRepository(fastify.pg);
  const service = new OfertasService(repository);
  const readOffers = [authMiddleware, roleMiddleware(['OWNER', 'CASHIER'])];
  const ownerOnly = [authMiddleware, roleMiddleware(['OWNER'])];

  fastify.post<{ Body: CreateOfertaBody }>(
    '/',
    { preHandler: ownerOnly, schema: createOfertaSchema },
    async (request, reply) => {
      const oferta = await service.create(request.body);
      return created(reply, oferta);
    },
  );

  fastify.get<{ Querystring: PaginationQuery }>(
    '/',
    { preHandler: readOffers, schema: listOfertasSchema },
    async (request, reply) => {
      const result = await service.findAll(request.query);
      return ok(reply, result);
    },
  );

  fastify.get<{ Querystring: PaginationQuery }>(
    '/activas',
    { preHandler: readOffers, schema: listOfertasActivasSchema },
    async (request, reply) => {
      const result = await service.findActive(request.query);
      return ok(reply, result);
    },
  );

  fastify.patch<{ Params: OfertaParams; Body: UpdateOfertaBody }>(
    '/:id',
    { preHandler: ownerOnly, schema: updateOfertaSchema },
    async (request, reply) => {
      const oferta = await service.update(request.params.id, request.body);
      return ok(reply, oferta);
    },
  );

  fastify.patch<{ Params: OfertaParams }>(
    '/:id/desactivar',
    { preHandler: ownerOnly, schema: deactivateOfertaSchema },
    async (request, reply) => {
      const oferta = await service.deactivate(request.params.id);
      return ok(reply, oferta);
    },
  );
};

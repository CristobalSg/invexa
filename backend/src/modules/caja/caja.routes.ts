import type { FastifyPluginAsync } from 'fastify';

import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { roleMiddleware } from '../../middlewares/role.middleware.js';
import { AuthService } from '../auth/auth.service.js';
import { created, ok } from '../../utils/responses.js';
import { CajaRepository } from './caja.repository.js';
import {
  abrirCajaSchema,
  cajaActualSchema,
  cerrarCajaSchema,
  editarMovimientoCajaSchema,
  eliminarMovimientoCajaSchema,
  forzarCerrarCajaSchema,
  crearMovimientoCajaSchema,
  getCajaSessionSchema,
  listMovimientosCajaSchema,
  listCajaSessionsSchema,
} from './caja.schema.js';
import { CajaService } from './caja.service.js';
import type {
  AbrirCajaBody,
  CajaSessionParams,
  CajaSessionsQuery,
  CerrarCajaBody,
  CrearMovimientoCajaBody,
  EditarMovimientoCajaBody,
  EliminarMovimientoCajaBody,
  ForzarCerrarCajaBody,
} from './caja.types.js';

export const cajaRoutes: FastifyPluginAsync = async (fastify) => {
  const repository = new CajaRepository(fastify.pg);
  const service = new CajaService(repository, fastify.pg);
  const authService = new AuthService(fastify);
  const cajaAccess = [authMiddleware, roleMiddleware(['OWNER', 'CASHIER'])];
  const ownerOnly = [authMiddleware, roleMiddleware(['OWNER'])];
  const getDeviceId = async (request: { headers: Record<string, string | string[] | undefined> }) => {
    const token = request.headers['x-device-token'];
    const deviceToken = Array.isArray(token) ? token[0] : token;

    if (!deviceToken) {
      return undefined;
    }

    const device = await authService.validateDevice(deviceToken);
    return device.id;
  };

  fastify.post<{ Body: AbrirCajaBody }>(
    '/abrir',
    { preHandler: cajaAccess, schema: abrirCajaSchema },
    async (request, reply) => {
      const session = await service.abrir(request.user.id, request.body, await getDeviceId(request));
      return created(reply, session);
    },
  );

  fastify.post<{ Body: CerrarCajaBody }>(
    '/cerrar',
    { preHandler: cajaAccess, schema: cerrarCajaSchema },
    async (request, reply) => {
      const session = await service.cerrar(request.user.id, request.body, await getDeviceId(request));
      return ok(reply, session);
    },
  );

  fastify.post<{ Body: ForzarCerrarCajaBody }>(
    '/cerrar/forzar',
    { preHandler: ownerOnly, schema: forzarCerrarCajaSchema },
    async (request, reply) => {
      const session = await service.forzarCerrar(request.body, await getDeviceId(request));
      return ok(reply, session);
    },
  );

  fastify.post<{ Body: CrearMovimientoCajaBody }>(
    '/movimientos',
    { preHandler: cajaAccess, schema: crearMovimientoCajaSchema },
    async (request, reply) => {
      const movimiento = await service.crearMovimiento(
        request.user.id,
        request.body,
        await getDeviceId(request),
      );
      return created(reply, movimiento);
    },
  );

  fastify.get(
    '/movimientos/actual',
    { preHandler: cajaAccess, schema: listMovimientosCajaSchema },
    async (request, reply) => {
      const movimientos = await service.listMovimientosActual(request.user.id, await getDeviceId(request));
      return ok(reply, movimientos);
    },
  );

  fastify.patch<{ Params: { readonly id: number }; Body: EditarMovimientoCajaBody }>(
    '/movimientos/:id',
    { preHandler: cajaAccess, schema: editarMovimientoCajaSchema },
    async (request, reply) => {
      const movimiento = await service.editarMovimiento(
        request.user.id,
        request.params.id,
        request.body,
        await getDeviceId(request),
      );
      return ok(reply, movimiento);
    },
  );

  fastify.delete<{ Params: { readonly id: number }; Body: EliminarMovimientoCajaBody }>(
    '/movimientos/:id',
    { preHandler: cajaAccess, schema: eliminarMovimientoCajaSchema },
    async (request, reply) => {
      const movimiento = await service.eliminarMovimiento(
        request.user.id,
        request.params.id,
        request.body,
        await getDeviceId(request),
      );
      return ok(reply, movimiento);
    },
  );

  fastify.get(
    '/actual',
    { preHandler: cajaAccess, schema: cajaActualSchema },
    async (request, reply) => {
      const session = await service.actual(request.user.id, await getDeviceId(request));
      return ok(reply, session);
    },
  );

  fastify.get<{ Querystring: CajaSessionsQuery }>(
    '/sesiones',
    { preHandler: cajaAccess, schema: listCajaSessionsSchema },
    async (request, reply) => {
      const query =
        request.user.rol === 'OWNER'
          ? request.query
          : { ...request.query, usuario_id: request.user.id };
      const result = await service.findAll(
        {
          id: request.user.id,
          rol: request.user.rol,
        },
        query,
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

import crypto from 'node:crypto';

import Fastify, { type FastifyInstance } from 'fastify';

import { env } from './config/env.js';
import { authRoutes } from './modules/auth/auth.routes.js';
import { backupsRoutes } from './modules/backups/backups.routes.js';
import { cajaRoutes } from './modules/caja/caja.routes.js';
import { categoriasRoutes } from './modules/categorias/categorias.routes.js';
import { comprasRoutes } from './modules/compras/compras.routes.js';
import { inventarioRoutes } from './modules/inventario/inventario.routes.js';
import { ofertasRoutes } from './modules/ofertas/ofertas.routes.js';
import { productosRoutes } from './modules/productos/productos.routes.js';
import { proveedoresRoutes } from './modules/proveedores/proveedores.routes.js';
import { reportesRoutes } from './modules/reportes/reportes.routes.js';
import { usuariosRoutes } from './modules/usuarios/usuarios.routes.js';
import { ventasRoutes } from './modules/ventas/ventas.routes.js';
import { jwtPlugin } from './plugins/jwt.plugin.js';
import { postgresPlugin } from './plugins/postgres.plugin.js';
import { securityPlugin } from './plugins/security.plugin.js';
import { errorHandler } from './utils/errors.js';
import { ok } from './utils/responses.js';

export const buildApp = async (): Promise<FastifyInstance> => {
  const app = Fastify({
    logger: {
      level: env.logLevel,
      redact: ['req.headers.authorization'],
    },
    genReqId: (request) => request.headers['x-request-id']?.toString() ?? crypto.randomUUID(),
  });

  app.setErrorHandler(errorHandler);

  await app.register(securityPlugin);
  await app.register(postgresPlugin);
  await app.register(jwtPlugin);

  app.get('/health', async (_request, reply) =>
    ok(reply, {
      status: 'ok',
      environment: env.nodeEnv,
    }),
  );

  await app.register(authRoutes, { prefix: '/auth' });
  await app.register(usuariosRoutes, { prefix: '/usuarios' });
  await app.register(productosRoutes, { prefix: '/productos' });
  await app.register(categoriasRoutes, { prefix: '/categorias' });
  await app.register(proveedoresRoutes, { prefix: '/proveedores' });
  await app.register(comprasRoutes, { prefix: '/compras' });
  await app.register(ventasRoutes, { prefix: '/ventas' });
  await app.register(cajaRoutes, { prefix: '/caja' });
  await app.register(ofertasRoutes, { prefix: '/ofertas' });
  await app.register(inventarioRoutes, { prefix: '/inventario' });
  await app.register(reportesRoutes, { prefix: '/reportes' });
  await app.register(backupsRoutes, { prefix: '/backups' });

  return app;
};

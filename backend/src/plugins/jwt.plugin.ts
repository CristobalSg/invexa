import jwt from '@fastify/jwt';
import fp from 'fastify-plugin';
import type { FastifyPluginAsync } from 'fastify';

import { env } from '../config/env.js';

export type UserRole = 'OWNER' | 'CASHIER';

export interface AuthenticatedUser {
  readonly id: number;
  readonly rol: UserRole;
  readonly nombre_usuario: string;
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: AuthenticatedUser;
    user: AuthenticatedUser;
  }
}

export const jwtPlugin: FastifyPluginAsync = fp(async (fastify) => {
  await fastify.register(jwt, {
    secret: env.jwtSecret,
    sign: {
      expiresIn: env.jwtExpiresIn,
    },
  });
});

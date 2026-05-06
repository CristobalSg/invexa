import type { FastifyReply, FastifyRequest } from 'fastify';

import { UnauthorizedError } from '../utils/errors.js';

export const authMiddleware = async (
  request: FastifyRequest,
  _reply: FastifyReply,
): Promise<void> => {
  try {
    await request.jwtVerify();
  } catch {
    throw new UnauthorizedError('Token invalido o ausente');
  }
};

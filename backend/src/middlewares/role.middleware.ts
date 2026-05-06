import type { FastifyReply, FastifyRequest } from 'fastify';

import type { UserRole } from '../plugins/jwt.plugin.js';
import { ForbiddenError, UnauthorizedError } from '../utils/errors.js';

export const roleMiddleware =
  (allowedRoles: readonly UserRole[]) =>
  async (request: FastifyRequest, _reply: FastifyReply): Promise<void> => {
    if (!request.user) {
      throw new UnauthorizedError();
    }

    if (!allowedRoles.includes(request.user.rol)) {
      throw new ForbiddenError();
    }
  };

import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify';

export type ErrorCode =
  | 'BAD_REQUEST'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'VALIDATION_ERROR'
  | 'INTERNAL_ERROR';

export class AppError extends Error {
  readonly statusCode: number;
  readonly code: ErrorCode;
  readonly details?: unknown;

  constructor(
    message: string,
    statusCode = 500,
    code: ErrorCode = 'INTERNAL_ERROR',
    details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'Solicitud invalida', details?: unknown) {
    super(message, 400, 'BAD_REQUEST', details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'No autenticado') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'No tienes permisos para realizar esta accion') {
    super(message, 403, 'FORBIDDEN');
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Recurso no encontrado') {
    super(message, 404, 'NOT_FOUND');
  }
}

export class ConflictError extends AppError {
  constructor(message = 'El recurso ya existe', details?: unknown) {
    super(message, 409, 'CONFLICT', details);
  }
}

type FastifyValidationError = FastifyError & {
  readonly validation?: unknown;
};

export const errorHandler = (
  error: FastifyError | AppError,
  request: FastifyRequest,
  reply: FastifyReply,
): void => {
  request.log.error({ error }, error.message);

  const validation = (error as FastifyValidationError).validation;

  if (validation) {
    reply.status(400).send({
      success: false,
      message: 'Error de validacion',
      details: validation,
    });
    return;
  }

  if (error instanceof AppError) {
    const payload: { success: false; message: string; details?: unknown } = {
      success: false,
      message: error.message,
    };

    if (error.details !== undefined) {
      payload.details = error.details;
    }

    reply.status(error.statusCode).send(payload);
    return;
  }

  reply.status(500).send({
    success: false,
    message: 'Error interno del servidor',
  });
};

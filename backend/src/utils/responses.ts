import type { FastifyReply } from 'fastify';

export interface SuccessResponse<T> {
  readonly success: true;
  readonly data: T;
}

export const ok = <T>(reply: FastifyReply, data: T): FastifyReply =>
  reply.status(200).send({
    success: true,
    data,
  } satisfies SuccessResponse<T>);

export const created = <T>(reply: FastifyReply, data: T): FastifyReply =>
  reply.status(201).send({
    success: true,
    data,
  } satisfies SuccessResponse<T>);

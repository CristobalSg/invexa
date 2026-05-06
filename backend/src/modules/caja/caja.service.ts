import type { Pool } from 'pg';

import { BadRequestError, ForbiddenError, NotFoundError } from '../../utils/errors.js';
import { withTransaction } from '../../utils/transactions.js';
import type { CajaRepository } from './caja.repository.js';
import type {
  AbrirCajaBody,
  CajaResumenFinanciero,
  CajaResumenRow,
  CajaSession,
  CajaSessionDetalle,
  CajaSessionListRow,
  CajaSessionRow,
  CajaSessionsQuery,
  CajaUserContext,
  PaginatedResult,
} from './caja.types.js';

export class CajaService {
  constructor(
    private readonly repository: CajaRepository,
    private readonly pool: Pool,
  ) {}

  async abrir(usuarioId: number, data: AbrirCajaBody): Promise<CajaSessionDetalle> {
    return withTransaction(this.pool, async (client) => {
      await this.repository.lockUserCashSessions(client, usuarioId);

      const openSession = await this.repository.findOpenByUsuarioId(client, usuarioId);

      if (openSession) {
        throw new BadRequestError('El usuario ya tiene una caja abierta');
      }

      const created = await this.repository.create(client, usuarioId, data.monto_apertura);
      const session = await this.repository.findByIdWithClient(client, created.id);

      if (!session) {
        throw new NotFoundError('Sesion de caja no encontrada');
      }

      const resumen = await this.repository.getResumenWithClient(client, session.id);
      return this.mapSessionDetalle(session, resumen);
    });
  }

  async cerrar(usuarioId: number): Promise<CajaSessionDetalle> {
    return withTransaction(this.pool, async (client) => {
      await this.repository.lockUserCashSessions(client, usuarioId);

      const openSession = await this.repository.findOpenByUsuarioId(client, usuarioId);

      if (!openSession) {
        throw new BadRequestError('El usuario no tiene una caja abierta');
      }

      const resumen = await this.repository.getResumenWithClient(client, openSession.id);
      const resumenFinanciero = this.mapResumen(resumen, Number(openSession.monto_apertura));
      const closed = await this.repository.close(
        client,
        openSession.id,
        resumenFinanciero.monto_esperado_cierre,
      );
      const session = await this.repository.findByIdWithClient(client, closed.id);

      if (!session) {
        throw new NotFoundError('Sesion de caja no encontrada');
      }

      return this.mapSessionDetalle(session, resumen);
    });
  }

  async actual(usuarioId: number): Promise<CajaSessionDetalle | null> {
    const session = await this.repository.findOpenByUsuarioIdReadOnly(usuarioId);

    if (!session) {
      return null;
    }

    const resumen = await this.repository.getResumen(session.id);
    return this.mapSessionDetalle(session, resumen);
  }

  async findAll(
    user: CajaUserContext,
    query: CajaSessionsQuery,
  ): Promise<PaginatedResult<CajaSessionDetalle>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const scopedQuery =
      user.rol === 'OWNER'
        ? query
        : {
            ...query,
            usuario_id: user.id,
          };
    const rows = await this.repository.findAll({ ...scopedQuery, page, limit });
    const total = rows[0] ? Number(rows[0].total_count) : 0;
    const items = await Promise.all(
      rows.map(async (row) => {
        const resumen = await this.repository.getResumen(row.id);
        return this.mapSessionDetalle(row, resumen);
      }),
    );

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findById(user: CajaUserContext, id: number): Promise<CajaSessionDetalle> {
    const session = await this.repository.findById(id);

    if (!session) {
      throw new NotFoundError('Sesion de caja no encontrada');
    }

    if (user.rol !== 'OWNER' && session.usuario_id !== user.id) {
      throw new ForbiddenError('No puedes ver sesiones de caja de otros usuarios');
    }

    const resumen = await this.repository.getResumen(session.id);
    return this.mapSessionDetalle(session, resumen);
  }

  private mapSessionDetalle(
    row: CajaSessionRow | CajaSessionListRow,
    resumen: CajaResumenRow,
  ): CajaSessionDetalle {
    const session = this.mapSession(row);

    return {
      ...session,
      resumen: this.mapResumen(resumen, session.monto_apertura),
    };
  }

  private mapSession(row: CajaSessionRow | CajaSessionListRow): CajaSession {
    return {
      id: row.id,
      usuario_id: row.usuario_id,
      usuario_nombre: row.usuario_nombre,
      monto_apertura: Number(row.monto_apertura),
      monto_cierre: row.monto_cierre === null ? null : Number(row.monto_cierre),
      abierta_en: row.abierta_en.toISOString(),
      cerrada_en: row.cerrada_en?.toISOString() ?? null,
      abierta: row.abierta,
    };
  }

  private mapResumen(row: CajaResumenRow, montoApertura: number): CajaResumenFinanciero {
    const totalVentas = Number(row.total_ventas);

    return {
      cantidad_ventas: Number(row.cantidad_ventas),
      subtotal: Number(row.subtotal),
      descuento: Number(row.descuento),
      total_ventas: totalVentas,
      efectivo: Number(row.efectivo),
      tarjeta: Number(row.tarjeta),
      transferencia: Number(row.transferencia),
      mixto: Number(row.mixto),
      monto_esperado_cierre: this.round(montoApertura + totalVentas, 2),
    };
  }

  private round(value: number, decimals: number): number {
    const factor = 10 ** decimals;
    return Math.round((value + Number.EPSILON) * factor) / factor;
  }
}

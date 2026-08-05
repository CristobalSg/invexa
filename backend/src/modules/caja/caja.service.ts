import type { Pool } from 'pg';

import { BadRequestError, ForbiddenError, NotFoundError } from '../../utils/errors.js';
import { assertValidOwnerPassword } from '../../utils/master-authorization.js';
import { withTransaction } from '../../utils/transactions.js';
import type { CajaRepository } from './caja.repository.js';
import type {
  AbrirCajaBody,
  CajaResumenFinanciero,
  CajaMovimiento,
  CajaMovimientoRow,
  CajaResumenRow,
  CajaSession,
  CajaSessionDetalle,
  CajaSessionListRow,
  CajaSessionRow,
  CajaSessionsQuery,
  CajaUserContext,
  CerrarCajaBody,
  CrearMovimientoCajaBody,
  PaginatedResult,
} from './caja.types.js';

export class CajaService {
  constructor(
    private readonly repository: CajaRepository,
    private readonly pool: Pool,
  ) {}

  async abrir(usuarioId: number, data: AbrirCajaBody, deviceId?: string): Promise<CajaSessionDetalle> {
    return withTransaction(this.pool, async (client) => {
      if (deviceId) {
        await this.repository.lockDeviceCashSessions(client, deviceId);
      } else {
        await this.repository.lockUserCashSessions(client, usuarioId);
      }

      const openSession = deviceId
        ? await this.repository.findOpenByDeviceId(client, deviceId)
        : await this.repository.findOpenByUsuarioId(client, usuarioId);

      if (openSession) {
        throw new BadRequestError('Este equipo ya tiene un turno de caja abierto');
      }

      const created = await this.repository.create(client, usuarioId, data.monto_apertura, deviceId);
      const session = await this.repository.findByIdWithClient(client, created.id);

      if (!session) {
        throw new NotFoundError('Sesion de caja no encontrada');
      }

      const resumen = await this.repository.getResumenWithClient(client, session.id);
      return this.mapSessionDetalle(session, resumen);
    });
  }

  async cerrar(usuarioId: number, data: CerrarCajaBody, deviceId?: string): Promise<CajaSessionDetalle> {
    return withTransaction(this.pool, async (client) => {
      if (deviceId) {
        await this.repository.lockDeviceCashSessions(client, deviceId);
      } else {
        await this.repository.lockUserCashSessions(client, usuarioId);
      }

      const openSession = deviceId
        ? await this.repository.findOpenByDeviceId(client, deviceId)
        : await this.repository.findOpenByUsuarioId(client, usuarioId);

      if (!openSession) {
        throw new BadRequestError('Este equipo no tiene un turno de caja abierto');
      }

      if (openSession.usuario_id !== usuarioId) {
        throw new ForbiddenError('Solo el usuario del turno actual puede cerrar esta caja');
      }

      const resumen = await this.repository.getResumenWithClient(client, openSession.id);
      const resumenFinanciero = this.mapResumen(resumen, Number(openSession.monto_apertura));
      const diferencia = this.round(data.efectivo_contado - resumenFinanciero.monto_esperado_cierre, 2);
      const closed = await this.repository.close(
        client,
        openSession.id,
        data.efectivo_contado,
        resumenFinanciero.monto_esperado_cierre,
        diferencia,
      );
      const session = await this.repository.findByIdWithClient(client, closed.id);

      if (!session) {
        throw new NotFoundError('Sesion de caja no encontrada');
      }

      return this.mapSessionDetalle(session, resumen);
    });
  }

  async crearMovimiento(
    usuarioId: number,
    data: CrearMovimientoCajaBody,
    deviceId?: string,
  ): Promise<CajaMovimiento> {
    if (data.monto <= 0) {
      throw new BadRequestError('El monto debe ser mayor a 0');
    }

    await assertValidOwnerPassword(this.pool, data.master_password);

    return withTransaction(this.pool, async (client) => {
      if (deviceId) {
        await this.repository.lockDeviceCashSessions(client, deviceId);
      } else {
        await this.repository.lockUserCashSessions(client, usuarioId);
      }

      const openSession = deviceId
        ? await this.repository.findOpenByDeviceId(client, deviceId)
        : await this.repository.findOpenByUsuarioId(client, usuarioId);

      if (!openSession) {
        throw new BadRequestError('Este equipo no tiene un turno de caja abierto');
      }

      if (openSession.usuario_id !== usuarioId) {
        throw new ForbiddenError('Solo el usuario del turno actual puede registrar movimientos');
      }

      const movimiento = await this.repository.createMovimiento(client, openSession.id, usuarioId, data);
      const rows = await this.repository.findMovimientosBySessionId(openSession.id);
      return this.mapMovimiento(rows.find((row) => row.id === movimiento.id) ?? movimiento);
    });
  }

  async listMovimientosActual(usuarioId: number, deviceId?: string): Promise<CajaMovimiento[]> {
    const session = deviceId
      ? await this.repository.findOpenByDeviceIdReadOnly(deviceId)
      : await this.repository.findOpenByUsuarioIdReadOnly(usuarioId);

    if (!session || session.usuario_id !== usuarioId) {
      return [];
    }

    const movimientos = await this.repository.findMovimientosBySessionId(session.id);
    return movimientos.map((row) => this.mapMovimiento(row));
  }

  async actual(usuarioId: number, deviceId?: string): Promise<CajaSessionDetalle | null> {
    const session = deviceId
      ? await this.repository.findOpenByDeviceIdReadOnly(deviceId)
      : await this.repository.findOpenByUsuarioIdReadOnly(usuarioId);

    if (!session) {
      return null;
    }

    if (session.usuario_id !== usuarioId) {
      throw new ForbiddenError('Este equipo tiene un turno abierto de otro usuario');
    }

    const resumen = await this.repository.getResumen(session.id);
    const movimientos = await this.repository.findMovimientosBySessionId(session.id);
    return this.mapSessionDetalle(session, resumen, movimientos);
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
        const movimientos = await this.repository.findMovimientosBySessionId(row.id);
        return this.mapSessionDetalle(row, resumen, movimientos);
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
    const movimientos = await this.repository.findMovimientosBySessionId(session.id);
    return this.mapSessionDetalle(session, resumen, movimientos);
  }

  private mapSessionDetalle(
    row: CajaSessionRow | CajaSessionListRow,
    resumen: CajaResumenRow,
    movimientos?: CajaMovimientoRow[],
  ): CajaSessionDetalle {
    const session = this.mapSession(row);

    return {
      ...session,
      resumen: {
        ...this.mapResumen(resumen, session.monto_apertura),
        diferencia_cierre: session.diferencia_cierre,
      },
      movimientos: (movimientos ?? []).map((movimiento) => this.mapMovimiento(movimiento)),
    };
  }

  private mapSession(row: CajaSessionRow | CajaSessionListRow): CajaSession {
    return {
      id: row.id,
      usuario_id: row.usuario_id,
      usuario_nombre: row.usuario_nombre,
      dispositivo_id: row.dispositivo_id,
      monto_apertura: Number(row.monto_apertura),
      monto_cierre: row.monto_cierre === null ? null : Number(row.monto_cierre),
      monto_esperado: row.monto_esperado === null ? null : Number(row.monto_esperado),
      diferencia_cierre: row.diferencia_cierre === null ? null : Number(row.diferencia_cierre),
      abierta_en: row.abierta_en.toISOString(),
      cerrada_en: row.cerrada_en?.toISOString() ?? null,
      abierta: row.abierta,
    };
  }

  private mapResumen(row: CajaResumenRow, montoApertura: number): CajaResumenFinanciero {
    const totalVentas = Number(row.total_ventas);
    const ingresos = Number(row.ingresos);
    const egresos = Number(row.egresos);
    const montoEsperadoCierre = this.round(montoApertura + ingresos + Number(row.efectivo) - egresos, 2);

    return {
      cantidad_ventas: Number(row.cantidad_ventas),
      subtotal: Number(row.subtotal),
      descuento: Number(row.descuento),
      total_ventas: totalVentas,
      efectivo: Number(row.efectivo),
      tarjeta: Number(row.tarjeta),
      transferencia: Number(row.transferencia),
      mixto: Number(row.mixto),
      ingresos,
      egresos,
      monto_esperado_cierre: montoEsperadoCierre,
      diferencia_cierre: null,
    };
  }

  private mapMovimiento(row: CajaMovimientoRow): CajaMovimiento {
    return {
      id: row.id,
      sesion_caja_id: row.sesion_caja_id,
      usuario_id: row.usuario_id,
      usuario_nombre: row.usuario_nombre,
      tipo: row.tipo,
      categoria: row.categoria,
      monto: Number(row.monto),
      descripcion: row.descripcion,
      creado_en: row.creado_en.toISOString(),
    };
  }

  private round(value: number, decimals: number): number {
    const factor = 10 ** decimals;
    return Math.round((value + Number.EPSILON) * factor) / factor;
  }
}

import type { FastifyBaseLogger } from 'fastify';
import type { Pool } from 'pg';

import { BadRequestError, ForbiddenError, NotFoundError } from '../../utils/errors.js';
import { assertValidOwnerPassword } from '../../utils/master-authorization.js';
import { withTransaction } from '../../utils/transactions.js';
import type { MailService } from '../../services/mail.service.js';
import type { CajaRepository } from './caja.repository.js';
import type {
  AbrirCajaBody,
  CajaCierreCorreoResumen,
  CajaConsignacionProveedorVenta,
  CajaConsignacionProveedorVentaRow,
  CajaConsignacionProveedorVentas,
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
  EditarMovimientoCajaBody,
  EliminarMovimientoCajaBody,
  ForzarCerrarCajaBody,
  PaginatedResult,
} from './caja.types.js';

export class CajaService {
  constructor(
    private readonly repository: CajaRepository,
    private readonly pool: Pool,
    private readonly mailService?: MailService,
    private readonly logger?: FastifyBaseLogger,
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
    const session = await withTransaction(this.pool, async (client) => {
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

    const notificacionCorreos = await this.sendCashCloseEmailSafely(session);
    return { ...session, notificacion_correos: notificacionCorreos };
  }

  async forzarCerrar(data: ForzarCerrarCajaBody, deviceId?: string): Promise<CajaSessionDetalle> {
    if (!deviceId) {
      throw new BadRequestError('Este equipo no esta autorizado');
    }

    await assertValidOwnerPassword(this.pool, data.master_password);

    const session = await withTransaction(this.pool, async (client) => {
      await this.repository.lockDeviceCashSessions(client, deviceId);

      const openSession = await this.repository.findOpenByDeviceId(client, deviceId);

      if (!openSession) {
        throw new BadRequestError('Este equipo no tiene un turno de caja abierto');
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

    const notificacionCorreos = await this.sendCashCloseEmailSafely(session);
    return { ...session, notificacion_correos: notificacionCorreos };
  }

  async crearMovimiento(
    usuarioId: number,
    rol: CajaUserContext['rol'],
    data: CrearMovimientoCajaBody,
    deviceId?: string,
  ): Promise<CajaMovimiento> {
    if (data.monto <= 0) {
      throw new BadRequestError('El monto debe ser mayor a 0');
    }

    if (rol === 'OWNER') {
      await assertValidOwnerPassword(this.pool, data.master_password ?? '');
    }

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

  async editarMovimiento(
    usuarioId: number,
    movimientoId: number,
    data: EditarMovimientoCajaBody,
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
        throw new ForbiddenError('Solo el usuario del turno actual puede editar movimientos');
      }

      const movimiento = await this.repository.findMovimientoByIdForUpdate(client, movimientoId);

      if (!movimiento || movimiento.sesion_caja_id !== openSession.id) {
        throw new NotFoundError('Movimiento de caja no encontrado');
      }

      const movimientoEditado = await this.repository.updateMovimiento(
        client,
        movimientoId,
        data,
      );

      if (!movimientoEditado) {
        throw new NotFoundError('Movimiento de caja no encontrado');
      }

      return this.mapMovimiento(movimientoEditado);
    });
  }

  async eliminarMovimiento(
    usuarioId: number,
    movimientoId: number,
    data: EliminarMovimientoCajaBody,
    deviceId?: string,
  ): Promise<CajaMovimiento> {
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
        throw new ForbiddenError('Solo el usuario del turno actual puede eliminar movimientos');
      }

      const movimiento = await this.repository.findMovimientoByIdForUpdate(client, movimientoId);

      if (!movimiento || movimiento.sesion_caja_id !== openSession.id) {
        throw new NotFoundError('Movimiento de caja no encontrado');
      }

      const movimientoEliminado = await this.repository.deleteMovimiento(client, movimientoId);

      if (!movimientoEliminado) {
        throw new NotFoundError('Movimiento de caja no encontrado');
      }

      return this.mapMovimiento(movimientoEliminado);
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

  async reenviarCorreoCierre(user: CajaUserContext, id: number): Promise<CajaSessionDetalle> {
    const session = await this.findById(user, id);

    if (session.abierta || !session.cerrada_en) {
      throw new BadRequestError('Solo se pueden reenviar correos de cajas cerradas');
    }

    const notificacionCorreos = await this.sendCashCloseEmailSafely(session);
    return { ...session, notificacion_correos: notificacionCorreos };
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
      ventas_propias: Number(row.ventas_propias),
      ventas_consignacion: Number(row.ventas_consignacion),
      consignacion_proveedores: this.parseConsignacionProveedores(row.consignacion_proveedores),
      ingresos,
      egresos,
      monto_esperado_cierre: montoEsperadoCierre,
      diferencia_cierre: null,
    };
  }

  private parseConsignacionProveedores(value: string | null): CajaResumenFinanciero['consignacion_proveedores'] {
    if (!value) {
      return [];
    }

    try {
      const parsed = JSON.parse(value) as Array<{
        proveedor_id?: number | null;
        proveedor_nombre?: string;
        total?: string | number;
      }>;

      if (!Array.isArray(parsed)) {
        return [];
      }

      return parsed.map((item) => ({
        proveedor_id: item.proveedor_id ?? null,
        proveedor_nombre: item.proveedor_nombre ?? 'Sin proveedor',
        total: Number(item.total ?? 0),
      }));
    } catch {
      return [];
    }
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

  private async sendCashCloseEmailSafely(session: CajaSessionDetalle): Promise<CajaCierreCorreoResumen> {
    const summary: CajaCierreCorreoResumen = {
      sistema_enviado: false,
      proveedores_enviados: 0,
      proveedores_omitidos: 0,
      proveedores_fallidos: 0,
    };

    if (!this.mailService) {
      return summary;
    }

    try {
      summary.sistema_enviado = await this.mailService.sendCashCloseEmail(session);
    } catch (error) {
      this.logger?.error({ error, caja_session_id: session.id }, 'Error sending cash close email');
    }

    let consignmentRows: CajaConsignacionProveedorVentaRow[] = [];

    try {
      consignmentRows = await this.repository.findConsignacionVentasBySessionId(session.id);
    } catch (error) {
      this.logger?.error(
        { error, caja_session_id: session.id },
        'Error loading consignment provider sales for cash close email',
      );
      return summary;
    }

    for (const providerSales of this.groupConsignmentSalesByProvider(consignmentRows)) {
      const email = providerSales.proveedor_email?.trim();

      if (!email || !this.mailService.isValidEmail(email)) {
        this.logger?.warn(
          {
            caja_session_id: session.id,
            proveedor_id: providerSales.proveedor_id,
            proveedor_nombre: providerSales.proveedor_nombre,
            proveedor_numero: providerSales.proveedor_email,
          },
          'Proveedor sin correo valido en campo numero/telefono. Email de consignacion omitido.',
        );
        summary.proveedores_omitidos += 1;
        continue;
      }

      try {
        const sent = await this.mailService.sendConsignmentProviderCashCloseEmail(email, session, providerSales);
        if (sent) {
          summary.proveedores_enviados += 1;
        } else {
          summary.proveedores_omitidos += 1;
        }
      } catch (error) {
        summary.proveedores_fallidos += 1;
        this.logger?.error(
          {
            error,
            caja_session_id: session.id,
            proveedor_id: providerSales.proveedor_id,
            proveedor_nombre: providerSales.proveedor_nombre,
          },
          'Error sending consignment provider cash close email',
        );
      }
    }

    return summary;
  }

  private groupConsignmentSalesByProvider(
    rows: CajaConsignacionProveedorVentaRow[],
  ): CajaConsignacionProveedorVentas[] {
    const byProvider = new Map<string, {
      proveedor_id: number | null;
      proveedor_nombre: string;
      proveedor_email: string | null;
      items: CajaConsignacionProveedorVenta[];
    }>();

    for (const row of rows) {
      const key = row.proveedor_id === null ? 'sin-proveedor' : String(row.proveedor_id);
      const current = byProvider.get(key) ?? {
        proveedor_id: row.proveedor_id,
        proveedor_nombre: row.proveedor_nombre,
        proveedor_email: row.proveedor_email,
        items: [],
      };

      current.items.push({
        producto_id: row.producto_id,
        producto_nombre: row.producto_nombre,
        producto_unidad_venta: row.producto_unidad_venta,
        precio_unitario: Number(row.precio_unitario),
        cantidad: Number(row.cantidad),
        subtotal: Number(row.subtotal),
        descuento: Number(row.descuento),
        total_final: Number(row.total_final),
      });

      byProvider.set(key, current);
    }

    return Array.from(byProvider.values()).map((provider) => ({
      ...provider,
      total: this.round(
        provider.items.reduce((sum, item) => sum + item.total_final, 0),
        2,
      ),
    }));
  }
}

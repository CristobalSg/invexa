import type { Pool } from 'pg';

import { BadRequestError, NotFoundError } from '../../utils/errors.js';
import { assertValidOwnerPassword } from '../../utils/master-authorization.js';
import { withTransaction } from '../../utils/transactions.js';
import type { VentasRepository } from './ventas.repository.js';
import type {
  AnularVentaBody,
  CreateVentaBody,
  DetalleVenta,
  DetalleVentaRow,
  MovimientoVenta,
  MovimientoVentaRow,
  PaginatedResult,
  PaginationQuery,
  Venta,
  VentaDetalle,
  VentaListRow,
  VentaProductoRow,
  VentaRow,
} from './ventas.types.js';

export class VentasService {
  constructor(
    private readonly repository: VentasRepository,
    private readonly pool: Pool,
  ) {}

  async create(usuarioId: number, data: CreateVentaBody, deviceId?: string): Promise<VentaDetalle> {
    this.validateUniqueProducts(data);
    const modalidad = data.modalidad ?? 'NORMAL';

    if (modalidad !== 'NORMAL') {
      await assertValidOwnerPassword(this.pool, data.master_password);
    }

    return withTransaction(this.pool, async (client) => {
      const sesionCaja = await this.repository.findOpenCashSessionForUpdate(client, usuarioId, deviceId);

      if (!sesionCaja) {
        throw new BadRequestError('Este equipo no tiene un turno de caja abierto');
      }

      if (sesionCaja.usuario_id !== usuarioId) {
        throw new BadRequestError('El turno abierto pertenece a otro usuario');
      }

      const preparedItems: Array<{
        readonly producto: VentaProductoRow;
        readonly ofertaId: number | null;
        readonly cantidad: number;
        readonly precioUnitario: number;
        readonly subtotal: number;
        readonly precioNormal: number;
        readonly descuento: number;
        readonly totalFinal: number;
        readonly actualizaInventario: boolean;
        readonly stockAnterior: number;
        readonly stockNuevo: number;
      }> = [];

      let subtotalVenta = 0;

      for (const item of data.items) {
        const producto = await this.repository.findProductoForUpdate(client, item.producto_id);

        if (!producto) {
          throw new BadRequestError(`Producto ${item.producto_id} no existe`);
        }

        if (!producto.activo) {
          throw new BadRequestError(`Producto ${producto.nombre} esta inactivo`);
        }

        const stockAnterior = Number(producto.stock);
        const actualizaInventario = producto.modo_inventario !== 'SIN_INVENTARIO';
        const stockNuevo = actualizaInventario
          ? this.round(stockAnterior - item.cantidad, 3)
          : stockAnterior;

        if (producto.modo_inventario === 'ESTRICTO' && stockAnterior < item.cantidad) {
          throw new BadRequestError(`Stock insuficiente para ${producto.nombre}`);
        }

        const oferta = modalidad === 'NORMAL'
          ? await this.repository.findActiveOffer(client, producto.id)
          : null;
        const precioUnitario = this.getPrecioUnitario(producto, modalidad);
        const precioOferta = this.calculateOfferPrice(item.cantidad, precioUnitario, oferta);
        const subtotal = this.round(precioUnitario * item.cantidad, 2);
        const descuento = this.round(Math.max(0, subtotal - precioOferta), 2);
        const totalFinal = this.round(subtotal - descuento, 2);

        preparedItems.push({
          producto,
          ofertaId: descuento > 0 ? (oferta?.id ?? null) : null,
          cantidad: item.cantidad,
          precioUnitario,
          subtotal,
          precioNormal: precioUnitario,
          descuento,
          totalFinal,
          actualizaInventario,
          stockAnterior,
          stockNuevo,
        });

        subtotalVenta = this.round(subtotalVenta + subtotal, 2);
      }

      const descuentoOfertas = this.round(
        preparedItems.reduce((total, item) => total + item.descuento, 0),
        2,
      );
      const descuentoManual = modalidad === 'NORMAL' ? (data.descuento ?? 0) : 0;
      const descuento = modalidad === 'RETIRO_DUENO'
        ? subtotalVenta
        : this.round(descuentoOfertas + descuentoManual, 2);

      if ((data.descuento ?? 0) > 0 && modalidad !== 'NORMAL') {
        throw new BadRequestError('Las ventas administrativas no aceptan descuento manual');
      }

      if (descuento > subtotalVenta) {
        throw new BadRequestError('El descuento no puede superar el subtotal');
      }

      const totalSinRedondeo = this.round(subtotalVenta - descuento, 2);
      const redondeo = data.metodo_pago === 'EFECTIVO' && modalidad !== 'RETIRO_DUENO'
        ? this.round(this.roundToNearestTen(totalSinRedondeo) - totalSinRedondeo, 2)
        : 0;
      const total = this.round(totalSinRedondeo + redondeo, 2);
      const montoRecibido = data.metodo_pago === 'EFECTIVO' && modalidad !== 'RETIRO_DUENO'
        ? data.monto_recibido
        : undefined;
      const vuelto = montoRecibido === undefined ? null : this.round(montoRecibido - total, 2);

      if (data.metodo_pago === 'EFECTIVO' && modalidad !== 'RETIRO_DUENO') {
        if (montoRecibido === undefined) {
          throw new BadRequestError('Debes ingresar el monto recibido en efectivo');
        }

        if (montoRecibido < total) {
          throw new BadRequestError('El monto recibido no alcanza para pagar la venta');
        }
      }

      const venta = await this.repository.createVenta(client, {
        usuarioId,
        sesionCajaId: sesionCaja.id,
        metodoPago: data.metodo_pago,
        subtotal: subtotalVenta,
        descuento,
        totalSinRedondeo,
        redondeo,
        total,
        montoRecibido: montoRecibido ?? null,
        vuelto,
        modalidad,
      });

      for (const item of preparedItems) {
        await this.repository.createDetalle(client, {
          ventaId: venta.id,
          productoId: item.producto.id,
          ofertaId: item.ofertaId,
          cantidad: item.cantidad,
          precioUnitario: item.precioUnitario,
          subtotal: item.subtotal,
          precioNormal: item.precioNormal,
          descuento: item.descuento,
          totalFinal: item.totalFinal,
          tipoPropiedad: item.producto.tipo_propiedad,
          proveedorId: item.producto.proveedor_id,
        });

        if (item.actualizaInventario) {
          await this.repository.updateProductoStock(client, {
            productoId: item.producto.id,
            stockNuevo: item.stockNuevo,
          });

          await this.repository.createMovimientoVenta(client, {
            productoId: item.producto.id,
            usuarioId,
            cantidad: item.cantidad,
            stockAnterior: item.stockAnterior,
            stockNuevo: item.stockNuevo,
            ventaId: venta.id,
            motivo: `Venta #${venta.id}`,
          });
        }
      }

      const ventaCompleta = await this.repository.findByIdWithClient(client, venta.id);

      if (!ventaCompleta) {
        throw new NotFoundError('Venta no encontrada');
      }

      const detalles = await this.repository.findDetallesByVentaIdWithClient(client, venta.id);
      const movimientos = await this.repository.findMovimientosByVentaIdWithClient(
        client,
        venta.id,
      );

      return this.mapVentaDetalle(ventaCompleta, detalles, movimientos);
    });
  }

  async findAll(query: PaginationQuery): Promise<PaginatedResult<Venta>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const rows = await this.repository.findAll({ ...query, page, limit });
    const total = rows[0] ? Number(rows[0].total_count) : 0;

    return {
      items: rows.map((row) => this.mapVenta(row)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findById(id: number): Promise<VentaDetalle> {
    const venta = await this.repository.findById(id);

    if (!venta) {
      throw new NotFoundError('Venta no encontrada');
    }

    const detalles = await this.repository.findDetallesByVentaId(id);
    const movimientos = await this.repository.findMovimientosByVentaId(id);

    return this.mapVentaDetalle(venta, detalles, movimientos);
  }

  async anular(ventaId: number, usuarioId: number, data: AnularVentaBody): Promise<VentaDetalle> {
    await assertValidOwnerPassword(this.pool, data.master_password);

    return withTransaction(this.pool, async (client) => {
      const venta = await this.repository.findVentaForUpdate(client, ventaId);

      if (!venta) {
        throw new NotFoundError('Venta no encontrada');
      }

      if (venta.estado !== 'COMPLETADA') {
        throw new BadRequestError('La venta ya fue anulada');
      }

      const detalles = await this.repository.findDetallesByVentaIdWithClient(client, venta.id);

      for (const detalle of detalles) {
        const producto = await this.repository.findProductoForUpdate(client, detalle.producto_id);

        if (!producto) {
          throw new BadRequestError(`Producto ${detalle.producto_id} no existe`);
        }

        if (producto.modo_inventario === 'SIN_INVENTARIO') {
          continue;
        }

        const cantidad = Number(detalle.cantidad);
        const stockAnterior = Number(producto.stock);
        const stockNuevo = this.round(stockAnterior + cantidad, 3);

        await this.repository.addProductoStock(client, {
          productoId: producto.id,
          stockNuevo,
        });

        await this.repository.createMovimientoAnulacion(client, {
          productoId: producto.id,
          usuarioId,
          cantidad,
          stockAnterior,
          stockNuevo,
          ventaId: venta.id,
          motivo: data.motivo,
        });
      }

      await this.repository.updateVentaAnulada(client, {
        ventaId: venta.id,
        anuladaPor: usuarioId,
        motivo: data.motivo,
      });

      const ventaAnulada = await this.repository.findByIdWithClient(client, venta.id);

      if (!ventaAnulada) {
        throw new NotFoundError('Venta no encontrada');
      }

      const detallesActualizados = await this.repository.findDetallesByVentaIdWithClient(
        client,
        venta.id,
      );
      const movimientos = await this.repository.findMovimientosByVentaIdWithClient(
        client,
        venta.id,
      );

      return this.mapVentaDetalle(ventaAnulada, detallesActualizados, movimientos);
    });
  }

  private validateUniqueProducts(data: CreateVentaBody): void {
    const productIds = new Set<number>();

    for (const item of data.items) {
      if (productIds.has(item.producto_id)) {
        throw new BadRequestError('No se puede repetir el mismo producto en una venta');
      }

      productIds.add(item.producto_id);
    }
  }

  private mapVenta(row: VentaRow | VentaListRow): Venta {
    return {
      id: row.id,
      usuario_id: row.usuario_id,
      usuario_nombre: row.usuario_nombre,
      sesion_caja_id: row.sesion_caja_id,
      metodo_pago: row.metodo_pago,
      subtotal: Number(row.subtotal),
      descuento: Number(row.descuento),
      total_sin_redondeo: Number(row.total_sin_redondeo),
      redondeo: Number(row.redondeo),
      total: Number(row.total),
      monto_recibido: row.monto_recibido === null ? null : Number(row.monto_recibido),
      vuelto: row.vuelto === null ? null : Number(row.vuelto),
      modalidad: row.modalidad,
      estado: row.estado,
      anulada_en: row.anulada_en?.toISOString() ?? null,
      anulada_por: row.anulada_por,
      motivo_anulacion: row.motivo_anulacion,
      creado_en: row.creado_en.toISOString(),
    };
  }

  private mapVentaDetalle(
    venta: VentaRow,
    detalles: DetalleVentaRow[],
    movimientos: MovimientoVentaRow[],
  ): VentaDetalle {
    return {
      ...this.mapVenta(venta),
      detalles: detalles.map((detalle) => this.mapDetalle(detalle)),
      movimientos: movimientos.map((movimiento) => this.mapMovimiento(movimiento)),
    };
  }

  private mapDetalle(row: DetalleVentaRow): DetalleVenta {
    return {
      id: row.id,
      venta_id: row.venta_id,
      producto_id: row.producto_id,
      producto_nombre: row.producto_nombre,
      oferta_id: row.oferta_id,
      cantidad: Number(row.cantidad),
      precio_unitario: Number(row.precio_unitario),
      subtotal: Number(row.subtotal),
      precio_normal: Number(row.precio_normal),
      descuento: Number(row.descuento),
      total_final: Number(row.total_final),
      tipo_propiedad: row.tipo_propiedad,
      proveedor_id: row.proveedor_id,
      proveedor_nombre: row.proveedor_nombre,
    };
  }

  private mapMovimiento(row: MovimientoVentaRow): MovimientoVenta {
    return {
      id: row.id,
      producto_id: row.producto_id,
      tipo: row.tipo,
      cantidad: Number(row.cantidad),
      stock_anterior: row.stock_anterior === null ? null : Number(row.stock_anterior),
      stock_nuevo: row.stock_nuevo === null ? null : Number(row.stock_nuevo),
      venta_id: row.venta_id,
      creado_en: row.creado_en.toISOString(),
    };
  }

  private round(value: number, decimals: number): number {
    const factor = 10 ** decimals;
    return Math.round((value + Number.EPSILON) * factor) / factor;
  }

  private roundToNearestTen(value: number): number {
    return Math.round(value / 10) * 10;
  }

  private getPrecioUnitario(
    producto: VentaProductoRow,
    modalidad: string,
  ): number {
    if (modalidad === 'PRECIO_COSTO' || modalidad === 'RETIRO_DUENO') {
      if (producto.costo_actual === null) {
        throw new BadRequestError(`Producto ${producto.nombre} no tiene costo registrado`);
      }

      return Number(producto.costo_actual);
    }

    return Number(producto.precio_venta);
  }

  private calculateOfferPrice(
    cantidad: number,
    precioUnitario: number,
    oferta: { readonly cantidad_oferta: string; readonly precio_oferta: string } | null,
  ): number {
    if (!oferta) {
      return this.round(cantidad * precioUnitario, 2);
    }

    const cantidadOferta = Number(oferta.cantidad_oferta);

    if (cantidadOferta <= 0 || cantidad < cantidadOferta) {
      return this.round(cantidad * precioUnitario, 2);
    }

    const gruposOferta = Math.floor((cantidad + Number.EPSILON) / cantidadOferta);
    const cantidadEnOferta = this.round(gruposOferta * cantidadOferta, 3);
    const cantidadRestante = this.round(Math.max(0, cantidad - cantidadEnOferta), 3);
    const totalOferta = gruposOferta * Number(oferta.precio_oferta);
    const totalRestante = cantidadRestante * precioUnitario;

    return this.round(totalOferta + totalRestante, 2);
  }
}

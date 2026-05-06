import type { Pool } from 'pg';

import { BadRequestError, NotFoundError } from '../../utils/errors.js';
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

  async create(usuarioId: number, data: CreateVentaBody): Promise<VentaDetalle> {
    this.validateUniqueProducts(data);

    return withTransaction(this.pool, async (client) => {
      const sesionCaja = await this.repository.findOpenCashSessionForUpdate(client, usuarioId);

      if (!sesionCaja) {
        throw new BadRequestError('El usuario no tiene una caja abierta');
      }

      const preparedItems: Array<{
        readonly producto: VentaProductoRow;
        readonly ofertaId: number | null;
        readonly cantidad: number;
        readonly precioUnitario: number;
        readonly subtotal: number;
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

        if (stockAnterior < item.cantidad) {
          throw new BadRequestError(`Stock insuficiente para ${producto.nombre}`);
        }

        const stockNuevo = this.round(stockAnterior - item.cantidad, 3);

        if (stockNuevo < 0) {
          throw new BadRequestError(`La venta dejaria stock negativo para ${producto.nombre}`);
        }

        const oferta = await this.repository.findActiveOffer(client, producto.id);
        const precioUnitario = oferta
          ? Number(oferta.precio_oferta)
          : Number(producto.precio_venta);
        const subtotal = this.round(precioUnitario * item.cantidad, 2);

        preparedItems.push({
          producto,
          ofertaId: oferta?.id ?? null,
          cantidad: item.cantidad,
          precioUnitario,
          subtotal,
          stockAnterior,
          stockNuevo,
        });

        subtotalVenta = this.round(subtotalVenta + subtotal, 2);
      }

      const descuento = data.descuento ?? 0;

      if (descuento > subtotalVenta) {
        throw new BadRequestError('El descuento no puede superar el subtotal');
      }

      const total = this.round(subtotalVenta - descuento, 2);
      const venta = await this.repository.createVenta(client, {
        usuarioId,
        sesionCajaId: sesionCaja.id,
        metodoPago: data.metodo_pago,
        subtotal: subtotalVenta,
        descuento,
        total,
      });

      for (const item of preparedItems) {
        await this.repository.createDetalle(client, {
          ventaId: venta.id,
          productoId: item.producto.id,
          ofertaId: item.ofertaId,
          cantidad: item.cantidad,
          precioUnitario: item.precioUnitario,
          subtotal: item.subtotal,
          tipoPropiedad: item.producto.tipo_propiedad,
          proveedorId: item.producto.proveedor_id,
        });

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
      total: Number(row.total),
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
}

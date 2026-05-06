import type { Pool } from 'pg';

import { BadRequestError, NotFoundError } from '../../utils/errors.js';
import { withTransaction } from '../../utils/transactions.js';
import type { ComprasRepository } from './compras.repository.js';
import type {
  Compra,
  CompraDetalle,
  CompraListRow,
  CompraRow,
  CreateCompraBody,
  DetalleCompra,
  DetalleCompraRow,
  MovimientoCompra,
  MovimientoCompraRow,
  PaginatedResult,
  PaginationQuery,
} from './compras.types.js';

export class ComprasService {
  constructor(
    private readonly repository: ComprasRepository,
    private readonly pool: Pool,
  ) {}

  async create(usuarioId: number, data: CreateCompraBody): Promise<CompraDetalle> {
    this.validateUniqueProducts(data);

    return withTransaction(this.pool, async (client) => {
      const compra = await this.repository.createCompra(client, usuarioId);
      let totalCosto = 0;

      for (const item of data.items) {
        const producto = await this.repository.findProductoForUpdate(client, item.producto_id);

        if (!producto) {
          throw new BadRequestError(`Producto ${item.producto_id} no existe`);
        }

        const stockAnterior = Number(producto.stock);
        const stockNuevo = this.round(stockAnterior + item.cantidad, 3);
        const costoAnterior = producto.costo_actual === null ? null : Number(producto.costo_actual);
        const precioAnterior = Number(producto.precio_venta);
        const multiplicadorGanancia = Number(producto.multiplicador_ganancia);
        const variacionMaximaPrecio = Number(producto.variacion_maxima_precio);
        const precioSugerido = this.round(item.costo_unitario * multiplicadorGanancia, 2);
        const precioFinal = item.precio_final ?? precioSugerido;
        const subtotalCosto = this.round(item.cantidad * item.costo_unitario, 2);
        const variacionPrecio =
          precioAnterior > 0
            ? this.round((precioFinal - precioAnterior) / precioAnterior, 4)
            : null;
        const tieneAlertaPrecio =
          variacionPrecio !== null && Math.abs(variacionPrecio) > variacionMaximaPrecio;
        const shouldUpdatePrecioVenta = item.actualizar_precio_venta ?? true;

        await this.repository.createDetalle(client, {
          compraId: compra.id,
          productoId: item.producto_id,
          cantidad: item.cantidad,
          costoUnitario: item.costo_unitario,
          costoAnterior,
          precioAnterior,
          precioSugerido,
          precioFinal,
          variacionPrecio,
          tieneAlertaPrecio,
          subtotalCosto,
        });

        await this.repository.updateProductoAfterPurchase(client, {
          productoId: item.producto_id,
          stockNuevo,
          costoActual: item.costo_unitario,
          precioVenta: precioFinal,
          shouldUpdatePrecioVenta,
        });

        await this.repository.createMovimientoCompra(client, {
          productoId: item.producto_id,
          usuarioId,
          cantidad: item.cantidad,
          stockAnterior,
          stockNuevo,
          compraId: compra.id,
          motivo: `Compra #${compra.id}`,
        });

        totalCosto = this.round(totalCosto + subtotalCosto, 2);
      }

      await this.repository.updateCompraTotal(client, compra.id, totalCosto);

      const compraCompleta = await this.repository.findByIdWithClient(client, compra.id);

      if (!compraCompleta) {
        throw new NotFoundError('Compra no encontrada');
      }

      const detalles = await this.repository.findDetallesByCompraIdWithClient(client, compra.id);
      const movimientos = await this.repository.findMovimientosByCompraIdWithClient(
        client,
        compra.id,
      );

      return this.mapCompraDetalle(compraCompleta, detalles, movimientos);
    });
  }

  async findAll(query: PaginationQuery): Promise<PaginatedResult<Compra>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const rows = await this.repository.findAll({ ...query, page, limit });
    const total = rows[0] ? Number(rows[0].total_count) : 0;

    return {
      items: rows.map((row) => this.mapCompra(row)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findById(id: number): Promise<CompraDetalle> {
    const compra = await this.repository.findById(id);

    if (!compra) {
      throw new NotFoundError('Compra no encontrada');
    }

    const detalles = await this.repository.findDetallesByCompraId(id);
    const movimientos = await this.repository.findMovimientosByCompraId(id);

    return this.mapCompraDetalle(compra, detalles, movimientos);
  }

  private validateUniqueProducts(data: CreateCompraBody): void {
    const productIds = new Set<number>();

    for (const item of data.items) {
      if (productIds.has(item.producto_id)) {
        throw new BadRequestError('No se puede repetir el mismo producto en una compra');
      }

      productIds.add(item.producto_id);
    }
  }

  private mapCompra(row: CompraRow | CompraListRow): Compra {
    return {
      id: row.id,
      usuario_id: row.usuario_id,
      usuario_nombre: row.usuario_nombre,
      total_costo: Number(row.total_costo),
      creado_en: row.creado_en.toISOString(),
    };
  }

  private mapCompraDetalle(
    compra: CompraRow,
    detalles: DetalleCompraRow[],
    movimientos: MovimientoCompraRow[],
  ): CompraDetalle {
    return {
      ...this.mapCompra(compra),
      detalles: detalles.map((detalle) => this.mapDetalle(detalle)),
      movimientos: movimientos.map((movimiento) => this.mapMovimiento(movimiento)),
    };
  }

  private mapDetalle(row: DetalleCompraRow): DetalleCompra {
    return {
      id: row.id,
      compra_id: row.compra_id,
      producto_id: row.producto_id,
      producto_nombre: row.producto_nombre,
      cantidad: Number(row.cantidad),
      costo_unitario: Number(row.costo_unitario),
      costo_anterior: row.costo_anterior === null ? null : Number(row.costo_anterior),
      precio_anterior: row.precio_anterior === null ? null : Number(row.precio_anterior),
      precio_sugerido: Number(row.precio_sugerido),
      precio_final: Number(row.precio_final),
      variacion_precio: row.variacion_precio === null ? null : Number(row.variacion_precio),
      tiene_alerta_precio: row.tiene_alerta_precio,
      subtotal_costo: Number(row.subtotal_costo),
    };
  }

  private mapMovimiento(row: MovimientoCompraRow): MovimientoCompra {
    return {
      id: row.id,
      producto_id: row.producto_id,
      tipo: row.tipo,
      cantidad: Number(row.cantidad),
      stock_anterior: row.stock_anterior === null ? null : Number(row.stock_anterior),
      stock_nuevo: row.stock_nuevo === null ? null : Number(row.stock_nuevo),
      compra_id: row.compra_id,
      creado_en: row.creado_en.toISOString(),
    };
  }

  private round(value: number, decimals: number): number {
    const factor = 10 ** decimals;
    return Math.round((value + Number.EPSILON) * factor) / factor;
  }
}

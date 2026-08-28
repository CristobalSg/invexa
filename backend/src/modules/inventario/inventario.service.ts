import type { InventarioRepository } from './inventario.repository.js';
import type {
  MovimientoInventario,
  MovimientoInventarioRow,
  MovimientosQuery,
  PaginatedResult,
} from './inventario.types.js';

export class InventarioService {
  constructor(private readonly repository: InventarioRepository) {}

  async findMovimientos(query: MovimientosQuery): Promise<PaginatedResult<MovimientoInventario>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const rows = await this.repository.findMovimientos({ ...query, page, limit });
    const total = rows[0] ? Number(rows[0].total_count) : 0;

    return {
      items: rows.map((row) => this.mapMovimiento(row)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  private mapMovimiento(row: MovimientoInventarioRow): MovimientoInventario {
    return {
      id: row.id,
      producto_id: row.producto_id,
      producto_nombre: row.producto_nombre,
      usuario_id: row.usuario_id,
      usuario_nombre: row.usuario_nombre,
      tipo: row.tipo,
      cantidad: Number(row.cantidad),
      stock_anterior: row.stock_anterior === null ? null : Number(row.stock_anterior),
      stock_nuevo: row.stock_nuevo === null ? null : Number(row.stock_nuevo),
      venta_id: row.venta_id,
      compra_id: row.compra_id,
      venta_metodo_pago: row.venta_metodo_pago,
      venta_total: row.venta_total === null ? null : Number(row.venta_total),
      venta_modalidad: row.venta_modalidad,
      venta_estado: row.venta_estado,
      venta_sesion_caja_id: row.venta_sesion_caja_id,
      venta_precio_unitario: row.venta_precio_unitario === null ? null : Number(row.venta_precio_unitario),
      venta_descuento: row.venta_descuento === null ? null : Number(row.venta_descuento),
      venta_total_final: row.venta_total_final === null ? null : Number(row.venta_total_final),
      compra_total_costo: row.compra_total_costo === null ? null : Number(row.compra_total_costo),
      compra_estado: row.compra_estado,
      compra_costo_unitario: row.compra_costo_unitario === null ? null : Number(row.compra_costo_unitario),
      compra_precio_anterior: row.compra_precio_anterior === null ? null : Number(row.compra_precio_anterior),
      compra_precio_final: row.compra_precio_final === null ? null : Number(row.compra_precio_final),
      compra_subtotal_costo: row.compra_subtotal_costo === null ? null : Number(row.compra_subtotal_costo),
      motivo: row.motivo,
      creado_en: row.creado_en.toISOString(),
    };
  }
}

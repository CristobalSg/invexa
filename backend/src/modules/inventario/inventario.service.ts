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
      motivo: row.motivo,
      creado_en: row.creado_en.toISOString(),
    };
  }
}

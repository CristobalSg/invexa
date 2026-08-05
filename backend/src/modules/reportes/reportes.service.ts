import { NotFoundError } from '../../utils/errors.js';
import type { ReportesRepository } from './reportes.repository.js';
import type {
  BajoStockQuery,
  CierreCajaDiario,
  CierreCajaDiarioItem,
  CierreCajaDiarioRow,
  ConsignacionItem,
  ConsignacionRow,
  DateRangeQuery,
  InventarioItem,
  InventarioRow,
  PaginatedResult,
  PaginationQuery,
  ProductoReporte,
  ProductoReporteMetricasRow,
  ProductoReporteRow,
  ProductoTop,
  ProductoTopRow,
  VentasMensual,
  VentasMensualRow,
  VentasResumen,
  VentasResumenRow,
} from './reportes.types.js';

export class ReportesService {
  constructor(private readonly repository: ReportesRepository) {}

  async ventasResumen(query: DateRangeQuery): Promise<VentasResumen> {
    return this.mapVentasResumen(await this.repository.ventasResumen(query));
  }

  async ventasMensual(query: DateRangeQuery): Promise<VentasMensual[]> {
    const rows = await this.repository.ventasMensual(query);
    return rows.map((row) => this.mapVentasMensual(row));
  }

  async cierreCajaDiario(query: DateRangeQuery): Promise<CierreCajaDiario> {
    const fecha = query.fecha_desde ?? new Date().toISOString().slice(0, 10);
    const sesiones = (await this.repository.cierreCajaDiario(fecha)).map((row) =>
      this.mapCierreCajaDiarioItem(row),
    );

    return {
      fecha,
      cajas_cerradas: sesiones.length,
      total_vendido: this.sum(sesiones, 'total_vendido'),
      efectivo: this.sum(sesiones, 'efectivo'),
      tarjeta: this.sum(sesiones, 'tarjeta'),
      transferencia: this.sum(sesiones, 'transferencia'),
      mixto: this.sum(sesiones, 'mixto'),
      ingresos: this.sum(sesiones, 'ingresos'),
      egresos: this.sum(sesiones, 'egresos'),
      diferencia_total: this.sum(sesiones, 'diferencia_cierre'),
      sesiones,
    };
  }

  async productosTop(query: PaginationQuery): Promise<PaginatedResult<ProductoTop>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const rows = await this.repository.productosTop({ ...query, page, limit });
    const total = rows[0] ? Number(rows[0].total_count) : 0;

    return this.paginate(
      rows.map((row) => this.mapProductoTop(row)),
      page,
      limit,
      total,
    );
  }

  async inventario(query: PaginationQuery): Promise<PaginatedResult<InventarioItem>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const rows = await this.repository.inventario({ ...query, page, limit });
    const total = rows[0] ? Number(rows[0].total_count) : 0;

    return this.paginate(
      rows.map((row) => this.mapInventario(row)),
      page,
      limit,
      total,
    );
  }

  async bajoStock(query: BajoStockQuery): Promise<PaginatedResult<InventarioItem>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const umbral = query.umbral ?? 5;
    const rows = await this.repository.bajoStock({ ...query, page, limit, umbral });
    const total = rows[0] ? Number(rows[0].total_count) : 0;

    return this.paginate(
      rows.map((row) => this.mapInventario(row)),
      page,
      limit,
      total,
    );
  }

  async consignacion(query: PaginationQuery): Promise<PaginatedResult<ConsignacionItem>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const rows = await this.repository.consignacion({ ...query, page, limit });
    const total = rows[0] ? Number(rows[0].total_count) : 0;

    return this.paginate(
      rows.map((row) => this.mapConsignacion(row)),
      page,
      limit,
      total,
    );
  }

  async producto(id: number, query: DateRangeQuery): Promise<ProductoReporte> {
    const producto = await this.repository.producto(id);

    if (!producto) {
      throw new NotFoundError('Producto no encontrado');
    }

    const metricas = await this.repository.productoMetricas(id, query);

    return {
      producto: this.mapProductoReporte(producto),
      metricas: this.mapProductoMetricas(metricas),
    };
  }

  private paginate<T>(items: T[], page: number, limit: number, total: number): PaginatedResult<T> {
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

  private mapVentasResumen(row: VentasResumenRow): VentasResumen {
    return {
      cantidad_ventas: Number(row.cantidad_ventas),
      subtotal: Number(row.subtotal),
      descuento: Number(row.descuento),
      total: Number(row.total),
      ticket_promedio: Number(row.ticket_promedio),
      efectivo: Number(row.efectivo),
      tarjeta: Number(row.tarjeta),
      transferencia: Number(row.transferencia),
      mixto: Number(row.mixto),
    };
  }

  private mapVentasMensual(row: VentasMensualRow): VentasMensual {
    return {
      mes: row.mes,
      cantidad_ventas: Number(row.cantidad_ventas),
      total: Number(row.total),
      subtotal: Number(row.subtotal),
      descuento: Number(row.descuento),
    };
  }

  private mapCierreCajaDiarioItem(row: CierreCajaDiarioRow): CierreCajaDiarioItem {
    return {
      sesion_caja_id: row.sesion_caja_id,
      usuario_id: row.usuario_id,
      usuario_nombre: row.usuario_nombre,
      dispositivo_nombre: row.dispositivo_nombre,
      abierta_en: row.abierta_en.toISOString(),
      cerrada_en: row.cerrada_en.toISOString(),
      monto_apertura: Number(row.monto_apertura),
      monto_cierre: row.monto_cierre === null ? null : Number(row.monto_cierre),
      monto_esperado: row.monto_esperado === null ? null : Number(row.monto_esperado),
      diferencia_cierre: row.diferencia_cierre === null ? null : Number(row.diferencia_cierre),
      cantidad_ventas: Number(row.cantidad_ventas),
      total_vendido: Number(row.total_vendido),
      efectivo: Number(row.efectivo),
      tarjeta: Number(row.tarjeta),
      transferencia: Number(row.transferencia),
      mixto: Number(row.mixto),
      ingresos: Number(row.ingresos),
      egresos: Number(row.egresos),
    };
  }

  private mapProductoTop(row: ProductoTopRow): ProductoTop {
    return {
      producto_id: row.producto_id,
      producto_nombre: row.producto_nombre,
      cantidad_vendida: Number(row.cantidad_vendida),
      total_vendido: Number(row.total_vendido),
    };
  }

  private mapInventario(row: InventarioRow): InventarioItem {
    return {
      producto_id: row.producto_id,
      producto_nombre: row.producto_nombre,
      codigo_barras: row.codigo_barras,
      categoria_nombre: row.categoria_nombre,
      tipo_propiedad: row.tipo_propiedad,
      proveedor_nombre: row.proveedor_nombre,
      stock: Number(row.stock),
      costo_actual: row.costo_actual === null ? null : Number(row.costo_actual),
      precio_venta: Number(row.precio_venta),
      valor_costo: Number(row.valor_costo),
      valor_venta: Number(row.valor_venta),
      activo: row.activo,
    };
  }

  private mapConsignacion(row: ConsignacionRow): ConsignacionItem {
    return {
      proveedor_id: row.proveedor_id,
      proveedor_nombre: row.proveedor_nombre,
      productos: Number(row.productos),
      stock_total: Number(row.stock_total),
      valor_venta: Number(row.valor_venta),
      porcentaje_comision: Number(row.porcentaje_comision),
      comision_estimada: Number(row.comision_estimada),
    };
  }

  private mapProductoReporte(row: ProductoReporteRow): InventarioItem {
    return {
      producto_id: row.id,
      producto_nombre: row.nombre,
      codigo_barras: row.codigo_barras,
      categoria_nombre: row.categoria_nombre,
      tipo_propiedad: row.tipo_propiedad,
      proveedor_nombre: row.proveedor_nombre,
      stock: Number(row.stock),
      costo_actual: row.costo_actual === null ? null : Number(row.costo_actual),
      precio_venta: Number(row.precio_venta),
      valor_costo: Number(row.stock) * (row.costo_actual === null ? 0 : Number(row.costo_actual)),
      valor_venta: Number(row.stock) * Number(row.precio_venta),
      activo: row.activo,
    };
  }

  private mapProductoMetricas(row: ProductoReporteMetricasRow): ProductoReporte['metricas'] {
    return {
      cantidad_vendida: Number(row.cantidad_vendida),
      total_vendido: Number(row.total_vendido),
      cantidad_comprada: Number(row.cantidad_comprada),
      total_comprado: Number(row.total_comprado),
      movimientos: Number(row.movimientos),
    };
  }

  private sum(
    items: CierreCajaDiarioItem[],
    key:
      | 'total_vendido'
      | 'efectivo'
      | 'tarjeta'
      | 'transferencia'
      | 'mixto'
      | 'ingresos'
      | 'egresos'
      | 'diferencia_cierre',
  ): number {
    return items.reduce((total, item) => total + (item[key] ?? 0), 0);
  }
}

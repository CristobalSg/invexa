import type { Pool } from 'pg';

import type {
  BajoStockQuery,
  ConsignacionRow,
  DateRangeQuery,
  InventarioRow,
  PaginationQuery,
  ProductoReporteMetricasRow,
  ProductoReporteRow,
  ProductoTopRow,
  VentasMensualRow,
  VentasResumenRow,
} from './reportes.types.js';

const localDate = (column: string) =>
  `(${column} AT TIME ZONE 'UTC' AT TIME ZONE 'America/Santiago')::date`;

const localMonth = (column: string) =>
  `DATE_TRUNC('month', ${column} AT TIME ZONE 'UTC' AT TIME ZONE 'America/Santiago')`;

export class ReportesRepository {
  constructor(private readonly pool: Pool) {}

  async ventasResumen(query: DateRangeQuery): Promise<VentasResumenRow> {
    const result = await this.pool.query<VentasResumenRow>(
      `
        SELECT
          COUNT(*)::text AS cantidad_ventas,
          COALESCE(SUM(subtotal), 0)::text AS subtotal,
          COALESCE(SUM(descuento), 0)::text AS descuento,
          COALESCE(SUM(total), 0)::text AS total,
          COALESCE(AVG(total), 0)::text AS ticket_promedio,
          COALESCE(SUM(total) FILTER (WHERE metodo_pago = 'EFECTIVO'), 0)::text AS efectivo,
          COALESCE(SUM(total) FILTER (WHERE metodo_pago = 'TARJETA'), 0)::text AS tarjeta,
          COALESCE(SUM(total) FILTER (WHERE metodo_pago = 'TRANSFERENCIA'), 0)::text AS transferencia,
          COALESCE(SUM(total) FILTER (WHERE metodo_pago = 'MIXTO'), 0)::text AS mixto
        FROM ventas
        WHERE estado = 'COMPLETADA'
          AND ($1::date IS NULL OR ${localDate('creado_en')} >= $1)
          AND ($2::date IS NULL OR ${localDate('creado_en')} <= $2)
      `,
      [query.fecha_desde ?? null, query.fecha_hasta ?? null],
    );

    return result.rows[0] as VentasResumenRow;
  }

  async ventasMensual(query: DateRangeQuery): Promise<VentasMensualRow[]> {
    const result = await this.pool.query<VentasMensualRow>(
      `
        SELECT
          TO_CHAR(${localMonth('creado_en')}, 'YYYY-MM') AS mes,
          COUNT(*)::text AS cantidad_ventas,
          COALESCE(SUM(total), 0)::text AS total,
          COALESCE(SUM(subtotal), 0)::text AS subtotal,
          COALESCE(SUM(descuento), 0)::text AS descuento
        FROM ventas
        WHERE estado = 'COMPLETADA'
          AND ($1::date IS NULL OR ${localDate('creado_en')} >= $1)
          AND ($2::date IS NULL OR ${localDate('creado_en')} <= $2)
        GROUP BY ${localMonth('creado_en')}
        ORDER BY ${localMonth('creado_en')} ASC
      `,
      [query.fecha_desde ?? null, query.fecha_hasta ?? null],
    );

    return result.rows;
  }

  async productosTop(
    query: Required<Pick<PaginationQuery, 'page' | 'limit'>> & PaginationQuery,
  ): Promise<ProductoTopRow[]> {
    const offset = (query.page - 1) * query.limit;
    const result = await this.pool.query<ProductoTopRow>(
      `
        WITH ventas_filtradas AS (
          SELECT id
          FROM ventas
          WHERE estado = 'COMPLETADA'
            AND ($1::date IS NULL OR ${localDate('creado_en')} >= $1)
            AND ($2::date IS NULL OR ${localDate('creado_en')} <= $2)
        ),
        productos_vendidos AS (
          SELECT
            dv.producto_id,
            p.nombre AS producto_nombre,
            SUM(dv.cantidad) AS cantidad_vendida,
            SUM(dv.total_final) AS total_vendido
          FROM detalle_ventas dv
          INNER JOIN ventas_filtradas vf ON vf.id = dv.venta_id
          INNER JOIN productos p ON p.id = dv.producto_id
          GROUP BY dv.producto_id, p.nombre
        )
        SELECT
          producto_id,
          producto_nombre,
          cantidad_vendida::text,
          total_vendido::text,
          COUNT(*) OVER() AS total_count
        FROM productos_vendidos
        ORDER BY cantidad_vendida DESC, total_vendido DESC
        LIMIT $3 OFFSET $4
      `,
      [query.fecha_desde ?? null, query.fecha_hasta ?? null, query.limit, offset],
    );

    return result.rows;
  }

  async inventario(
    query: Required<Pick<PaginationQuery, 'page' | 'limit'>> & PaginationQuery,
  ): Promise<InventarioRow[]> {
    const offset = (query.page - 1) * query.limit;
    const result = await this.pool.query<InventarioRow>(
      `
        SELECT
          p.id AS producto_id,
          p.nombre AS producto_nombre,
          p.codigo_barras,
          c.nombre AS categoria_nombre,
          p.tipo_propiedad,
          pr.nombre AS proveedor_nombre,
          p.stock,
          p.costo_actual,
          p.precio_venta,
          (p.stock * COALESCE(p.costo_actual, 0))::text AS valor_costo,
          (p.stock * p.precio_venta)::text AS valor_venta,
          p.activo,
          COUNT(*) OVER() AS total_count
        FROM productos p
        INNER JOIN categorias_producto c ON c.id = p.categoria_id
        LEFT JOIN proveedores pr ON pr.id = p.proveedor_id
        ORDER BY p.nombre ASC
        LIMIT $1 OFFSET $2
      `,
      [query.limit, offset],
    );

    return result.rows;
  }

  async bajoStock(
    query: Required<Pick<BajoStockQuery, 'page' | 'limit' | 'umbral'>> & BajoStockQuery,
  ): Promise<InventarioRow[]> {
    const offset = (query.page - 1) * query.limit;
    const result = await this.pool.query<InventarioRow>(
      `
        SELECT
          p.id AS producto_id,
          p.nombre AS producto_nombre,
          p.codigo_barras,
          c.nombre AS categoria_nombre,
          p.tipo_propiedad,
          pr.nombre AS proveedor_nombre,
          p.stock,
          p.costo_actual,
          p.precio_venta,
          (p.stock * COALESCE(p.costo_actual, 0))::text AS valor_costo,
          (p.stock * p.precio_venta)::text AS valor_venta,
          p.activo,
          COUNT(*) OVER() AS total_count
        FROM productos p
        INNER JOIN categorias_producto c ON c.id = p.categoria_id
        LEFT JOIN proveedores pr ON pr.id = p.proveedor_id
        WHERE p.activo = TRUE
          AND p.modo_inventario <> 'SIN_INVENTARIO'
          AND p.stock <= $1
        ORDER BY p.stock ASC, p.nombre ASC
        LIMIT $2 OFFSET $3
      `,
      [query.umbral, query.limit, offset],
    );

    return result.rows;
  }

  async consignacion(
    query: Required<Pick<PaginationQuery, 'page' | 'limit'>> & PaginationQuery,
  ): Promise<ConsignacionRow[]> {
    const offset = (query.page - 1) * query.limit;
    const result = await this.pool.query<ConsignacionRow>(
      `
        SELECT
          pr.id AS proveedor_id,
          pr.nombre AS proveedor_nombre,
          COUNT(p.id)::text AS productos,
          COALESCE(SUM(p.stock), 0)::text AS stock_total,
          COALESCE(SUM(p.stock * p.precio_venta), 0)::text AS valor_venta,
          pr.porcentaje_comision::text,
          COALESCE(SUM(p.stock * p.precio_venta * pr.porcentaje_comision / 100), 0)::text AS comision_estimada,
          COUNT(*) OVER() AS total_count
        FROM proveedores pr
        INNER JOIN productos p ON p.proveedor_id = pr.id
        WHERE p.tipo_propiedad = 'CONSIGNACION'
        GROUP BY pr.id, pr.nombre, pr.porcentaje_comision
        ORDER BY valor_venta DESC
        LIMIT $1 OFFSET $2
      `,
      [query.limit, offset],
    );

    return result.rows;
  }

  async producto(id: number): Promise<ProductoReporteRow | null> {
    const result = await this.pool.query<ProductoReporteRow>(
      `
        SELECT
          p.id,
          p.nombre,
          p.codigo_barras,
          c.nombre AS categoria_nombre,
          pr.nombre AS proveedor_nombre,
          p.tipo_propiedad,
          p.stock,
          p.costo_actual,
          p.precio_venta,
          p.activo
        FROM productos p
        INNER JOIN categorias_producto c ON c.id = p.categoria_id
        LEFT JOIN proveedores pr ON pr.id = p.proveedor_id
        WHERE p.id = $1
        LIMIT 1
      `,
      [id],
    );

    return result.rows[0] ?? null;
  }

  async productoMetricas(id: number, query: DateRangeQuery): Promise<ProductoReporteMetricasRow> {
    const result = await this.pool.query<ProductoReporteMetricasRow>(
      `
        SELECT
          COALESCE((
            SELECT SUM(dv.cantidad)
            FROM detalle_ventas dv
            INNER JOIN ventas v ON v.id = dv.venta_id
            WHERE dv.producto_id = $1
              AND v.estado = 'COMPLETADA'
              AND ($2::date IS NULL OR ${localDate('v.creado_en')} >= $2)
              AND ($3::date IS NULL OR ${localDate('v.creado_en')} <= $3)
          ), 0)::text AS cantidad_vendida,
          COALESCE((
            SELECT SUM(dv.total_final)
            FROM detalle_ventas dv
            INNER JOIN ventas v ON v.id = dv.venta_id
            WHERE dv.producto_id = $1
              AND v.estado = 'COMPLETADA'
              AND ($2::date IS NULL OR ${localDate('v.creado_en')} >= $2)
              AND ($3::date IS NULL OR ${localDate('v.creado_en')} <= $3)
          ), 0)::text AS total_vendido,
          COALESCE((
            SELECT SUM(dc.cantidad)
            FROM detalle_compras dc
            INNER JOIN compras c ON c.id = dc.compra_id
            WHERE dc.producto_id = $1
              AND ($2::date IS NULL OR ${localDate('c.creado_en')} >= $2)
              AND ($3::date IS NULL OR ${localDate('c.creado_en')} <= $3)
          ), 0)::text AS cantidad_comprada,
          COALESCE((
            SELECT SUM(dc.subtotal_costo)
            FROM detalle_compras dc
            INNER JOIN compras c ON c.id = dc.compra_id
            WHERE dc.producto_id = $1
              AND ($2::date IS NULL OR ${localDate('c.creado_en')} >= $2)
              AND ($3::date IS NULL OR ${localDate('c.creado_en')} <= $3)
          ), 0)::text AS total_comprado,
          COALESCE((
            SELECT COUNT(*)
            FROM movimientos_inventario mi
            WHERE mi.producto_id = $1
              AND ($2::date IS NULL OR ${localDate('mi.creado_en')} >= $2)
              AND ($3::date IS NULL OR ${localDate('mi.creado_en')} <= $3)
          ), 0)::text AS movimientos
      `,
      [id, query.fecha_desde ?? null, query.fecha_hasta ?? null],
    );

    return result.rows[0] as ProductoReporteMetricasRow;
  }
}

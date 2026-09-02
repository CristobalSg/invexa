import type { Pool } from 'pg';

import type {
  BajoStockQuery,
  CierreCajaDiarioRow,
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

  async cierreCajaDiario(fecha: string): Promise<CierreCajaDiarioRow[]> {
    const result = await this.pool.query<CierreCajaDiarioRow>(
      `
        WITH ventas_por_sesion AS (
          SELECT
            v.sesion_caja_id,
            COUNT(v.id)::text AS cantidad_ventas,
            COALESCE(SUM(v.total), 0)::text AS total_vendido,
            COALESCE(SUM(v.total) FILTER (WHERE v.metodo_pago = 'EFECTIVO'), 0)::text AS efectivo,
            COALESCE(SUM(v.total) FILTER (WHERE v.metodo_pago = 'TARJETA'), 0)::text AS tarjeta,
            COALESCE(SUM(v.total) FILTER (WHERE v.metodo_pago = 'TRANSFERENCIA'), 0)::text AS transferencia,
            COALESCE(SUM(v.total) FILTER (WHERE v.metodo_pago = 'MIXTO'), 0)::text AS mixto
          FROM ventas v
          WHERE v.estado = 'COMPLETADA'
            AND v.sesion_caja_id IS NOT NULL
          GROUP BY v.sesion_caja_id
        ),
        movimientos_por_sesion AS (
          SELECT
            mc.sesion_caja_id,
            COALESCE(SUM(mc.monto) FILTER (WHERE mc.tipo = 'INGRESO'), 0)::text AS ingresos,
            COALESCE(SUM(mc.monto) FILTER (WHERE mc.tipo = 'EGRESO'), 0)::text AS egresos
          FROM movimientos_caja mc
          GROUP BY mc.sesion_caja_id
        )
        SELECT
          sc.id AS sesion_caja_id,
          sc.usuario_id,
          u.nombre AS usuario_nombre,
          dp.nombre AS dispositivo_nombre,
          sc.abierta_en,
          sc.cerrada_en,
          sc.monto_apertura,
          sc.monto_cierre,
          sc.monto_esperado,
          sc.diferencia_cierre,
          COALESCE(vps.cantidad_ventas, '0') AS cantidad_ventas,
          COALESCE(vps.total_vendido, '0') AS total_vendido,
          COALESCE(vps.efectivo, '0') AS efectivo,
          COALESCE(vps.tarjeta, '0') AS tarjeta,
          COALESCE(vps.transferencia, '0') AS transferencia,
          COALESCE(vps.mixto, '0') AS mixto,
          COALESCE(mps.ingresos, '0') AS ingresos,
          COALESCE(mps.egresos, '0') AS egresos
        FROM sesiones_caja sc
        INNER JOIN usuarios u ON u.id = sc.usuario_id
        LEFT JOIN dispositivos_pos dp ON dp.id = sc.dispositivo_id
        LEFT JOIN ventas_por_sesion vps ON vps.sesion_caja_id = sc.id
        LEFT JOIN movimientos_por_sesion mps ON mps.sesion_caja_id = sc.id
        WHERE sc.abierta = FALSE
          AND sc.cerrada_en IS NOT NULL
          AND ${localDate('sc.cerrada_en')} = $1::date
        ORDER BY sc.cerrada_en ASC, sc.id ASC
      `,
      [fecha],
    );

    return result.rows;
  }

  async productosTop(
    query: Required<Pick<PaginationQuery, 'page' | 'limit'>> & PaginationQuery,
  ): Promise<ProductoTopRow[]> {
    const result = await this.pool.query<ProductoTopRow>(
      `
        WITH ventas_filtradas AS (
          SELECT id, total_sin_redondeo
          FROM ventas
          WHERE estado = 'COMPLETADA'
            AND ($1::date IS NULL OR ${localDate('creado_en')} >= $1)
            AND ($2::date IS NULL OR ${localDate('creado_en')} <= $2)
        ),
        lineas_atribuidas AS (
          SELECT
            dv.producto_id,
            p.nombre AS producto_nombre,
            p.unidad_venta,
            dv.cantidad,
            CASE
              WHEN SUM(dv.total_final) OVER (PARTITION BY dv.venta_id) > 0
                THEN dv.total_final * vf.total_sin_redondeo
                  / SUM(dv.total_final) OVER (PARTITION BY dv.venta_id)
              ELSE 0
            END AS ingreso_atribuido
          FROM detalle_ventas dv
          INNER JOIN ventas_filtradas vf ON vf.id = dv.venta_id
          INNER JOIN productos p ON p.id = dv.producto_id
        ),
        productos_vendidos AS (
          SELECT
            producto_id,
            producto_nombre,
            unidad_venta,
            SUM(cantidad) AS cantidad_vendida,
            SUM(ingreso_atribuido) AS ingresos
          FROM lineas_atribuidas
          GROUP BY producto_id, producto_nombre, unidad_venta
        ),
        productos_rankeados AS (
          SELECT
            *,
            ROW_NUMBER() OVER (
              PARTITION BY unidad_venta
              ORDER BY cantidad_vendida DESC, ingresos DESC, producto_id ASC
            ) AS cantidad_rank,
            ROW_NUMBER() OVER (
              ORDER BY ingresos DESC, cantidad_vendida DESC, producto_id ASC
            ) AS ingresos_rank
          FROM productos_vendidos
        )
        SELECT
          producto_id,
          producto_nombre,
          unidad_venta,
          cantidad_vendida::text,
          ingresos::text,
          cantidad_rank::text,
          ingresos_rank::text
        FROM productos_rankeados
        WHERE cantidad_rank <= $3 OR ingresos_rank <= $3
        ORDER BY ingresos_rank ASC
      `,
      [query.fecha_desde ?? null, query.fecha_hasta ?? null, query.limit],
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
          COUNT(*) OVER() AS total_count,
          SUM(p.stock * COALESCE(p.costo_actual, 0)) OVER()::text AS valor_costo_total,
          SUM(p.stock * p.precio_venta) OVER()::text AS valor_venta_total
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

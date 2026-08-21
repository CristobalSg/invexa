import type { Pool, PoolClient } from 'pg';

import type {
  CajaResumenRow,
  CajaMovimientoRow,
  CajaSessionListRow,
  CajaSessionRow,
  CajaSessionsQuery,
} from './caja.types.js';

export class CajaRepository {
  constructor(private readonly pool: Pool) {}

  async lockUserCashSessions(client: PoolClient, usuarioId: number): Promise<void> {
    await client.query('SELECT pg_advisory_xact_lock($1)', [usuarioId]);
  }

  async lockDeviceCashSessions(client: PoolClient, deviceId: string): Promise<void> {
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [deviceId]);
  }

  async findOpenByUsuarioId(client: PoolClient, usuarioId: number): Promise<CajaSessionRow | null> {
    const result = await client.query<CajaSessionRow>(
      `
        SELECT
          sc.id,
          sc.usuario_id,
          u.nombre AS usuario_nombre,
          sc.dispositivo_id,
          sc.monto_apertura,
          sc.monto_cierre,
          sc.monto_esperado,
          sc.diferencia_cierre,
          sc.abierta_en,
          sc.cerrada_en,
          sc.abierta
        FROM sesiones_caja sc
        INNER JOIN usuarios u ON u.id = sc.usuario_id
        WHERE sc.usuario_id = $1
          AND sc.abierta = TRUE
          AND sc.cerrada_en IS NULL
        ORDER BY sc.abierta_en DESC
        LIMIT 1
        FOR UPDATE OF sc
      `,
      [usuarioId],
    );

    return result.rows[0] ?? null;
  }

  async findOpenByUsuarioIdReadOnly(usuarioId: number): Promise<CajaSessionRow | null> {
    const result = await this.pool.query<CajaSessionRow>(
      `
        SELECT
          sc.id,
          sc.usuario_id,
          u.nombre AS usuario_nombre,
          sc.dispositivo_id,
          sc.monto_apertura,
          sc.monto_cierre,
          sc.monto_esperado,
          sc.diferencia_cierre,
          sc.abierta_en,
          sc.cerrada_en,
          sc.abierta
        FROM sesiones_caja sc
        INNER JOIN usuarios u ON u.id = sc.usuario_id
        WHERE sc.usuario_id = $1
          AND sc.abierta = TRUE
          AND sc.cerrada_en IS NULL
        ORDER BY sc.abierta_en DESC
        LIMIT 1
      `,
      [usuarioId],
    );

    return result.rows[0] ?? null;
  }

  async findOpenByDeviceId(client: PoolClient, deviceId: string): Promise<CajaSessionRow | null> {
    const result = await client.query<CajaSessionRow>(
      `
        SELECT
          sc.id,
          sc.usuario_id,
          u.nombre AS usuario_nombre,
          sc.dispositivo_id,
          sc.monto_apertura,
          sc.monto_cierre,
          sc.monto_esperado,
          sc.diferencia_cierre,
          sc.abierta_en,
          sc.cerrada_en,
          sc.abierta
        FROM sesiones_caja sc
        INNER JOIN usuarios u ON u.id = sc.usuario_id
        WHERE sc.dispositivo_id = $1
          AND sc.abierta = TRUE
          AND sc.cerrada_en IS NULL
        ORDER BY sc.abierta_en DESC
        LIMIT 1
        FOR UPDATE OF sc
      `,
      [deviceId],
    );

    return result.rows[0] ?? null;
  }

  async findOpenByDeviceIdReadOnly(deviceId: string): Promise<CajaSessionRow | null> {
    const result = await this.pool.query<CajaSessionRow>(
      `
        SELECT
          sc.id,
          sc.usuario_id,
          u.nombre AS usuario_nombre,
          sc.dispositivo_id,
          sc.monto_apertura,
          sc.monto_cierre,
          sc.monto_esperado,
          sc.diferencia_cierre,
          sc.abierta_en,
          sc.cerrada_en,
          sc.abierta
        FROM sesiones_caja sc
        INNER JOIN usuarios u ON u.id = sc.usuario_id
        WHERE sc.dispositivo_id = $1
          AND sc.abierta = TRUE
          AND sc.cerrada_en IS NULL
        ORDER BY sc.abierta_en DESC
        LIMIT 1
      `,
      [deviceId],
    );

    return result.rows[0] ?? null;
  }

  async create(
    client: PoolClient,
    usuarioId: number,
    montoApertura: number,
    deviceId?: string,
  ): Promise<CajaSessionRow> {
    const result = await client.query<CajaSessionRow>(
      `
        INSERT INTO sesiones_caja (
          usuario_id,
          dispositivo_id,
          monto_apertura
        )
        VALUES ($1, $2, $3)
        RETURNING
          id,
          usuario_id,
          '' AS usuario_nombre,
          dispositivo_id,
          monto_apertura,
          monto_cierre,
          monto_esperado,
          diferencia_cierre,
          abierta_en,
          cerrada_en,
          abierta
      `,
      [usuarioId, deviceId ?? null, montoApertura],
    );

    return result.rows[0] as CajaSessionRow;
  }

  async close(
    client: PoolClient,
    sessionId: number,
    efectivoContado: number,
    montoEsperado: number,
    diferencia: number,
  ): Promise<CajaSessionRow> {
    const result = await client.query<CajaSessionRow>(
      `
        UPDATE sesiones_caja
        SET
          monto_cierre = $2,
          monto_esperado = $3,
          diferencia_cierre = $4,
          cerrada_en = NOW(),
          abierta = FALSE
        WHERE id = $1
        RETURNING
          id,
          usuario_id,
          '' AS usuario_nombre,
          dispositivo_id,
          monto_apertura,
          monto_cierre,
          monto_esperado,
          diferencia_cierre,
          abierta_en,
          cerrada_en,
          abierta
      `,
      [sessionId, efectivoContado, montoEsperado, diferencia],
    );

    return result.rows[0] as CajaSessionRow;
  }

  async findById(id: number): Promise<CajaSessionRow | null> {
    const result = await this.pool.query<CajaSessionRow>(
      `
        SELECT
          sc.id,
          sc.usuario_id,
          u.nombre AS usuario_nombre,
          sc.dispositivo_id,
          sc.monto_apertura,
          sc.monto_cierre,
          sc.monto_esperado,
          sc.diferencia_cierre,
          sc.abierta_en,
          sc.cerrada_en,
          sc.abierta
        FROM sesiones_caja sc
        INNER JOIN usuarios u ON u.id = sc.usuario_id
        WHERE sc.id = $1
        LIMIT 1
      `,
      [id],
    );

    return result.rows[0] ?? null;
  }

  async findByIdWithClient(client: PoolClient, id: number): Promise<CajaSessionRow | null> {
    const result = await client.query<CajaSessionRow>(
      `
        SELECT
          sc.id,
          sc.usuario_id,
          u.nombre AS usuario_nombre,
          sc.dispositivo_id,
          sc.monto_apertura,
          sc.monto_cierre,
          sc.monto_esperado,
          sc.diferencia_cierre,
          sc.abierta_en,
          sc.cerrada_en,
          sc.abierta
        FROM sesiones_caja sc
        INNER JOIN usuarios u ON u.id = sc.usuario_id
        WHERE sc.id = $1
        LIMIT 1
      `,
      [id],
    );

    return result.rows[0] ?? null;
  }

  async findAll(
    query: Required<Pick<CajaSessionsQuery, 'page' | 'limit'>> & CajaSessionsQuery,
  ): Promise<CajaSessionListRow[]> {
    const offset = (query.page - 1) * query.limit;

    const result = await this.pool.query<CajaSessionListRow>(
      `
        SELECT
          sc.id,
          sc.usuario_id,
          u.nombre AS usuario_nombre,
          sc.dispositivo_id,
          sc.monto_apertura,
          sc.monto_cierre,
          sc.monto_esperado,
          sc.diferencia_cierre,
          sc.abierta_en,
          sc.cerrada_en,
          sc.abierta,
          COUNT(*) OVER() AS total_count
        FROM sesiones_caja sc
        INNER JOIN usuarios u ON u.id = sc.usuario_id
        WHERE ($1::integer IS NULL OR sc.usuario_id = $1)
          AND ($2::boolean IS NULL OR sc.abierta = $2)
          AND ($3::date IS NULL OR sc.abierta_en::date >= $3)
          AND ($4::date IS NULL OR sc.abierta_en::date <= $4)
        ORDER BY sc.abierta_en DESC, sc.id DESC
        LIMIT $5 OFFSET $6
      `,
      [
        query.usuario_id ?? null,
        query.abierta ?? null,
        query.fecha_desde ?? null,
        query.fecha_hasta ?? null,
        query.limit,
        offset,
      ],
    );

    return result.rows;
  }

  async getResumen(sessionId: number): Promise<CajaResumenRow> {
    const result = await this.pool.query<CajaResumenRow>(
      `
        WITH ventas_resumen AS (
          SELECT
            COUNT(v.id)::text AS cantidad_ventas,
            COALESCE(SUM(v.subtotal), 0)::text AS subtotal,
            COALESCE(SUM(v.descuento), 0)::text AS descuento,
            COALESCE(SUM(v.total), 0)::text AS total_ventas,
            COALESCE(SUM(v.total) FILTER (WHERE v.metodo_pago = 'EFECTIVO'), 0)::text AS efectivo,
            COALESCE(SUM(v.total) FILTER (WHERE v.metodo_pago = 'TARJETA'), 0)::text AS tarjeta,
            COALESCE(SUM(v.total) FILTER (WHERE v.metodo_pago = 'TRANSFERENCIA'), 0)::text AS transferencia,
            COALESCE(SUM(v.total) FILTER (WHERE v.metodo_pago = 'MIXTO'), 0)::text AS mixto
          FROM ventas v
          WHERE v.sesion_caja_id = $1
            AND v.estado = 'COMPLETADA'
        ),
        movimientos_resumen AS (
          SELECT
            COALESCE(SUM(mc.monto) FILTER (WHERE mc.tipo = 'INGRESO'), 0)::text AS ingresos,
            COALESCE(SUM(mc.monto) FILTER (WHERE mc.tipo = 'EGRESO'), 0)::text AS egresos
          FROM movimientos_caja mc
          WHERE mc.sesion_caja_id = $1
        ),
        detalle_resumen AS (
          SELECT
            COALESCE(SUM(dv.total_final) FILTER (WHERE dv.tipo_propiedad = 'PROPIO'), 0)::text AS ventas_propias,
            COALESCE(SUM(dv.total_final) FILTER (WHERE dv.tipo_propiedad = 'CONSIGNACION'), 0)::text AS ventas_consignacion
          FROM detalle_ventas dv
          INNER JOIN ventas v ON v.id = dv.venta_id
          WHERE v.sesion_caja_id = $1
            AND v.estado = 'COMPLETADA'
        ),
        consignacion_proveedores AS (
          SELECT COALESCE(
            json_agg(
              json_build_object(
                'proveedor_id', proveedor_id,
                'proveedor_nombre', proveedor_nombre,
                'total', total
              )
              ORDER BY total DESC, proveedor_nombre ASC
            ),
            '[]'::json
          )::text AS consignacion_proveedores
          FROM (
            SELECT
              dv.proveedor_id,
              COALESCE(pr.nombre, 'Sin proveedor') AS proveedor_nombre,
              SUM(dv.total_final)::numeric AS total
            FROM detalle_ventas dv
            INNER JOIN ventas v ON v.id = dv.venta_id
            LEFT JOIN proveedores pr ON pr.id = dv.proveedor_id
            WHERE v.sesion_caja_id = $1
              AND v.estado = 'COMPLETADA'
              AND dv.tipo_propiedad = 'CONSIGNACION'
            GROUP BY dv.proveedor_id, pr.nombre
          ) proveedores_consignacion
        )
        SELECT *
        FROM ventas_resumen
        CROSS JOIN movimientos_resumen
        CROSS JOIN detalle_resumen
        CROSS JOIN consignacion_proveedores
      `,
      [sessionId],
    );

    return result.rows[0] as CajaResumenRow;
  }

  async getResumenWithClient(client: PoolClient, sessionId: number): Promise<CajaResumenRow> {
    const result = await client.query<CajaResumenRow>(
      `
        WITH ventas_resumen AS (
          SELECT
            COUNT(v.id)::text AS cantidad_ventas,
            COALESCE(SUM(v.subtotal), 0)::text AS subtotal,
            COALESCE(SUM(v.descuento), 0)::text AS descuento,
            COALESCE(SUM(v.total), 0)::text AS total_ventas,
            COALESCE(SUM(v.total) FILTER (WHERE v.metodo_pago = 'EFECTIVO'), 0)::text AS efectivo,
            COALESCE(SUM(v.total) FILTER (WHERE v.metodo_pago = 'TARJETA'), 0)::text AS tarjeta,
            COALESCE(SUM(v.total) FILTER (WHERE v.metodo_pago = 'TRANSFERENCIA'), 0)::text AS transferencia,
            COALESCE(SUM(v.total) FILTER (WHERE v.metodo_pago = 'MIXTO'), 0)::text AS mixto
          FROM ventas v
          WHERE v.sesion_caja_id = $1
            AND v.estado = 'COMPLETADA'
        ),
        movimientos_resumen AS (
          SELECT
            COALESCE(SUM(mc.monto) FILTER (WHERE mc.tipo = 'INGRESO'), 0)::text AS ingresos,
            COALESCE(SUM(mc.monto) FILTER (WHERE mc.tipo = 'EGRESO'), 0)::text AS egresos
          FROM movimientos_caja mc
          WHERE mc.sesion_caja_id = $1
        ),
        detalle_resumen AS (
          SELECT
            COALESCE(SUM(dv.total_final) FILTER (WHERE dv.tipo_propiedad = 'PROPIO'), 0)::text AS ventas_propias,
            COALESCE(SUM(dv.total_final) FILTER (WHERE dv.tipo_propiedad = 'CONSIGNACION'), 0)::text AS ventas_consignacion
          FROM detalle_ventas dv
          INNER JOIN ventas v ON v.id = dv.venta_id
          WHERE v.sesion_caja_id = $1
            AND v.estado = 'COMPLETADA'
        ),
        consignacion_proveedores AS (
          SELECT COALESCE(
            json_agg(
              json_build_object(
                'proveedor_id', proveedor_id,
                'proveedor_nombre', proveedor_nombre,
                'total', total
              )
              ORDER BY total DESC, proveedor_nombre ASC
            ),
            '[]'::json
          )::text AS consignacion_proveedores
          FROM (
            SELECT
              dv.proveedor_id,
              COALESCE(pr.nombre, 'Sin proveedor') AS proveedor_nombre,
              SUM(dv.total_final)::numeric AS total
            FROM detalle_ventas dv
            INNER JOIN ventas v ON v.id = dv.venta_id
            LEFT JOIN proveedores pr ON pr.id = dv.proveedor_id
            WHERE v.sesion_caja_id = $1
              AND v.estado = 'COMPLETADA'
              AND dv.tipo_propiedad = 'CONSIGNACION'
            GROUP BY dv.proveedor_id, pr.nombre
          ) proveedores_consignacion
        )
        SELECT *
        FROM ventas_resumen
        CROSS JOIN movimientos_resumen
        CROSS JOIN detalle_resumen
        CROSS JOIN consignacion_proveedores
      `,
      [sessionId],
    );

    return result.rows[0] as CajaResumenRow;
  }

  async createMovimiento(
    client: PoolClient,
    sessionId: number,
    usuarioId: number,
    data: {
      readonly tipo: string;
      readonly categoria: string;
      readonly monto: number;
      readonly descripcion?: string | null;
    },
  ): Promise<CajaMovimientoRow> {
    const result = await client.query<CajaMovimientoRow>(
      `
        INSERT INTO movimientos_caja (
          sesion_caja_id,
          usuario_id,
          tipo,
          categoria,
          monto,
          descripcion
        )
        VALUES (
          $1,
          $2,
          $3::tipo_movimiento_caja,
          $4::categoria_movimiento_caja,
          $5::numeric,
          $6
        )
        RETURNING
          id,
          sesion_caja_id,
          usuario_id,
          '' AS usuario_nombre,
          tipo,
          categoria,
          monto,
          descripcion,
          creado_en
      `,
      [sessionId, usuarioId, data.tipo, data.categoria, data.monto, data.descripcion ?? null],
    );

    return result.rows[0] as CajaMovimientoRow;
  }

  async findMovimientosBySessionId(sessionId: number): Promise<CajaMovimientoRow[]> {
    const result = await this.pool.query<CajaMovimientoRow>(
      `
        SELECT
          mc.id,
          mc.sesion_caja_id,
          mc.usuario_id,
          u.nombre AS usuario_nombre,
          mc.tipo,
          mc.categoria,
          mc.monto,
          mc.descripcion,
          mc.creado_en
        FROM movimientos_caja mc
        INNER JOIN usuarios u ON u.id = mc.usuario_id
        WHERE mc.sesion_caja_id = $1
        ORDER BY mc.creado_en DESC, mc.id DESC
      `,
      [sessionId],
    );

    return result.rows;
  }
}

import type { Pool, PoolClient } from 'pg';

import type {
  CajaResumenRow,
  CajaSessionListRow,
  CajaSessionRow,
  CajaSessionsQuery,
} from './caja.types.js';

export class CajaRepository {
  constructor(private readonly pool: Pool) {}

  async lockUserCashSessions(client: PoolClient, usuarioId: number): Promise<void> {
    await client.query('SELECT pg_advisory_xact_lock($1)', [usuarioId]);
  }

  async findOpenByUsuarioId(client: PoolClient, usuarioId: number): Promise<CajaSessionRow | null> {
    const result = await client.query<CajaSessionRow>(
      `
        SELECT
          sc.id,
          sc.usuario_id,
          u.nombre AS usuario_nombre,
          sc.monto_apertura,
          sc.monto_cierre,
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
          sc.monto_apertura,
          sc.monto_cierre,
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

  async create(
    client: PoolClient,
    usuarioId: number,
    montoApertura: number,
  ): Promise<CajaSessionRow> {
    const result = await client.query<CajaSessionRow>(
      `
        INSERT INTO sesiones_caja (
          usuario_id,
          monto_apertura
        )
        VALUES ($1, $2)
        RETURNING
          id,
          usuario_id,
          '' AS usuario_nombre,
          monto_apertura,
          monto_cierre,
          abierta_en,
          cerrada_en,
          abierta
      `,
      [usuarioId, montoApertura],
    );

    return result.rows[0] as CajaSessionRow;
  }

  async close(client: PoolClient, sessionId: number, montoCierre: number): Promise<CajaSessionRow> {
    const result = await client.query<CajaSessionRow>(
      `
        UPDATE sesiones_caja
        SET
          monto_cierre = $2,
          cerrada_en = NOW(),
          abierta = FALSE
        WHERE id = $1
        RETURNING
          id,
          usuario_id,
          '' AS usuario_nombre,
          monto_apertura,
          monto_cierre,
          abierta_en,
          cerrada_en,
          abierta
      `,
      [sessionId, montoCierre],
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
          sc.monto_apertura,
          sc.monto_cierre,
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
          sc.monto_apertura,
          sc.monto_cierre,
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
          sc.monto_apertura,
          sc.monto_cierre,
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
      `,
      [sessionId],
    );

    return result.rows[0] as CajaResumenRow;
  }

  async getResumenWithClient(client: PoolClient, sessionId: number): Promise<CajaResumenRow> {
    const result = await client.query<CajaResumenRow>(
      `
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
      `,
      [sessionId],
    );

    return result.rows[0] as CajaResumenRow;
  }
}

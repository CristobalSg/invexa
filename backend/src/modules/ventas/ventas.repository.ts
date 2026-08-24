import type { Pool, PoolClient } from 'pg';

import type {
  DetalleVentaRow,
  MetodoPago,
  MovimientoVentaRow,
  OfertaActivaRow,
  PaginationQuery,
  SesionCajaAbiertaRow,
  VentaListRow,
  VentaProductoRow,
  VentaRow,
} from './ventas.types.js';

export class VentasRepository {
  constructor(private readonly pool: Pool) {}

  async findAll(
    query: Required<Pick<PaginationQuery, 'page' | 'limit'>> & PaginationQuery,
  ): Promise<VentaListRow[]> {
    const offset = (query.page - 1) * query.limit;

    const result = await this.pool.query<VentaListRow>(
      `
        SELECT
          v.id,
          v.usuario_id,
          u.nombre AS usuario_nombre,
          v.sesion_caja_id,
          v.metodo_pago,
          v.subtotal,
          v.descuento,
          v.total_sin_redondeo,
          v.redondeo,
          v.total,
          v.monto_recibido,
          v.vuelto,
          v.modalidad,
          v.estado,
          v.anulada_en,
          v.anulada_por,
          v.motivo_anulacion,
          v.creado_en,
          COUNT(*) OVER() AS total_count
        FROM ventas v
        INNER JOIN usuarios u ON u.id = v.usuario_id
        WHERE ($1::integer IS NULL OR v.usuario_id = $1)
          AND ($2::estado_venta IS NULL OR v.estado = $2)
          AND ($3::metodo_pago IS NULL OR v.metodo_pago = $3)
          AND ($4::date IS NULL OR v.creado_en::date >= $4)
          AND ($5::date IS NULL OR v.creado_en::date <= $5)
        ORDER BY v.creado_en DESC, v.id DESC
        LIMIT $6 OFFSET $7
      `,
      [
        query.usuario_id ?? null,
        query.estado ?? null,
        query.metodo_pago ?? null,
        query.fecha_desde ?? null,
        query.fecha_hasta ?? null,
        query.limit,
        offset,
      ],
    );

    return result.rows;
  }

  async findById(id: number): Promise<VentaRow | null> {
    const result = await this.pool.query<VentaRow>(
      `
        SELECT
          v.id,
          v.usuario_id,
          u.nombre AS usuario_nombre,
          v.sesion_caja_id,
          v.metodo_pago,
          v.subtotal,
          v.descuento,
          v.total_sin_redondeo,
          v.redondeo,
          v.total,
          v.monto_recibido,
          v.vuelto,
          v.modalidad,
          v.estado,
          v.anulada_en,
          v.anulada_por,
          v.motivo_anulacion,
          v.creado_en
        FROM ventas v
        INNER JOIN usuarios u ON u.id = v.usuario_id
        WHERE v.id = $1
        LIMIT 1
      `,
      [id],
    );

    return result.rows[0] ?? null;
  }

  async findDetallesByVentaId(ventaId: number): Promise<DetalleVentaRow[]> {
    const result = await this.pool.query<DetalleVentaRow>(
      `
        SELECT
          dv.id,
          dv.venta_id,
          dv.producto_id,
          p.nombre AS producto_nombre,
          dv.oferta_id,
          dv.cantidad,
          dv.precio_unitario,
          dv.subtotal,
          dv.precio_normal,
          dv.descuento,
          dv.total_final,
          dv.tipo_propiedad,
          dv.proveedor_id,
          pr.nombre AS proveedor_nombre
        FROM detalle_ventas dv
        INNER JOIN productos p ON p.id = dv.producto_id
        LEFT JOIN proveedores pr ON pr.id = dv.proveedor_id
        WHERE dv.venta_id = $1
        ORDER BY dv.id ASC
      `,
      [ventaId],
    );

    return result.rows;
  }

  async findMovimientosByVentaId(ventaId: number): Promise<MovimientoVentaRow[]> {
    const result = await this.pool.query<MovimientoVentaRow>(
      `
        SELECT
          id,
          producto_id,
          tipo,
          cantidad,
          stock_anterior,
          stock_nuevo,
          venta_id,
          creado_en
        FROM movimientos_inventario
        WHERE venta_id = $1
        ORDER BY id ASC
      `,
      [ventaId],
    );

    return result.rows;
  }

  async findOpenCashSessionForUpdate(
    client: PoolClient,
    usuarioId: number,
    deviceId?: string,
  ): Promise<SesionCajaAbiertaRow | null> {
    const result = await client.query<SesionCajaAbiertaRow>(
      `
        SELECT
          id,
          usuario_id
        FROM sesiones_caja
        WHERE ($2::uuid IS NOT NULL OR usuario_id = $1)
          AND ($2::uuid IS NULL OR dispositivo_id = $2)
          AND abierta = TRUE
          AND cerrada_en IS NULL
        ORDER BY abierta_en DESC
        LIMIT 1
        FOR UPDATE
      `,
      [usuarioId, deviceId ?? null],
    );

    return result.rows[0] ?? null;
  }

  async findProductoForUpdate(
    client: PoolClient,
    productoId: number,
  ): Promise<VentaProductoRow | null> {
    const result = await client.query<VentaProductoRow>(
      `
        SELECT
          id,
          nombre,
          precio_venta,
          costo_actual,
          stock,
          activo,
          tipo_propiedad,
          modo_inventario,
          proveedor_id
        FROM productos
        WHERE id = $1
        FOR UPDATE
      `,
      [productoId],
    );

    return result.rows[0] ?? null;
  }

  async findActiveOffer(client: PoolClient, productoId: number): Promise<OfertaActivaRow | null> {
    const result = await client.query<OfertaActivaRow>(
      `
        SELECT
          id,
          cantidad_oferta,
          precio_oferta
        FROM ofertas_producto
        WHERE producto_id = $1
          AND activa = TRUE
          AND inicia_en <= NOW()
          AND (termina_en IS NULL OR termina_en >= NOW())
        ORDER BY precio_oferta ASC, id DESC
        LIMIT 1
      `,
      [productoId],
    );

    return result.rows[0] ?? null;
  }

  async createVenta(
    client: PoolClient,
    data: {
      readonly usuarioId: number;
      readonly sesionCajaId: number;
      readonly metodoPago: MetodoPago;
      readonly subtotal: number;
      readonly descuento: number;
      readonly totalSinRedondeo: number;
      readonly redondeo: number;
      readonly total: number;
      readonly montoRecibido: number | null;
      readonly vuelto: number | null;
      readonly modalidad: string;
    },
  ): Promise<VentaRow> {
    const result = await client.query<VentaRow>(
      `
        INSERT INTO ventas (
          usuario_id,
          sesion_caja_id,
          metodo_pago,
          subtotal,
          descuento,
          total_sin_redondeo,
          redondeo,
          total,
          monto_recibido,
          vuelto,
          modalidad
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::modalidad_venta)
        RETURNING
          id,
          usuario_id,
          '' AS usuario_nombre,
          sesion_caja_id,
          metodo_pago,
          subtotal,
          descuento,
          total_sin_redondeo,
          redondeo,
          total,
          monto_recibido,
          vuelto,
          modalidad,
          estado,
          anulada_en,
          anulada_por,
          motivo_anulacion,
          creado_en
      `,
      [
        data.usuarioId,
        data.sesionCajaId,
        data.metodoPago,
        data.subtotal,
        data.descuento,
        data.totalSinRedondeo,
        data.redondeo,
        data.total,
        data.montoRecibido,
        data.vuelto,
        data.modalidad,
      ],
    );

    return result.rows[0] as VentaRow;
  }

  async createDetalle(
    client: PoolClient,
    data: {
      readonly ventaId: number;
      readonly productoId: number;
      readonly ofertaId: number | null;
      readonly cantidad: number;
      readonly precioUnitario: number;
      readonly subtotal: number;
      readonly precioNormal: number;
      readonly descuento: number;
      readonly totalFinal: number;
      readonly tipoPropiedad: string;
      readonly proveedorId: number | null;
    },
  ): Promise<void> {
    await client.query(
      `
        INSERT INTO detalle_ventas (
          venta_id,
          producto_id,
          oferta_id,
          cantidad,
          precio_unitario,
          subtotal,
          precio_normal,
          descuento,
          total_final,
          tipo_propiedad,
          proveedor_id
        )
        VALUES ($1, $2, $3, $4::numeric, $5::numeric, $6::numeric, $7::numeric, $8::numeric, $9::numeric, $10, $11)
      `,
      [
        data.ventaId,
        data.productoId,
        data.ofertaId,
        data.cantidad,
        data.precioUnitario,
        data.subtotal,
        data.precioNormal,
        data.descuento,
        data.totalFinal,
        data.tipoPropiedad,
        data.proveedorId,
      ],
    );
  }

  async updateProductoStock(
    client: PoolClient,
    data: {
      readonly productoId: number;
      readonly stockNuevo: number;
    },
  ): Promise<void> {
    await client.query(
      `
        UPDATE productos
        SET
          stock = $2::numeric,
          actualizado_en = NOW()
        WHERE id = $1
      `,
      [data.productoId, data.stockNuevo],
    );
  }

  async createMovimientoVenta(
    client: PoolClient,
    data: {
      readonly productoId: number;
      readonly usuarioId: number;
      readonly cantidad: number;
      readonly stockAnterior: number;
      readonly stockNuevo: number;
      readonly ventaId: number;
      readonly motivo: string;
    },
  ): Promise<void> {
    await client.query(
      `
        INSERT INTO movimientos_inventario (
          producto_id,
          usuario_id,
          tipo,
          cantidad,
          stock_anterior,
          stock_nuevo,
          venta_id,
          motivo
        )
        VALUES ($1, $2, 'VENTA', $3::numeric, $4::numeric, $5::numeric, $6, $7)
      `,
      [
        data.productoId,
        data.usuarioId,
        data.cantidad,
        data.stockAnterior,
        data.stockNuevo,
        data.ventaId,
        data.motivo,
      ],
    );
  }

  async findByIdWithClient(client: PoolClient, id: number): Promise<VentaRow | null> {
    const result = await client.query<VentaRow>(
      `
        SELECT
          v.id,
          v.usuario_id,
          u.nombre AS usuario_nombre,
          v.sesion_caja_id,
          v.metodo_pago,
          v.subtotal,
          v.descuento,
          v.total_sin_redondeo,
          v.redondeo,
          v.total,
          v.monto_recibido,
          v.vuelto,
          v.modalidad,
          v.estado,
          v.anulada_en,
          v.anulada_por,
          v.motivo_anulacion,
          v.creado_en
        FROM ventas v
        INNER JOIN usuarios u ON u.id = v.usuario_id
        WHERE v.id = $1
        LIMIT 1
      `,
      [id],
    );

    return result.rows[0] ?? null;
  }

  async findDetallesByVentaIdWithClient(
    client: PoolClient,
    ventaId: number,
  ): Promise<DetalleVentaRow[]> {
    const result = await client.query<DetalleVentaRow>(
      `
        SELECT
          dv.id,
          dv.venta_id,
          dv.producto_id,
          p.nombre AS producto_nombre,
          dv.oferta_id,
          dv.cantidad,
          dv.precio_unitario,
          dv.subtotal,
          dv.precio_normal,
          dv.descuento,
          dv.total_final,
          dv.tipo_propiedad,
          dv.proveedor_id,
          pr.nombre AS proveedor_nombre
        FROM detalle_ventas dv
        INNER JOIN productos p ON p.id = dv.producto_id
        LEFT JOIN proveedores pr ON pr.id = dv.proveedor_id
        WHERE dv.venta_id = $1
        ORDER BY dv.id ASC
      `,
      [ventaId],
    );

    return result.rows;
  }

  async findMovimientosByVentaIdWithClient(
    client: PoolClient,
    ventaId: number,
  ): Promise<MovimientoVentaRow[]> {
    const result = await client.query<MovimientoVentaRow>(
      `
        SELECT
          id,
          producto_id,
          tipo,
          cantidad,
          stock_anterior,
          stock_nuevo,
          venta_id,
          creado_en
        FROM movimientos_inventario
        WHERE venta_id = $1
        ORDER BY id ASC
      `,
      [ventaId],
    );

    return result.rows;
  }

  async findVentaForUpdate(client: PoolClient, id: number): Promise<VentaRow | null> {
    const result = await client.query<VentaRow>(
      `
        SELECT
          v.id,
          v.usuario_id,
          u.nombre AS usuario_nombre,
          v.sesion_caja_id,
          v.metodo_pago,
          v.subtotal,
          v.descuento,
          v.total_sin_redondeo,
          v.redondeo,
          v.total,
          v.monto_recibido,
          v.vuelto,
          v.modalidad,
          v.estado,
          v.anulada_en,
          v.anulada_por,
          v.motivo_anulacion,
          v.creado_en
        FROM ventas v
        INNER JOIN usuarios u ON u.id = v.usuario_id
        WHERE v.id = $1
        LIMIT 1
        FOR UPDATE OF v
      `,
      [id],
    );

    return result.rows[0] ?? null;
  }

  async updateVentaAnulada(
    client: PoolClient,
    data: {
      readonly ventaId: number;
      readonly anuladaPor: number;
      readonly motivo: string;
    },
  ): Promise<void> {
    await client.query(
      `
        UPDATE ventas
        SET
          estado = 'ANULADA',
          anulada_en = NOW(),
          anulada_por = $2,
          motivo_anulacion = $3
        WHERE id = $1
      `,
      [data.ventaId, data.anuladaPor, data.motivo],
    );
  }

  async addProductoStock(
    client: PoolClient,
    data: {
      readonly productoId: number;
      readonly stockNuevo: number;
    },
  ): Promise<void> {
    await client.query(
      `
        UPDATE productos
        SET
          stock = $2::numeric,
          actualizado_en = NOW()
        WHERE id = $1
      `,
      [data.productoId, data.stockNuevo],
    );
  }

  async createMovimientoAnulacion(
    client: PoolClient,
    data: {
      readonly productoId: number;
      readonly usuarioId: number;
      readonly cantidad: number;
      readonly stockAnterior: number;
      readonly stockNuevo: number;
      readonly ventaId: number;
      readonly motivo: string;
    },
  ): Promise<void> {
    await client.query(
      `
        INSERT INTO movimientos_inventario (
          producto_id,
          usuario_id,
          tipo,
          cantidad,
          stock_anterior,
          stock_nuevo,
          venta_id,
          motivo
        )
        VALUES ($1, $2, 'ANULACION', $3::numeric, $4::numeric, $5::numeric, $6, $7)
      `,
      [
        data.productoId,
        data.usuarioId,
        data.cantidad,
        data.stockAnterior,
        data.stockNuevo,
        data.ventaId,
        data.motivo,
      ],
    );
  }
}

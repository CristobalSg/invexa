const dateRangeQuerySchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    fecha_desde: { type: 'string', format: 'date' },
    fecha_hasta: { type: 'string', format: 'date' },
  },
} as const;

const paginationQuerySchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    page: { type: 'integer', minimum: 1, default: 1 },
    limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
    fecha_desde: { type: 'string', format: 'date' },
    fecha_hasta: { type: 'string', format: 'date' },
  },
} as const;

const idParamsSchema = {
  type: 'object',
  required: ['id'],
  additionalProperties: false,
  properties: {
    id: { type: 'integer', minimum: 1 },
  },
} as const;

const paginationSchema = {
  type: 'object',
  required: ['page', 'limit', 'total', 'totalPages'],
  properties: {
    page: { type: 'number' },
    limit: { type: 'number' },
    total: { type: 'number' },
    totalPages: { type: 'number' },
  },
} as const;

export const ventasResumenSchema = {
  querystring: dateRangeQuerySchema,
} as const;

export const ventasMensualSchema = {
  querystring: dateRangeQuerySchema,
} as const;

export const cierreCajaDiarioSchema = {
  querystring: {
    type: 'object',
    additionalProperties: false,
    properties: {
      fecha_desde: { type: 'string', format: 'date' },
    },
  },
  response: {
    200: {
      type: 'object',
      required: ['success', 'data'],
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          required: [
            'fecha',
            'cajas_cerradas',
            'total_vendido',
            'efectivo',
            'tarjeta',
            'transferencia',
            'mixto',
            'ingresos',
            'egresos',
            'diferencia_total',
            'sesiones',
          ],
          properties: {
            fecha: { type: 'string' },
            cajas_cerradas: { type: 'number' },
            total_vendido: { type: 'number' },
            efectivo: { type: 'number' },
            tarjeta: { type: 'number' },
            transferencia: { type: 'number' },
            mixto: { type: 'number' },
            ingresos: { type: 'number' },
            egresos: { type: 'number' },
            diferencia_total: { type: 'number' },
            sesiones: {
              type: 'array',
              items: {
                type: 'object',
                required: [
                  'sesion_caja_id',
                  'usuario_id',
                  'usuario_nombre',
                  'dispositivo_nombre',
                  'abierta_en',
                  'cerrada_en',
                  'monto_apertura',
                  'monto_cierre',
                  'monto_esperado',
                  'diferencia_cierre',
                  'cantidad_ventas',
                  'total_vendido',
                  'efectivo',
                  'tarjeta',
                  'transferencia',
                  'mixto',
                  'ingresos',
                  'egresos',
                ],
                properties: {
                  sesion_caja_id: { type: 'number' },
                  usuario_id: { type: 'number' },
                  usuario_nombre: { type: 'string' },
                  dispositivo_nombre: { type: ['string', 'null'] },
                  abierta_en: { type: 'string' },
                  cerrada_en: { type: 'string' },
                  monto_apertura: { type: 'number' },
                  monto_cierre: { type: ['number', 'null'] },
                  monto_esperado: { type: ['number', 'null'] },
                  diferencia_cierre: { type: ['number', 'null'] },
                  cantidad_ventas: { type: 'number' },
                  total_vendido: { type: 'number' },
                  efectivo: { type: 'number' },
                  tarjeta: { type: 'number' },
                  transferencia: { type: 'number' },
                  mixto: { type: 'number' },
                  ingresos: { type: 'number' },
                  egresos: { type: 'number' },
                },
              },
            },
          },
        },
      },
    },
  },
} as const;

export const paginatedReporteSchema = {
  querystring: paginationQuerySchema,
} as const;

export const bajoStockSchema = {
  querystring: {
    ...paginationQuerySchema,
    properties: {
      ...paginationQuerySchema.properties,
      umbral: { type: 'number', minimum: 0, default: 5 },
    },
  },
} as const;

export const productoReporteSchema = {
  params: idParamsSchema,
  querystring: dateRangeQuerySchema,
} as const;

export const paginatedResponseSchema = paginationSchema;

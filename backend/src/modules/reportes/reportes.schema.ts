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

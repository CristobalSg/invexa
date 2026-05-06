const idParamsSchema = {
  type: 'object',
  required: ['id'],
  additionalProperties: false,
  properties: {
    id: { type: 'integer', minimum: 1 },
  },
} as const;

const paginationQuerySchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    page: { type: 'integer', minimum: 1, default: 1 },
    limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
    usuario_id: { type: 'integer', minimum: 1 },
    fecha_desde: { type: 'string', format: 'date' },
    fecha_hasta: { type: 'string', format: 'date' },
  },
} as const;

const compraResponseSchema = {
  type: 'object',
  required: ['id', 'usuario_id', 'usuario_nombre', 'total_costo', 'creado_en'],
  properties: {
    id: { type: 'number' },
    usuario_id: { type: 'number' },
    usuario_nombre: { type: 'string' },
    total_costo: { type: 'number' },
    creado_en: { type: 'string' },
  },
} as const;

const detalleCompraResponseSchema = {
  type: 'object',
  required: [
    'id',
    'compra_id',
    'producto_id',
    'producto_nombre',
    'cantidad',
    'costo_unitario',
    'costo_anterior',
    'precio_anterior',
    'precio_sugerido',
    'precio_final',
    'variacion_precio',
    'tiene_alerta_precio',
    'subtotal_costo',
  ],
  properties: {
    id: { type: 'number' },
    compra_id: { type: 'number' },
    producto_id: { type: 'number' },
    producto_nombre: { type: 'string' },
    cantidad: { type: 'number' },
    costo_unitario: { type: 'number' },
    costo_anterior: { type: ['number', 'null'] },
    precio_anterior: { type: ['number', 'null'] },
    precio_sugerido: { type: 'number' },
    precio_final: { type: 'number' },
    variacion_precio: { type: ['number', 'null'] },
    tiene_alerta_precio: { type: 'boolean' },
    subtotal_costo: { type: 'number' },
  },
} as const;

const movimientoCompraResponseSchema = {
  type: 'object',
  required: [
    'id',
    'producto_id',
    'tipo',
    'cantidad',
    'stock_anterior',
    'stock_nuevo',
    'compra_id',
    'creado_en',
  ],
  properties: {
    id: { type: 'number' },
    producto_id: { type: 'number' },
    tipo: { type: 'string', enum: ['COMPRA'] },
    cantidad: { type: 'number' },
    stock_anterior: { type: ['number', 'null'] },
    stock_nuevo: { type: ['number', 'null'] },
    compra_id: { type: 'number' },
    creado_en: { type: 'string' },
  },
} as const;

const compraDetalleResponseSchema = {
  ...compraResponseSchema,
  required: [...compraResponseSchema.required, 'detalles', 'movimientos'],
  properties: {
    ...compraResponseSchema.properties,
    detalles: { type: 'array', items: detalleCompraResponseSchema },
    movimientos: { type: 'array', items: movimientoCompraResponseSchema },
  },
} as const;

export const createCompraSchema = {
  body: {
    type: 'object',
    required: ['items'],
    additionalProperties: false,
    properties: {
      items: {
        type: 'array',
        minItems: 1,
        items: {
          type: 'object',
          required: ['producto_id', 'cantidad', 'costo_unitario'],
          additionalProperties: false,
          properties: {
            producto_id: { type: 'integer', minimum: 1 },
            cantidad: { type: 'number', exclusiveMinimum: 0 },
            costo_unitario: { type: 'number', exclusiveMinimum: 0 },
            precio_final: { type: 'number', exclusiveMinimum: 0 },
            actualizar_precio_venta: { type: 'boolean', default: true },
          },
        },
      },
    },
  },
  response: {
    201: {
      type: 'object',
      required: ['success', 'data'],
      properties: {
        success: { type: 'boolean' },
        data: compraDetalleResponseSchema,
      },
    },
  },
} as const;

export const listComprasSchema = {
  querystring: paginationQuerySchema,
  response: {
    200: {
      type: 'object',
      required: ['success', 'data'],
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          required: ['items', 'pagination'],
          properties: {
            items: { type: 'array', items: compraResponseSchema },
            pagination: {
              type: 'object',
              required: ['page', 'limit', 'total', 'totalPages'],
              properties: {
                page: { type: 'number' },
                limit: { type: 'number' },
                total: { type: 'number' },
                totalPages: { type: 'number' },
              },
            },
          },
        },
      },
    },
  },
} as const;

export const getCompraSchema = {
  params: idParamsSchema,
  response: {
    200: {
      type: 'object',
      required: ['success', 'data'],
      properties: {
        success: { type: 'boolean' },
        data: compraDetalleResponseSchema,
      },
    },
  },
} as const;

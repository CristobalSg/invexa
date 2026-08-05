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
    estado: { type: 'string', enum: ['COMPLETADA', 'ANULADA'] },
    metodo_pago: { type: 'string', enum: ['EFECTIVO', 'TARJETA', 'TRANSFERENCIA', 'MIXTO'] },
    fecha_desde: { type: 'string', format: 'date' },
    fecha_hasta: { type: 'string', format: 'date' },
  },
} as const;

const ventaResponseSchema = {
  type: 'object',
  required: [
    'id',
    'usuario_id',
    'usuario_nombre',
    'sesion_caja_id',
    'metodo_pago',
    'subtotal',
    'descuento',
    'total',
    'modalidad',
    'estado',
    'anulada_en',
    'anulada_por',
    'motivo_anulacion',
    'creado_en',
  ],
  properties: {
    id: { type: 'number' },
    usuario_id: { type: 'number' },
    usuario_nombre: { type: 'string' },
    sesion_caja_id: { type: ['number', 'null'] },
    metodo_pago: { type: 'string', enum: ['EFECTIVO', 'TARJETA', 'TRANSFERENCIA', 'MIXTO'] },
    subtotal: { type: 'number' },
    descuento: { type: 'number' },
    total: { type: 'number' },
    modalidad: { type: 'string', enum: ['NORMAL', 'PRECIO_COSTO', 'RETIRO_DUENO'] },
    estado: { type: 'string', enum: ['COMPLETADA', 'ANULADA'] },
    anulada_en: { type: ['string', 'null'] },
    anulada_por: { type: ['number', 'null'] },
    motivo_anulacion: { type: ['string', 'null'] },
    creado_en: { type: 'string' },
  },
} as const;

const detalleVentaResponseSchema = {
  type: 'object',
  required: [
    'id',
    'venta_id',
    'producto_id',
    'producto_nombre',
    'oferta_id',
    'cantidad',
    'precio_unitario',
    'subtotal',
    'precio_normal',
    'descuento',
    'total_final',
    'tipo_propiedad',
    'proveedor_id',
    'proveedor_nombre',
  ],
  properties: {
    id: { type: 'number' },
    venta_id: { type: 'number' },
    producto_id: { type: 'number' },
    producto_nombre: { type: 'string' },
    oferta_id: { type: ['number', 'null'] },
    cantidad: { type: 'number' },
    precio_unitario: { type: 'number' },
    subtotal: { type: 'number' },
    precio_normal: { type: 'number' },
    descuento: { type: 'number' },
    total_final: { type: 'number' },
    tipo_propiedad: { type: 'string', enum: ['PROPIO', 'CONSIGNACION'] },
    proveedor_id: { type: ['number', 'null'] },
    proveedor_nombre: { type: ['string', 'null'] },
  },
} as const;

const movimientoVentaResponseSchema = {
  type: 'object',
  required: [
    'id',
    'producto_id',
    'tipo',
    'cantidad',
    'stock_anterior',
    'stock_nuevo',
    'venta_id',
    'creado_en',
  ],
  properties: {
    id: { type: 'number' },
    producto_id: { type: 'number' },
    tipo: { type: 'string', enum: ['VENTA', 'ANULACION'] },
    cantidad: { type: 'number' },
    stock_anterior: { type: ['number', 'null'] },
    stock_nuevo: { type: ['number', 'null'] },
    venta_id: { type: 'number' },
    creado_en: { type: 'string' },
  },
} as const;

const ventaDetalleResponseSchema = {
  ...ventaResponseSchema,
  required: [...ventaResponseSchema.required, 'detalles', 'movimientos'],
  properties: {
    ...ventaResponseSchema.properties,
    detalles: { type: 'array', items: detalleVentaResponseSchema },
    movimientos: { type: 'array', items: movimientoVentaResponseSchema },
  },
} as const;

export const createVentaSchema = {
  body: {
    type: 'object',
    required: ['metodo_pago', 'items'],
    additionalProperties: false,
    properties: {
      metodo_pago: { type: 'string', enum: ['EFECTIVO', 'TARJETA', 'TRANSFERENCIA', 'MIXTO'] },
      descuento: { type: 'number', minimum: 0, default: 0 },
      modalidad: { type: 'string', enum: ['NORMAL', 'PRECIO_COSTO', 'RETIRO_DUENO'], default: 'NORMAL' },
      master_password: { type: 'string', minLength: 1, maxLength: 200 },
      items: {
        type: 'array',
        minItems: 1,
        items: {
          type: 'object',
          required: ['producto_id', 'cantidad'],
          additionalProperties: false,
          properties: {
            producto_id: { type: 'integer', minimum: 1 },
            cantidad: { type: 'number', exclusiveMinimum: 0 },
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
        data: ventaDetalleResponseSchema,
      },
    },
  },
} as const;

export const listVentasSchema = {
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
            items: { type: 'array', items: ventaResponseSchema },
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

export const getVentaSchema = {
  params: idParamsSchema,
  response: {
    200: {
      type: 'object',
      required: ['success', 'data'],
      properties: {
        success: { type: 'boolean' },
        data: ventaDetalleResponseSchema,
      },
    },
  },
} as const;

export const anularVentaSchema = {
  params: idParamsSchema,
  body: {
    type: 'object',
    required: ['motivo', 'master_password'],
    additionalProperties: false,
    properties: {
      motivo: { type: 'string', minLength: 3, maxLength: 500 },
      master_password: { type: 'string', minLength: 1, maxLength: 200 },
    },
  },
  response: {
    200: {
      type: 'object',
      required: ['success', 'data'],
      properties: {
        success: { type: 'boolean' },
        data: ventaDetalleResponseSchema,
      },
    },
  },
} as const;

const idParamsSchema = {
  type: 'object',
  required: ['id'],
  additionalProperties: false,
  properties: {
    id: { type: 'integer', minimum: 1 },
  },
} as const;

const sessionsQuerySchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    page: { type: 'integer', minimum: 1, default: 1 },
    limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
    usuario_id: { type: 'integer', minimum: 1 },
    abierta: { type: 'boolean' },
    fecha_desde: { type: 'string', format: 'date' },
    fecha_hasta: { type: 'string', format: 'date' },
  },
} as const;

const resumenSchema = {
  type: 'object',
  required: [
    'cantidad_ventas',
    'subtotal',
    'descuento',
    'total_ventas',
    'efectivo',
    'tarjeta',
    'transferencia',
    'mixto',
    'ingresos',
    'egresos',
    'monto_esperado_cierre',
    'diferencia_cierre',
  ],
  properties: {
    cantidad_ventas: { type: 'number' },
    subtotal: { type: 'number' },
    descuento: { type: 'number' },
    total_ventas: { type: 'number' },
    efectivo: { type: 'number' },
    tarjeta: { type: 'number' },
    transferencia: { type: 'number' },
    mixto: { type: 'number' },
    ingresos: { type: 'number' },
    egresos: { type: 'number' },
    monto_esperado_cierre: { type: 'number' },
    diferencia_cierre: { type: ['number', 'null'] },
  },
} as const;

const movimientoCajaSchema = {
  type: 'object',
  required: [
    'id',
    'sesion_caja_id',
    'usuario_id',
    'usuario_nombre',
    'tipo',
    'categoria',
    'monto',
    'descripcion',
    'creado_en',
  ],
  properties: {
    id: { type: 'number' },
    sesion_caja_id: { type: 'number' },
    usuario_id: { type: 'number' },
    usuario_nombre: { type: 'string' },
    tipo: { type: 'string', enum: ['INGRESO', 'EGRESO'] },
    categoria: {
      type: 'string',
      enum: ['PAGO_PROVEEDOR', 'COMPRA_MENOR', 'RETIRO_PROPIETARIO', 'DEPOSITO', 'REPOSICION', 'OTRO'],
    },
    monto: { type: 'number' },
    descripcion: { type: ['string', 'null'] },
    creado_en: { type: 'string' },
  },
} as const;

const cajaSessionSchema = {
  type: 'object',
  required: [
    'id',
    'usuario_id',
    'usuario_nombre',
    'dispositivo_id',
    'monto_apertura',
    'monto_cierre',
    'monto_esperado',
    'diferencia_cierre',
    'abierta_en',
    'cerrada_en',
    'abierta',
  ],
  properties: {
    id: { type: 'number' },
    usuario_id: { type: 'number' },
    usuario_nombre: { type: 'string' },
    dispositivo_id: { type: ['string', 'null'] },
    monto_apertura: { type: 'number' },
    monto_cierre: { type: ['number', 'null'] },
    monto_esperado: { type: ['number', 'null'] },
    diferencia_cierre: { type: ['number', 'null'] },
    abierta_en: { type: 'string' },
    cerrada_en: { type: ['string', 'null'] },
    abierta: { type: 'boolean' },
  },
} as const;

const cajaSessionDetalleSchema = {
  ...cajaSessionSchema,
  required: [...cajaSessionSchema.required, 'resumen'],
  properties: {
    ...cajaSessionSchema.properties,
    resumen: resumenSchema,
    movimientos: { type: 'array', items: movimientoCajaSchema },
  },
} as const;

const nullableCajaSessionDetalleSchema = {
  anyOf: [cajaSessionDetalleSchema, { type: 'null' }],
} as const;

export const abrirCajaSchema = {
  body: {
    type: 'object',
    required: ['monto_apertura'],
    additionalProperties: false,
    properties: {
      monto_apertura: { type: 'number', minimum: 0 },
    },
  },
  response: {
    201: {
      type: 'object',
      required: ['success', 'data'],
      properties: {
        success: { type: 'boolean' },
        data: cajaSessionDetalleSchema,
      },
    },
  },
} as const;

export const cerrarCajaSchema = {
  body: {
    type: 'object',
    required: ['efectivo_contado'],
    additionalProperties: false,
    properties: {
      efectivo_contado: { type: 'number', minimum: 0 },
    },
  },
  response: {
    200: {
      type: 'object',
      required: ['success', 'data'],
      properties: {
        success: { type: 'boolean' },
        data: cajaSessionDetalleSchema,
      },
    },
  },
} as const;

export const crearMovimientoCajaSchema = {
  body: {
    type: 'object',
    required: ['tipo', 'categoria', 'monto', 'master_password'],
    additionalProperties: false,
    properties: {
      tipo: { type: 'string', enum: ['INGRESO', 'EGRESO'] },
      categoria: {
        type: 'string',
        enum: ['PAGO_PROVEEDOR', 'COMPRA_MENOR', 'RETIRO_PROPIETARIO', 'DEPOSITO', 'REPOSICION', 'OTRO'],
      },
      monto: { type: 'number', exclusiveMinimum: 0 },
      descripcion: { type: ['string', 'null'], maxLength: 500 },
      master_password: { type: 'string', minLength: 1, maxLength: 200 },
    },
  },
  response: {
    201: {
      type: 'object',
      required: ['success', 'data'],
      properties: {
        success: { type: 'boolean' },
        data: movimientoCajaSchema,
      },
    },
  },
} as const;

export const listMovimientosCajaSchema = {
  response: {
    200: {
      type: 'object',
      required: ['success', 'data'],
      properties: {
        success: { type: 'boolean' },
        data: { type: 'array', items: movimientoCajaSchema },
      },
    },
  },
} as const;

export const cajaActualSchema = {
  response: {
    200: {
      type: 'object',
      required: ['success', 'data'],
      properties: {
        success: { type: 'boolean' },
        data: nullableCajaSessionDetalleSchema,
      },
    },
  },
} as const;

export const listCajaSessionsSchema = {
  querystring: sessionsQuerySchema,
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
            items: { type: 'array', items: cajaSessionDetalleSchema },
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

export const getCajaSessionSchema = {
  params: idParamsSchema,
  response: {
    200: {
      type: 'object',
      required: ['success', 'data'],
      properties: {
        success: { type: 'boolean' },
        data: cajaSessionDetalleSchema,
      },
    },
  },
} as const;

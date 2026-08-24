const paginationQuerySchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    page: { type: 'integer', minimum: 1, default: 1 },
    limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
    search: { type: 'string', minLength: 1, maxLength: 150 },
    codigo: { type: 'string', minLength: 1, maxLength: 100 },
    nombre: { type: 'string', minLength: 1, maxLength: 150 },
    activo: { type: 'boolean' },
    categoria_id: { type: 'integer', minimum: 1 },
    proveedor_id: { type: 'integer', minimum: 1 },
    tipo_propiedad: { type: 'string', enum: ['PROPIO', 'CONSIGNACION'] },
    modo_inventario: { type: 'string', enum: ['SIN_INVENTARIO', 'FLEXIBLE', 'ESTRICTO'] },
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

const codigoParamsSchema = {
  type: 'object',
  required: ['codigo'],
  additionalProperties: false,
  properties: {
    codigo: { type: 'string', minLength: 1, maxLength: 100 },
  },
} as const;

const productoResponseSchema = {
  type: 'object',
  required: [
    'id',
    'nombre',
    'codigo_barras',
    'categoria_id',
    'categoria_nombre',
    'tipo_propiedad',
    'unidad_venta',
    'modo_inventario',
    'proveedor_id',
    'proveedor_nombre',
    'costo_actual',
    'precio_venta',
    'stock',
    'activo',
    'creado_en',
    'actualizado_en',
  ],
  properties: {
    id: { type: 'number' },
    nombre: { type: 'string' },
    codigo_barras: { type: ['string', 'null'] },
    categoria_id: { type: 'number' },
    categoria_nombre: { type: 'string' },
    tipo_propiedad: { type: 'string', enum: ['PROPIO', 'CONSIGNACION'] },
    unidad_venta: { type: 'string', enum: ['UNIDAD', 'PESO'] },
    modo_inventario: { type: 'string', enum: ['SIN_INVENTARIO', 'FLEXIBLE', 'ESTRICTO'] },
    proveedor_id: { type: ['number', 'null'] },
    proveedor_nombre: { type: ['string', 'null'] },
    costo_actual: { type: ['number', 'null'] },
    precio_venta: { type: 'number' },
    stock: { type: 'number' },
    activo: { type: 'boolean' },
    creado_en: { type: 'string' },
    actualizado_en: { type: 'string' },
  },
} as const;

const successProductoResponseSchema = {
  type: 'object',
  required: ['success', 'data'],
  properties: {
    success: { type: 'boolean' },
    data: productoResponseSchema,
  },
} as const;

export const listProductosSchema = {
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
            items: { type: 'array', items: productoResponseSchema },
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

export const getProductoSchema = {
  params: idParamsSchema,
  response: {
    200: successProductoResponseSchema,
  },
} as const;

export const getProductoByCodigoSchema = {
  params: codigoParamsSchema,
  response: {
    200: successProductoResponseSchema,
  },
} as const;

export const createProductoSchema = {
  body: {
    type: 'object',
    required: ['nombre', 'categoria_id', 'precio_venta'],
    additionalProperties: false,
    properties: {
      nombre: { type: 'string', minLength: 2, maxLength: 150 },
      codigo_barras: { type: ['string', 'null'], minLength: 1, maxLength: 100 },
      categoria_id: { type: 'integer', minimum: 1 },
      tipo_propiedad: { type: 'string', enum: ['PROPIO', 'CONSIGNACION'], default: 'PROPIO' },
      unidad_venta: { type: 'string', enum: ['UNIDAD', 'PESO'], default: 'UNIDAD' },
      modo_inventario: { type: 'string', enum: ['SIN_INVENTARIO', 'FLEXIBLE', 'ESTRICTO'], default: 'FLEXIBLE' },
      proveedor_id: { type: ['integer', 'null'], minimum: 1 },
      costo_actual: { type: ['number', 'null'], minimum: 0 },
      precio_venta: { type: 'number', exclusiveMinimum: 0 },
      stock: { type: 'number', minimum: 0, default: 0 },
      activo: { type: 'boolean' },
      master_password: { type: 'string', minLength: 1, maxLength: 200 },
    },
  },
  response: {
    201: successProductoResponseSchema,
  },
} as const;

export const updateProductoSchema = {
  params: idParamsSchema,
  body: {
    type: 'object',
    minProperties: 1,
    additionalProperties: false,
    properties: {
      nombre: { type: 'string', minLength: 2, maxLength: 150 },
      codigo_barras: { type: ['string', 'null'], minLength: 1, maxLength: 100 },
      categoria_id: { type: 'integer', minimum: 1 },
      tipo_propiedad: { type: 'string', enum: ['PROPIO', 'CONSIGNACION'] },
      unidad_venta: { type: 'string', enum: ['UNIDAD', 'PESO'] },
      modo_inventario: { type: 'string', enum: ['SIN_INVENTARIO', 'FLEXIBLE', 'ESTRICTO'] },
      proveedor_id: { type: ['integer', 'null'], minimum: 1 },
      costo_actual: { type: ['number', 'null'], minimum: 0 },
      precio_venta: { type: 'number', exclusiveMinimum: 0 },
      stock: { type: 'number', minimum: 0 },
      activo: { type: 'boolean' },
    },
  },
  response: {
    200: successProductoResponseSchema,
  },
} as const;

export const deactivateProductoSchema = {
  params: idParamsSchema,
  response: {
    200: successProductoResponseSchema,
  },
} as const;

export const resetProduceProductsSchema = {
  body: {
    type: 'object',
    required: ['master_password', 'productos'],
    additionalProperties: false,
    properties: {
      master_password: { type: 'string', minLength: 1, maxLength: 200 },
      productos: {
        type: 'array',
        minItems: 1,
        maxItems: 300,
        items: {
          type: 'object',
          required: ['nombre', 'tipo'],
          additionalProperties: false,
          properties: {
            nombre: { type: 'string', minLength: 2, maxLength: 150 },
            tipo: { type: 'string', enum: ['FRUTA', 'VERDURA'] },
          },
        },
      },
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
          required: ['categoria_id', 'desactivados', 'creados'],
          properties: {
            categoria_id: { type: 'number' },
            desactivados: { type: 'number' },
            creados: { type: 'number' },
          },
        },
      },
    },
  },
} as const;

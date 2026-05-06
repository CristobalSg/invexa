const paginationQuerySchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    page: { type: 'integer', minimum: 1, default: 1 },
    limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
    search: { type: 'string', minLength: 1, maxLength: 150 },
    activo: { type: 'boolean' },
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

const proveedorResponseSchema = {
  type: 'object',
  required: ['id', 'nombre', 'telefono', 'porcentaje_comision', 'activo', 'creado_en'],
  properties: {
    id: { type: 'number' },
    nombre: { type: 'string' },
    telefono: { type: ['string', 'null'] },
    porcentaje_comision: { type: 'number' },
    activo: { type: 'boolean' },
    creado_en: { type: 'string' },
  },
} as const;

const successProveedorResponseSchema = {
  type: 'object',
  required: ['success', 'data'],
  properties: {
    success: { type: 'boolean' },
    data: proveedorResponseSchema,
  },
} as const;

export const listProveedoresSchema = {
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
            items: { type: 'array', items: proveedorResponseSchema },
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

export const createProveedorSchema = {
  body: {
    type: 'object',
    required: ['nombre'],
    additionalProperties: false,
    properties: {
      nombre: { type: 'string', minLength: 2, maxLength: 150 },
      telefono: { type: ['string', 'null'], minLength: 3, maxLength: 50 },
      porcentaje_comision: { type: 'number', minimum: 0 },
      activo: { type: 'boolean' },
    },
  },
  response: {
    201: successProveedorResponseSchema,
  },
} as const;

export const updateProveedorSchema = {
  params: idParamsSchema,
  body: {
    type: 'object',
    minProperties: 1,
    additionalProperties: false,
    properties: {
      nombre: { type: 'string', minLength: 2, maxLength: 150 },
      telefono: { type: ['string', 'null'], minLength: 3, maxLength: 50 },
      porcentaje_comision: { type: 'number', minimum: 0 },
      activo: { type: 'boolean' },
    },
  },
  response: {
    200: successProveedorResponseSchema,
  },
} as const;

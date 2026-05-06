const paginationQuerySchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    page: { type: 'integer', minimum: 1, default: 1 },
    limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
    search: { type: 'string', minLength: 1, maxLength: 100 },
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

const categoriaResponseSchema = {
  type: 'object',
  required: ['id', 'nombre', 'multiplicador_ganancia', 'variacion_maxima_precio', 'creado_en'],
  properties: {
    id: { type: 'number' },
    nombre: { type: 'string' },
    multiplicador_ganancia: { type: 'number' },
    variacion_maxima_precio: { type: 'number' },
    creado_en: { type: 'string' },
  },
} as const;

export const listCategoriasSchema = {
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
            items: { type: 'array', items: categoriaResponseSchema },
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

export const createCategoriaSchema = {
  body: {
    type: 'object',
    required: ['nombre'],
    additionalProperties: false,
    properties: {
      nombre: { type: 'string', minLength: 2, maxLength: 100 },
      multiplicador_ganancia: { type: 'number', exclusiveMinimum: 0 },
      variacion_maxima_precio: { type: 'number', minimum: 0 },
    },
  },
  response: {
    201: {
      type: 'object',
      required: ['success', 'data'],
      properties: {
        success: { type: 'boolean' },
        data: categoriaResponseSchema,
      },
    },
  },
} as const;

export const updateCategoriaSchema = {
  params: idParamsSchema,
  body: {
    type: 'object',
    minProperties: 1,
    additionalProperties: false,
    properties: {
      nombre: { type: 'string', minLength: 2, maxLength: 100 },
      multiplicador_ganancia: { type: 'number', exclusiveMinimum: 0 },
      variacion_maxima_precio: { type: 'number', minimum: 0 },
    },
  },
  response: {
    200: {
      type: 'object',
      required: ['success', 'data'],
      properties: {
        success: { type: 'boolean' },
        data: categoriaResponseSchema,
      },
    },
  },
} as const;

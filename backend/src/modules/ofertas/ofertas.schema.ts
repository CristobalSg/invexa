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
    producto_id: { type: 'integer', minimum: 1 },
    activa: { type: 'boolean' },
    search: { type: 'string', minLength: 1, maxLength: 150 },
  },
} as const;

const ofertaResponseSchema = {
  type: 'object',
  required: [
    'id',
    'producto_id',
    'producto_nombre',
    'nombre',
    'precio_oferta',
    'activa',
    'inicia_en',
    'termina_en',
    'motivo',
    'creado_en',
    'esta_vigente',
  ],
  properties: {
    id: { type: 'number' },
    producto_id: { type: 'number' },
    producto_nombre: { type: 'string' },
    nombre: { type: 'string' },
    precio_oferta: { type: 'number' },
    activa: { type: 'boolean' },
    inicia_en: { type: 'string' },
    termina_en: { type: ['string', 'null'] },
    motivo: { type: ['string', 'null'] },
    creado_en: { type: 'string' },
    esta_vigente: { type: 'boolean' },
  },
} as const;

const successOfertaResponseSchema = {
  type: 'object',
  required: ['success', 'data'],
  properties: {
    success: { type: 'boolean' },
    data: ofertaResponseSchema,
  },
} as const;

export const listOfertasSchema = {
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
            items: { type: 'array', items: ofertaResponseSchema },
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

export const listOfertasActivasSchema = listOfertasSchema;

export const createOfertaSchema = {
  body: {
    type: 'object',
    required: ['producto_id', 'nombre', 'precio_oferta'],
    additionalProperties: false,
    properties: {
      producto_id: { type: 'integer', minimum: 1 },
      nombre: { type: 'string', minLength: 2, maxLength: 150 },
      precio_oferta: { type: 'number', exclusiveMinimum: 0 },
      activa: { type: 'boolean' },
      inicia_en: { type: 'string', format: 'date-time' },
      termina_en: { type: ['string', 'null'], format: 'date-time' },
      motivo: { type: ['string', 'null'], maxLength: 500 },
    },
  },
  response: {
    201: successOfertaResponseSchema,
  },
} as const;

export const updateOfertaSchema = {
  params: idParamsSchema,
  body: {
    type: 'object',
    minProperties: 1,
    additionalProperties: false,
    properties: {
      producto_id: { type: 'integer', minimum: 1 },
      nombre: { type: 'string', minLength: 2, maxLength: 150 },
      precio_oferta: { type: 'number', exclusiveMinimum: 0 },
      activa: { type: 'boolean' },
      inicia_en: { type: 'string', format: 'date-time' },
      termina_en: { type: ['string', 'null'], format: 'date-time' },
      motivo: { type: ['string', 'null'], maxLength: 500 },
    },
  },
  response: {
    200: successOfertaResponseSchema,
  },
} as const;

export const deactivateOfertaSchema = {
  params: idParamsSchema,
  response: {
    200: successOfertaResponseSchema,
  },
} as const;

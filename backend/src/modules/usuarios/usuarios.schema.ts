const usuarioResponseSchema = {
  type: 'object',
  required: ['id', 'nombre_usuario', 'nombre', 'email', 'rol', 'activo', 'creado_en'],
  properties: {
    id: { type: 'number' },
    nombre_usuario: { type: 'string' },
    nombre: { type: 'string' },
    email: { type: ['string', 'null'] },
    rol: { type: 'string', enum: ['OWNER', 'CASHIER'] },
    activo: { type: 'boolean' },
    creado_en: { type: 'string' },
  },
} as const;

const successUsuarioResponseSchema = {
  type: 'object',
  required: ['success', 'data'],
  properties: {
    success: { type: 'boolean' },
    data: usuarioResponseSchema,
  },
} as const;

const idParamsSchema = {
  type: 'object',
  required: ['id'],
  additionalProperties: false,
  properties: {
    id: {
      type: 'integer',
      minimum: 1,
    },
  },
} as const;

export const listUsuariosSchema = {
  response: {
    200: {
      type: 'object',
      required: ['success', 'data'],
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'array',
          items: usuarioResponseSchema,
        },
      },
    },
  },
} as const;

export const getUsuarioSchema = {
  params: idParamsSchema,
  response: {
    200: successUsuarioResponseSchema,
  },
} as const;

export const createUsuarioSchema = {
  body: {
    type: 'object',
    required: ['nombre_usuario', 'contraseña', 'nombre', 'rol'],
    additionalProperties: false,
    properties: {
      nombre_usuario: {
        type: 'string',
        minLength: 3,
        maxLength: 100,
      },
      contraseña: {
        type: 'string',
        minLength: 4,
        maxLength: 200,
      },
      nombre: {
        type: 'string',
        minLength: 2,
        maxLength: 150,
      },
      email: {
        type: ['string', 'null'],
        format: 'email',
        maxLength: 150,
      },
      rol: {
        type: 'string',
        enum: ['OWNER', 'CASHIER'],
      },
    },
  },
  response: {
    201: successUsuarioResponseSchema,
  },
} as const;

export const updateUsuarioSchema = {
  params: idParamsSchema,
  body: {
    type: 'object',
    minProperties: 1,
    additionalProperties: false,
    properties: {
      nombre_usuario: {
        type: 'string',
        minLength: 3,
        maxLength: 100,
      },
      contraseña: {
        type: 'string',
        minLength: 4,
        maxLength: 200,
      },
      nombre: {
        type: 'string',
        minLength: 2,
        maxLength: 150,
      },
      email: {
        type: ['string', 'null'],
        format: 'email',
        maxLength: 150,
      },
      rol: {
        type: 'string',
        enum: ['OWNER', 'CASHIER'],
      },
      activo: {
        type: 'boolean',
      },
    },
  },
  response: {
    200: successUsuarioResponseSchema,
  },
} as const;

export const deactivateUsuarioSchema = {
  params: idParamsSchema,
  response: {
    200: successUsuarioResponseSchema,
  },
} as const;

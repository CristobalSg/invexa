export const loginSchema = {
  body: {
    type: 'object',
    required: ['nombre_usuario', 'contraseña'],
    additionalProperties: false,
    properties: {
      nombre_usuario: {
        type: 'string',
        minLength: 3,
        maxLength: 100,
      },
      contraseña: {
        type: 'string',
        minLength: 6,
        maxLength: 200,
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
          required: ['token', 'usuario'],
          properties: {
            token: { type: 'string' },
            usuario: {
              type: 'object',
              required: ['id', 'nombre_usuario', 'nombre', 'rol'],
              properties: {
                id: { type: 'number' },
                nombre_usuario: { type: 'string' },
                nombre: { type: 'string' },
                email: { type: ['string', 'null'] },
                rol: { type: 'string', enum: ['OWNER', 'CASHIER'] },
              },
            },
          },
        },
      },
    },
  },
} as const;

export const meSchema = {
  response: {
    200: {
      type: 'object',
      required: ['success', 'data'],
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          required: ['id', 'nombre_usuario', 'nombre', 'rol'],
          properties: {
            id: { type: 'number' },
            nombre_usuario: { type: 'string' },
            nombre: { type: 'string' },
            email: { type: ['string', 'null'] },
            rol: { type: 'string', enum: ['OWNER', 'CASHIER'] },
          },
        },
      },
    },
  },
} as const;

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
        minLength: 4,
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

const authUserResponseSchema = {
  type: 'object',
  required: ['id', 'nombre_usuario', 'nombre', 'rol'],
  properties: {
    id: { type: 'number' },
    nombre_usuario: { type: 'string' },
    nombre: { type: 'string' },
    email: { type: ['string', 'null'] },
    rol: { type: 'string', enum: ['OWNER', 'CASHIER'] },
  },
} as const;

const turnoAbiertoResponseSchema = {
  type: 'object',
  required: ['id', 'usuario_id', 'usuario_nombre'],
  properties: {
    id: { type: 'number' },
    usuario_id: { type: 'number' },
    usuario_nombre: { type: 'string' },
  },
} as const;

const deviceAuthResponseSchema = {
  type: 'object',
  required: ['device_token', 'dispositivo'],
  properties: {
    device_token: { type: 'string' },
    dispositivo: {
      type: 'object',
      required: ['id', 'nombre'],
      properties: {
        id: { type: 'string' },
        nombre: { type: 'string' },
      },
    },
  },
} as const;

export const setupStatusSchema = {
  response: {
    200: {
      type: 'object',
      required: ['success', 'data'],
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          required: ['requiere_setup'],
          properties: {
            requiere_setup: { type: 'boolean' },
          },
        },
      },
    },
  },
} as const;

export const setupAdminSchema = {
  body: {
    type: 'object',
    required: ['nombre_usuario', 'nombre', 'contraseña', 'confirmar_contraseña'],
    additionalProperties: false,
    properties: {
      nombre_usuario: {
        type: 'string',
        minLength: 3,
        maxLength: 100,
      },
      nombre: {
        type: 'string',
        minLength: 1,
        maxLength: 150,
      },
      email: {
        type: ['string', 'null'],
        maxLength: 150,
      },
      contraseña: {
        type: 'string',
        minLength: 4,
        maxLength: 200,
      },
      confirmar_contraseña: {
        type: 'string',
        minLength: 4,
        maxLength: 200,
      },
      nombre_dispositivo: {
        type: 'string',
        minLength: 1,
        maxLength: 150,
      },
    },
  },
  response: {
    201: {
      type: 'object',
      required: ['success', 'data'],
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          required: ['token', 'usuario', 'device_token', 'dispositivo'],
          properties: {
            token: { type: 'string' },
            usuario: authUserResponseSchema,
            ...deviceAuthResponseSchema.properties,
          },
        },
      },
    },
  },
} as const;

export const authorizeDeviceSchema = {
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
        minLength: 4,
        maxLength: 200,
      },
      nombre_dispositivo: {
        type: 'string',
        minLength: 1,
        maxLength: 150,
      },
    },
  },
  response: {
    200: {
      type: 'object',
      required: ['success', 'data'],
      properties: {
        success: { type: 'boolean' },
        data: deviceAuthResponseSchema,
      },
    },
  },
} as const;

export const listProfilesSchema = {
  response: {
    200: {
      type: 'object',
      required: ['success', 'data'],
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'array',
          items: {
            ...authUserResponseSchema,
            required: ['id', 'nombre_usuario', 'nombre', 'rol', 'activo'],
            properties: {
              ...authUserResponseSchema.properties,
              activo: { type: 'boolean' },
            },
          },
        },
      },
    },
  },
} as const;

export const profileLoginSchema = {
  body: {
    type: 'object',
    required: ['usuario_id', 'contraseña'],
    additionalProperties: false,
    properties: {
      usuario_id: {
        type: 'integer',
        minimum: 1,
      },
      contraseña: {
        type: 'string',
        minLength: 1,
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
          required: ['token', 'usuario', 'requiere_apertura_turno', 'turno_abierto'],
          properties: {
            token: { type: 'string' },
            usuario: authUserResponseSchema,
            requiere_apertura_turno: { type: 'boolean' },
            turno_abierto: {
              anyOf: [
                turnoAbiertoResponseSchema,
                { type: 'null' },
              ],
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

export const authorizeOwnerSchema = {
  body: {
    type: 'object',
    required: ['master_password'],
    additionalProperties: false,
    properties: {
      master_password: {
        type: 'string',
        minLength: 1,
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
          required: ['authorized'],
          properties: {
            authorized: { type: 'boolean' },
          },
        },
      },
    },
  },
} as const;

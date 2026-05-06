export const listMovimientosSchema = {
  querystring: {
    type: 'object',
    additionalProperties: false,
    properties: {
      page: { type: 'integer', minimum: 1, default: 1 },
      limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
      producto_id: { type: 'integer', minimum: 1 },
      tipo: {
        type: 'string',
        enum: ['VENTA', 'COMPRA', 'AJUSTE', 'MERMA', 'DEVOLUCION', 'ANULACION'],
      },
      fecha_desde: { type: 'string', format: 'date' },
      fecha_hasta: { type: 'string', format: 'date' },
    },
  },
} as const;

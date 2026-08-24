const backupFileSchema = {
  type: 'object',
  required: ['filename', 'size_bytes', 'created_at'],
  properties: {
    filename: { type: 'string' },
    size_bytes: { type: 'number' },
    created_at: { type: 'string' },
  },
} as const;

const filenameParamsSchema = {
  type: 'object',
  required: ['filename'],
  additionalProperties: false,
  properties: {
    filename: { type: 'string', pattern: '^backup-[0-9]{8}-[0-9]{6}\\.dump$' },
  },
} as const;

export const listBackupsSchema = {
  response: {
    200: {
      type: 'object',
      required: ['success', 'data'],
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'array',
          items: backupFileSchema,
        },
      },
    },
  },
} as const;

export const createBackupSchema = {
  response: {
    201: {
      type: 'object',
      required: ['success', 'data'],
      properties: {
        success: { type: 'boolean' },
        data: backupFileSchema,
      },
    },
  },
} as const;

export const backupFilenameSchema = {
  params: filenameParamsSchema,
} as const;

export const deleteBackupSchema = {
  params: filenameParamsSchema,
  response: {
    200: {
      type: 'object',
      required: ['success', 'data'],
      properties: {
        success: { type: 'boolean' },
        data: backupFileSchema,
      },
    },
  },
} as const;

export const restoreBackupSchema = {
  headers: {
    type: 'object',
    properties: {
      'x-confirm-restore': { type: 'string' },
    },
    required: ['x-confirm-restore'],
  },
  response: {
    200: {
      type: 'object',
      required: ['success', 'data'],
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          required: ['restored'],
          properties: {
            restored: { type: 'boolean' },
          },
        },
      },
    },
  },
} as const;


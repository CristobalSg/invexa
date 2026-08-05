import bcrypt from 'bcrypt';
import type { Pool } from 'pg';

import { ForbiddenError } from './errors.js';

interface OwnerPasswordRow {
  readonly contrasena_hash: string;
}

export async function assertValidOwnerPassword(
  pool: Pool,
  password: string | undefined,
): Promise<void> {
  if (!password) {
    throw new ForbiddenError('Se requiere contraseña maestra de administrador');
  }

  const result = await pool.query<OwnerPasswordRow>(
    `
      SELECT contrasena_hash
      FROM usuarios
      WHERE rol = 'OWNER'
        AND activo = TRUE
    `,
  );

  for (const owner of result.rows) {
    if (await bcrypt.compare(password, owner.contrasena_hash)) {
      return;
    }
  }

  throw new ForbiddenError('Contraseña maestra invalida');
}

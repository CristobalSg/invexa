import type { Pool } from 'pg';

import type { UsuarioAuthRow } from './auth.types.js';

export class AuthRepository {
  constructor(private readonly pool: Pool) {}

  async findByNombreUsuario(nombreUsuario: string): Promise<UsuarioAuthRow | null> {
    const result = await this.pool.query<UsuarioAuthRow>(
      `
        SELECT
          id,
          nombre_usuario,
          contrasena_hash,
          nombre,
          email,
          rol,
          activo
        FROM usuarios
        WHERE nombre_usuario = $1
        LIMIT 1
      `,
      [nombreUsuario],
    );

    return result.rows[0] ?? null;
  }

  async findActiveById(id: number): Promise<UsuarioAuthRow | null> {
    const result = await this.pool.query<UsuarioAuthRow>(
      `
        SELECT
          id,
          nombre_usuario,
          contrasena_hash,
          nombre,
          email,
          rol,
          activo
        FROM usuarios
        WHERE id = $1
          AND activo = TRUE
        LIMIT 1
      `,
      [id],
    );

    return result.rows[0] ?? null;
  }
}

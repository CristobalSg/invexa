import type { Pool } from 'pg';

import type {
  CreateUsuarioBody,
  UpdateUsuarioBody,
  UsuarioDuplicateRow,
  UsuarioRow,
} from './usuarios.types.js';

export class UsuariosRepository {
  constructor(private readonly pool: Pool) {}

  async findAll(): Promise<UsuarioRow[]> {
    const result = await this.pool.query<UsuarioRow>(
      `
        SELECT
          id,
          nombre_usuario,
          nombre,
          email,
          rol,
          activo,
          creado_en
        FROM usuarios
        ORDER BY id ASC
      `,
    );

    return result.rows;
  }

  async findById(id: number): Promise<UsuarioRow | null> {
    const result = await this.pool.query<UsuarioRow>(
      `
        SELECT
          id,
          nombre_usuario,
          nombre,
          email,
          rol,
          activo,
          creado_en
        FROM usuarios
        WHERE id = $1
        LIMIT 1
      `,
      [id],
    );

    return result.rows[0] ?? null;
  }

  async findDuplicate(
    nombreUsuario: string,
    email: string | null,
    ignoredId?: number,
  ): Promise<UsuarioDuplicateRow | null> {
    const values: Array<string | number | null> = [nombreUsuario, email];
    const ignoredIdClause = ignoredId ? 'AND id <> $3' : '';

    if (ignoredId) {
      values.push(ignoredId);
    }

    const result = await this.pool.query<UsuarioDuplicateRow>(
      `
        SELECT
          id,
          nombre_usuario,
          email
        FROM usuarios
        WHERE (
          nombre_usuario = $1
          OR ($2::varchar IS NOT NULL AND email = $2)
        )
        ${ignoredIdClause}
        LIMIT 1
      `,
      values,
    );

    return result.rows[0] ?? null;
  }

  async create(data: CreateUsuarioBody, contrasenaHash: string): Promise<UsuarioRow> {
    const result = await this.pool.query<UsuarioRow>(
      `
        INSERT INTO usuarios (
          nombre_usuario,
          contrasena_hash,
          nombre,
          email,
          rol
        )
        VALUES ($1, $2, $3, $4, $5)
        RETURNING
          id,
          nombre_usuario,
          nombre,
          email,
          rol,
          activo,
          creado_en
      `,
      [data.nombre_usuario, contrasenaHash, data.nombre, data.email ?? null, data.rol],
    );

    return result.rows[0] as UsuarioRow;
  }

  async update(
    id: number,
    data: UpdateUsuarioBody,
    contrasenaHash?: string,
  ): Promise<UsuarioRow | null> {
    const result = await this.pool.query<UsuarioRow>(
      `
        UPDATE usuarios
        SET
          nombre_usuario = COALESCE($2, nombre_usuario),
          contrasena_hash = COALESCE($3, contrasena_hash),
          nombre = COALESCE($4, nombre),
          email = CASE
            WHEN $5::boolean THEN $6::varchar
            ELSE email
          END,
          rol = COALESCE($7::rol_usuario, rol),
          activo = COALESCE($8, activo)
        WHERE id = $1
        RETURNING
          id,
          nombre_usuario,
          nombre,
          email,
          rol,
          activo,
          creado_en
      `,
      [
        id,
        data.nombre_usuario ?? null,
        contrasenaHash ?? null,
        data.nombre ?? null,
        Object.hasOwn(data, 'email'),
        data.email ?? null,
        data.rol ?? null,
        data.activo ?? null,
      ],
    );

    return result.rows[0] ?? null;
  }

  async deactivate(id: number): Promise<UsuarioRow | null> {
    const result = await this.pool.query<UsuarioRow>(
      `
        UPDATE usuarios
        SET activo = FALSE
        WHERE id = $1
        RETURNING
          id,
          nombre_usuario,
          nombre,
          email,
          rol,
          activo,
          creado_en
      `,
      [id],
    );

    return result.rows[0] ?? null;
  }
}

import type { Pool } from 'pg';

import type { DeviceProfile, DeviceRow, UsuarioAuthRow } from './auth.types.js';

export class AuthRepository {
  constructor(private readonly pool: Pool) {}

  async countActiveOwners(): Promise<number> {
    const result = await this.pool.query<{ readonly count: string }>(
      `
        SELECT COUNT(*) AS count
        FROM usuarios
        WHERE rol = 'OWNER'
          AND activo = TRUE
      `,
    );

    return Number(result.rows[0]?.count ?? 0);
  }

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

  async findActiveProfiles(): Promise<DeviceProfile[]> {
    const result = await this.pool.query<DeviceProfile>(
      `
        SELECT
          id,
          nombre_usuario,
          nombre,
          email,
          rol,
          activo
        FROM usuarios
        WHERE activo = TRUE
        ORDER BY
          CASE WHEN rol = 'OWNER' THEN 0 ELSE 1 END,
          nombre ASC,
          id ASC
      `,
    );

    return result.rows;
  }

  async createDevice(data: {
    readonly id: string;
    readonly nombre: string;
    readonly tokenHash: string;
    readonly autorizadoPor: number;
  }): Promise<DeviceRow> {
    const result = await this.pool.query<DeviceRow>(
      `
        INSERT INTO dispositivos_pos (
          id,
          nombre,
          token_hash,
          autorizado_por
        )
        VALUES ($1, $2, $3, $4)
        RETURNING
          id,
          nombre,
          token_hash,
          autorizado_por,
          activo
      `,
      [data.id, data.nombre, data.tokenHash, data.autorizadoPor],
    );

    return result.rows[0] as DeviceRow;
  }

  async createInitialOwner(data: {
    readonly nombreUsuario: string;
    readonly contrasenaHash: string;
    readonly nombre: string;
    readonly email?: string | null;
  }): Promise<UsuarioAuthRow | null> {
    const result = await this.pool.query<UsuarioAuthRow>(
      `
        INSERT INTO usuarios (
          nombre_usuario,
          contrasena_hash,
          nombre,
          email,
          rol,
          activo
        )
        SELECT $1, $2, $3, $4, 'OWNER', TRUE
        WHERE NOT EXISTS (
          SELECT 1
          FROM usuarios
          WHERE rol = 'OWNER'
            AND activo = TRUE
        )
        RETURNING
          id,
          nombre_usuario,
          contrasena_hash,
          nombre,
          email,
          rol,
          activo
      `,
      [data.nombreUsuario, data.contrasenaHash, data.nombre, data.email ?? null],
    );

    return result.rows[0] ?? null;
  }

  async findDeviceByTokenHash(tokenHash: string): Promise<DeviceRow | null> {
    const result = await this.pool.query<DeviceRow>(
      `
        UPDATE dispositivos_pos
        SET ultimo_uso_en = NOW()
        WHERE token_hash = $1
          AND activo = TRUE
        RETURNING
          id,
          nombre,
          token_hash,
          autorizado_por,
          activo
      `,
      [tokenHash],
    );

    return result.rows[0] ?? null;
  }

  async findOpenDeviceTurn(deviceId: string): Promise<{
    readonly id: number;
    readonly usuario_id: number;
    readonly usuario_nombre: string;
  } | null> {
    const result = await this.pool.query<{
      readonly id: number;
      readonly usuario_id: number;
      readonly usuario_nombre: string;
    }>(
      `
        SELECT
          sc.id,
          sc.usuario_id,
          u.nombre AS usuario_nombre
        FROM sesiones_caja sc
        INNER JOIN usuarios u ON u.id = sc.usuario_id
        WHERE sc.dispositivo_id = $1
          AND sc.abierta = TRUE
          AND sc.cerrada_en IS NULL
        ORDER BY sc.abierta_en DESC
        LIMIT 1
      `,
      [deviceId],
    );

    return result.rows[0] ?? null;
  }
}

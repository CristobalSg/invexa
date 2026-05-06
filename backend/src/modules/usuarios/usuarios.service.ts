import bcrypt from 'bcrypt';

import { env } from '../../config/env.js';
import { ConflictError, NotFoundError } from '../../utils/errors.js';
import type { UsuariosRepository } from './usuarios.repository.js';
import type {
  CreateUsuarioBody,
  UpdateUsuarioBody,
  Usuario,
  UsuarioDuplicateRow,
  UsuarioRow,
} from './usuarios.types.js';

export class UsuariosService {
  constructor(private readonly repository: UsuariosRepository) {}

  async findAll(): Promise<Usuario[]> {
    const usuarios = await this.repository.findAll();
    return usuarios.map((usuario) => this.mapUsuario(usuario));
  }

  async findById(id: number): Promise<Usuario> {
    const usuario = await this.repository.findById(id);

    if (!usuario) {
      throw new NotFoundError('Usuario no encontrado');
    }

    return this.mapUsuario(usuario);
  }

  async create(data: CreateUsuarioBody): Promise<Usuario> {
    await this.ensureNoDuplicates(data.nombre_usuario, data.email ?? null);

    const contrasenaHash = await bcrypt.hash(data.contraseña, env.bcryptSaltRounds);
    const usuario = await this.repository.create(data, contrasenaHash);

    return this.mapUsuario(usuario);
  }

  async update(id: number, data: UpdateUsuarioBody): Promise<Usuario> {
    await this.ensureUsuarioExists(id);

    if (data.nombre_usuario !== undefined || Object.hasOwn(data, 'email')) {
      const current = await this.repository.findById(id);
      const nombreUsuario = data.nombre_usuario ?? current?.nombre_usuario;
      const email = Object.hasOwn(data, 'email') ? (data.email ?? null) : (current?.email ?? null);

      if (nombreUsuario) {
        await this.ensureNoDuplicates(nombreUsuario, email, id);
      }
    }

    const contrasenaHash =
      data.contraseña !== undefined
        ? await bcrypt.hash(data.contraseña, env.bcryptSaltRounds)
        : undefined;

    const usuario = await this.repository.update(id, data, contrasenaHash);

    if (!usuario) {
      throw new NotFoundError('Usuario no encontrado');
    }

    return this.mapUsuario(usuario);
  }

  async deactivate(id: number): Promise<Usuario> {
    const usuario = await this.repository.deactivate(id);

    if (!usuario) {
      throw new NotFoundError('Usuario no encontrado');
    }

    return this.mapUsuario(usuario);
  }

  private async ensureUsuarioExists(id: number): Promise<void> {
    const usuario = await this.repository.findById(id);

    if (!usuario) {
      throw new NotFoundError('Usuario no encontrado');
    }
  }

  private async ensureNoDuplicates(
    nombreUsuario: string,
    email: string | null,
    ignoredId?: number,
  ): Promise<void> {
    const duplicate = await this.repository.findDuplicate(nombreUsuario, email, ignoredId);

    if (!duplicate) {
      return;
    }

    throw new ConflictError(this.getDuplicateMessage(duplicate, nombreUsuario, email));
  }

  private getDuplicateMessage(
    duplicate: UsuarioDuplicateRow,
    nombreUsuario: string,
    email: string | null,
  ): string {
    if (duplicate.nombre_usuario === nombreUsuario) {
      return 'El nombre de usuario ya existe';
    }

    if (email && duplicate.email === email) {
      return 'El email ya existe';
    }

    return 'El usuario ya existe';
  }

  private mapUsuario(usuario: UsuarioRow): Usuario {
    return {
      id: usuario.id,
      nombre_usuario: usuario.nombre_usuario,
      nombre: usuario.nombre,
      email: usuario.email,
      rol: usuario.rol,
      activo: usuario.activo,
      creado_en: usuario.creado_en.toISOString(),
    };
  }
}

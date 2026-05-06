import bcrypt from 'bcrypt';
import type { FastifyInstance } from 'fastify';

import { UnauthorizedError } from '../../utils/errors.js';
import { AuthRepository } from './auth.repository.js';
import type { AuthUser, LoginBody, LoginResult, UsuarioAuthRow } from './auth.types.js';

export class AuthService {
  private readonly repository: AuthRepository;

  constructor(private readonly fastify: FastifyInstance) {
    this.repository = new AuthRepository(fastify.pg);
  }

  async login(credentials: LoginBody): Promise<LoginResult> {
    const usuario = await this.repository.findByNombreUsuario(credentials.nombre_usuario);

    if (!usuario || !usuario.activo) {
      throw new UnauthorizedError('Credenciales invalidas');
    }

    const passwordMatches = await bcrypt.compare(credentials.contraseña, usuario.contrasena_hash);

    if (!passwordMatches) {
      throw new UnauthorizedError('Credenciales invalidas');
    }

    const authUser = this.mapAuthUser(usuario);
    const token = this.fastify.jwt.sign({
      id: authUser.id,
      rol: authUser.rol,
      nombre_usuario: authUser.nombre_usuario,
    });

    return {
      token,
      usuario: authUser,
    };
  }

  async getProfile(usuarioId: number): Promise<AuthUser> {
    const usuario = await this.repository.findActiveById(usuarioId);

    if (!usuario) {
      throw new UnauthorizedError('Usuario no encontrado o inactivo');
    }

    return this.mapAuthUser(usuario);
  }

  private mapAuthUser(usuario: UsuarioAuthRow): AuthUser {
    return {
      id: usuario.id,
      nombre_usuario: usuario.nombre_usuario,
      nombre: usuario.nombre,
      email: usuario.email,
      rol: usuario.rol,
    };
  }
}

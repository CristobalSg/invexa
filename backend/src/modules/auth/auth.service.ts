import { createHash, randomBytes, randomUUID } from 'node:crypto';
import bcrypt from 'bcrypt';
import type { FastifyInstance } from 'fastify';

import { env } from '../../config/env.js';
import { BadRequestError, ConflictError, UnauthorizedError } from '../../utils/errors.js';
import { assertValidOwnerPassword } from '../../utils/master-authorization.js';
import { AuthRepository } from './auth.repository.js';
import type {
  AuthUser,
  AuthorizeDeviceBody,
  DeviceAuthResult,
  DeviceProfile,
  DeviceRow,
  LoginBody,
  LoginResult,
  PosProfileLoginResult,
  ProfileLoginBody,
  RecoverProfilePasswordBody,
  SetupAdminBody,
  SetupAdminResult,
  SetupStatusResult,
  UsuarioAuthRow,
} from './auth.types.js';

export class AuthService {
  private readonly repository: AuthRepository;

  constructor(private readonly fastify: FastifyInstance) {
    this.repository = new AuthRepository(fastify.pg);
  }

  async setupStatus(): Promise<SetupStatusResult> {
    const owners = await this.repository.countActiveOwners();
    return { requiere_setup: owners === 0 };
  }

  async setupInitialAdmin(data: SetupAdminBody): Promise<SetupAdminResult> {
    const owners = await this.repository.countActiveOwners();

    if (owners > 0) {
      throw new ConflictError('El administrador inicial ya fue configurado');
    }

    if (data.contraseña !== data.confirmar_contraseña) {
      throw new BadRequestError('Las contraseñas no coinciden');
    }

    const nombreUsuario = data.nombre_usuario.trim();
    const nombre = data.nombre.trim();
    const email = data.email?.trim() || null;
    const contrasenaHash = await bcrypt.hash(data.contraseña, env.bcryptSaltRounds);
    const usuario = await this.repository.createInitialOwner({
      nombreUsuario,
      contrasenaHash,
      nombre,
      email,
    });

    if (!usuario) {
      throw new ConflictError('El administrador inicial ya fue configurado');
    }

    const authUser = this.mapAuthUser(usuario);
    const token = this.fastify.jwt.sign({
      id: authUser.id,
      rol: authUser.rol,
      nombre_usuario: authUser.nombre_usuario,
    });
    const deviceToken = randomBytes(32).toString('hex');
    const device = await this.repository.createDevice({
      id: randomUUID(),
      nombre: data.nombre_dispositivo?.trim() || 'Caja POS',
      tokenHash: this.hashDeviceToken(deviceToken),
      autorizadoPor: usuario.id,
    });

    return {
      token,
      usuario: authUser,
      ...this.mapDeviceAuth(deviceToken, device),
    };
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

  async authorizeDevice(data: AuthorizeDeviceBody): Promise<DeviceAuthResult> {
    const usuario = await this.validateCredentials(data.nombre_usuario, data.contraseña);

    if (usuario.rol !== 'OWNER') {
      throw new UnauthorizedError('Solo un administrador puede autorizar este equipo');
    }

    const deviceToken = randomBytes(32).toString('hex');
    const device = await this.repository.createDevice({
      id: randomUUID(),
      nombre: data.nombre_dispositivo?.trim() || 'Caja POS',
      tokenHash: this.hashDeviceToken(deviceToken),
      autorizadoPor: usuario.id,
    });

    return this.mapDeviceAuth(deviceToken, device);
  }

  async validateDevice(deviceToken: string | undefined): Promise<DeviceRow> {
    if (!deviceToken) {
      throw new UnauthorizedError('Equipo no autorizado');
    }

    const device = await this.repository.findDeviceByTokenHash(this.hashDeviceToken(deviceToken));

    if (!device) {
      throw new UnauthorizedError('Equipo no autorizado');
    }

    return device;
  }

  async listProfiles(deviceToken: string | undefined): Promise<DeviceProfile[]> {
    await this.validateDevice(deviceToken);
    return this.repository.findActiveProfiles();
  }

  async loginProfile(
    deviceToken: string | undefined,
    data: ProfileLoginBody,
  ): Promise<PosProfileLoginResult> {
    const device = await this.validateDevice(deviceToken);
    const usuario = await this.repository.findActiveById(data.usuario_id);

    if (!usuario) {
      throw new UnauthorizedError('Usuario no encontrado o inactivo');
    }

    const passwordMatches = await bcrypt.compare(data.contraseña, usuario.contrasena_hash);

    if (!passwordMatches) {
      throw new UnauthorizedError('PIN o contraseña incorrecta');
    }

    const openTurn = await this.repository.findOpenDeviceTurn(device.id);

    if (openTurn && openTurn.usuario_id !== usuario.id) {
      throw new ConflictError('Hay un turno abierto de otro usuario en este equipo', {
        turno_abierto: openTurn,
      });
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
      requiere_apertura_turno: !openTurn && authUser.rol !== 'OWNER',
      turno_abierto: openTurn,
    };
  }

  async recoverProfilePassword(
    deviceToken: string | undefined,
    data: RecoverProfilePasswordBody,
  ): Promise<AuthUser> {
    await this.validateDevice(deviceToken);

    if (data.contraseña !== data.confirmar_contraseña) {
      throw new BadRequestError('Las contraseñas no coinciden');
    }

    await assertValidOwnerPassword(this.fastify.pg, data.master_password);

    const contrasenaHash = await bcrypt.hash(data.contraseña, env.bcryptSaltRounds);
    const usuario = await this.repository.updatePassword(data.usuario_id, contrasenaHash);

    if (!usuario) {
      throw new UnauthorizedError('Usuario no encontrado o inactivo');
    }

    return this.mapAuthUser(usuario);
  }

  async getProfile(usuarioId: number): Promise<AuthUser> {
    const usuario = await this.repository.findActiveById(usuarioId);

    if (!usuario) {
      throw new UnauthorizedError('Usuario no encontrado o inactivo');
    }

    return this.mapAuthUser(usuario);
  }

  private async validateCredentials(
    nombreUsuario: string,
    contraseña: string,
  ): Promise<UsuarioAuthRow> {
    const usuario = await this.repository.findByNombreUsuario(nombreUsuario);

    if (!usuario || !usuario.activo) {
      throw new UnauthorizedError('Credenciales invalidas');
    }

    const passwordMatches = await bcrypt.compare(contraseña, usuario.contrasena_hash);

    if (!passwordMatches) {
      throw new UnauthorizedError('Credenciales invalidas');
    }

    return usuario;
  }

  private hashDeviceToken(deviceToken: string): string {
    return createHash('sha256').update(deviceToken).digest('hex');
  }

  private mapDeviceAuth(deviceToken: string, device: DeviceRow): DeviceAuthResult {
    return {
      device_token: deviceToken,
      dispositivo: {
        id: device.id,
        nombre: device.nombre,
      },
    };
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

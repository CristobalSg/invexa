import { ConflictError, NotFoundError } from '../../utils/errors.js';
import type { ProveedoresRepository } from './proveedores.repository.js';
import type {
  CreateProveedorBody,
  PaginatedResult,
  PaginationQuery,
  Proveedor,
  ProveedorListRow,
  ProveedorRow,
  UpdateProveedorBody,
} from './proveedores.types.js';

export class ProveedoresService {
  constructor(private readonly repository: ProveedoresRepository) {}

  async findAll(query: PaginationQuery): Promise<PaginatedResult<Proveedor>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const rows = await this.repository.findAll({ ...query, page, limit });
    const total = rows[0] ? Number(rows[0].total_count) : 0;

    return {
      items: rows.map((row) => this.mapProveedor(row)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async create(data: CreateProveedorBody): Promise<Proveedor> {
    await this.ensureNombreAvailable(data.nombre);
    const proveedor = await this.repository.create(data);
    return this.mapProveedor(proveedor);
  }

  async update(id: number, data: UpdateProveedorBody): Promise<Proveedor> {
    await this.ensureExists(id);

    if (data.nombre !== undefined) {
      await this.ensureNombreAvailable(data.nombre, id);
    }

    const proveedor = await this.repository.update(id, data);

    if (!proveedor) {
      throw new NotFoundError('Proveedor no encontrado');
    }

    return this.mapProveedor(proveedor);
  }

  private async ensureExists(id: number): Promise<void> {
    const proveedor = await this.repository.findById(id);

    if (!proveedor) {
      throw new NotFoundError('Proveedor no encontrado');
    }
  }

  private async ensureNombreAvailable(nombre: string, ignoredId?: number): Promise<void> {
    const proveedor = await this.repository.findByNombre(nombre, ignoredId);

    if (proveedor) {
      throw new ConflictError('El proveedor ya existe');
    }
  }

  private mapProveedor(row: ProveedorRow | ProveedorListRow): Proveedor {
    return {
      id: row.id,
      nombre: row.nombre,
      telefono: row.telefono,
      porcentaje_comision: Number(row.porcentaje_comision),
      activo: row.activo,
      creado_en: row.creado_en.toISOString(),
    };
  }
}

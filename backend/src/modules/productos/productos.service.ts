import { BadRequestError, ConflictError, NotFoundError } from '../../utils/errors.js';
import type { ProductosRepository } from './productos.repository.js';
import type {
  CreateProductoBody,
  PaginatedResult,
  PaginationQuery,
  Producto,
  ProductoListRow,
  ProductoRow,
  TipoPropiedadProducto,
  UpdateProductoBody,
} from './productos.types.js';

export class ProductosService {
  constructor(private readonly repository: ProductosRepository) {}

  async findAll(query: PaginationQuery): Promise<PaginatedResult<Producto>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const rows = await this.repository.findAll({ ...query, page, limit });
    const total = rows[0] ? Number(rows[0].total_count) : 0;

    return {
      items: rows.map((row) => this.mapProducto(row)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findById(id: number): Promise<Producto> {
    const producto = await this.repository.findById(id);

    if (!producto) {
      throw new NotFoundError('Producto no encontrado');
    }

    return this.mapProducto(producto);
  }

  async findByCodigo(codigo: string): Promise<Producto> {
    const producto = await this.repository.findByCodigo(codigo);

    if (!producto) {
      throw new NotFoundError('Producto no encontrado');
    }

    return this.mapProducto(producto);
  }

  async create(data: CreateProductoBody): Promise<Producto> {
    await this.validateProductReferences(
      data.categoria_id,
      data.tipo_propiedad ?? 'PROPIO',
      data.proveedor_id ?? null,
    );
    await this.ensureCodigoAvailable(data.codigo_barras ?? null);

    const producto = await this.repository.create(data);
    return this.mapProducto(producto);
  }

  async update(id: number, data: UpdateProductoBody): Promise<Producto> {
    const current = await this.repository.findById(id);

    if (!current) {
      throw new NotFoundError('Producto no encontrado');
    }

    const categoriaId = data.categoria_id ?? current.categoria_id;
    const tipoPropiedad = data.tipo_propiedad ?? current.tipo_propiedad;
    const proveedorId = Object.hasOwn(data, 'proveedor_id')
      ? (data.proveedor_id ?? null)
      : current.proveedor_id;

    await this.validateProductReferences(categoriaId, tipoPropiedad, proveedorId);

    if (Object.hasOwn(data, 'codigo_barras')) {
      await this.ensureCodigoAvailable(data.codigo_barras ?? null, id);
    }

    const producto = await this.repository.update(id, data);

    if (!producto) {
      throw new NotFoundError('Producto no encontrado');
    }

    return this.mapProducto(producto);
  }

  async deactivate(id: number): Promise<Producto> {
    const producto = await this.repository.deactivate(id);

    if (!producto) {
      throw new NotFoundError('Producto no encontrado');
    }

    return this.mapProducto(producto);
  }

  private async validateProductReferences(
    categoriaId: number,
    tipoPropiedad: TipoPropiedadProducto,
    proveedorId: number | null,
  ): Promise<void> {
    const categoria = await this.repository.findCategoriaById(categoriaId);

    if (!categoria) {
      throw new BadRequestError('La categoria es obligatoria y debe existir');
    }

    if (tipoPropiedad === 'CONSIGNACION' && proveedorId === null) {
      throw new BadRequestError('Los productos en consignacion requieren proveedor');
    }

    if (proveedorId !== null) {
      const proveedor = await this.repository.findActiveProveedorById(proveedorId);

      if (!proveedor) {
        throw new BadRequestError('El proveedor debe existir y estar activo');
      }
    }
  }

  private async ensureCodigoAvailable(codigo: string | null, ignoredId?: number): Promise<void> {
    if (!codigo) {
      return;
    }

    const duplicate = await this.repository.findDuplicateCodigo(codigo, ignoredId);

    if (duplicate) {
      throw new ConflictError('El codigo de barras ya existe');
    }
  }

  private mapProducto(row: ProductoRow | ProductoListRow): Producto {
    return {
      id: row.id,
      nombre: row.nombre,
      codigo_barras: row.codigo_barras,
      categoria_id: row.categoria_id,
      categoria_nombre: row.categoria_nombre,
      tipo_propiedad: row.tipo_propiedad,
      unidad_venta: row.unidad_venta,
      modo_inventario: row.modo_inventario,
      proveedor_id: row.proveedor_id,
      proveedor_nombre: row.proveedor_nombre,
      costo_actual: row.costo_actual === null ? null : Number(row.costo_actual),
      precio_venta: Number(row.precio_venta),
      stock: Number(row.stock),
      activo: row.activo,
      creado_en: row.creado_en.toISOString(),
      actualizado_en: row.actualizado_en.toISOString(),
    };
  }
}

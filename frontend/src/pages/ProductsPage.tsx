import { useMemo, useState } from "react";
import { keepPreviousData, useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FunnelIcon } from "@heroicons/react/24/outline";
import { getProducts, deleteProduct } from "../services/productService";
import type { ModoInventarioProducto, Producto } from "../types/api";

import { ProductModal } from "../components/ProductModal";
import { ProductCard } from "../components/ProductCard";
import ProductFormCreate from "../components/ProductFormCreate";
import { getStoredUser } from "../services/authService";
import { getCategorias } from "../services/catalogService";
import ModuleCard from "../components/ModuleCard";
import { Button, FormField, inputClassName } from "../components/FormControls";

const modoInventarioLabels: Record<ModoInventarioProducto, string> = {
  SIN_INVENTARIO: "Sin inventario",
  FLEXIBLE: "Inventario flexible",
  ESTRICTO: "Inventario estricto",
};

export default function ProductsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState<Producto | null>(null);
  const [codigo, setCodigo] = useState("");
  const [nombre, setNombre] = useState("");
  const [categoriaId, setCategoriaId] = useState("");
  const isOwner = getStoredUser()?.rol === "OWNER";

  const queryClient = useQueryClient();

  const { data: products, isLoading, isFetching, error } = useQuery({
    queryKey: ["products"],
    queryFn: () => getProducts({ activo: true, limit: 100 }),
    placeholderData: keepPreviousData,
  });
  const { data: categorias } = useQuery({ queryKey: ["categorias"], queryFn: () => getCategorias() });

  const productosFiltrados = useMemo(() => {
    const normalizedCodigo = codigo.trim().toLowerCase();
    const normalizedNombre = nombre.trim().toLowerCase();

    return (products?.items ?? [])
      .filter((product) => !categoriaId || product.categoria_id === Number(categoriaId))
      .filter((product) => {
        if (!normalizedCodigo) return true;
        return (product.codigo_barras ?? "").toLowerCase().includes(normalizedCodigo);
      })
      .filter((product) => {
        if (!normalizedNombre) return true;
        return product.nombre.toLowerCase().includes(normalizedNombre);
      });
  }, [categoriaId, codigo, nombre, products?.items]);

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteProduct(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });

  const handleEdit = (product: Producto) => {
    setProductToEdit(product);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("¿Estás seguro de que deseas eliminar este producto?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setProductToEdit(null);
  };

  const handleSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["products"] });
    handleCloseModal();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Gestión de Inventario</h1>
        {isOwner && <Button
          onClick={() => {
            setIsModalOpen(true);
            setProductToEdit(null);
          }}
        >
          Crear producto
        </Button>}
      </div>
      <ModuleCard title="Filtros" icon={FunnelIcon} contentClassName="p-4">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
          <FormField label="Código de barra">
            <input
              value={codigo}
              onChange={(event) => setCodigo(event.target.value)}
              className={inputClassName}
              placeholder="Buscar por código"
            />
          </FormField>
          <FormField label="Nombre">
            <input
              value={nombre}
              onChange={(event) => setNombre(event.target.value)}
              className={inputClassName}
              placeholder="Buscar por nombre"
            />
          </FormField>
          <FormField label="Categoría">
            <select
              value={categoriaId}
              onChange={(event) => setCategoriaId(event.target.value)}
              className={inputClassName}
            >
              <option value="">Todas</option>
              {categorias?.items.map((category) => (
                <option key={category.id} value={category.id}>{category.nombre}</option>
              ))}
            </select>
          </FormField>
        </div>
      </ModuleCard>
      {error && <p className="text-sm text-red-500">Error al cargar productos</p>}
      {isFetching && <p className="text-sm text-gray-500">Actualizando productos...</p>}

      <ProductModal isOpen={isModalOpen} onClose={handleCloseModal}>
        <ProductFormCreate
          initialData={productToEdit ?? undefined}
          onSuccess={handleSuccess}
        />
      </ProductModal>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {isLoading && <p>Cargando productos...</p>}
        {productosFiltrados.map((product) => (
          <ProductCard
            key={product.id}
            name={product.nombre}
            description={
              <div>
                <p className="text-sm text-gray-500">
                  Código de barras: {product.codigo_barras ?? "Sin código"}
                </p>
                <p className="text-sm text-gray-500">
                  Categoría: {product.categoria_nombre}
                </p>
                <p className="text-sm text-gray-500">Propiedad: {product.tipo_propiedad}</p>
                <p className="text-sm text-gray-500">
                  Unidad venta: {product.unidad_venta === "PESO" ? "Peso" : "Unidad"}
                </p>
                <p className="text-sm text-gray-500">
                  Modo inventario: {modoInventarioLabels[product.modo_inventario]}
                </p>
                <p className="text-sm text-gray-500">Proveedor: {product.proveedor_nombre ?? "No aplica"}</p>
                <p className="font-semibold mt-2">Stock: {product.stock}{product.unidad_venta === "PESO" ? " kg" : ""}</p>
                <p className="font-semibold">Precio: ${product.precio_venta.toLocaleString()}</p>
              </div>
            }
            onEdit={isOwner ? () => handleEdit(product) : undefined}
            onDelete={isOwner ? () => handleDelete(product.id.toString()) : undefined}
          />
        ))}
        {!isLoading && productosFiltrados.length === 0 && (
          <p className="text-sm text-gray-500">No se encontraron productos.</p>
        )}
      </div>
    </div>
  );
}

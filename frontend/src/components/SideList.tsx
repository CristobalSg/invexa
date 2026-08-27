import { useQuery } from "@tanstack/react-query"
import type { ReactNode } from "react"
import { getProducts } from "../services/productService"
import type { Producto } from "../types/api"
import ProductTile from "./ProductTile"

interface Props {
  searchTerm: string
  onProductClick: (product: Producto) => void
  featuredProductIds?: number[]
  onToggleFeatured?: (productId: number) => void
  productsOverride?: Producto[]
  isLoadingOverride?: boolean
  kicker?: string
  title?: string
  actions?: ReactNode
}

export default function SideList({
  searchTerm,
  onProductClick,
  featuredProductIds = [],
  onToggleFeatured,
  productsOverride,
  isLoadingOverride = false,
  kicker = "Seleccionado",
  title = "Productos",
  actions,
}: Props) {
  const { data: products, isLoading } = useQuery({
    queryKey: ["products"],
    queryFn: () => getProducts({ activo: true }),
    enabled: productsOverride === undefined,
  })
  
  if (isLoadingOverride || isLoading) {
    return (
      <div className="pos-products-block">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <p className="ml-3 text-gray-600">Cargando productos...</p>
        </div>
      </div>
    )
  }

  const productItems = productsOverride ?? products?.items ?? [];
  const filtered = productItems.filter((p) => {
    const term = searchTerm.toLowerCase();
    return (
      p.nombre.toLowerCase().includes(term) ||
      p.categoria_nombre.toLowerCase().includes(term)
    );
  })

  return (
    <section className="pos-products-block">
      <div className="pos-section-row">
        <div>
          <span className="pos-kicker">{kicker}</span>
          <h2 className="pos-subtitle">{title}</h2>
        </div>
        <div className="pos-list-actions">
          {actions}
          <button type="button" className="rounded-xl border border-[#ececf0] bg-white px-3 py-2 text-xs font-semibold text-[#71747d]">
            {filtered.length} productos
          </button>
        </div>
      </div>
      <div className="mt-1">
        {searchTerm && (
          <p className="text-sm text-gray-500">
            Filtrando por: <span className="font-medium text-gray-700">"{searchTerm}"</span>
          </p>
        )}
      </div>

      {!filtered || filtered.length === 0 ? (
        <div className="rounded-2xl border border-[#eeeef1] bg-[#fbfaf6] py-14 text-center">
          <p className="text-sm text-gray-500">No se encontraron productos</p>
        </div>
      ) : (
        <div className="pos-product-grid quick-product-grid">
          {filtered.map((prod) => {
            const isFeatured = featuredProductIds.includes(prod.id)

            return (
              <ProductTile
                key={prod.id}
                product={prod}
                isFeatured={isFeatured}
                density="compact"
                compactVariant="quick"
                onClick={() => onProductClick(prod)}
                onToggleFeatured={onToggleFeatured ? () => onToggleFeatured(prod.id) : undefined}
              />
            )
          })}
        </div>
      )}
    </section>
  )
}

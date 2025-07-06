import { MinusIcon, TrashIcon } from "@heroicons/react/24/outline"
import type { Product } from "../types/product"

interface ProductListProps {
  products?: Product[]
  onDecrease?: (id: string) => void
  onRemove?: (id: string) => void
}

export default function ProductList({ products = [], onDecrease, onRemove }: ProductListProps) {
  if (products.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-100 p-6">
        <h2 className="text-sm font-medium text-gray-900 mb-4">Carrito</h2>
        <div className="text-center py-8">
          <p className="text-sm text-gray-500">Sin productos</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-gray-100 p-6">
      <h2 className="text-sm font-medium text-gray-900 mb-4">Carrito</h2>
      <div className="space-y-3">
        {products.map((product) => (
          <div
            key={product.id}
            className="flex items-center justify-between py-2 border-b border-gray-50 last:border-b-0"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{product.name}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-gray-500">{product.barCode}</span>
                <span className="text-xs text-gray-400">•</span>
                <span className="text-xs text-gray-500">
                  {product.quantity} {product.quantity === 1 ? "unidad" : "unidades"}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1 ml-4">
              {onDecrease && (
                <button
                  onClick={() => onDecrease(product.id.toString())}
                  className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-md transition-colors"
                  aria-label="Disminuir cantidad"
                >
                  <MinusIcon className="w-4 h-4" />
                </button>
              )}
              {onRemove && (
                <button
                  onClick={() => onRemove(product.id.toString())}
                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                  aria-label="Eliminar producto"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// src/components/MainList.tsx
import { MinusIcon, PlusIcon, TrashIcon } from "@heroicons/react/24/outline"
import type { Producto } from "../types/api"

type CartProduct = Producto & { quantity: number; cartItemId?: string }

const isWeighableProduct = (product: Producto) =>
  product.unidad_venta === "PESO"

const blocksSalesByStock = (product: Producto) =>
  product.modo_inventario === "ESTRICTO"

const formatQuantity = (quantity: number, isWeight: boolean) =>
  isWeight ? `${Number(quantity).toFixed(3)} kg` : `${quantity} un.`

interface ProductListProps {
  products?: CartProduct[]
  onDecrease?: (id: string) => void
  onIncrease?: (id: string) => void
  onRemove?: (id: string) => void
}

export default function ProductList({ products = [], onDecrease, onIncrease, onRemove }: ProductListProps) {
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
      <div className="max-h-[58vh] space-y-3 overflow-y-auto pr-2">
        {products.map((product, index) => {
          const cartItemId = product.cartItemId ?? product.id.toString()
          const lockedQuantity = isWeighableProduct(product)
          const limitedByStock = blocksSalesByStock(product)

          return (
            <div
              key={cartItemId}
              className={`grid grid-cols-[1fr_auto_auto] items-center gap-4 rounded-md border px-4 py-3 ${
                index % 2 === 0
                  ? "border-gray-200 bg-gray-50"
                  : "border-blue-100 bg-blue-50/60"
              }`}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{product.nombre}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-gray-500">{product.codigo_barras ?? "Sin codigo"}</span>
                  <span className="text-xs text-gray-400">•</span>
                  <span className="text-xs text-gray-500">{product.stock} disponibles</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  ${product.precio_venta.toLocaleString()}{lockedQuantity ? "/kg" : " c/u"}
                </p>
              </div>

              <div className="min-w-28 rounded-md border border-gray-200 bg-white px-3 py-2 text-center">
                <p className="text-xs font-medium uppercase text-gray-400">
                  {lockedQuantity ? "Peso" : "Cantidad"}
                </p>
                <p className="text-2xl font-bold leading-tight text-gray-900">{formatQuantity(product.quantity, lockedQuantity)}</p>
              </div>

              <div className="flex items-center gap-2">
                {onDecrease && !lockedQuantity && (
                <button
                  onClick={() => onDecrease(cartItemId)}
                  className="p-2 text-gray-500 hover:text-amber-600 hover:bg-amber-50 rounded-md transition-colors"
                  aria-label="Disminuir cantidad"
                >
                  <MinusIcon className="w-5 h-5" />
                </button>
                )}
                {onIncrease && !lockedQuantity && (
                <button
                  onClick={() => onIncrease(cartItemId)}
                  disabled={limitedByStock && product.quantity >= product.stock}
                  className="p-2 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Aumentar cantidad"
                >
                  <PlusIcon className="w-5 h-5" />
                </button>
                )}
                {onRemove && (
                <button
                  onClick={() => onRemove(cartItemId)}
                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                  aria-label="Eliminar producto"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

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
      <div className="pos-cart-list">
        <div className="grid min-h-56 place-items-center content-center text-center text-[#9b9da5]">
          <div className="text-4xl">🛒</div>
          <strong className="mt-2 block text-sm text-[#6e7078]">Carrito vacío</strong>
          <span className="mt-1 block max-w-56 text-xs leading-5">Selecciona productos del catálogo para agregarlos a la venta.</span>
        </div>
      </div>
    )
  }

  return (
    <div className="pos-cart-list">
        {products.map((product, index) => {
          const cartItemId = product.cartItemId ?? product.id.toString()
          const lockedQuantity = isWeighableProduct(product)
          const limitedByStock = blocksSalesByStock(product)

          return (
            <div
              key={cartItemId}
              className="pos-cart-item"
            >
              <div className="pos-cart-thumb">{index + 1}</div>
              <div className="min-w-0">
                <p className="pos-cart-name">{product.nombre}</p>
                <p className="pos-cart-meta">
                  ${product.precio_venta.toLocaleString()}{lockedQuantity ? "/kg" : " c/u"} · {formatQuantity(product.quantity, lockedQuantity)}
                </p>
                <p className="pos-cart-line-total">
                  ${(product.precio_venta * product.quantity).toLocaleString()}
                </p>
              </div>

              <div className="pos-cart-controls">
                <div className="pos-qty-row">
                  {onDecrease && !lockedQuantity && (
                    <button
                      type="button"
                      onClick={() => onDecrease(cartItemId)}
                      className="pos-qty-btn"
                      aria-label="Disminuir cantidad"
                    >
                      <MinusIcon className="h-5 w-5" />
                    </button>
                  )}
                  <span className="pos-qty-value">{formatQuantity(product.quantity, lockedQuantity)}</span>
                  {onIncrease && !lockedQuantity && (
                    <button
                      type="button"
                      onClick={() => onIncrease(cartItemId)}
                      disabled={limitedByStock && product.quantity >= product.stock}
                      className="pos-qty-btn disabled:cursor-not-allowed disabled:opacity-40"
                      aria-label="Aumentar cantidad"
                    >
                      <PlusIcon className="h-5 w-5" />
                    </button>
                  )}
                </div>
                  {onRemove && (
                    <button
                      type="button"
                      onClick={() => onRemove(cartItemId)}
                      className="pos-cart-remove"
                      aria-label="Eliminar producto"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  )}
              </div>
            </div>
          )
        })}
    </div>
  )
}

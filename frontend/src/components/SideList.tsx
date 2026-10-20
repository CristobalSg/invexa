import { useEffect, useRef } from "react";
import { StarIcon as StarIconOutline } from "@heroicons/react/24/outline";
import { StarIcon as StarIconSolid } from "@heroicons/react/24/solid";
import type { Producto } from "../types/api";

interface Props {
  searchTerm: string;
  products: Producto[];
  totalProducts: number;
  selectedIndex: number;
  keyboardActive: boolean;
  favoriteProductIds: number[];
  cartShortcut: string;
  checkoutShortcut: string;
  isLoading?: boolean;
  onProductClick: (product: Producto, index: number) => void;
  onToggleFavorite: (productId: number) => void;
}

const isWeighableProduct = (product: Producto) => product.unidad_venta === "PESO";

export default function SideList({
  searchTerm,
  products,
  totalProducts,
  selectedIndex,
  keyboardActive,
  favoriteProductIds,
  cartShortcut,
  checkoutShortcut,
  isLoading = false,
  onProductClick,
  onToggleFavorite,
}: Props) {
  const selectedRef = useRef<HTMLDivElement>(null);
  const favoriteIds = new Set(favoriteProductIds);

  useEffect(() => {
    if (!keyboardActive) return;
    selectedRef.current?.scrollIntoView({ block: "nearest" });
  }, [keyboardActive, selectedIndex]);

  return (
    <section className="pos-products-block pos-keyboard-products">
      <div className="pos-section-row">
        <div>
          <span className="pos-kicker">Catálogo</span>
          <h2 className="pos-subtitle">Productos</h2>
        </div>
        <div className="pos-keyboard-help" aria-label="Atajos de teclado">
          <kbd>↑</kbd><kbd>↓</kbd> navegar <kbd>Enter</kbd> agregar <kbd>{cartShortcut}</kbd> carrito <kbd>{checkoutShortcut}</kbd> finalizar
        </div>
      </div>

      <div className="pos-product-results-summary" aria-live="polite">
        <span>
          {searchTerm
            ? <>Resultados para <strong>“{searchTerm}”</strong></>
            : "Todos los productos activos"}
        </span>
        <strong>Mostrando {products.length} de {totalProducts}</strong>
      </div>

      {isLoading ? (
        <div className="pos-product-list-empty">Cargando productos...</div>
      ) : products.length === 0 ? (
        <div className="pos-product-list-empty">
          <strong>No se encontraron productos</strong>
          <span>Prueba con otro nombre o código de barra.</span>
        </div>
      ) : (
        <div className="pos-keyboard-product-list" role="listbox" aria-label="Productos disponibles">
          {products.map((product, index) => {
            const selected = keyboardActive && index === selectedIndex;
            const weight = isWeighableProduct(product);
            const isFavorite = favoriteIds.has(product.id);

            return (
              <div
                key={product.id}
                ref={selected ? selectedRef : undefined}
                role="option"
                aria-selected={selected}
                className={`pos-keyboard-product-row ${selected ? "selected" : ""} ${product.stock <= 0 ? "out-of-stock" : ""}`}
              >
                <button type="button" className="pos-keyboard-product-select" onClick={() => onProductClick(product, index)}>
                  <span className="pos-product-row-index">{index + 1}</span>
                  <span className="pos-product-row-main">
                    <strong>{product.nombre}</strong>
                    <small>{product.codigo_barras ?? "Sin código"} · {product.categoria_nombre}</small>
                  </span>
                  <span className="pos-product-row-stock">
                    {product.stock <= 0 ? "Sin stock" : `${product.stock} ${weight ? "kg" : "un."}`}
                  </span>
                  <span className="pos-product-row-price">
                    ${product.precio_venta.toLocaleString()}{weight ? "/kg" : ""}
                  </span>
                </button>
                <button
                  type="button"
                  className={`pos-product-row-favorite ${isFavorite ? "active" : ""}`}
                  onClick={() => onToggleFavorite(product.id)}
                  aria-label={isFavorite ? `Quitar ${product.nombre} de favoritos` : `Agregar ${product.nombre} a favoritos`}
                  title={isFavorite ? "Quitar de favoritos" : "Agregar a favoritos"}
                >
                  {isFavorite ? <StarIconSolid /> : <StarIconOutline />}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

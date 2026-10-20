import { useEffect, useRef } from "react";
import type { Producto } from "../types/api";

interface Props {
  searchTerm: string;
  products: Producto[];
  selectedIndex: number;
  keyboardActive: boolean;
  isLoading?: boolean;
  onProductClick: (product: Producto, index: number) => void;
}

const isWeighableProduct = (product: Producto) => product.unidad_venta === "PESO";

export default function SideList({
  searchTerm,
  products,
  selectedIndex,
  keyboardActive,
  isLoading = false,
  onProductClick,
}: Props) {
  const selectedRef = useRef<HTMLButtonElement>(null);

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
          <kbd>↑</kbd><kbd>↓</kbd> navegar <kbd>Enter</kbd> agregar <kbd>\</kbd> carrito <kbd>]</kbd> finalizar
        </div>
      </div>

      <div className="pos-product-results-summary" aria-live="polite">
        <span>
          {searchTerm
            ? <>Resultados para <strong>“{searchTerm}”</strong></>
            : "Todos los productos activos"}
        </span>
        <strong>{products.length} {products.length === 1 ? "producto" : "productos"}</strong>
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

            return (
              <button
                key={product.id}
                ref={selected ? selectedRef : undefined}
                type="button"
                role="option"
                aria-selected={selected}
                className={`pos-keyboard-product-row ${selected ? "selected" : ""} ${product.stock <= 0 ? "out-of-stock" : ""}`}
                onClick={() => onProductClick(product, index)}
              >
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
            );
          })}
        </div>
      )}
    </section>
  );
}

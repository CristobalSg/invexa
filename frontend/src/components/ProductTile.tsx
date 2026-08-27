import { PlusIcon, StarIcon as StarIconOutline } from "@heroicons/react/24/outline";
import { StarIcon as StarIconSolid } from "@heroicons/react/24/solid";
import type { Producto } from "../types/api";

interface ProductTileProps {
  product: Producto;
  isFeatured?: boolean;
  mode?: "sale" | "inventory";
  density?: "normal" | "compact";
  compactVariant?: "default" | "quick";
  onClick?: () => void;
  onToggleFeatured?: () => void;
}

const productImageModules = import.meta.glob("../assets/images/products/**/*.{png,jpg,jpeg,webp,avif}", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;

const normalizeText = (value: string) =>
  value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

const slugifyAssetName = (value: string) =>
  normalizeText(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const productImagesBySlug = Object.entries(productImageModules).reduce<Record<string, string>>((acc, [path, src]) => {
  const filename = path.split("/").pop()?.replace(/\.[^.]+$/, "").replace(/^\d+[_-]+/, "") ?? "";
  acc[slugifyAssetName(filename)] = src;
  return acc;
}, {});

const isWeighableProduct = (product: Producto) =>
  product.unidad_venta === "PESO";

const productVisual = (product: Producto) => {
  const category = normalizeText(product.categoria_nombre);
  if (category.includes("fruta")) return "🍊";
  if (category.includes("verdura")) return "🥦";
  if (category.includes("lact")) return "🥛";
  if (category.includes("bebida")) return "🧃";
  if (category.includes("carne")) return "🥩";
  return product.nombre.trim().charAt(0).toUpperCase() || "•";
};

export default function ProductTile({
  product,
  isFeatured = false,
  mode = "sale",
  density = "normal",
  compactVariant = "default",
  onClick,
  onToggleFeatured,
}: ProductTileProps) {
  const productImage = productImagesBySlug[slugifyAssetName(product.nombre)];
  const isCompact = density === "compact";
  const isQuickCompact = isCompact && compactVariant === "quick";

  if (mode === "inventory") {
    return (
      <button
        type="button"
        className={`inventory-product-card inventory-product-card-compact text-left ${product.activo ? "" : "inactive"}`}
        onClick={onClick}
      >
        <span className="inventory-product-card-visual">
          {productImage ? <img src={productImage} alt="" /> : productVisual(product)}
        </span>
        <span className="inventory-product-card-main">
          <span className="inventory-product-card-name">{product.nombre}</span>
          <span className="inventory-product-card-price">
            - ${product.precio_venta.toLocaleString()}{isWeighableProduct(product) ? "/kg" : ""}
          </span>
        </span>
        <span className="inventory-product-card-category">
          {product.categoria_nombre} · Quedan {product.stock} {isWeighableProduct(product) ? "kg" : "un."}
        </span>
      </button>
    );
  }

  const content = (
    <>
      <div className="pos-product-visual">
        {productImage ? <img src={productImage} alt="" /> : productVisual(product)}
      </div>
      {onToggleFeatured && (
        <span
          role="button"
          tabIndex={0}
          onClick={(event) => {
            event.stopPropagation();
            onToggleFeatured();
          }}
          onKeyDown={(event) => {
            if (event.key !== "Enter" && event.key !== " ") return;
            event.preventDefault();
            event.stopPropagation();
            onToggleFeatured();
          }}
          className={`pos-product-favorite ${isFeatured ? "active" : ""}`}
          aria-label={isFeatured ? "Quitar de destacados" : "Destacar producto"}
          title={isFeatured ? "Quitar de destacados" : "Destacar producto"}
        >
          {isFeatured ? <StarIconSolid className="h-5 w-5" /> : <StarIconOutline className="h-5 w-5" />}
        </span>
      )}
      <div className="pos-product-name">{product.nombre}</div>
      {!isCompact && (
        <div className="pos-product-unit">
          {product.categoria_nombre} · {product.stock} {isWeighableProduct(product) ? "kg" : "un."}
        </div>
      )}
      <div className={`pos-product-footer ${isCompact ? "compact" : ""}`}>
        <span className="pos-product-price">
          ${product.precio_venta.toLocaleString()}{isWeighableProduct(product) ? "/kg" : ""}
        </span>
        {!isCompact ? (
          <span className="pos-add-btn" aria-hidden="true">
            <PlusIcon className="h-5 w-5" />
          </span>
        ) : null}
      </div>
    </>
  );

  return (
    <button type="button" className={`pos-product-card text-left ${isCompact ? "compact" : ""} ${isQuickCompact ? "quick" : ""}`} onClick={onClick}>
      {content}
    </button>
  );
}

import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import { EllipsisHorizontalIcon, PencilIcon, PlusIcon, StarIcon as StarIconOutline, TrashIcon } from "@heroicons/react/24/outline";
import { StarIcon as StarIconSolid } from "@heroicons/react/24/solid";
import type { Producto } from "../types/api";

interface ProductTileProps {
  product: Producto;
  isFeatured?: boolean;
  mode?: "sale" | "inventory";
  inventoryModeLabel?: string;
  onClick?: () => void;
  onToggleFeatured?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

const productImageModules = import.meta.glob("../assets/images/products/*.{png,jpg,jpeg,webp,avif}", {
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
  const filename = path.split("/").pop()?.replace(/\.[^.]+$/, "") ?? "";
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
  inventoryModeLabel,
  onClick,
  onToggleFeatured,
  onEdit,
  onDelete,
}: ProductTileProps) {
  const productImage = productImagesBySlug[slugifyAssetName(product.nombre)];
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
      <div className="pos-product-unit">
        {product.categoria_nombre} · {product.stock} {isWeighableProduct(product) ? "kg" : "un."}
      </div>
      {mode === "inventory" && (
        <div className="inventory-product-meta">
          <span>{product.codigo_barras ?? "Sin código"}</span>
          <span>{product.tipo_propiedad}</span>
          <span>{product.unidad_venta === "PESO" ? "Peso" : "Unidad"}</span>
          <span>{inventoryModeLabel}</span>
          <span>{product.proveedor_nombre ?? "Sin proveedor"}</span>
        </div>
      )}
      <div className="pos-product-footer">
        <span className="pos-product-price">
          ${product.precio_venta.toLocaleString()}{isWeighableProduct(product) ? "/kg" : ""}
        </span>
        {mode === "inventory" ? (
          (onEdit || onDelete) && (
            <Menu as="span" className="relative inline-block text-left">
              <MenuButton className="pos-options-btn" onClick={(event) => event.stopPropagation()}>
                <EllipsisHorizontalIcon className="h-5 w-5" />
                <span>Opciones</span>
              </MenuButton>
              <MenuItems className="absolute right-0 z-20 mt-2 w-40 origin-top-right rounded-2xl border border-[#ececf0] bg-white p-1 shadow-[0_18px_50px_rgba(31,35,48,.16)] focus:outline-none">
                {onEdit && (
                  <MenuItem>
                    {({ focus }) => (
                      <button
                        type="button"
                        onClick={onEdit}
                        className={`${focus ? "bg-[#faf9ff] text-[#7652ed]" : "text-[#25262c]"} flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold`}
                      >
                        <PencilIcon className="h-4 w-4" />
                        Editar
                      </button>
                    )}
                  </MenuItem>
                )}
                {onDelete && (
                  <MenuItem>
                    {({ focus }) => (
                      <button
                        type="button"
                        onClick={onDelete}
                        className={`${focus ? "bg-red-50 text-red-700" : "text-red-600"} flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold`}
                      >
                        <TrashIcon className="h-4 w-4" />
                        Eliminar
                      </button>
                    )}
                  </MenuItem>
                )}
              </MenuItems>
            </Menu>
          )
        ) : (
          <span className="pos-add-btn" aria-hidden="true">
            <PlusIcon className="h-5 w-5" />
          </span>
        )}
      </div>
    </>
  );

  if (mode === "inventory") {
    return <div className="pos-product-card inventory-product-card text-left">{content}</div>;
  }

  return (
    <button type="button" className="pos-product-card text-left" onClick={onClick}>
      {content}
    </button>
  );
}

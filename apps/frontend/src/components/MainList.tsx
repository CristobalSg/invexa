import type { Product } from "../types/product";

interface MainListProps {
  products?: Product[];
  onDecrease?: (id: string) => void;
  onRemove?: (id: string) => void;
}

export default function MainList({ products = [], onDecrease, onRemove }: MainListProps) {
  return (
    <div className="bg-white p-4 rounded shadow">
      <h2 className="text-lg font-semibold mb-2">Carrito</h2>
      <ul className="list-disc list-inside space-y-2">
        {products.length === 0 && <li className="text-gray-400">Sin productos</li>}
        {products.map((prod) => (
          <li key={prod.id} className="flex items-center justify-between">
            <div>
              {prod.name} — {prod.barcode} — {prod.quantity} unidades
            </div>
            <div className="space-x-2">
              {onDecrease && (
                <button
                  className="bg-yellow-400 px-2 py-1 text-sm rounded"
                  onClick={() => onDecrease(prod.id)}
                >
                  -
                </button>
              )}
              {onRemove && (
                <button
                  className="bg-red-500 text-white px-2 py-1 text-sm rounded"
                  onClick={() => onRemove(prod.id)}
                >
                  Eliminar
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}


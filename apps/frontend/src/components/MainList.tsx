import type { Product } from "../types/product";

interface MainListProps {
  products?: Product[];
}

export default function MainList({ products = [] }: MainListProps) {
  return (
    <div className="bg-white p-4 rounded shadow">
      <h2 className="text-lg font-semibold mb-2">Carrito</h2>
      <ul className="list-disc list-inside">
        {products.length === 0 && <li className="text-gray-400">Sin productos</li>}
        {products.map((prod) => (
          <li key={prod.id}>
            {prod.name} — {prod.barcode} — {prod.quantity} unidades
          </li>
        ))}
      </ul>
    </div>
  );
}

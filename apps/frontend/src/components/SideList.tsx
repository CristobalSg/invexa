import { useQuery } from "@tanstack/react-query";
import { getProducts } from "../services/productService";
import type { Product } from "../types/product";


interface Props {
  searchTerm: string;
  onProductClick: (product: Product) => void;
}

export default function SideList({searchTerm, onProductClick}: Props) {
  const { data: products, isLoading } = useQuery({
    queryKey: ["products"],
    queryFn: getProducts,
  });

  if (isLoading) return <p>Cargando productos...</p>;
  
  const filtered = products?.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-white p-4 rounded shadow">
      <ul className="list-disc list-inside">
        {filtered?.map((prod) => (
          <li key={prod.id} className="border-2 border-indigo-200 border-x-indigo-500 p-2 rounded-md"
            onClick={() => onProductClick(prod)}
          >
            {prod.name} — Código: {prod.barcode} — {prod.quantity} unidades — ${prod.price}
          </li>
        ))}
      </ul>
    </div>
  );
}

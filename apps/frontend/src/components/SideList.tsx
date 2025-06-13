import { useQuery } from "@tanstack/react-query";
import { getProducts } from "../services/productService";

export default function SideList() {
  const { data: products, isLoading } = useQuery({
    queryKey: ["products"],
    queryFn: getProducts,
  });

  if (isLoading) return <p>Cargando productos...</p>;
  
  return (
    <div className="bg-white p-4 rounded shadow">
      <ul className="list-disc list-inside">
        {products?.map((prod) => (
          <li key={prod.id} className="border-2 border-indigo-200 border-x-indigo-500 p-2 rounded-md">
            {prod.name} — Código: {prod.barcode} — {prod.quantity} unidades — ${prod.price}
          </li>
        ))}
      </ul>
    </div>
  );
}

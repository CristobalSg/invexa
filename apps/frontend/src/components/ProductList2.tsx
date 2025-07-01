import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import type { Product } from "../types/product"


const fetchProducts = async (): Promise<Product[]> => {
    const token = localStorage.getItem("token");
    const res = await axios.get(`${import.meta.env.VITE_API_URL}/products`, {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });
  return res.data;
};

export default function ProductList() {
  const { data: products, isLoading, error } = useQuery({
    queryKey: ["products"],
    queryFn: fetchProducts,
  });
  
  if (products) {
    console.log("Productos recibidos:", products);
  }

  if (isLoading) return <p>Cargando productos...</p>;
  if (error) return <p className="text-red-500">Error al cargar productos</p>;

  return (
    <div className="space-y-4">
      {products?.map((product) => (
        <div
          key={product.id}
          className="border rounded-xl shadow p-4 bg-white space-y-2"
        >
          <h2 className="text-xl font-bold">{product.name}</h2>
          <p className="text-sm text-gray-500">Código de barras: {product.barCode}</p>
          <p className="text-sm text-gray-500">Tipo: {product.productType.name}</p>

          <div>
            <h3 className="font-semibold mt-2">Presentaciones:</h3>
            <ul className="list-disc ml-5">
              {product.presentations.map((p) => (
                <li key={p.id}>
                  {p.description} — {p.unitLabel} — ${p.price}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mt-2">Inventario:</h3>
            {product.inventories.map((inv) => (
              <p key={inv.id}>Cantidad: {inv.quantity}</p>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

import { useState } from "react";
import { getProductByBarcode } from "../services/productService";
import type { Product } from "../types/product";

interface Props {
  title: string;
  onProductFound?: (product: Product) => void;
}

export default function InputForm({ title, onProductFound }: Props) {
  const [value, setValue] = useState("");
  const [error, setError] = useState("");

  const handleKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && value.trim()) {
      setError("");
      const product = await getProductByBarcode(value.trim());
      if (product) {
        onProductFound?.(product);
        setValue("");
      } else {
        setError("Producto no encontrado");
      }
    }
  };

  return (
    <div className="mb-4">
      <input
        type="text"
        placeholder={title}
        className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
      />
      {error && <div className="text-red-500 text-sm mt-1">{error}</div>}
    </div>
  );
}

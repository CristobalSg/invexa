import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { getProductByBarcode } from "../services/productService";
import type { Producto } from "../types/api";

interface Props {
  title: string;
  onProductFound?: (product: Producto) => void;
  onSearchChange?: (text: string) => void;
  size?: "normal" | "large";
}

const InputForm = forwardRef<HTMLInputElement, Props>(({ title, onProductFound, onSearchChange, size = "normal" }, ref) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const inputClass =
    size === "large"
      ? "w-full rounded-lg border border-gray-300 bg-white py-4 pl-5 pr-14 text-2xl font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-white/10 dark:bg-neutral-900 dark:text-neutral-100 dark:placeholder:text-neutral-500"
      : "w-full rounded-md border border-gray-300 bg-white py-2 pl-4 pr-10 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-white/10 dark:bg-neutral-900 dark:text-neutral-100 dark:placeholder:text-neutral-500";

  useImperativeHandle(ref, () => inputRef.current as HTMLInputElement);

  const clearValue = () => {
    setValue("");
    setError("");
    onSearchChange?.("");
    window.setTimeout(() => inputRef.current?.focus(), 0);
  };

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
      <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-neutral-300">
        {title}
      </label>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          placeholder={title}
          className={inputClass}
          value={value}
          onChange={e => {
            setValue(e.target.value);
            setError("");
            onSearchChange?.(e.target.value);
          }}
          onKeyDown={handleKeyDown}
        />
        {value && (
          <button
            type="button"
            onClick={clearValue}
            className={`absolute right-2 top-1/2 -translate-y-1/2 rounded-md text-gray-400 transition-colors hover:bg-gray-100 hover:text-red-600 dark:hover:bg-white/10 dark:hover:text-red-300 ${
              size === "large" ? "p-2" : "p-1.5"
            }`}
            aria-label="Borrar código"
            title="Borrar"
          >
            <XMarkIcon className={size === "large" ? "h-6 w-6" : "h-4 w-4"} />
          </button>
        )}
      </div>
      {error && <div className="text-red-500 text-sm mt-1">{error}</div>}
    </div>
  );
});

InputForm.displayName = "InputForm";

export default InputForm;

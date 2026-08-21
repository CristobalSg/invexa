import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { getProductByBarcode } from "../services/productService";
import type { Producto } from "../types/api";

interface Props {
  title: string;
  onProductFound?: (product: Producto) => void;
  onSearchChange?: (text: string) => void;
  onBlur?: (event: React.FocusEvent<HTMLInputElement>) => void;
  clearSignal?: number;
  showClearButton?: boolean;
  size?: "normal" | "large";
}

const InputForm = forwardRef<HTMLInputElement, Props>(({
  title,
  onProductFound,
  onSearchChange,
  onBlur,
  clearSignal = 0,
  showClearButton = true,
  size = "normal",
}, ref) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const inputClass =
    size === "large"
      ? "h-[52px] w-full rounded-[15px] border border-[#ececf0] bg-[#f7f7f9] px-4 pr-12 text-sm font-medium text-[#24252a] placeholder:text-[#a3a5ad] focus:border-[#cfc3ff] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#8657ff]/10"
      : "h-[46px] w-full rounded-[14px] border border-[#ececf0] bg-[#f7f7f9] px-4 pr-10 text-sm text-[#24252a] placeholder:text-[#a3a5ad] focus:border-[#cfc3ff] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#8657ff]/10";

  useImperativeHandle(ref, () => inputRef.current as HTMLInputElement);

  const clearValue = () => {
    setValue("");
    setError("");
    onSearchChange?.("");
    window.setTimeout(() => inputRef.current?.focus(), 0);
  };

  useEffect(() => {
    if (clearSignal === 0) return;
    clearValue();
  }, [clearSignal]);

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
    <div>
      <label className="sr-only">
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
          onBlur={onBlur}
          onKeyDown={handleKeyDown}
        />
        {showClearButton && value && (
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

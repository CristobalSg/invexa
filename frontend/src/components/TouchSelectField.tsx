import { useEffect, useRef, useState, type ReactNode } from "react";
import { CheckIcon, ChevronDownIcon } from "@heroicons/react/24/outline";

interface TouchSelectOption<T extends string | number> {
  value: T;
  label: string;
  description?: ReactNode;
}

interface TouchSelectFieldProps<T extends string | number> {
  label: ReactNode;
  value: T;
  options: Array<TouchSelectOption<T>>;
  onChange: (value: T) => void;
  placeholder?: string;
  help?: ReactNode;
  disabled?: boolean;
  modalTitle?: string;
  emptyText?: string;
}

export default function TouchSelectField<T extends string | number>({
  label,
  value,
  options,
  onChange,
  placeholder = "Seleccionar",
  help,
  disabled = false,
  modalTitle,
  emptyText = "No hay opciones disponibles.",
}: TouchSelectFieldProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const selectedOption = options.find((option) => String(option.value) === String(value));

  const closeModal = () => {
    setIsOpen(false);
  };

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      if (containerRef.current?.contains(event.target as Node)) return;
      closeModal();
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
    };
  }, [isOpen]);

  return (
    <div className="touch-select-field" ref={containerRef}>
      <span className="touch-select-label">{label}</span>
      <button
        type="button"
        onClick={() => {
          if (!disabled) setIsOpen((current) => !current);
        }}
        className="touch-select-trigger"
        disabled={disabled}
      >
        <span className={selectedOption ? "touch-select-value" : "touch-select-placeholder"}>
          {selectedOption?.label ?? placeholder}
        </span>
        <ChevronDownIcon className="h-5 w-5" />
      </button>
      {help && <p className="touch-select-help">{help}</p>}

      {isOpen && (
        <div className="touch-select-popover" role="dialog" aria-label={String(modalTitle ?? label)}>
          <div className="touch-select-options">
            {options.map((option) => {
              const isSelected = String(option.value) === String(value);

              return (
                <button
                  key={String(option.value)}
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    closeModal();
                  }}
                  className={`touch-select-option ${isSelected ? "active" : ""}`}
                >
                  <span>
                    <strong>{option.label}</strong>
                    {option.description && <small>{option.description}</small>}
                  </span>
                  {isSelected && <CheckIcon className="h-6 w-6" />}
                </button>
              );
            })}
            {options.length === 0 && (
              <div className="touch-select-empty">{emptyText}</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

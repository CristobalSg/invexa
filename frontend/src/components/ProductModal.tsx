import React from "react";
import { Dialog, DialogPanel, DialogTitle } from "@headlessui/react";
import { XMarkIcon } from "@heroicons/react/24/outline";

type ProductModalProps = {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
};

export const ProductModal: React.FC<ProductModalProps> = ({
  isOpen,
  onClose,
  title = "Agregar nuevo producto",
  children,
}) => {
  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/40" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="product-modal-panel">
          <div className="product-modal-head">
            <DialogTitle className="product-modal-title">
              {title}
            </DialogTitle>
            <button
              type="button"
              onClick={onClose}
              className="product-modal-close"
              aria-label="Cerrar"
              title="Cerrar"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
          {children}
        </DialogPanel>
      </div>
    </Dialog>
  );
};

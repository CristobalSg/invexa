import React from "react";
import { Dialog, DialogPanel, DialogTitle } from "@headlessui/react";

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
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="w-full max-w-5xl rounded-xl bg-white p-6 shadow-xl max-h-[90vh] overflow-auto">
          <DialogTitle className="text-xl font-bold text-gray-900 mb-4">
            {title}
          </DialogTitle>
          {children}
        </DialogPanel>
      </div>
    </Dialog>
  );
};

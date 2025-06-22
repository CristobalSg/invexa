import React from "react";
import { Dialog, DialogPanel, DialogTitle } from "@headlessui/react";
import { ProductForm } from "./ProductForm";

type ProductModalProps = {
  isOpen: boolean;
  onClose: () => void;
  form: {
    name: string;
    barcode?: string;
    quantity: number;
    cost: number;
    price: number;
  };
  handleSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  handleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleCancelEdit: () => void;
  editingId: string | null;
};

export const ProductModal: React.FC<ProductModalProps> = ({
  isOpen,
  onClose,
  form,
  handleSubmit,
  handleChange,
  handleCancelEdit,
  editingId,
}) => {
  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="w-full max-w-3xl rounded-xl bg-zinc-900 p-6 shadow-xl">
          <DialogTitle className="text-xl font-bold text-white mb-4">
            {editingId ? "Editar producto" : "Agregar nuevo producto"}
          </DialogTitle>

          <ProductForm
            form={form}
            handleSubmit={handleSubmit}
            handleChange={handleChange}
            handleCancelEdit={() => {
              handleCancelEdit();
              onClose();
            }}
            editingId={editingId}
          />
        </DialogPanel>
      </div>
    </Dialog>
  );
};

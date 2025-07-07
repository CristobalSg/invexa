// src/types/product.ts
export interface Product {
  id: number;
  name: string;
  barCode: string;
  productType: {
    id: number;
    name: string;
  };
  presentations: Presentation[];
  inventories: Inventory[];
  company?: {
    id: number;
    name: string;
  };
}

export interface Presentation {
  id: number;
  price: number;
  description?: string;
  unitLabel?: string;
}

export interface Inventory {
  id: number;
  quantity: number;
}

// Para el carrito (con cantidad)
export type CartProduct = Product & { quantity: number };

export type CreateProductInput = {
  name: string;
  barCode: string;
  productTypeId: number;
  companyId: number;
  presentation: {
    price: number;
    description?: string;
    unitLabel?: string;
  };
  initialQuantity: number;
};

export type UpdateProductInput = {
  name?: string;
  barCode?: string;
  productTypeId?: number;
  presentation?: {
    id: number;
    price?: number;
    description?: string;
    unitLabel?: string;
  };
  inventory?: {
    id: number;
    quantity?: number;
  };
};

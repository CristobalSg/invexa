// src/types/product.ts
export interface Product {
  id: number;
  name: string;
  barCode?: string;
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
  description: string;
  baseQuantity: number;
  price: number;
  unitLabel: string;
  barCode?: string;
}

export interface Inventory {
  id: number;
  quantity: number;
}

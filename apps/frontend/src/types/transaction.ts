import type { Product } from "./product";

export type Transaction = {
  id: number;
  type: string;
  quantity: number;
  date: string;
  product: Product;
};

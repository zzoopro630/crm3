import type { LeadProduct } from "@/types/order";

export interface CartItem {
  cartKey: string; // `${productId}-${region}`
  productId: number;
  product: LeadProduct;
  region: string;
  quantity: number;
}

export interface ApplicantInfo {
  name: string;
  affiliation: string;
  position: string;
  phone: string;
  email: string;
}

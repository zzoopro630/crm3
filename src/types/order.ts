export type OrderStatus = "pending" | "confirmed" | "completed" | "cancelled";

export interface LeadProduct {
  id: number;
  dbType: string;
  name: string;
  price: number;
  description: string | null;
  isActive: boolean;
  sortOrder: number;
}

export interface LeadOrderItem {
  id: number;
  productId: number;
  productName?: string;
  region: string | null;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface LeadOrder {
  id: number;
  orderedBy: string;
  orderedByName?: string;
  name: string;
  affiliation: string | null;
  position: string | null;
  phone: string | null;
  email: string | null;
  totalAmount: number;
  status: OrderStatus;
  cancelledAt: string | null;
  cancelledBy: string | null;
  createdAt: string;
  items?: LeadOrderItem[];
}

export interface LeadOrderListResponse {
  data: LeadOrder[];
  total: number;
  page: number;
  limit: number;
}

export interface CreateOrderInput {
  name: string;
  affiliation?: string;
  position?: string;
  phone?: string;
  email?: string;
  items: Array<{
    productId: number;
    region?: string;
    quantity: number;
  }>;
}

export interface CreateProductInput {
  dbType: string;
  name: string;
  price: number;
  description?: string;
  isActive?: boolean;
  sortOrder?: number;
}

export interface UpdateProductInput {
  dbType?: string;
  name?: string;
  price?: number;
  description?: string;
  isActive?: boolean;
  sortOrder?: number;
}

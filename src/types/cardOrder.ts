export type CardOrderStatus = "pending" | "confirmed" | "printing" | "shipped" | "completed" | "cancelled";

export interface CardOrderApplicant {
  id: number;
  design: number;
  designLabel: string | null;
  cardType: string;
  name: string;
  grade: string | null;
  branch: string | null;
  phone: string | null;
  email: string | null;
  fax: string | null;
  addrBase: string | null;
  addrDetail: string | null;
  request: string | null;
  qty: number;
}

export interface CardOrder {
  id: number;
  orderedBy: string;
  orderedByName?: string;
  totalQty: number;
  deliveryFee: number;
  totalAmount: number;
  status: CardOrderStatus;
  recipientName: string | null;
  recipientPhone: string | null;
  recipientAddress: string | null;
  recipientEmail: string | null;
  cancelledAt: string | null;
  cancelledBy: string | null;
  createdAt: string;
  applicants?: CardOrderApplicant[];
}

export interface CardOrderListResponse {
  data: CardOrder[];
  total: number;
  page: number;
  limit: number;
}

export interface CreateCardOrderApplicant {
  design: number;
  cardType: string;
  name: string;
  grade?: string;
  branch?: string;
  phone?: string;
  email?: string;
  fax?: string;
  addrBase?: string;
  addrDetail?: string;
  request?: string;
  qty: number;
}

export interface CreateCardOrderInput {
  applicants: CreateCardOrderApplicant[];
  recipient: {
    name?: string;
    phone?: string;
    address?: string;
    email?: string;
  };
}

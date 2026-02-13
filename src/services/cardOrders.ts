import type {
  CardOrder,
  CardOrderListResponse,
  CreateCardOrderInput,
} from "@/types/cardOrder";
import { apiRequest } from "@/lib/apiClient";

export async function getCardOrders(params: {
  page?: number;
  limit?: number;
  status?: string;
} = {}): Promise<CardOrderListResponse> {
  const searchParams = new URLSearchParams({
    page: String(params.page || 1),
    limit: String(params.limit || 20),
  });
  if (params.status) searchParams.set("status", params.status);
  return apiRequest<CardOrderListResponse>(`/api/card-orders?${searchParams}`);
}

export async function getCardOrder(id: number): Promise<CardOrder> {
  return apiRequest<CardOrder>(`/api/card-orders/${id}`);
}

export async function createCardOrder(input: CreateCardOrderInput): Promise<CardOrder> {
  return apiRequest<CardOrder>("/api/card-orders", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateCardOrderStatus(
  id: number,
  status: string
): Promise<CardOrder> {
  return apiRequest<CardOrder>(`/api/card-orders/${id}/status`, {
    method: "PUT",
    body: JSON.stringify({ status }),
  });
}

import type {
  LeadProduct,
  LeadOrder,
  LeadOrderListResponse,
  CreateOrderInput,
  CreateProductInput,
  UpdateProductInput,
} from "@/types/order";
import { apiRequest } from "@/lib/apiClient";

// ---- Products ----
export async function getProducts(all = false): Promise<LeadProduct[]> {
  const params = all ? "?all=true" : "";
  return apiRequest<LeadProduct[]>(`/api/lead-products${params}`);
}

export async function createProduct(input: CreateProductInput): Promise<LeadProduct> {
  return apiRequest<LeadProduct>("/api/lead-products", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateProduct(id: number, input: UpdateProductInput): Promise<LeadProduct> {
  return apiRequest<LeadProduct>(`/api/lead-products/${id}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export async function deleteProduct(id: number): Promise<void> {
  await apiRequest(`/api/lead-products/${id}`, { method: "DELETE" });
}

// ---- Orders ----
export async function getOrders(params: {
  page?: number;
  limit?: number;
  status?: string;
} = {}): Promise<LeadOrderListResponse> {
  const searchParams = new URLSearchParams({
    page: String(params.page || 1),
    limit: String(params.limit || 20),
  });
  if (params.status) searchParams.set("status", params.status);
  return apiRequest<LeadOrderListResponse>(`/api/lead-orders?${searchParams}`);
}

export async function getOrder(id: number): Promise<LeadOrder> {
  return apiRequest<LeadOrder>(`/api/lead-orders/${id}`);
}

export async function createOrder(input: CreateOrderInput): Promise<LeadOrder> {
  return apiRequest<LeadOrder>("/api/lead-orders", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateOrderStatus(
  id: number,
  status: string
): Promise<LeadOrder> {
  return apiRequest<LeadOrder>(`/api/lead-orders/${id}/status`, {
    method: "PUT",
    body: JSON.stringify({ status }),
  });
}

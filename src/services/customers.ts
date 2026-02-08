import type {
  CustomerListParams,
  CustomerListResponse,
  CustomerWithManager,
  CreateCustomerInput,
  UpdateCustomerInput,
} from "@/types/customer";
import { apiRequest } from "@/lib/apiClient";

// ============ Customer Services ============

export async function getCustomers(
  params: CustomerListParams = {}
): Promise<CustomerListResponse> {
  const {
    page = 1,
    limit = 20,
    filters = {},
    sortBy = "createdAt",
    sortOrder = "desc",
  } = params;

  const searchParams = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    sortBy,
    sortOrder,
  });

  if (filters.search) searchParams.set("search", filters.search);
  if (filters.status) searchParams.set("status", filters.status);
  if (filters.managerId) searchParams.set("managerId", filters.managerId);
  if (filters.type) searchParams.set("type", filters.type);

  return apiRequest<CustomerListResponse>(`/api/customers?${searchParams}`);
}

export async function getCustomerById(
  id: number
): Promise<CustomerWithManager | null> {
  try {
    return await apiRequest<CustomerWithManager>(`/api/customers/${id}`);
  } catch (error) {
    if (error instanceof Error && error.message.includes("404")) {
      return null;
    }
    throw error;
  }
}

export async function createCustomer(
  input: CreateCustomerInput,
  managerId?: string
): Promise<CustomerWithManager> {
  return apiRequest<CustomerWithManager>("/api/customers", {
    method: "POST",
    body: JSON.stringify({
      ...input,
      managerId: managerId || input.managerId,
    }),
  });
}

export async function updateCustomer(
  id: number,
  input: UpdateCustomerInput
): Promise<CustomerWithManager> {
  return apiRequest<CustomerWithManager>(`/api/customers/${id}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export async function deleteCustomer(id: number): Promise<void> {
  await apiRequest(`/api/customers/${id}`, {
    method: "DELETE",
  });
}

// ============ Trash (Soft Delete) Services ============

export async function getTrashCustomers(
  params: CustomerListParams = {}
): Promise<CustomerListResponse> {
  const { page = 1, limit = 20 } = params;
  const searchParams = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  if (params.filters?.search) searchParams.set("search", params.filters.search);
  return apiRequest<CustomerListResponse>(`/api/customers/trash?${searchParams}`);
}

export async function permanentDeleteCustomer(id: number): Promise<void> {
  await apiRequest(`/api/customers/${id}/permanent`, { method: "DELETE" });
}

export async function restoreCustomer(id: number): Promise<void> {
  await apiRequest(`/api/customers/${id}/restore`, { method: "POST" });
}

export async function bulkCreateCustomers(
  customers: CreateCustomerInput[],
  managerId: string
): Promise<{ success: number; failed: number }> {
  // 개별 생성으로 처리 (bulk API는 추후 추가)
  let success = 0;
  let failed = 0;

  for (const customer of customers) {
    try {
      await createCustomer(customer, managerId);
      success++;
    } catch {
      failed++;
    }
  }

  return { success, failed };
}

import { apiRequest } from "@/lib/apiClient";
import type { DashboardCard, DashboardCardInput } from "@/types/dashboardCard";

// snake_case → camelCase 변환
function toCamel(row: any): DashboardCard {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    imageUrl: row.image_url,
    linkUrl: row.link_url,
    sortOrder: row.sort_order,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function fetchDashboardCards(): Promise<DashboardCard[]> {
  const data = await apiRequest<any[]>("/api/dashboard-cards");
  return data.map(toCamel);
}

export async function createDashboardCard(
  input: DashboardCardInput
): Promise<DashboardCard> {
  const data = await apiRequest<any>("/api/dashboard-cards", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return toCamel(data);
}

export async function updateDashboardCard(
  id: number,
  input: Partial<DashboardCardInput>
): Promise<DashboardCard> {
  const data = await apiRequest<any>(`/api/dashboard-cards/${id}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
  return toCamel(data);
}

export async function deleteDashboardCard(id: number): Promise<void> {
  await apiRequest(`/api/dashboard-cards/${id}`, { method: "DELETE" });
}

export async function reorderDashboardCards(ids: number[]): Promise<void> {
  await apiRequest("/api/dashboard-cards/reorder", {
    method: "PUT",
    body: JSON.stringify({ ids }),
  });
}

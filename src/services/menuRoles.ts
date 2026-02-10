import { apiRequest } from "@/lib/apiClient";
import type { MenuRoleMap, EmployeeMenuOverride } from "@/types/menuRole";

export async function fetchMyMenuRoles(): Promise<MenuRoleMap> {
  return apiRequest<MenuRoleMap>("/api/menu-roles/me");
}

export async function fetchEmployeeOverrides(
  employeeId: string
): Promise<EmployeeMenuOverride[]> {
  return apiRequest<EmployeeMenuOverride[]>(
    `/api/menu-overrides?employeeId=${employeeId}`
  );
}

export async function updateEmployeeOverrides(
  employeeId: string,
  overrides: EmployeeMenuOverride[]
): Promise<void> {
  await apiRequest("/api/menu-overrides", {
    method: "PUT",
    body: JSON.stringify({ employeeId, overrides }),
  });
}

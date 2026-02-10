import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchMyMenuRoles,
  fetchEmployeeOverrides,
  updateEmployeeOverrides,
} from "@/services/menuRoles";
import type { MenuRole, MenuRoleMap, EmployeeMenuOverride } from "@/types/menuRole";

export function useMenuRoles() {
  return useQuery<MenuRoleMap>({
    queryKey: ["menuRoles", "me"],
    queryFn: fetchMyMenuRoles,
    staleTime: 1000 * 60 * 10, // 10분 캐시
    retry: 1,
  });
}

export function useMenuRole(path: string): MenuRole {
  const { data: roleMap } = useMenuRoles();
  if (!roleMap) return "none";
  return (roleMap[path] as MenuRole) || "none";
}

export function useIsEditor(path: string): boolean {
  return useMenuRole(path) === "editor";
}

export function useIsViewer(path: string): boolean {
  const role = useMenuRole(path);
  return role === "viewer" || role === "editor";
}

export function useEmployeeOverrides(employeeId: string | null) {
  return useQuery<EmployeeMenuOverride[]>({
    queryKey: ["menuOverrides", employeeId],
    queryFn: () => fetchEmployeeOverrides(employeeId!),
    enabled: !!employeeId,
    staleTime: 1000 * 60 * 5,
  });
}

export function useUpdateEmployeeOverrides() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      employeeId,
      overrides,
    }: {
      employeeId: string;
      overrides: EmployeeMenuOverride[];
    }) => updateEmployeeOverrides(employeeId, overrides),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["menuOverrides", variables.employeeId],
      });
      queryClient.invalidateQueries({ queryKey: ["menuRoles"] });
    },
  });
}

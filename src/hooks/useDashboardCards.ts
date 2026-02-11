import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchDashboardCards,
  createDashboardCard,
  updateDashboardCard,
  deleteDashboardCard,
} from "@/services/dashboardCards";
import type { DashboardCardInput } from "@/types/dashboardCard";

const QUERY_KEY = ["dashboardCards"];

export function useDashboardCards() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: fetchDashboardCards,
    staleTime: 1000 * 60 * 5,
  });
}

export function useCreateDashboardCard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: DashboardCardInput) => createDashboardCard(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}

export function useUpdateDashboardCard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: Partial<DashboardCardInput> }) =>
      updateDashboardCard(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}

export function useDeleteDashboardCard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteDashboardCard(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}

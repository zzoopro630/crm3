import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchDashboardCards,
  createDashboardCard,
  updateDashboardCard,
  deleteDashboardCard,
  reorderDashboardCards,
} from "@/services/dashboardCards";
import type { DashboardCard, DashboardCardInput } from "@/types/dashboardCard";

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

export function useReorderDashboardCards() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids: number[]) => reorderDashboardCards(ids),
    onMutate: async (ids) => {
      await qc.cancelQueries({ queryKey: QUERY_KEY });
      const prev = qc.getQueryData<DashboardCard[]>(QUERY_KEY);
      if (prev) {
        const map = new Map(prev.map((c) => [c.id, c]));
        const reordered = ids
          .map((id, i) => {
            const card = map.get(id);
            return card ? { ...card, sortOrder: i } : null;
          })
          .filter(Boolean) as DashboardCard[];
        qc.setQueryData(QUERY_KEY, reordered);
      }
      return { prev };
    },
    onError: (_err, _ids, ctx) => {
      if (ctx?.prev) qc.setQueryData(QUERY_KEY, ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}

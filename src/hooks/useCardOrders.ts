import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getCardOrders,
  getCardOrder,
  createCardOrder,
  updateCardOrderStatus,
} from "@/services/cardOrders";
import type { CreateCardOrderInput } from "@/types/cardOrder";

export function useCardOrders(params: { page?: number; limit?: number; status?: string } = {}) {
  return useQuery({
    queryKey: ["cardOrders", params],
    queryFn: () => getCardOrders(params),
    staleTime: 1000 * 60,
  });
}

export function useCardOrder(id: number | null) {
  return useQuery({
    queryKey: ["cardOrder", id],
    queryFn: () => getCardOrder(id!),
    enabled: id !== null,
    staleTime: 1000 * 60,
  });
}

export function useCreateCardOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCardOrderInput) => createCardOrder(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cardOrders"] });
    },
  });
}

export function useUpdateCardOrderStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      updateCardOrderStatus(id, status),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["cardOrders"] });
      queryClient.invalidateQueries({ queryKey: ["cardOrder", variables.id] });
    },
  });
}

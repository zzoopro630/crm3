import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchBoardCategories,
  createBoardCategory,
  updateBoardCategory,
  deleteBoardCategory,
} from "@/services/boardCategories";
import type {
  CreateBoardCategoryInput,
  UpdateBoardCategoryInput,
} from "@/types/boardCategory";

export function useBoardCategories(activeOnly = true) {
  return useQuery({
    queryKey: ["boardCategories", { activeOnly }],
    queryFn: () => fetchBoardCategories(activeOnly),
    staleTime: 1000 * 60 * 5,
  });
}

export function useCreateBoardCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateBoardCategoryInput) =>
      createBoardCategory(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["boardCategories"] });
      queryClient.invalidateQueries({ queryKey: ["menuRoles"] });
    },
  });
}

export function useUpdateBoardCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: UpdateBoardCategoryInput }) =>
      updateBoardCategory(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["boardCategories"] });
      queryClient.invalidateQueries({ queryKey: ["menuRoles"] });
    },
  });
}

export function useDeleteBoardCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteBoardCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["boardCategories"] });
      queryClient.invalidateQueries({ queryKey: ["menuRoles"] });
    },
  });
}

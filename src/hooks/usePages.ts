import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getPages, getPage, createPage, updatePage, deletePage } from "@/services/pages";
import type { CreatePageInput, UpdatePageInput } from "@/types/page";

export function usePages(all = false) {
  return useQuery({
    queryKey: ["pages", { all }],
    queryFn: () => getPages(all),
    staleTime: 1000 * 60 * 30, // 30분 (변경 빈도 낮음)
  });
}

export function usePage(slug: string | null) {
  return useQuery({
    queryKey: ["page", slug],
    queryFn: () => getPage(slug!),
    enabled: !!slug,
    staleTime: 1000 * 60 * 30,
  });
}

export function useCreatePage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreatePageInput) => createPage(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pages"] });
      queryClient.invalidateQueries({ queryKey: ["menuRoles"] });
    },
  });
}

export function useUpdatePage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: UpdatePageInput }) =>
      updatePage(id, input),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["pages"] });
      queryClient.invalidateQueries({ queryKey: ["page", data.slug] });
      queryClient.invalidateQueries({ queryKey: ["menuRoles"] });
    },
  });
}

export function useDeletePage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deletePage(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pages"] });
      queryClient.invalidateQueries({ queryKey: ["menuRoles"] });
    },
  });
}

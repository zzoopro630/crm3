import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getPosts,
  getPost,
  createPost,
  updatePost,
  deletePost,
} from "@/services/posts";
import type {
  PostListParams,
  CreatePostInput,
  UpdatePostInput,
} from "@/types/post";

export function usePosts(params: PostListParams = {}) {
  return useQuery({
    queryKey: ["posts", params],
    queryFn: () => getPosts(params),
  });
}

export function usePost(id: number | null) {
  return useQuery({
    queryKey: ["post", id],
    queryFn: () => getPost(id!),
    enabled: id !== null,
  });
}

export function useCreatePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreatePostInput) => createPost(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
  });
}

export function useUpdatePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: UpdatePostInput }) =>
      updatePost(id, input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      queryClient.invalidateQueries({ queryKey: ["post", variables.id] });
    },
  });
}

export function useDeletePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deletePost(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
  });
}

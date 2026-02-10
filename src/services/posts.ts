import type {
  Post,
  PostListParams,
  PostListResponse,
  CreatePostInput,
  UpdatePostInput,
} from "@/types/post";
import { apiRequest } from "@/lib/apiClient";

export async function getPosts(
  params: PostListParams = {}
): Promise<PostListResponse> {
  const { category, search, page = 1, limit = 20 } = params;

  const searchParams = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });

  if (category) searchParams.set("category", category);
  if (search) searchParams.set("search", search);

  return apiRequest<PostListResponse>(`/api/posts?${searchParams}`);
}

export async function getPost(id: number): Promise<Post> {
  return apiRequest<Post>(`/api/posts/${id}`);
}

export async function createPost(input: CreatePostInput): Promise<Post> {
  return apiRequest<Post>("/api/posts", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updatePost(
  id: number,
  input: UpdatePostInput
): Promise<Post> {
  return apiRequest<Post>(`/api/posts/${id}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export async function deletePost(id: number): Promise<void> {
  await apiRequest(`/api/posts/${id}`, { method: "DELETE" });
}

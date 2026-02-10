export type PostCategory = "notice" | "resource";

export interface Post {
  id: number;
  category: PostCategory;
  title: string;
  content: string;
  isPinned: boolean;
  authorId: string;
  authorName: string;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
  attachments?: PostAttachment[];
}

export interface PostAttachment {
  id: number;
  fileName: string;
  fileUrl: string;
}

export interface PostListResponse {
  data: Post[];
  total: number;
  page: number;
  limit: number;
}

export interface PostListParams {
  category?: PostCategory;
  search?: string;
  page?: number;
  limit?: number;
}

export interface CreatePostInput {
  title: string;
  content: string;
  category: PostCategory;
  isPinned?: boolean;
  attachments?: { fileName: string; fileUrl: string }[];
}

export interface UpdatePostInput {
  title?: string;
  content?: string;
  isPinned?: boolean;
  attachments?: { fileName: string; fileUrl: string }[];
}

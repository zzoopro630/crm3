export interface Page {
  id: number;
  slug: string;
  title: string;
  content: string;
  icon: string | null;
  sortOrder: number;
  isPublished: boolean;
  authorId: string;
  authorName: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePageInput {
  title: string;
  slug: string;
  content: string;
  icon?: string;
  sortOrder?: number;
  isPublished?: boolean;
}

export interface UpdatePageInput {
  title?: string;
  slug?: string;
  content?: string;
  icon?: string;
  sortOrder?: number;
  isPublished?: boolean;
}

export interface BoardCategory {
  id: number;
  slug: string;
  name: string;
  icon: string | null;
  sortOrder: number;
  displayType: string;
  isActive: boolean;
}

export interface CreateBoardCategoryInput {
  name: string;
  slug: string;
  icon?: string;
  sortOrder?: number;
}

export interface UpdateBoardCategoryInput {
  name?: string;
  slug?: string;
  icon?: string;
  sortOrder?: number;
  isActive?: boolean;
}

export interface DashboardCard {
  id: number;
  title: string;
  description?: string | null;
  imageUrl?: string | null;
  linkUrl?: string | null;
  sortOrder: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardCardInput {
  title: string;
  description?: string;
  imageUrl?: string;
  linkUrl?: string;
  sortOrder?: number;
}

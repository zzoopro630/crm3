import type {
  BoardCategory,
  CreateBoardCategoryInput,
  UpdateBoardCategoryInput,
} from "@/types/boardCategory";
import { apiRequest } from "@/lib/apiClient";

export async function fetchBoardCategories(
  activeOnly = true
): Promise<BoardCategory[]> {
  const params = activeOnly ? "?active=true" : "";
  return apiRequest<BoardCategory[]>(`/api/board-categories${params}`);
}

export async function createBoardCategory(
  input: CreateBoardCategoryInput
): Promise<BoardCategory> {
  return apiRequest<BoardCategory>("/api/board-categories", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateBoardCategory(
  id: number,
  input: UpdateBoardCategoryInput
): Promise<BoardCategory> {
  return apiRequest<BoardCategory>(`/api/board-categories/${id}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export async function deleteBoardCategory(id: number): Promise<void> {
  await apiRequest(`/api/board-categories/${id}`, { method: "DELETE" });
}

import type { Page, CreatePageInput, UpdatePageInput } from "@/types/page";
import { apiRequest } from "@/lib/apiClient";

export async function getPages(all = false): Promise<Page[]> {
  const params = all ? "?all=true" : "";
  return apiRequest<Page[]>(`/api/pages${params}`);
}

export async function getPage(slug: string): Promise<Page> {
  return apiRequest<Page>(`/api/pages/${slug}`);
}

export async function createPage(input: CreatePageInput): Promise<Page> {
  return apiRequest<Page>("/api/pages", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updatePage(id: number, input: UpdatePageInput): Promise<Page> {
  return apiRequest<Page>(`/api/pages/${id}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export async function deletePage(id: number): Promise<void> {
  await apiRequest(`/api/pages/${id}`, { method: "DELETE" });
}

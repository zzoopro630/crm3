import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const API_BASE = "/api/keywords";

async function fetchKeywords(siteId) {
  const url = siteId ? `${API_BASE}?site_id=${siteId}` : API_BASE;
  const res = await fetch(url);
  if (!res.ok) throw new Error("키워드 목록 조회 실패");
  return res.json();
}

async function fetchKeyword(id) {
  const res = await fetch(`${API_BASE}/${id}`);
  if (!res.ok) throw new Error("키워드 조회 실패");
  return res.json();
}

async function createKeyword(data) {
  const res = await fetch(API_BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("키워드 생성 실패");
  return res.json();
}

async function updateKeyword({ id, ...data }) {
  const res = await fetch(`${API_BASE}/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("키워드 수정 실패");
  return res.json();
}

async function deleteKeyword(id) {
  const res = await fetch(`${API_BASE}/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("키워드 삭제 실패");
  return res.json();
}

export function useKeywords(siteId) {
  return useQuery({
    queryKey: ["keywords", siteId],
    queryFn: () => fetchKeywords(siteId),
  });
}

export function useKeyword(id) {
  return useQuery({
    queryKey: ["keywords", "detail", id],
    queryFn: () => fetchKeyword(id),
    enabled: !!id,
  });
}

export function useCreateKeyword() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createKeyword,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["keywords"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useUpdateKeyword() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateKeyword,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["keywords"] });
    },
  });
}

export function useDeleteKeyword() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteKeyword,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["keywords"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const API_BASE = "/api/sites";

async function fetchSites() {
  const res = await fetch(API_BASE);
  if (!res.ok) throw new Error("사이트 목록 조회 실패");
  return res.json();
}

async function fetchSite(id) {
  const res = await fetch(`${API_BASE}/${id}`);
  if (!res.ok) throw new Error("사이트 조회 실패");
  return res.json();
}

async function createSite(data) {
  const res = await fetch(API_BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("사이트 생성 실패");
  return res.json();
}

async function updateSite({ id, ...data }) {
  const res = await fetch(`${API_BASE}/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("사이트 수정 실패");
  return res.json();
}

async function deleteSite(id) {
  const res = await fetch(`${API_BASE}/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("사이트 삭제 실패");
  return res.json();
}

export function useSites() {
  return useQuery({
    queryKey: ["sites"],
    queryFn: fetchSites,
  });
}

export function useSite(id) {
  return useQuery({
    queryKey: ["sites", id],
    queryFn: () => fetchSite(id),
    enabled: !!id,
  });
}

export function useCreateSite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createSite,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sites"] });
    },
  });
}

export function useUpdateSite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateSite,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sites"] });
    },
  });
}

export function useDeleteSite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteSite,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sites"] });
    },
  });
}

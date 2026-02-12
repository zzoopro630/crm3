import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const API_BASE = "/api/url-tracking";

async function fetchTrackedUrls() {
  const res = await fetch(API_BASE);
  if (!res.ok) throw new Error("추적 URL 목록 조회 실패");
  return res.json();
}

async function createTrackedUrl(data) {
  const res = await fetch(API_BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("추적 URL 추가 실패");
  return res.json();
}

async function deleteTrackedUrl(id) {
  const res = await fetch(`${API_BASE}/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("추적 URL 삭제 실패");
  return res.json();
}

async function checkUrlRanking(ids) {
  const res = await fetch(`${API_BASE}/check`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tracked_url_ids: ids }),
  });
  if (!res.ok) throw new Error("URL 순위 체크 실패");
  return res.json();
}

async function fetchUrlRankingHistory(id, limit = 30) {
  const res = await fetch(`${API_BASE}/${id}/history?limit=${limit}`);
  if (!res.ok) throw new Error("순위 히스토리 조회 실패");
  return res.json();
}

export function useTrackedUrls() {
  return useQuery({
    queryKey: ["trackedUrls"],
    queryFn: fetchTrackedUrls,
  });
}

export function useCreateTrackedUrl() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createTrackedUrl,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trackedUrls"] });
    },
  });
}

export function useDeleteTrackedUrl() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteTrackedUrl,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trackedUrls"] });
    },
  });
}

export function useCheckUrlRanking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: checkUrlRanking,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trackedUrls"] });
    },
  });
}

export function useUrlRankingHistory(id, limit) {
  return useQuery({
    queryKey: ["urlRankingHistory", id, limit],
    queryFn: () => fetchUrlRankingHistory(id, limit),
    enabled: !!id,
  });
}

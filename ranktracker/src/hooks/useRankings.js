import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const API_BASE = "/api/rankings";

async function fetchRankings(keywordId, limit = 30) {
  const res = await fetch(`${API_BASE}/${keywordId}?limit=${limit}`);
  if (!res.ok) throw new Error("랭킹 히스토리 조회 실패");
  return res.json();
}

async function checkRankings(keywordIds) {
  const res = await fetch(`${API_BASE}/check`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ keyword_ids: keywordIds }),
  });
  if (!res.ok) throw new Error("랭킹 체크 실패");
  return res.json();
}

async function fetchDashboardSummary() {
  const res = await fetch(`${API_BASE}/dashboard/summary`);
  if (!res.ok) throw new Error("대시보드 요약 조회 실패");
  return res.json();
}

export function useRankings(keywordId, limit) {
  return useQuery({
    queryKey: ["rankings", keywordId, limit],
    queryFn: () => fetchRankings(keywordId, limit),
    enabled: !!keywordId,
  });
}

export function useCheckRankings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: checkRankings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rankings"] });
      queryClient.invalidateQueries({ queryKey: ["keywords"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useDashboardSummary() {
  return useQuery({
    queryKey: ["dashboard", "summary"],
    queryFn: fetchDashboardSummary,
  });
}

import type {
  RankSite,
  RankKeyword,
  TrackedUrl,
  RankDashboardSummary,
  CreateRankSiteInput,
  UpdateRankSiteInput,
  CreateRankKeywordInput,
  CreateTrackedUrlInput,
  RankHistoryKeywordItem,
  RankHistoryUrlItem,
} from '@/types/ranking';
import { apiRequest } from '@/lib/apiClient';

const BASE = '/api/rank';

// ===== Sites =====
export async function getRankSites(): Promise<RankSite[]> {
  return apiRequest<RankSite[]>(`${BASE}/sites`);
}

export async function createRankSite(input: CreateRankSiteInput): Promise<RankSite> {
  return apiRequest<RankSite>(`${BASE}/sites`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function updateRankSite(id: number, input: UpdateRankSiteInput): Promise<RankSite> {
  return apiRequest<RankSite>(`${BASE}/sites/${id}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  });
}

export async function deleteRankSite(id: number): Promise<void> {
  return apiRequest<void>(`${BASE}/sites/${id}`, { method: 'DELETE' });
}

// ===== Keywords =====
export async function getRankKeywords(siteId?: number | null): Promise<RankKeyword[]> {
  const params = siteId ? `?siteId=${siteId}` : '';
  return apiRequest<RankKeyword[]>(`${BASE}/keywords${params}`);
}

export async function createRankKeyword(input: CreateRankKeywordInput): Promise<RankKeyword> {
  return apiRequest<RankKeyword>(`${BASE}/keywords`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function deleteRankKeyword(id: number): Promise<void> {
  return apiRequest<void>(`${BASE}/keywords/${id}`, { method: 'DELETE' });
}

// ===== Rankings =====
export async function checkRankings(keywordIds: number[]): Promise<{ results: unknown[] }> {
  return apiRequest<{ results: unknown[] }>(`${BASE}/rankings/check`, {
    method: 'POST',
    body: JSON.stringify({ keywordIds }),
  });
}

export async function getRankDashboardSummary(): Promise<RankDashboardSummary> {
  return apiRequest<RankDashboardSummary>(`${BASE}/rankings/dashboard/summary`);
}

// ===== URL Tracking =====
export async function getTrackedUrls(): Promise<TrackedUrl[]> {
  return apiRequest<TrackedUrl[]>(`${BASE}/url-tracking`);
}

export async function createTrackedUrl(input: CreateTrackedUrlInput): Promise<TrackedUrl> {
  return apiRequest<TrackedUrl>(`${BASE}/url-tracking`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function updateTrackedUrl(id: number, input: CreateTrackedUrlInput): Promise<TrackedUrl> {
  return apiRequest<TrackedUrl>(`${BASE}/url-tracking/${id}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  });
}

export async function deleteTrackedUrl(id: number): Promise<void> {
  return apiRequest<void>(`${BASE}/url-tracking/${id}`, { method: 'DELETE' });
}

export async function checkUrlRanking(ids: number[]): Promise<{ results: unknown[] }> {
  return apiRequest<{ results: unknown[] }>(`${BASE}/url-tracking/check`, {
    method: 'POST',
    body: JSON.stringify({ trackedUrlIds: ids }),
  });
}

// ===== History =====
export async function getRankHistory(
  startDate: string,
  endDate: string,
  type: 'keyword' | 'url'
): Promise<RankHistoryKeywordItem[] | RankHistoryUrlItem[]> {
  const params = new URLSearchParams({ startDate, endDate, type });
  return apiRequest(`${BASE}/rankings/history?${params}`);
}

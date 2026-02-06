import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getRankSites,
  createRankSite,
  updateRankSite,
  deleteRankSite,
  getRankKeywords,
  createRankKeyword,
  deleteRankKeyword,
  checkRankings,
  getRankDashboardSummary,
  getTrackedUrls,
  createTrackedUrl,
  deleteTrackedUrl,
  checkUrlRanking,
} from '@/services/ranking';
import type {
  CreateRankSiteInput,
  UpdateRankSiteInput,
  CreateRankKeywordInput,
  CreateTrackedUrlInput,
} from '@/types/ranking';

// ===== Sites =====
export function useRankSites() {
  return useQuery({
    queryKey: ['rankSites'],
    queryFn: getRankSites,
  });
}

export function useCreateRankSite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateRankSiteInput) => createRankSite(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rankSites'] });
    },
  });
}

export function useUpdateRankSite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: UpdateRankSiteInput & { id: number }) =>
      updateRankSite(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rankSites'] });
    },
  });
}

export function useDeleteRankSite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteRankSite(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rankSites'] });
    },
  });
}

// ===== Keywords =====
export function useRankKeywords(siteId?: number | null) {
  return useQuery({
    queryKey: ['rankKeywords', siteId],
    queryFn: () => getRankKeywords(siteId),
  });
}

export function useCreateRankKeyword() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateRankKeywordInput) => createRankKeyword(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rankKeywords'] });
      queryClient.invalidateQueries({ queryKey: ['rankDashboard'] });
    },
  });
}

export function useDeleteRankKeyword() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteRankKeyword(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rankKeywords'] });
      queryClient.invalidateQueries({ queryKey: ['rankDashboard'] });
    },
  });
}

// ===== Rankings =====
export function useCheckRankings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (keywordIds: number[]) => checkRankings(keywordIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rankKeywords'] });
      queryClient.invalidateQueries({ queryKey: ['rankDashboard'] });
    },
  });
}

export function useRankDashboardSummary() {
  return useQuery({
    queryKey: ['rankDashboard', 'summary'],
    queryFn: getRankDashboardSummary,
  });
}

// ===== URL Tracking =====
export function useTrackedUrls() {
  return useQuery({
    queryKey: ['trackedUrls'],
    queryFn: getTrackedUrls,
  });
}

export function useCreateTrackedUrl() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTrackedUrlInput) => createTrackedUrl(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trackedUrls'] });
    },
  });
}

export function useDeleteTrackedUrl() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteTrackedUrl(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trackedUrls'] });
    },
  });
}

export function useCheckUrlRanking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids: number[]) => checkUrlRanking(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trackedUrls'] });
    },
  });
}

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getKeywordDetails,
  saveKeywordDetails,
  getInquiries,
  createInquiries,
  getGaSummary,
  saveGaSummary,
  getGaTotals,
  saveGaTotals,
  fetchGaSummary,
  fetchGaTotalSessions,
} from "@/services/ads";
import type { ParsedKeywordData, GASummaryData, GATotalSessionsData } from "@/types/ads";

export function useKeywordDetails(startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: ["ads-keyword-details", startDate, endDate],
    queryFn: () => getKeywordDetails(startDate, endDate),
    enabled: !!startDate && !!endDate,
  });
}

export function useSaveKeywordDetails() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: ParsedKeywordData[]) => saveKeywordDetails(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ads-keyword-details"] });
    },
  });
}

export function useInquiries(startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: ["ads-inquiries", startDate, endDate],
    queryFn: () => getInquiries(startDate, endDate),
    enabled: !!startDate && !!endDate,
  });
}

export function useCreateInquiries() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createInquiries,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ads-inquiries"] });
    },
  });
}

export function useGaSummary(startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: ["ads-ga-summary", startDate, endDate],
    queryFn: () => getGaSummary(startDate!, endDate!),
    enabled: !!startDate && !!endDate,
  });
}

export function useSaveGaSummary() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ data, reportDate }: { data: GASummaryData[]; reportDate: string }) =>
      saveGaSummary(data, reportDate),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ads-ga-summary"] });
    },
  });
}

export function useGaTotals(startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: ["ads-ga-totals", startDate, endDate],
    queryFn: () => getGaTotals(startDate!, endDate!),
    enabled: !!startDate && !!endDate,
  });
}

export function useSaveGaTotals() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ totals, reportDate }: { totals: GATotalSessionsData["totals"]; reportDate: string }) =>
      saveGaTotals(totals, reportDate),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ads-ga-totals"] });
    },
  });
}

export function useFetchGaSummary() {
  return useMutation({
    mutationFn: ({ startDate, endDate }: { startDate: string; endDate: string }) =>
      fetchGaSummary(startDate, endDate),
  });
}

export function useFetchGaTotalSessions() {
  return useMutation({
    mutationFn: ({ startDate, endDate }: { startDate: string; endDate: string }) =>
      fetchGaTotalSessions(startDate, endDate),
  });
}

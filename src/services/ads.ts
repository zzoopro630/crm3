import type {
  KeywordDetailRow,
  Inquiry,
  GASummaryData,
  GATotalSessionsData,
  ParsedKeywordData,
} from "@/types/ads";

async function apiRequest<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

// ============ Keyword Details (CSV) ============

export async function getKeywordDetails(
  startDate?: string,
  endDate?: string,
): Promise<{ success: boolean; data: KeywordDetailRow[] }> {
  const params = new URLSearchParams();
  if (startDate) params.set("startDate", startDate);
  if (endDate) params.set("endDate", endDate);
  return apiRequest(`/api/ads/keyword-details?${params}`);
}

export async function saveKeywordDetails(
  data: ParsedKeywordData[],
): Promise<{ success: boolean; count: number }> {
  return apiRequest("/api/ads/keyword-details", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// ============ Inquiries ============

export async function getInquiries(
  startDate?: string,
  endDate?: string,
): Promise<{ success: boolean; data: Inquiry[] }> {
  const params = new URLSearchParams();
  if (startDate) params.set("startDate", startDate);
  if (endDate) params.set("endDate", endDate);
  return apiRequest(`/api/ads/inquiries?${params}`);
}

export async function createInquiries(
  records: Array<{
    customer_name: string;
    phone: null;
    product_name: string;
    utm_campaign: string;
    source_url: string;
    inquiry_date: string;
  }>,
): Promise<{ success: boolean }> {
  return apiRequest("/api/ads/inquiries", {
    method: "POST",
    body: JSON.stringify(records),
  });
}

// ============ GA Data (DB Cache) ============

export async function getGaSummary(
  startDate: string,
  endDate: string,
): Promise<{ success: boolean; data: GASummaryData[]; fromDb: boolean }> {
  const params = new URLSearchParams({ startDate, endDate });
  return apiRequest(`/api/ads/ga-summary?${params}`);
}

export async function saveGaSummary(
  data: GASummaryData[],
  reportDate: string,
): Promise<{ success: boolean; count: number }> {
  return apiRequest("/api/ads/ga-summary", {
    method: "POST",
    body: JSON.stringify({ data, reportDate }),
  });
}

export async function getGaTotals(
  startDate: string,
  endDate: string,
): Promise<{ success: boolean; totals: GATotalSessionsData["totals"] | null; fromDb: boolean }> {
  const params = new URLSearchParams({ startDate, endDate });
  return apiRequest(`/api/ads/ga-totals?${params}`);
}

export async function saveGaTotals(
  totals: GATotalSessionsData["totals"],
  reportDate: string,
): Promise<{ success: boolean }> {
  return apiRequest("/api/ads/ga-totals", {
    method: "POST",
    body: JSON.stringify({ totals, reportDate }),
  });
}

// ============ GA Edge Function Proxies ============

export async function fetchGaSummary(
  startDate: string,
  endDate: string,
): Promise<{ success: boolean; count: number; data: GASummaryData[] }> {
  return apiRequest("/api/ads/ga/edge-summary", {
    method: "POST",
    body: JSON.stringify({ startDate, endDate }),
  });
}

export async function fetchGaTotalSessions(
  startDate: string,
  endDate: string,
): Promise<GATotalSessionsData> {
  return apiRequest("/api/ads/ga/edge-total-sessions", {
    method: "POST",
    body: JSON.stringify({ startDate, endDate }),
  });
}

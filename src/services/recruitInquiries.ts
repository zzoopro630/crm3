import type {
  InquiryListParams,
  InquiryListResponse,
  UpdateInquiryInput,
  Inquiry,
} from "@/types/inquiry";

async function apiRequest<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ error: "Unknown error" }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

export async function getRecruitInquiries(
  params: InquiryListParams = {}
): Promise<InquiryListResponse> {
  const { page = 1, limit = 15, search, status, managerId } = params;

  const searchParams = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });

  if (search) searchParams.set("search", search);
  if (status) searchParams.set("status", status);
  if (managerId) searchParams.set("managerId", managerId);

  return apiRequest<InquiryListResponse>(
    `/api/recruit-inquiries?${searchParams}`
  );
}

export async function updateRecruitInquiry(
  id: number,
  input: UpdateInquiryInput
): Promise<Inquiry> {
  return apiRequest<Inquiry>(`/api/recruit-inquiries/${id}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

import type {
  InquiryListParams,
  RecruitInquiryListResponse,
  UpdateInquiryInput,
  RecruitInquiry,
} from "@/types/inquiry";
import { apiRequest } from "@/lib/apiClient";

export async function getRecruitInquiries(
  params: InquiryListParams = {}
): Promise<RecruitInquiryListResponse> {
  const { page = 1, limit = 15, search, status, managerId } = params;

  const searchParams = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });

  if (search) searchParams.set("search", search);
  if (status) searchParams.set("status", status);
  if (managerId) searchParams.set("managerId", managerId);

  return apiRequest<RecruitInquiryListResponse>(
    `/api/recruit-inquiries?${searchParams}`
  );
}

export async function updateRecruitInquiry(
  id: number,
  input: UpdateInquiryInput
): Promise<RecruitInquiry> {
  return apiRequest<RecruitInquiry>(`/api/recruit-inquiries/${id}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

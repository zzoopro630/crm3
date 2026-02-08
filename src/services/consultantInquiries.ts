import type {
  ConsultantInquiryListParams,
  ConsultantInquiryListResponse,
  UpdateConsultantInquiryInput,
  ConsultantInquiry,
} from "@/types/consultantInquiry";
import { apiRequest } from "@/lib/apiClient";

export async function getConsultantInquiries(
  params: ConsultantInquiryListParams = {}
): Promise<ConsultantInquiryListResponse> {
  const { page = 1, limit = 15, search, status, managerId } = params;

  const searchParams = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });

  if (search) searchParams.set("search", search);
  if (status) searchParams.set("status", status);
  if (managerId) searchParams.set("managerId", managerId);

  return apiRequest<ConsultantInquiryListResponse>(
    `/api/consultant-inquiries?${searchParams}`
  );
}

export async function updateConsultantInquiry(
  id: number,
  input: UpdateConsultantInquiryInput
): Promise<ConsultantInquiry> {
  return apiRequest<ConsultantInquiry>(`/api/consultant-inquiries/${id}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

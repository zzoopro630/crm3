import type {
  InquiryListParams,
  InquiryListResponse,
  UpdateInquiryInput,
  CreateInquiryInput,
  Inquiry,
} from "@/types/inquiry";
import { apiRequest } from "@/lib/apiClient";

export async function getInquiries(
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

  return apiRequest<InquiryListResponse>(`/api/inquiries?${searchParams}`);
}

export async function updateInquiry(
  id: number,
  input: UpdateInquiryInput
): Promise<Inquiry> {
  return apiRequest<Inquiry>(`/api/inquiries/${id}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export async function createInquiry(
  input: CreateInquiryInput
): Promise<Inquiry> {
  return apiRequest<Inquiry>("/api/inquiries", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

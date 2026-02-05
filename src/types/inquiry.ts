export interface Inquiry {
  id: number;
  customerName: string;
  phone: string | null;
  productName: string | null;
  utmCampaign: string | null;
  sourceUrl: string | null;
  inquiryDate: string | null;
  managerId: string | null;
  managerName: string | null;
  status: string;
  email: string | null;
  memo: string | null;
  adminComment: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface InquiryListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  managerId?: string;
}

export interface InquiryListResponse {
  data: Inquiry[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface UpdateInquiryInput {
  managerId?: string;
  status?: string;
  memo?: string;
  email?: string;
  adminComment?: string;
}

export interface CreateInquiryInput {
  customerName: string;
  phone: string;
  productName?: string;
  managerId?: string;
  status?: string;
  memo?: string;
}

export interface RecruitInquiry {
  id: number;
  customerName: string;
  phone: string | null;
  age: string | null;
  area: string | null;
  career: string | null;
  request: string | null;
  utmCampaign: string | null;
  sourceUrl: string | null;
  refererPage: string | null;
  inquiryDate: string | null;
  managerId: string | null;
  managerName: string | null;
  status: string;
  memo: string | null;
  adminComment: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface RecruitInquiryListResponse {
  data: RecruitInquiry[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

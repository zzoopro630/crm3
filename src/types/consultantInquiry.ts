export interface ConsultantInquiry {
  id: number;
  customerName: string;
  phone: string | null;
  productName: string | null;
  consultant: string | null;
  tfRef: string | null;
  refererPage: string | null;
  request: string | null;
  sourceUrl: string | null;
  inquiryDate: string | null;
  managerId: string | null;
  managerName: string | null;
  status: string;
  memo: string | null;
  adminComment: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface ConsultantInquiryListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  managerId?: string;
}

export interface ConsultantInquiryListResponse {
  data: ConsultantInquiry[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface UpdateConsultantInquiryInput {
  managerId?: string;
  status?: string;
  memo?: string;
  adminComment?: string;
}

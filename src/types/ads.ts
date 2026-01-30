// 광고 분석 타입 정의

// 키워드 상세 데이터 (CSV 업로드용)
export interface KeywordDetailRow {
  id: string;
  adGroup: string;
  keyword: string;
  reportDate: string;
  impressions: number;
  clicks: number;
  clickRate: number;
  avgCpc: number;
  totalCost: number;
  avgPosition: number;
  createdAt?: string;
}

// 고객 문의
export interface Inquiry {
  id: string;
  customerName: string;
  phone: string;
  productName: string;
  utmCampaign: string;
  sourceUrl: string;
  inquiryDate: string;
  createdAt: string;
}

// GA 요약 데이터
export interface GASummaryData {
  insuranceName: string;
  sessions: number;
  keyEvents: number;
  activeUsers: number;
  landingDbRate: number;
}

// GA 전체 세션 데이터
export interface GATotalSessionsData {
  success: boolean;
  totals: {
    sessions: number;
    conversions: number;
    activeUsers: number;
  };
  daily: Array<{
    date: string;
    sessions: number;
    conversions: number;
    activeUsers: number;
  }>;
}

// CSV 파싱 결과
export interface ParsedKeywordData {
  adGroup: string;
  keyword: string;
  reportDate: string;
  impressions: number;
  clicks: number;
  clickRate: number;
  avgCpc: number;
  totalCost: number;
  avgPosition: number;
}

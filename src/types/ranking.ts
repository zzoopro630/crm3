// SEO 순위 추적 타입 정의

export interface RankSite {
  id: number;
  name: string;
  url: string;
  createdAt: string;
  keywordCount?: number;
}

export interface RankKeyword {
  id: number;
  keyword: string;
  siteId: number;
  isActive: boolean;
  createdAt: string;
  siteName?: string;
  siteUrl?: string;
  latestRank?: number | null;
  lastChecked?: string | null;
}

export interface RankRecord {
  id: number;
  keywordId: number;
  rankPosition: number | null;
  searchType: string;
  checkedAt: string;
  resultUrl?: string | null;
  resultTitle?: string | null;
}

export interface TrackedUrl {
  id: number;
  keyword: string;
  targetUrl: string;
  section: string | null;
  memo: string | null;
  isActive: boolean;
  createdAt: string;
  latestRank?: number | null;
  latestSection?: string | null;
  latestSectionRank?: number | null;
  lastChecked?: string | null;
}

export interface UrlRankRecord {
  id: number;
  trackedUrlId: number;
  rankPosition: number | null;
  sectionName: string | null;
  sectionRank: number | null;
  checkedAt: string;
}

export interface RankDashboardSummary {
  stats: {
    siteCount: number;
    keywordCount: number;
    todayChecks: number;
  };
  latestRankings: Array<{
    keywordId: number;
    keyword: string;
    siteName: string;
    siteUrl: string;
    rankPosition: number | null;
    checkedAt: string | null;
    resultUrl: string | null;
    resultTitle: string | null;
  }>;
}

// API 요청 타입
export interface CreateRankSiteInput {
  name: string;
  url: string;
}

export interface UpdateRankSiteInput {
  name?: string;
  url?: string;
}

export interface CreateRankKeywordInput {
  keyword: string;
  siteId: number;
}

export interface CreateTrackedUrlInput {
  keyword: string;
  targetUrl: string;
  section?: string | null;
  memo?: string | null;
}

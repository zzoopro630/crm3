import { useState, useEffect, useCallback } from "react";
import { ArrowUpDown, Calendar, PlusCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  useKeywordDetails,
  useInquiries,
  useGaSummary,
  useGaTotals,
  useSaveGaSummary,
  useSaveGaTotals,
  useFetchGaSummary,
  useFetchGaTotalSessions,
} from "@/hooks/useAds";
import { InquiryInputModal } from "@/components/ads/InquiryInputModal";
import { extractKeywordCategory } from "@/utils/ads/transform";
import type { GASummaryData, GATotalSessionsData } from "@/types/ads";

const formatNumber = (num: number): string => Math.round(num).toLocaleString();
const formatPercent = (num: number): string => `${num.toFixed(1)}%`;

function getYesterday(): string {
  const now = new Date();
  const kstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  kstNow.setDate(kstNow.getDate() - 1);
  return kstNow.toISOString().split("T")[0];
}

function formatDateKST(date: Date): string {
  const kst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().split("T")[0];
}

export default function AdsReportPage() {
  const [startDate, setStartDate] = useState(getYesterday());
  const [endDate, setEndDate] = useState(getYesterday());
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" }>({
    key: "totalCost",
    direction: "desc",
  });
  const [isInquiryModalOpen, setIsInquiryModalOpen] = useState(false);

  // GA resolved data state (from DB cache or edge function)
  const [gaData, setGaData] = useState<GASummaryData[]>([]);
  const [gaTotals, setGaTotals] = useState<GATotalSessionsData["totals"] | null>(null);
  const [gaLoading, setGaLoading] = useState(false);
  const [gaError, setGaError] = useState<string | null>(null);

  const { data: detailsResult, refetch: refetchDetails } = useKeywordDetails(startDate, endDate);
  const { data: inquiriesResult, refetch: refetchInquiries } = useInquiries(startDate, endDate);
  const { data: gaSummaryDb } = useGaSummary(startDate, endDate);
  const { data: gaTotalsDb } = useGaTotals(startDate, endDate);

  const saveGaSummary = useSaveGaSummary();
  const saveGaTotals = useSaveGaTotals();
  const fetchEdgeSummary = useFetchGaSummary();
  const fetchEdgeTotalSessions = useFetchGaTotalSessions();

  const allKeywordDetails = detailsResult?.data || [];
  const inquiries = inquiriesResult?.data || [];

  // 파워링크 광고그룹 제외 (보고서는 파컨 전용)
  const keywordDetails = allKeywordDetails.filter((row) => {
    const adGroup = row.adGroup.toLowerCase();
    return !adGroup.startsWith("파워링크") && !adGroup.startsWith("파워");
  });

  // GA data loading with DB cache → Edge Function fallback
  const loadGaData = useCallback(async () => {
    // Check DB cache first
    if (gaSummaryDb?.fromDb && gaSummaryDb.data.length > 0 && gaTotalsDb?.fromDb) {
      setGaData(gaSummaryDb.data);
      setGaTotals(gaTotalsDb.totals);
      return;
    }

    // Fetch from edge functions
    setGaLoading(true);
    setGaError(null);
    try {
      const [summaryResult, totalResult] = await Promise.all([
        fetchEdgeSummary.mutateAsync({ startDate, endDate }),
        fetchEdgeTotalSessions.mutateAsync({ startDate, endDate }),
      ]);

      const summaryData = summaryResult.success ? summaryResult.data : [];
      const totalsData = totalResult.success ? totalResult.totals : null;

      // Cache to DB
      const saveDate = startDate === endDate ? startDate : endDate;
      if (summaryData.length > 0) {
        try { await saveGaSummary.mutateAsync({ data: summaryData, reportDate: saveDate }); } catch {}
      }
      if (totalsData) {
        try { await saveGaTotals.mutateAsync({ totals: totalsData, reportDate: saveDate }); } catch {}
      }

      setGaData(summaryData);
      setGaTotals(totalsData);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "GA 데이터 조회 실패";
      setGaError(message);
    } finally {
      setGaLoading(false);
    }
  }, [startDate, endDate, gaSummaryDb, gaTotalsDb, fetchEdgeSummary, fetchEdgeTotalSessions, saveGaSummary, saveGaTotals]);

  useEffect(() => {
    if (startDate && endDate) {
      loadGaData();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate, gaSummaryDb?.fromDb, gaTotalsDb?.fromDb]);

  // 키워드 목록 (모달용)
  const allKeywords = [...new Set(keywordDetails.map((row) => extractKeywordCategory(row.adGroup)))];

  const keywordList = allKeywords
    .map((keyword) => {
      const normalizedKeyword = keyword.trim().toLowerCase();
      const gaItem = gaData.find((g) => g.insuranceName.trim().toLowerCase() === normalizedKeyword);
      return { keyword, sessions: gaItem?.sessions || 0 };
    })
    .filter((item) => item.sessions > 0)
    .sort((a, b) => b.sessions - a.sessions)
    .map((item) => item.keyword);

  // 문의 매칭
  const matchInquiryToKeyword = (productName: string | undefined): string | null => {
    if (!productName || productName.trim() === "") return null;
    const normalizedProduct = productName.trim().toLowerCase();

    const exactMatch = allKeywords.find((kw) => kw.trim().toLowerCase() === normalizedProduct);
    if (exactMatch) return exactMatch;

    const partialMatches = allKeywords.filter((kw) => {
      const normalizedKw = kw.trim().toLowerCase();
      return normalizedProduct.includes(normalizedKw) || normalizedKw.includes(normalizedProduct);
    });

    if (partialMatches.length === 1) return partialMatches[0];
    if (partialMatches.length > 1) {
      const sorted = partialMatches.sort((a, b) => b.length - a.length);
      if (sorted[0].length > sorted[1].length) return sorted[0];
      return null;
    }
    return null;
  };

  const inquiryKeywordMap = new Map<string, string>();
  for (const inq of inquiries) {
    const matchedKeyword = matchInquiryToKeyword(inq.productName);
    if (matchedKeyword) inquiryKeywordMap.set(inq.id, matchedKeyword);
  }

  // 키워드별 집계
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const aggregated: Record<string, any> = {};
  keywordDetails.forEach((row) => {
    const key = extractKeywordCategory(row.adGroup);
    if (!aggregated[key]) {
      aggregated[key] = {
        keywordCategory: key,
        impressions: 0,
        clicks: 0,
        totalCost: 0,
        avgPositionSum: 0,
        count: 0,
        adGroups: new Set<string>(),
      };
    }
    aggregated[key].impressions += row.impressions;
    aggregated[key].clicks += row.clicks;
    aggregated[key].totalCost += row.totalCost;
    aggregated[key].avgPositionSum += row.avgPosition;
    aggregated[key].count += 1;
    aggregated[key].adGroups.add(row.adGroup);
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const aggregatedList = Object.values(aggregated).map((item: any) => {
    const normalizedKeyword = item.keywordCategory.trim().toLowerCase();
    const gaMatches = gaData.filter((gaItem) =>
      gaItem.insuranceName.trim().toLowerCase().includes(normalizedKeyword),
    );
    const gaSummary = gaMatches.reduce(
      (acc, curr) => ({
        sessions: acc.sessions + curr.sessions,
        keyEvents: acc.keyEvents + (curr.keyEvents || 0),
      }),
      { sessions: 0, keyEvents: 0 },
    );
    const landingDbRate =
      gaSummary.sessions > 0 ? Math.round((gaSummary.keyEvents / gaSummary.sessions) * 10000) / 100 : 0;

    return {
      keywordCategory: item.keywordCategory,
      impressions: item.impressions,
      clicks: item.clicks,
      totalCost: item.totalCost,
      clickRate: item.impressions > 0 ? (item.clicks / item.impressions) * 100 : 0,
      avgCpc: item.clicks > 0 ? item.totalCost / item.clicks : 0,
      avgPosition: item.avgPositionSum / item.count,
      adGroupCount: item.adGroups.size,
      isDuplicate: item.adGroups.size > 1,
      gaSessions: gaSummary.sessions > 0 ? gaSummary.sessions : null,
      gaKeyEvents: gaSummary.keyEvents > 0 ? gaSummary.keyEvents : null,
      gaLandingDbRate: gaSummary.sessions > 0 ? landingDbRate : null,
      gaCpa: gaSummary.keyEvents > 0 ? item.totalCost / gaSummary.keyEvents : null,
      gaLandingRate: item.clicks > 0 && gaSummary.sessions > 0 ? (gaSummary.sessions / item.clicks) * 100 : null,
      inquiryCount: inquiries.filter((inq) => inquiryKeywordMap.get(inq.id) === item.keywordCategory).length,
    };
  });

  // 정렬
  const handleSort = (key: string) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sortedList = [...aggregatedList].sort((a: any, b: any) => {
    const aValue = a[sortConfig.key] ?? 0;
    const bValue = b[sortConfig.key] ?? 0;
    if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
    return 0;
  });

  const top5Keywords = [...aggregatedList]
    .sort((a, b) => b.totalCost - a.totalCost)
    .slice(0, 5)
    .map((r) => r.keywordCategory);

  // 검증
  const csvTotals = {
    impressions: keywordDetails.reduce((sum, r) => sum + r.impressions, 0),
    clicks: keywordDetails.reduce((sum, r) => sum + r.clicks, 0),
    totalCost: keywordDetails.reduce((sum, r) => sum + r.totalCost, 0),
  };
  const aggTotals = {
    impressions: aggregatedList.reduce((sum, r) => sum + r.impressions, 0),
    clicks: aggregatedList.reduce((sum, r) => sum + r.clicks, 0),
    totalCost: aggregatedList.reduce((sum, r) => sum + r.totalCost, 0),
  };
  const isValid =
    csvTotals.impressions === aggTotals.impressions &&
    csvTotals.clicks === aggTotals.clicks &&
    csvTotals.totalCost === aggTotals.totalCost;

  // 합계 행
  const matchedGaNames = new Set<string>();
  aggregatedList.forEach((row) => {
    gaData.forEach((gaItem) => {
      if (gaItem.insuranceName.trim().toLowerCase().includes(row.keywordCategory.trim().toLowerCase())) {
        matchedGaNames.add(gaItem.insuranceName);
      }
    });
  });
  const uniqueGaStats = Array.from(matchedGaNames)
    .map((name) => gaData.find((item) => item.insuranceName === name))
    .filter((item): item is GASummaryData => !!item);

  const totals = {
    impressions: csvTotals.impressions,
    clicks: csvTotals.clicks,
    totalCost: csvTotals.totalCost,
    gaSessions: gaTotals?.sessions ?? uniqueGaStats.reduce((sum, r) => sum + r.sessions, 0),
    gaKeyEvents: gaTotals?.conversions ?? uniqueGaStats.reduce((sum, r) => sum + (r.keyEvents ?? 0), 0),
    totalInquiries: inquiries.length,
  };

  const SortHeader = ({ label, sortKey, className }: { label: React.ReactNode; sortKey: string; className?: string }) => (
    <th className={`cursor-pointer hover:bg-muted/50 select-none py-2 px-2 text-xs ${className || ""}`} onClick={() => handleSort(sortKey)}>
      <div className="flex items-center gap-1 justify-end">
        {label}
        <ArrowUpDown className={`h-3 w-3 shrink-0 ${sortConfig.key === sortKey ? "text-primary" : "text-muted-foreground"}`} />
      </div>
    </th>
  );

  const handleRefresh = () => {
    refetchDetails();
    refetchInquiries();
  };

  const setSpecificDate = (daysAgo: number) => {
    const target = new Date();
    target.setDate(target.getDate() - daysAgo);
    const dateStr = formatDateKST(target);
    setStartDate(dateStr);
    setEndDate(dateStr);
  };

  if (keywordDetails.length === 0) {
    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs text-muted-foreground">단일:</span>
              <Input
                type="date"
                className="w-40"
                value={startDate === endDate ? startDate : ""}
                max={getYesterday()}
                onChange={(e) => { if (e.target.value) { setStartDate(e.target.value); setEndDate(e.target.value); } }}
              />
              <span className="text-muted-foreground">|</span>
              <span className="text-xs text-muted-foreground">기간:</span>
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Input type="date" className="w-40" value={startDate} max={getYesterday()} onChange={(e) => setStartDate(e.target.value)} />
              <span className="text-muted-foreground">~</span>
              <Input type="date" className="w-40" value={endDate} max={getYesterday()} onChange={(e) => setEndDate(e.target.value)} />
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-3">
              <span className="text-xs text-muted-foreground mr-1">단축:</span>
              {[1, 2, 3].map((d) => (
                <Button key={d} variant="outline" size="sm" className="text-xs h-7" onClick={() => setSpecificDate(d)}>
                  {d}일전
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-12 pb-12 text-center text-muted-foreground">
            CSV 데이터가 없습니다. N-DATA 탭에서 CSV를 업로드해주세요.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 날짜 선택 */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs text-muted-foreground">단일:</span>
            <Input
              type="date"
              className="w-40"
              value={startDate === endDate ? startDate : ""}
              max={getYesterday()}
              onChange={(e) => { if (e.target.value) { setStartDate(e.target.value); setEndDate(e.target.value); } }}
            />
            <span className="text-muted-foreground">|</span>
            <span className="text-xs text-muted-foreground">기간:</span>
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <Input type="date" className="w-40" value={startDate} max={getYesterday()} onChange={(e) => setStartDate(e.target.value)} />
            <span className="text-muted-foreground">~</span>
            <Input type="date" className="w-40" value={endDate} max={getYesterday()} onChange={(e) => setEndDate(e.target.value)} />
            <Button size="sm" variant="outline" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4 mr-1" />
              새로고침
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-3">
            <span className="text-xs text-muted-foreground mr-1">단축:</span>
            {[1, 2, 3].map((d) => (
              <Button key={d} variant="outline" size="sm" className="text-xs h-7" onClick={() => setSpecificDate(d)}>
                {d}일전
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 보고서 */}
      <Card>
        <CardContent className="pt-4 pb-4 overflow-auto">
          <div className="flex justify-between items-end mb-4">
            <div>
              <h3 className="text-lg font-semibold">키워드 합산 보고서 (기간별 취합)</h3>
              <p className="text-sm text-muted-foreground mt-0.5">
                {startDate} ~ {endDate}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button size="sm" variant="outline" onClick={() => setIsInquiryModalOpen(true)}>
                <PlusCircle className="h-4 w-4 mr-1" />
                문의 입력
              </Button>
              {gaLoading && <span className="text-xs text-muted-foreground">GA 로딩 중...</span>}
              {gaError && <span className="text-xs text-destructive">GA 오류: {gaError}</span>}
              <span className={`text-xs ${isValid ? "text-green-600" : "text-destructive"}`}>
                {isValid ? "✓ 합계 일치" : "⚠ 합계 불일치"}
              </span>
            </div>
          </div>

          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b">
                <SortHeader label="키워드" sortKey="keywordCategory" className="text-left" />
                <SortHeader label="노출수" sortKey="impressions" />
                <SortHeader label="클릭(률)" sortKey="clicks" />
                <SortHeader label={<>평균클릭비용<br />(VAT포함)</>} sortKey="avgCpc" />
                <SortHeader label={<>총비용<br />(VAT포함)</>} sortKey="totalCost" />
                <SortHeader label="평균순위" sortKey="avgPosition" />
                <SortHeader label="DB세션수" sortKey="gaSessions" className="bg-blue-500/5" />
                <SortHeader label="랜딩율" sortKey="gaLandingRate" className="bg-blue-500/5" />
                <SortHeader label="전환수" sortKey="gaKeyEvents" className="bg-blue-500/5" />
                <SortHeader label={<>랜딩조회<br />DB비</>} sortKey="gaLandingDbRate" className="bg-blue-500/5" />
                <SortHeader label={<>전환단가<br />(CPA)</>} sortKey="gaCpa" className="bg-blue-500/5" />
                <SortHeader label="실제문의" sortKey="inquiryCount" className="bg-green-500/5" />
              </tr>
            </thead>
            <tbody>
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {sortedList.map((row: any) => {
                const rankIndex = top5Keywords.indexOf(row.keywordCategory);
                const isTop = rankIndex !== -1;
                const topBg = rankIndex === 0 ? "bg-yellow-500/10" : rankIndex === 1 ? "bg-gray-300/10" : rankIndex === 2 ? "bg-orange-400/10" : isTop ? "bg-muted/30" : "";

                return (
                  <tr key={row.keywordCategory} className={`border-b hover:bg-muted/30 ${topBg}`}>
                    <td className="py-1.5 px-2 font-semibold text-primary">
                      <div className="flex items-center gap-1">
                        {isTop && (
                          <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold ${
                            rankIndex === 0 ? "bg-yellow-500 text-white" : rankIndex === 1 ? "bg-gray-400 text-white" : rankIndex === 2 ? "bg-orange-400 text-white" : "bg-muted text-muted-foreground"
                          }`}>
                            {rankIndex + 1}
                          </span>
                        )}
                        {row.keywordCategory}
                        {row.isDuplicate && (
                          <span className="text-[10px] text-yellow-600 bg-yellow-500/10 px-1 rounded">중복</span>
                        )}
                      </div>
                    </td>
                    <td className="py-1.5 px-2 text-right tabular-nums">{formatNumber(row.impressions)}</td>
                    <td className="py-1.5 px-2 text-right tabular-nums">
                      {formatNumber(row.clicks)} ({formatPercent(row.clickRate)})
                    </td>
                    <td className="py-1.5 px-2 text-right tabular-nums">{formatNumber(row.avgCpc)}</td>
                    <td className="py-1.5 px-2 text-right tabular-nums">{formatNumber(row.totalCost)}</td>
                    <td className="py-1.5 px-2 text-right tabular-nums">{formatNumber(row.avgPosition ?? 0)}</td>
                    <td className="py-1.5 px-2 text-right tabular-nums bg-blue-500/5">{row.gaSessions !== null ? formatNumber(row.gaSessions) : "-"}</td>
                    <td className="py-1.5 px-2 text-right tabular-nums bg-blue-500/5">{row.gaLandingRate !== null ? formatPercent(row.gaLandingRate) : "-"}</td>
                    <td className="py-1.5 px-2 text-right tabular-nums bg-blue-500/5">{row.gaKeyEvents !== null ? formatNumber(row.gaKeyEvents) : "-"}</td>
                    <td className="py-1.5 px-2 text-right tabular-nums bg-blue-500/5">{row.gaLandingDbRate !== null ? formatPercent(row.gaLandingDbRate) : "-"}</td>
                    <td className="py-1.5 px-2 text-right tabular-nums bg-blue-500/5">{row.gaCpa !== null ? formatNumber(row.gaCpa) : "-"}</td>
                    <td className="py-1.5 px-2 text-right tabular-nums bg-green-500/5 font-semibold">
                      {row.inquiryCount > 0 ? formatNumber(row.inquiryCount) : "-"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 bg-muted/50 font-semibold text-sm">
                <td className="py-2 px-2">합계</td>
                <td className="py-2 px-2 text-right tabular-nums">{formatNumber(totals.impressions)}</td>
                <td className="py-2 px-2 text-right tabular-nums">
                  {formatNumber(totals.clicks)}({formatPercent(totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0)})
                </td>
                <td className="py-2 px-2 text-right tabular-nums">{formatNumber(totals.clicks > 0 ? totals.totalCost / totals.clicks : 0)}</td>
                <td className="py-2 px-2 text-right tabular-nums">{formatNumber(totals.totalCost)}</td>
                <td className="py-2 px-2 text-right">-</td>
                <td className="py-2 px-2 text-right tabular-nums bg-blue-500/5">{formatNumber(totals.gaSessions)}</td>
                <td className="py-2 px-2 text-right tabular-nums bg-blue-500/5">
                  {totals.clicks > 0 ? formatPercent((totals.gaSessions / totals.clicks) * 100) : "-"}
                </td>
                <td className="py-2 px-2 text-right tabular-nums bg-blue-500/5">{formatNumber(totals.gaKeyEvents)}</td>
                <td className="py-2 px-2 text-right tabular-nums bg-blue-500/5">
                  {totals.gaSessions > 0 ? formatPercent((totals.gaKeyEvents / totals.gaSessions) * 100) : "-"}
                </td>
                <td className="py-2 px-2 text-right tabular-nums bg-blue-500/5">
                  {totals.gaKeyEvents > 0 ? formatNumber(totals.totalCost / totals.gaKeyEvents) : "-"}
                </td>
                <td className="py-2 px-2 text-right tabular-nums bg-green-500/5">{formatNumber(totals.totalInquiries)}</td>
              </tr>
            </tfoot>
          </table>

          <div className="mt-4 space-y-1 text-xs text-muted-foreground">
            <p>※ 선택하신 기간 ({startDate} ~ {endDate}) 동안의 데이터를 키워드별로 합산한 보고서입니다.</p>
            <p>※ '중복' 표시는 동일한 키워드 카테고리가 여러 광고그룹에 나누어 집행되고 있음을 의미합니다.</p>
            <p className="text-blue-500/80">※ 파란색 배경 컬럼은 Google Analytics 데이터입니다.</p>
          </div>
        </CardContent>
      </Card>

      <InquiryInputModal
        isOpen={isInquiryModalOpen}
        onClose={() => setIsInquiryModalOpen(false)}
        onSave={() => {
          setIsInquiryModalOpen(false);
          handleRefresh();
        }}
        keywords={keywordList}
        defaultDate={endDate}
      />
    </div>
  );
}

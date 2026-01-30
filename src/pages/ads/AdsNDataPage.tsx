import { useState, useRef } from "react";
import { RefreshCw, Upload, Calendar, ArrowUpDown, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useKeywordDetails, useSaveKeywordDetails } from "@/hooks/useAds";
import { parseNaverAdsCsv } from "@/utils/ads/csvParser";
import type { KeywordDetailRow } from "@/types/ads";

// 날짜 유틸리티 (KST 기준)
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

type SortKey = keyof KeywordDetailRow;

export default function AdsNDataPage() {
  const [startDate, setStartDate] = useState(getYesterday());
  const [endDate, setEndDate] = useState(getYesterday());
  const [filterType, setFilterType] = useState<"all" | "general" | "powerlink">("general");
  const [sortConfig, setSortConfig] = useState<{ key: SortKey | null; direction: "asc" | "desc" }>({
    key: null,
    direction: "desc",
  });

  const csvInputRef = useRef<HTMLInputElement>(null);
  const saveKeywordDetails = useSaveKeywordDetails();

  const { data: detailsResult, isLoading, refetch } = useKeywordDetails(startDate, endDate);
  const keywordDetails = detailsResult?.data || [];

  // CSV 업로드
  const handleCsvUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const content = await file.text();
      const parsed = parseNaverAdsCsv(content);

      if (parsed.length === 0) {
        throw new Error("CSV 파일에서 유효한 데이터를 찾을 수 없습니다.");
      }

      const dates = parsed.map((d) => d.reportDate).sort();
      const minDate = dates[0];
      const maxDate = dates[dates.length - 1];

      const result = await saveKeywordDetails.mutateAsync(parsed);

      if (result.success) {
        alert(`${result.count}건의 키워드 데이터를 저장했습니다.\n기간: ${minDate} ~ ${maxDate}`);
        setStartDate(minDate);
        setEndDate(maxDate);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "알 수 없는 오류";
      alert(`CSV 업로드 실패: ${message}`);
    } finally {
      if (csvInputRef.current) csvInputRef.current.value = "";
    }
  };

  // 필터링
  const filteredKeywordDetails = keywordDetails.filter((row) => {
    const adGroup = row.adGroup.toLowerCase();
    const keyword = row.keyword.toLowerCase();

    const isDummy =
      adGroup.includes("테스트") ||
      adGroup.includes("test") ||
      adGroup.includes("임시") ||
      keyword.includes("테스트") ||
      keyword.includes("test") ||
      keyword.includes("임시");
    if (isDummy) return false;

    const isPowerLink = adGroup.startsWith("파워링크") || adGroup.startsWith("파워");
    if (filterType === "general") return !isPowerLink;
    if (filterType === "powerlink") return isPowerLink;
    return true;
  });

  // 정렬
  const getLeadingNumber = (str: string): number => {
    const match = str.match(/^(\d+)/);
    return match ? parseInt(match[1], 10) : 999;
  };

  const sortedKeywordDetails = [...filteredKeywordDetails].sort((a, b) => {
    if (sortConfig.key) {
      const aValue = a[sortConfig.key] ?? 0;
      const bValue = b[sortConfig.key] ?? 0;
      if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    }
    const aNum = getLeadingNumber(a.adGroup);
    const bNum = getLeadingNumber(b.adGroup);
    if (aNum !== bNum) return bNum - aNum;
    if (a.adGroup !== b.adGroup) return a.adGroup.localeCompare(b.adGroup);
    return b.totalCost - a.totalCost;
  });

  // 하이라이트
  const topClickRateByAdGroup = new Map<string, string>();
  const topImpressionsByAdGroup = new Map<string, string>();

  const adGroupStats = new Map<string, { keyword: string; clickRate: number; impressions: number }[]>();
  filteredKeywordDetails.forEach((row) => {
    const existing = adGroupStats.get(row.adGroup) || [];
    existing.push({ keyword: row.keyword, clickRate: row.clickRate, impressions: row.impressions });
    adGroupStats.set(row.adGroup, existing);
  });
  adGroupStats.forEach((keywords, adGroup) => {
    const topCR = keywords.reduce((best, curr) => (curr.clickRate > best.clickRate ? curr : best));
    topClickRateByAdGroup.set(adGroup, topCR.keyword);
    const topImp = keywords.reduce((best, curr) => (curr.impressions > best.impressions ? curr : best));
    topImpressionsByAdGroup.set(adGroup, topImp.keyword);
  });

  // 통계
  const stats = {
    keywordCount: filteredKeywordDetails.length,
    uniqueKeywords: new Set(filteredKeywordDetails.map((r) => r.keyword)).size,
    totalImpressions: filteredKeywordDetails.reduce((sum, r) => sum + r.impressions, 0),
    totalClicks: filteredKeywordDetails.reduce((sum, r) => sum + r.clicks, 0),
    totalCost: filteredKeywordDetails.reduce((sum, r) => sum + r.totalCost, 0),
    avgCpc:
      filteredKeywordDetails.reduce((sum, r) => sum + r.clicks, 0) > 0
        ? filteredKeywordDetails.reduce((sum, r) => sum + r.totalCost, 0) /
          filteredKeywordDetails.reduce((sum, r) => sum + r.clicks, 0)
        : 0,
  };

  const handleSort = (key: SortKey) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  const setSpecificDate = (daysAgo: number) => {
    const target = new Date();
    target.setDate(target.getDate() - daysAgo);
    const dateStr = formatDateKST(target);
    setStartDate(dateStr);
    setEndDate(dateStr);
  };

  const SortHeader = ({ label, sortKey, className }: { label: string; sortKey: SortKey; className?: string }) => (
    <th
      className={`cursor-pointer hover:bg-muted/50 select-none ${className || ""}`}
      onClick={() => handleSort(sortKey)}
    >
      <div className="flex items-center gap-1 justify-end">
        {label}
        <ArrowUpDown className={`h-3 w-3 ${sortConfig.key === sortKey ? "text-primary" : "text-muted-foreground"}`} />
      </div>
    </th>
  );

  return (
    <div className="space-y-4">
      {/* 날짜 & 액션 */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs text-muted-foreground">단일:</span>
            <Input
              type="date"
              className="w-40"
              value={startDate === endDate ? startDate : ""}
              max={getYesterday()}
              onChange={(e) => {
                if (e.target.value) {
                  setStartDate(e.target.value);
                  setEndDate(e.target.value);
                }
              }}
            />
            <span className="text-muted-foreground">|</span>
            <span className="text-xs text-muted-foreground">기간:</span>
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <Input
              type="date"
              className="w-40"
              value={startDate}
              max={getYesterday()}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <span className="text-muted-foreground">~</span>
            <Input
              type="date"
              className="w-40"
              value={endDate}
              max={getYesterday()}
              onChange={(e) => setEndDate(e.target.value)}
            />
            <Button onClick={() => refetch()} disabled={isLoading} size="sm">
              <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? "animate-spin" : ""}`} />
              {isLoading ? "로딩..." : "조회"}
            </Button>
            <input type="file" ref={csvInputRef} accept=".csv" className="hidden" onChange={handleCsvUpload} />
            <Button
              variant="secondary"
              size="sm"
              onClick={() => csvInputRef.current?.click()}
              disabled={isLoading || saveKeywordDetails.isPending}
            >
              <Upload className={`h-4 w-4 mr-1 ${saveKeywordDetails.isPending ? "animate-spin" : ""}`} />
              {saveKeywordDetails.isPending ? "업로드 중..." : "CSV 업로드"}
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-2 mt-3">
            <span className="text-xs text-muted-foreground mr-1">단축:</span>
            {[1, 2, 3].map((d) => (
              <Button key={d} variant="outline" size="sm" className="text-xs h-7" onClick={() => setSpecificDate(d)}>
                {d}일전
              </Button>
            ))}
            <div className="ml-auto flex items-center gap-1">
              <span className="text-xs text-muted-foreground mr-1">분류:</span>
              {(["all", "general", "powerlink"] as const).map((type) => (
                <Button
                  key={type}
                  variant={filterType === type ? "default" : "outline"}
                  size="sm"
                  className="text-xs h-7"
                  onClick={() => setFilterType(type)}
                >
                  {type === "all" ? "전체" : type === "general" ? "파컨" : "파워링크"}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 통계 카드 */}
      {keywordDetails.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: "키워드 데이터", value: stats.keywordCount },
            { label: "고유 키워드", value: stats.uniqueKeywords },
            { label: "총 노출수", value: stats.totalImpressions.toLocaleString() },
            { label: "총 클릭수", value: stats.totalClicks.toLocaleString() },
            { label: "평균 CPC", value: Math.round(stats.avgCpc).toLocaleString() },
            { label: "총 비용", value: Math.round(stats.totalCost).toLocaleString() },
          ].map(({ label, value }) => (
            <Card key={label}>
              <CardContent className="pt-4 pb-4 text-center">
                <div className="text-2xl font-bold tabular-nums">{value}</div>
                <div className="text-xs text-muted-foreground mt-1">{label}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 로딩 */}
      {isLoading && (
        <div className="flex justify-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* 키워드 테이블 */}
      {!isLoading && sortedKeywordDetails.length > 0 && (
        <Card>
          <CardContent className="pt-4 pb-4 overflow-auto">
            <div className="text-sm text-muted-foreground mb-3">
              키워드별 상세 데이터 ({sortedKeywordDetails.length}건)
            </div>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b text-xs text-muted-foreground">
                  <th className="text-left py-2 px-2">날짜</th>
                  <SortHeader label="광고그룹" sortKey="adGroup" className="text-left" />
                  <SortHeader label="키워드" sortKey="keyword" className="text-left" />
                  <SortHeader label="노출수" sortKey="impressions" />
                  <SortHeader label="클릭수" sortKey="clicks" />
                  <SortHeader label="클릭률" sortKey="clickRate" />
                  <SortHeader label="평균CPC" sortKey="avgCpc" />
                  <SortHeader label="총비용" sortKey="totalCost" />
                  <SortHeader label="평균순위" sortKey="avgPosition" />
                </tr>
              </thead>
              <tbody>
                {sortedKeywordDetails.map((row, idx) => {
                  const prevRow = sortedKeywordDetails[idx - 1];
                  const isGroupFirst = idx === 0 || prevRow?.adGroup !== row.adGroup;
                  const isTopClickRate = topClickRateByAdGroup.get(row.adGroup) === row.keyword;
                  const isTopImpressions = topImpressionsByAdGroup.get(row.adGroup) === row.keyword;

                  return (
                    <tr
                      key={`${row.reportDate}-${row.keyword}-${idx}`}
                      className={`border-b hover:bg-muted/30 ${isGroupFirst ? "border-t-2 border-t-border" : ""} ${
                        isTopClickRate ? "bg-red-500/5" : ""
                      } ${isTopImpressions ? "bg-yellow-500/5" : ""}`}
                    >
                      <td className="py-1.5 px-2 text-muted-foreground text-xs">{row.reportDate}</td>
                      <td className="py-1.5 px-2 text-xs">{row.adGroup}</td>
                      <td className="py-1.5 px-2 font-semibold text-primary">{row.keyword}</td>
                      <td className="py-1.5 px-2 text-right tabular-nums">{row.impressions.toLocaleString()}</td>
                      <td className="py-1.5 px-2 text-right tabular-nums">{row.clicks.toLocaleString()}</td>
                      <td className="py-1.5 px-2 text-right tabular-nums">{row.clickRate.toFixed(2)}%</td>
                      <td className="py-1.5 px-2 text-right tabular-nums">{Math.round(row.avgCpc).toLocaleString()}</td>
                      <td className="py-1.5 px-2 text-right tabular-nums">{Math.round(row.totalCost).toLocaleString()}</td>
                      <td className="py-1.5 px-2 text-right tabular-nums">{row.avgPosition.toFixed(1)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Empty */}
      {!isLoading && keywordDetails.length === 0 && (
        <Card>
          <CardContent className="pt-12 pb-12 text-center">
            <BarChart3 className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">날짜를 선택하고 조회 버튼을 클릭하세요</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

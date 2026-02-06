import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useRankHistory } from "@/hooks/useRanking";
import type { RankHistoryKeywordItem, RankHistoryUrlItem } from "@/types/ranking";
import { RefreshCw, ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

function getToday(): string {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().split("T")[0];
}

function getDateBefore(days: number): string {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  kst.setDate(kst.getDate() - days);
  return kst.toISOString().split("T")[0];
}

type SortKey = string;
type SortDirection = "asc" | "desc";

export default function RankHistoryPage() {
  const [startDate, setStartDate] = useState(getDateBefore(7));
  const [endDate, setEndDate] = useState(getToday());
  const [activeTab, setActiveTab] = useState<"keyword" | "url">("keyword");
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDirection }>({
    key: "checkedAt",
    direction: "desc",
  });

  const { data, isLoading } = useRankHistory(startDate, endDate, activeTab);

  const handleSort = (key: SortKey) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "desc" ? "asc" : "desc",
    }));
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sortData = <T,>(items: T[]): T[] => {
    return [...items].sort((a, b) => {
      const aVal = (a as any)[sortConfig.key];
      const bVal = (b as any)[sortConfig.key];
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;

      let cmp = 0;
      if (typeof aVal === "number" && typeof bVal === "number") {
        cmp = aVal - bVal;
      } else {
        cmp = String(aVal).localeCompare(String(bVal), "ko");
      }
      return sortConfig.direction === "asc" ? cmp : -cmp;
    });
  };

  const SortHeader = ({ label, sortKey }: { label: string; sortKey: string }) => (
    <TableHead
      className="cursor-pointer select-none"
      onClick={() => handleSort(sortKey)}
    >
      <div className="flex items-center gap-1">
        {label}
        <ArrowUpDown className={cn(
          "w-3 h-3",
          sortConfig.key === sortKey ? "text-foreground" : "text-muted-foreground/50"
        )} />
      </div>
    </TableHead>
  );

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("ko-KR");
  };

  const getRankBadgeVariant = (rank: number | null): "default" | "secondary" | "outline" => {
    if (!rank) return "outline";
    if (rank <= 3) return "default";
    if (rank <= 10) return "secondary";
    return "outline";
  };

  const truncateUrl = (url: string, maxLen = 50) => {
    if (!url) return "-";
    if (url.length <= maxLen) return url;
    return url.substring(0, maxLen) + "...";
  };

  const keywordData = activeTab === "keyword" ? sortData<RankHistoryKeywordItem>((data as RankHistoryKeywordItem[]) || []) : [];
  const urlData = activeTab === "url" ? sortData<RankHistoryUrlItem>((data as RankHistoryUrlItem[]) || []) : [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">순위 기록</h1>

      {/* 날짜 선택 */}
      <div className="flex flex-wrap items-end gap-4">
        <div className="grid gap-2">
          <Label>시작일</Label>
          <Input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-40"
          />
        </div>
        <div className="grid gap-2">
          <Label>종료일</Label>
          <Input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-40"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => { setStartDate(getDateBefore(1)); setEndDate(getToday()); }}
          >
            1일전
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => { setStartDate(getDateBefore(3)); setEndDate(getToday()); }}
          >
            3일전
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => { setStartDate(getDateBefore(7)); setEndDate(getToday()); }}
          >
            7일전
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => { setStartDate(getDateBefore(30)); setEndDate(getToday()); }}
          >
            30일전
          </Button>
        </div>
      </div>

      {/* 탭 */}
      <div className="flex gap-2">
        <Button
          variant={activeTab === "keyword" ? "default" : "outline"}
          onClick={() => { setActiveTab("keyword"); setSortConfig({ key: "checkedAt", direction: "desc" }); }}
        >
          키워드 순위
        </Button>
        <Button
          variant={activeTab === "url" ? "default" : "outline"}
          onClick={() => { setActiveTab("url"); setSortConfig({ key: "checkedAt", direction: "desc" }); }}
        >
          URL 추적 순위
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-6 h-6 animate-spin" />
        </div>
      ) : activeTab === "keyword" ? (
        <Card>
          <CardHeader>
            <CardTitle>키워드 순위 기록</CardTitle>
            <CardDescription>
              {startDate} ~ {endDate} 기간의 키워드 순위 기록 ({keywordData.length}건)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {keywordData.length ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortHeader label="체크일시" sortKey="checkedAt" />
                    <SortHeader label="사이트" sortKey="siteName" />
                    <SortHeader label="키워드" sortKey="keyword" />
                    <SortHeader label="순위" sortKey="rankPosition" />
                    <TableHead>결과 URL</TableHead>
                    <TableHead>결과 제목</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {keywordData.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {formatDate(item.checkedAt)}
                      </TableCell>
                      <TableCell className="font-medium">{item.siteName}</TableCell>
                      <TableCell>{item.keyword}</TableCell>
                      <TableCell>
                        <Badge variant={getRankBadgeVariant(item.rankPosition)}>
                          {item.rankPosition ? `${item.rankPosition}위` : "미확인"}
                        </Badge>
                      </TableCell>
                      <TableCell
                        className="text-sm max-w-[200px] truncate"
                        title={item.resultUrl || ""}
                      >
                        {item.resultUrl ? (
                          <a
                            href={item.resultUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline"
                          >
                            {truncateUrl(item.resultUrl)}
                          </a>
                        ) : "-"}
                      </TableCell>
                      <TableCell className="text-sm max-w-[200px] truncate" title={item.resultTitle || ""}>
                        {item.resultTitle || "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="py-8 text-center text-muted-foreground">
                해당 기간에 순위 기록이 없습니다.
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>URL 추적 순위 기록</CardTitle>
            <CardDescription>
              {startDate} ~ {endDate} 기간의 URL 추적 순위 기록 ({urlData.length}건)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {urlData.length ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortHeader label="체크일시" sortKey="checkedAt" />
                    <SortHeader label="키워드" sortKey="keyword" />
                    <TableHead>대상 URL</TableHead>
                    <SortHeader label="전체 순위" sortKey="rankPosition" />
                    <SortHeader label="영역" sortKey="sectionName" />
                    <SortHeader label="영역 순위" sortKey="sectionRank" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {urlData.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {formatDate(item.checkedAt)}
                      </TableCell>
                      <TableCell className="font-medium">{item.keyword}</TableCell>
                      <TableCell
                        className="text-sm max-w-[200px] truncate"
                        title={item.targetUrl}
                      >
                        {truncateUrl(item.targetUrl)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getRankBadgeVariant(item.rankPosition)}>
                          {item.rankPosition ? `${item.rankPosition}위` : "미확인"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {item.sectionName ? (
                          <Badge variant="outline">{item.sectionName}</Badge>
                        ) : "-"}
                      </TableCell>
                      <TableCell className="text-center">
                        {item.sectionRank ? `${item.sectionRank}위` : "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="py-8 text-center text-muted-foreground">
                해당 기간에 URL 추적 기록이 없습니다.
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

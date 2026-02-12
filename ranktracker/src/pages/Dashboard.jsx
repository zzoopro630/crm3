import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useDashboardSummary, useCheckRankings } from "@/hooks/useRankings";
import { Globe, Search, Activity, RefreshCw, ExternalLink } from "lucide-react";
import { toast } from "sonner";

export default function Dashboard() {
  const { data, isLoading, refetch } = useDashboardSummary();
  const checkRankings = useCheckRankings();
  const [checkingIds, setCheckingIds] = useState(new Set());

  const handleCheckAll = async () => {
    if (!data?.latestRankings?.length) return;

    const keywordIds = data.latestRankings.map((r) => r.keyword_id);
    setCheckingIds(new Set(keywordIds));

    try {
      await checkRankings.mutateAsync(keywordIds);
      toast.success("랭킹 체크가 완료되었습니다.");
      refetch();
    } catch (error) {
      toast.error("랭킹 체크 중 오류가 발생했습니다.");
    } finally {
      setCheckingIds(new Set());
    }
  };

  const handleCheckSingle = async (keywordId) => {
    setCheckingIds((prev) => new Set([...prev, keywordId]));

    try {
      await checkRankings.mutateAsync([keywordId]);
      toast.success("랭킹 체크가 완료되었습니다.");
      refetch();
    } catch (error) {
      toast.error("랭킹 체크 중 오류가 발생했습니다.");
    } finally {
      setCheckingIds((prev) => {
        const next = new Set(prev);
        next.delete(keywordId);
        return next;
      });
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleString("ko-KR");
  };

  const getRankBadgeVariant = (rank) => {
    if (!rank) return "outline";
    if (rank <= 3) return "default";
    if (rank <= 10) return "secondary";
    return "outline";
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">대시보드</h1>
        <Button
          onClick={handleCheckAll}
          disabled={checkRankings.isPending || !data?.latestRankings?.length}
        >
          {checkRankings.isPending ? (
            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4 mr-2" />
          )}
          전체 랭킹 체크
        </Button>
      </div>

      {/* 통계 카드 */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">등록된 사이트</CardTitle>
            <Globe className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.stats?.siteCount || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">활성 키워드</CardTitle>
            <Search className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.stats?.keywordCount || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">오늘 체크 횟수</CardTitle>
            <Activity className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.stats?.todayChecks || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* 키워드 랭킹 테이블 */}
      <Card>
        <CardHeader>
          <CardTitle>키워드별 현재 순위</CardTitle>
          <CardDescription>네이버 VIEW 탭 기준 검색 순위입니다.</CardDescription>
        </CardHeader>
        <CardContent>
          {data?.latestRankings?.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>사이트</TableHead>
                  <TableHead>키워드</TableHead>
                  <TableHead className="text-center">순위</TableHead>
                  <TableHead>마지막 체크</TableHead>
                  <TableHead className="text-right">액션</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.latestRankings.map((item) => (
                  <TableRow key={item.keyword_id}>
                    <TableCell className="font-medium">{item.site_name}</TableCell>
                    <TableCell>{item.keyword}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={getRankBadgeVariant(item.rank_position)}>
                        {item.rank_position ? `${item.rank_position}위` : "미확인"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(item.checked_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {item.result_url && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => window.open(item.result_url, "_blank")}
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCheckSingle(item.keyword_id)}
                          disabled={checkingIds.has(item.keyword_id)}
                        >
                          {checkingIds.has(item.keyword_id) ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                          ) : (
                            "체크"
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              등록된 키워드가 없습니다. 키워드를 먼저 등록해주세요.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

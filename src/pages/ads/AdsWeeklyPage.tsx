import { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LabelList,
} from "recharts";
import { ArrowUp, ArrowDown, RefreshCw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { getKeywordDetails, getInquiries } from "@/services/ads";

// KST 날짜 유틸리티
function formatDateKST(date: Date): string {
  const kst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().split("T")[0];
}

function getWeekRange(date: Date) {
  const current = new Date(date);
  const day = current.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(current);
  monday.setDate(current.getDate() + diffToMonday);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return { start: formatDateKST(monday), end: formatDateKST(sunday) };
}

interface WeekData {
  name: string;
  range: string;
  cost: number;
  impressions: number;
  clicks: number;
  cpc: number;
  inquiries: number;
}

export default function AdsWeeklyPage() {
  const [weeklyData, setWeeklyData] = useState<WeekData[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchPreviousWeeks = async () => {
      setIsLoading(true);
      const today = new Date();
      const weeks = [];

      for (let i = 0; i < 4; i++) {
        const targetDate = new Date();
        targetDate.setDate(today.getDate() - i * 7);
        const range = getWeekRange(targetDate);
        weeks.push({ label: i === 0 ? "이번 주" : `${i}주 전`, ...range });
      }

      try {
        const [detailsResults, inquiriesResults] = await Promise.all([
          Promise.all(weeks.map((w) => getKeywordDetails(w.start, w.end))),
          Promise.all(weeks.map((w) => getInquiries(w.start, w.end))),
        ]);

        const processed = weeks
          .map((w, i) => {
            const detailsRes = detailsResults[i];
            const inquiryRes = inquiriesResults[i];
            const allRows = detailsRes.success ? detailsRes.data : [];
            const inqRows = inquiryRes.success ? inquiryRes.data : [];

            // 파워링크 광고그룹 제외 (파컨 전용)
            const rows = allRows.filter((r) => {
              const ag = r.adGroup.toLowerCase();
              return !ag.startsWith("파워링크") && !ag.startsWith("파워");
            });

            const totalCost = rows.reduce((sum, r) => sum + r.totalCost, 0);
            const totalImpressions = rows.reduce((sum, r) => sum + r.impressions, 0);
            const totalClicks = rows.reduce((sum, r) => sum + r.clicks, 0);

            return {
              name: w.label,
              range: `${w.start} ~ ${w.end}`,
              cost: totalCost,
              impressions: totalImpressions,
              clicks: totalClicks,
              cpc: totalClicks > 0 ? totalCost / totalClicks : 0,
              inquiries: inqRows.length,
            };
          })
          .reverse();

        setWeeklyData(processed);
      } catch (err) {
        console.error("Failed to fetch weekly data:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPreviousWeeks();
  }, []);

  const formatNumber = (num: number) => Math.round(num).toLocaleString();

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const hasData = weeklyData.length > 0 && weeklyData.some((w) => w.cost > 0);

  if (!hasData) {
    return (
      <Card>
        <CardContent className="pt-12 pb-12 text-center text-muted-foreground">
          주간 데이터가 없습니다. N-DATA 탭에서 CSV를 업로드해주세요.
        </CardContent>
      </Card>
    );
  }

  // 전환단가(CPA) 데이터 계산
  const cpaData = weeklyData.map((w) => ({
    name: w.name,
    cpa: w.inquiries > 0 ? Math.round(w.cost / w.inquiries) : 0,
    inquiries: w.inquiries,
  }));

  return (
    <div className="space-y-4">
      {/* 2분할 차트 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 왼쪽: 주간 광고비 추이 */}
        <Card>
          <CardContent className="pt-4 pb-4">
            <h3 className="font-semibold mb-4">주간 광고비 추이</h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyData} margin={{ top: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
                  <XAxis dataKey="name" className="text-muted-foreground" fontSize={12} />
                  <YAxis className="text-muted-foreground" fontSize={12} tickFormatter={(val) => `${val / 10000}만`} />
                  <Tooltip
                    contentStyle={{ borderRadius: "8px" }}
                    formatter={(value: number | undefined, name: string | undefined) => [
                      formatNumber(value ?? 0) + (name === "광고비" ? "원" : "건"),
                      name ?? "",
                    ]}
                  />
                  <Bar dataKey="cost" fill="hsl(var(--primary))" name="광고비" radius={[4, 4, 0, 0]}>
                    <LabelList dataKey="cost" position="top" fontSize={10} formatter={(v) => `${Math.round(Number(v) / 10000)}만`} />
                  </Bar>
                  <Bar dataKey="inquiries" fill="hsl(142, 71%, 45%)" name="문의수" radius={[4, 4, 0, 0]}>
                    <LabelList dataKey="inquiries" position="top" fontSize={10} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* 오른쪽: 주간 전환단가 추이 */}
        <Card>
          <CardContent className="pt-4 pb-4">
            <h3 className="font-semibold mb-4">주간 전환단가 추이</h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={cpaData} margin={{ top: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
                  <XAxis dataKey="name" className="text-muted-foreground" fontSize={12} />
                  <YAxis className="text-muted-foreground" fontSize={12} tickFormatter={(val) => `${val / 10000}만`} />
                  <Tooltip
                    contentStyle={{ borderRadius: "8px" }}
                    formatter={(value: number | undefined, name: string | undefined) => [
                      formatNumber(value ?? 0) + (name === "전환단가" ? "원" : "건"),
                      name ?? "",
                    ]}
                  />
                  <Bar dataKey="cpa" fill="hsl(25, 95%, 53%)" name="전환단가" radius={[4, 4, 0, 0]}>
                    <LabelList dataKey="cpa" position="top" fontSize={10} formatter={(v) => Math.round(Number(v)).toLocaleString()} />
                  </Bar>
                  <Bar dataKey="inquiries" fill="hsl(142, 71%, 45%)" name="문의수" radius={[4, 4, 0, 0]}>
                    <LabelList dataKey="inquiries" position="top" fontSize={10} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 비교 테이블 */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <h3 className="font-semibold mb-4">주간 성과 비교</h3>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b text-xs text-muted-foreground">
                <th className="text-left py-2 px-2">기간</th>
                <th className="text-right py-2 px-2">광고비</th>
                <th className="text-right py-2 px-2">클릭수</th>
                <th className="text-right py-2 px-2">평균CPC</th>
                <th className="text-right py-2 px-2">실제문의</th>
                <th className="text-right py-2 px-2">전환단가(CPA)</th>
              </tr>
            </thead>
            <tbody>
              {weeklyData
                .slice()
                .reverse()
                .map((w, i, arr) => {
                  const prev = arr[i + 1];
                  const costDiff = prev ? w.cost - prev.cost : 0;

                  return (
                    <tr key={w.name} className="border-b hover:bg-muted/30">
                      <td className="py-2 px-2">
                        <div className="font-medium">{w.name}</div>
                        <div className="text-xs text-muted-foreground">{w.range}</div>
                      </td>
                      <td className="py-2 px-2 text-right">
                        <div className="tabular-nums">{formatNumber(w.cost)}</div>
                        {prev && (
                          <div className={`text-xs flex items-center justify-end gap-0.5 ${costDiff > 0 ? "text-red-500" : "text-green-500"}`}>
                            {costDiff > 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                            {formatNumber(Math.abs(costDiff))}
                          </div>
                        )}
                      </td>
                      <td className="py-2 px-2 text-right tabular-nums">{formatNumber(w.clicks)}</td>
                      <td className="py-2 px-2 text-right tabular-nums">{formatNumber(w.cpc)}</td>
                      <td className="py-2 px-2 text-right font-semibold text-green-600">
                        {w.inquiries > 0 ? w.inquiries : "-"}
                      </td>
                      <td className="py-2 px-2 text-right font-semibold tabular-nums">
                        {w.inquiries > 0 ? formatNumber(w.cost / w.inquiries) : "-"}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4 pb-4">
          <p className="text-xs text-muted-foreground">
            ※ 주간 데이터는 월요일부터 일요일까지를 한 주로 계산합니다.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

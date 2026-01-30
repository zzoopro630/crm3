// 네이버 광고관리자 CSV 파싱 유틸리티
import type { ParsedKeywordData } from "@/types/ads";

// 날짜 형식 변환: "2026.01.22." → "2026-01-22"
function parseDate(dateStr: string): string {
  const cleaned = dateStr.replace(/\.$/, "");
  const parts = cleaned.split(".");
  if (parts.length === 3) {
    return `${parts[0]}-${parts[1].padStart(2, "0")}-${parts[2].padStart(2, "0")}`;
  }
  return dateStr;
}

// 숫자 파싱 (콤마 제거)
function parseNumber(value: string): number {
  if (!value || value === "-") return 0;
  const cleaned = value.replace(/,/g, "").replace(/"/g, "");
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

// CSV 행 파싱 (쉼표로 분리, 따옴표 처리)
function parseCSVRow(row: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < row.length; i++) {
    const char = row[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

// 네이버 광고관리자 CSV 파싱
export function parseNaverAdsCsv(csvContent: string): ParsedKeywordData[] {
  const lines = csvContent.split("\n").filter((line) => line.trim());

  if (lines.length < 3) {
    throw new Error("CSV 파일 형식이 올바르지 않습니다. (최소 3줄 필요)");
  }

  const results: ParsedKeywordData[] = [];

  for (let i = 2; i < lines.length; i++) {
    const row = parseCSVRow(lines[i]);
    if (row.length < 9) continue;

    const [adGroup, keyword, dateStr, impressions, clicks, clickRate, avgCpc, totalCost, avgPosition] = row;

    if (!adGroup || !dateStr) continue;
    if (keyword === "-") continue;

    results.push({
      adGroup: adGroup.replace(/"/g, ""),
      keyword: keyword.replace(/"/g, ""),
      reportDate: parseDate(dateStr.replace(/"/g, "")),
      impressions: parseNumber(impressions),
      clicks: parseNumber(clicks),
      clickRate: parseNumber(clickRate),
      avgCpc: parseNumber(avgCpc),
      totalCost: parseNumber(totalCost),
      avgPosition: parseNumber(avgPosition),
    });
  }

  return results;
}

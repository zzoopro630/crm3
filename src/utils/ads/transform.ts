// 광고그룹명에서 키워드 카테고리 추출
// 예: "65_파컨_고혈압_251118" -> "고혈압"
// 예: "파워#퍼스트_채용-241030-2" -> "채용"
export function extractKeywordCategory(adGroupName: string): string {
  const pakonMatch = adGroupName.match(/파컨[_-]([^_-]+)/);
  if (pakonMatch) return pakonMatch[1];

  const firstMatch = adGroupName.match(/퍼스트[_-]([^_-]+)/);
  if (firstMatch) return firstMatch[1];

  const parts = adGroupName.split(/[_#-]/);
  for (const part of parts) {
    if (/^\d+$/.test(part) || part.length < 2) continue;
    if (["파워", "파워링크", "파컨", "퍼스트"].includes(part)) continue;
    return part;
  }

  return adGroupName.substring(0, 10);
}

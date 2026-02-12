import * as cheerio from "cheerio";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const SECTION_MAP: Record<string, string> = {
  ugB_adR: "브랜드콘텐츠",
  ugB_b1R: "VIEW",
  ugB_b2R: "VIEW",
  ugB_b3R: "VIEW",
  ugB_bsR: "VIEW",
  ugB_ipR: "인플루언서",
  web_gen: "웹",
  sit_5po: "웹",
  nws_all: "뉴스",
};

const NAVER_CONTENT_HOSTS = [
  "blog.naver.com",
  "post.naver.com",
  "cafe.naver.com",
  "in.naver.com",
  "kin.naver.com",
  "tv.naver.com",
];

function normalizeUrl(url: string): string {
  try {
    return url
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .replace(/\/$/, "")
      .toLowerCase();
  } catch {
    return url.toLowerCase();
  }
}

function getSectionName(area: string, h2Text: string): string | null {
  if (SECTION_MAP[area]) return SECTION_MAP[area];
  if (/^ugB_b\dR$/.test(area)) return h2Text || "VIEW";
  if (h2Text?.includes("브랜드 콘텐츠")) return "브랜드콘텐츠";
  if (h2Text) return h2Text;
  return null;
}

function isNaverInternal(hostname: string): boolean {
  return (
    hostname.endsWith("naver.com") &&
    !hostname.startsWith("ader.") &&
    !NAVER_CONTENT_HOSTS.includes(hostname)
  );
}

async function resolveAderUrl(aderUrl: string): Promise<string | null> {
  try {
    const res = await fetch(aderUrl, { redirect: "manual" });
    return res.headers.get("location") || null;
  } catch {
    return null;
  }
}

async function fetchNaverHtml(query: string, where: string): Promise<string> {
  const url = `https://search.naver.com/search.naver?where=${where}&query=${encodeURIComponent(query)}`;
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT },
  });
  return res.text();
}

// ============ URL 추적 (통합검색) ============

interface SectionItem {
  url: string;
  title: string;
}

interface ParsedSection {
  name: string;
  items: SectionItem[];
}

interface ParseResult {
  sections: ParsedSection[];
  brandContentApiUrl: string | null;
}

/**
 * 네이버 통합검색 HTML을 파싱하여 섹션별 URL 목록 반환
 */
async function parseNaverSearchResults(keyword: string): Promise<ParseResult> {
  const html = await fetchNaverHtml(keyword, "nexearch");
  const $ = cheerio.load(html);

  let brandContentApiUrl: string | null = null;

  // 브랜드콘텐츠 lb_api URL 추출 (script 태그에서)
  $("script").each((_, el) => {
    const scriptText = $(el).html() || "";
    // lb_api 패턴 매칭: "api":"https://lbapi.naver.com/..."
    const match = scriptText.match(/"api"\s*:\s*"(https:\/\/lbapi\.naver\.com[^"]+)"/);
    if (match) {
      brandContentApiUrl = match[1];
    }
  });

  // 섹션별 URL 추출
  const rawSections: Array<{
    area: string;
    h2: string;
    urls: SectionItem[];
  }> = [];

  $("#main_pack .sc_new").each((_, section) => {
    const $section = $(section);
    const area = $section.attr("data-meta-area") || "";
    const h2 = $section.find("h2").first().text().trim();

    if (area === "ad_section" || h2.includes("파워링크")) return;

    const urls: SectionItem[] = [];
    const seen = new Set<string>();

    $section.find('a[href^="http"]').each((_, link) => {
      try {
        const href = $(link).attr("href") || "";
        const urlObj = new URL(href);

        if (isNaverInternal(urlObj.hostname)) return;

        const text = $(link).text().trim();
        if (text.length < 3) return;

        if (seen.has(href)) return;
        seen.add(href);

        urls.push({ url: href, title: text.substring(0, 100) });
      } catch {
        /* skip invalid URLs */
      }
    });

    if (urls.length > 0) {
      rawSections.push({ area, h2, urls });
    }
  });

  // ader.naver.com 리디렉트 URL 병렬 해석
  const sections: ParsedSection[] = [];

  for (const raw of rawSections) {
    const sectionName = getSectionName(raw.area, raw.h2);
    if (!sectionName) continue;

    // 브랜드콘텐츠 섹션은 lb_api로 별도 조회하므로 HTML 파싱 결과 스킵
    if (sectionName === "브랜드콘텐츠" && brandContentApiUrl) {
      sections.push({ name: sectionName, items: [] });
      continue;
    }

    const aderItems: Array<{ index: number; url: string }> = [];
    const items: SectionItem[] = [];

    for (let i = 0; i < raw.urls.length; i++) {
      const item = raw.urls[i];
      try {
        const urlObj = new URL(item.url);
        if (urlObj.hostname.startsWith("ader.")) {
          aderItems.push({ index: i, url: item.url });
          items.push({ url: "", title: item.title }); // placeholder
        } else {
          items.push(item);
        }
      } catch {
        items.push(item);
      }
    }

    // ader URL 병렬 해석
    if (aderItems.length > 0) {
      const resolved = await Promise.all(
        aderItems.map((a) => resolveAderUrl(a.url))
      );
      for (let i = 0; i < aderItems.length; i++) {
        if (resolved[i]) {
          items[aderItems[i].index] = {
            url: resolved[i]!,
            title: items[aderItems[i].index].title,
          };
        }
      }
    }

    const validItems = items.filter((item) => item.url !== "");
    if (validItems.length > 0) {
      sections.push({ name: sectionName, items: validItems });
    }
  }

  return { sections, brandContentApiUrl };
}

/**
 * lb_api로 브랜드콘텐츠 전체 아이템 조회
 */
async function fetchBrandContentItems(
  apiUrl: string
): Promise<SectionItem[]> {
  try {
    const res = await fetch(apiUrl, {
      headers: { "User-Agent": USER_AGENT },
    });
    const json = (await res.json()) as {
      dom?: { collection?: Array<{ html?: string }> };
    };

    const htmlStr = json?.dom?.collection?.[0]?.html;
    if (!htmlStr) return [];

    const $ = cheerio.load(htmlStr);
    const aderUrls: Array<{ url: string; title: string }> = [];

    $("a[href]").each((_, link) => {
      const href = $(link).attr("href") || "";
      const text = $(link).text().trim();
      if (href && text.length >= 3) {
        aderUrls.push({ url: href, title: text.substring(0, 100) });
      }
    });

    if (aderUrls.length === 0) return [];

    // ader URL 병렬 리디렉트 해석
    const results = await Promise.all(
      aderUrls.map(async (item) => {
        try {
          const urlObj = new URL(item.url);
          if (urlObj.hostname.startsWith("ader.")) {
            const resolved = await resolveAderUrl(item.url);
            return resolved ? { url: resolved, title: item.title } : null;
          }
          return item;
        } catch {
          return item;
        }
      })
    );

    return results.filter((r): r is SectionItem => r !== null);
  } catch {
    return [];
  }
}

interface UrlMatchResult {
  isExposed: boolean;
  sectionExists: boolean;
  sectionRank: number | null;
  overallRank: number | null;
  foundInSection: string | null;
}

/**
 * 전체 결과에서 타겟 URL 매칭
 */
function matchUrlInResults(
  sections: ParsedSection[],
  targetUrl: string,
  targetSection?: string
): UrlMatchResult {
  const normalizedTarget = normalizeUrl(targetUrl);

  // 전체 노출 여부 체크
  let isExposed = false;
  let overallRank = 0;
  let foundOverallRank: number | null = null;
  let foundInSection: string | null = null;

  for (const section of sections) {
    for (let i = 0; i < section.items.length; i++) {
      overallRank++;
      const normalizedItem = normalizeUrl(section.items[i].url);

      if (
        normalizedItem.includes(normalizedTarget) ||
        normalizedTarget.includes(normalizedItem)
      ) {
        isExposed = true;
        if (!foundOverallRank) {
          foundOverallRank = overallRank;
          foundInSection = section.name;
        }
      }
    }
  }

  // 지정 영역 체크
  if (!targetSection) {
    return {
      isExposed,
      sectionExists: true,
      sectionRank: null,
      overallRank: foundOverallRank,
      foundInSection,
    };
  }

  const targetSectionData = sections.find((s) => s.name === targetSection);
  const sectionExists = !!targetSectionData;

  if (!sectionExists) {
    return {
      isExposed,
      sectionExists: false,
      sectionRank: null,
      overallRank: foundOverallRank,
      foundInSection,
    };
  }

  // 지정 영역 내 순위 계산
  let sectionRank: number | null = null;
  for (let i = 0; i < targetSectionData.items.length; i++) {
    const normalizedItem = normalizeUrl(targetSectionData.items[i].url);
    if (
      normalizedItem.includes(normalizedTarget) ||
      normalizedTarget.includes(normalizedItem)
    ) {
      sectionRank = i + 1;
      break;
    }
  }

  return {
    isExposed,
    sectionExists: true,
    sectionRank,
    overallRank: foundOverallRank,
    foundInSection,
  };
}

/**
 * URL 추적 통합 체크 함수 (API에서 호출)
 */
export async function checkUrlTracking(
  keyword: string,
  targetUrl: string,
  section?: string
): Promise<UrlMatchResult> {
  const { sections, brandContentApiUrl } = await parseNaverSearchResults(keyword);

  // 브랜드콘텐츠 lb_api가 있으면 전체 아이템 조회 후 섹션 데이터 교체
  if (brandContentApiUrl) {
    const brandItems = await fetchBrandContentItems(brandContentApiUrl);
    const brandSection = sections.find((s) => s.name === "브랜드콘텐츠");
    if (brandSection) {
      brandSection.items = brandItems;
    } else if (brandItems.length > 0) {
      // lb_api는 있는데 섹션이 없었으면 추가
      sections.unshift({ name: "브랜드콘텐츠", items: brandItems });
    }
  }

  return matchUrlInResults(sections, targetUrl, section || undefined);
}

// ============ 사이트 순위 추적 (웹 탭) — 기존 유지 ============

/**
 * 네이버 웹 탭에서 특정 키워드 검색 후 사이트 순위 확인 (cheerio 기반)
 */
export async function checkNaverWebRank(
  keyword: string,
  siteUrl: string,
  maxResults = 50
) {
  const html = await fetchNaverHtml(keyword, "web");
  const $ = cheerio.load(html);

  const results: Array<{ url: string; title: string; domain: string }> = [];
  const seen = new Set<string>();

  $("#main_pack .sc_new").each((_, section) => {
    const $section = $(section);
    const area = $section.attr("data-meta-area") || "";
    const h2 = $section.find("h2").first().text().trim();

    if (area === "ad_section" || h2.includes("파워링크")) return;

    $section.find('a[href^="http"]').each((_, link) => {
      try {
        const href = $(link).attr("href") || "";
        const urlObj = new URL(href);

        if (urlObj.hostname.endsWith("naver.com")) return;
        if (href.includes("/adcr") || href.includes("ad.search")) return;

        const text = $(link).text().trim();
        if (text.length < 5) return;

        const urlKey = urlObj.hostname + urlObj.pathname;
        if (seen.has(urlKey)) return;
        seen.add(urlKey);

        results.push({
          url: href,
          title: text.substring(0, 100),
          domain: urlObj.hostname,
        });
      } catch {
        /* skip invalid URLs */
      }
    });
  });

  // 사이트 URL 매칭
  const normalizedSiteUrl = siteUrl
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "")
    .toLowerCase();

  for (let i = 0; i < Math.min(results.length, maxResults); i++) {
    const result = results[i];
    const normalizedUrl = result.url
      .replace(/^https?:\/\//, "")
      .replace(/\/$/, "")
      .toLowerCase();

    if (
      normalizedUrl.includes(normalizedSiteUrl) ||
      result.domain.includes(normalizedSiteUrl)
    ) {
      return { rank: i + 1, url: result.url, title: result.title };
    }
  }

  return { rank: null, url: null, title: null };
}

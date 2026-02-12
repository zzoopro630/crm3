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

/**
 * 네이버 통합검색에서 특정 URL의 노출 위치를 확인 (cheerio 기반)
 */
export async function checkNaverUrlExposure(
  keyword: string,
  targetUrl: string
) {
  const html = await fetchNaverHtml(keyword, "nexearch");
  const $ = cheerio.load(html);

  // 섹션별 URL 추출
  const rawSections: Array<{
    area: string;
    h2: string;
    urls: Array<{ url: string; title: string }>;
  }> = [];

  $("#main_pack .sc_new").each((_, section) => {
    const $section = $(section);
    const area = $section.attr("data-meta-area") || "";
    const h2 = $section.find("h2").first().text().trim();

    if (area === "ad_section" || h2.includes("파워링크")) return;

    const urls: Array<{ url: string; title: string }> = [];
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

  // ader.naver.com 리디렉트 URL 해석
  const allSections: Array<{
    name: string;
    items: Array<{ url: string; title: string }>;
  }> = [];

  for (const raw of rawSections) {
    const sectionName = getSectionName(raw.area, raw.h2);
    if (!sectionName) continue;

    const items: Array<{ url: string; title: string }> = [];
    for (const item of raw.urls) {
      try {
        const urlObj = new URL(item.url);
        if (urlObj.hostname.startsWith("ader.")) {
          const resolved = await resolveAderUrl(item.url);
          if (resolved) {
            items.push({ url: resolved, title: item.title });
          }
        } else {
          items.push(item);
        }
      } catch {
        items.push(item);
      }
    }

    if (items.length > 0) {
      allSections.push({ name: sectionName, items });
    }
  }

  // 전체 순위 계산 + 타겟 URL 매칭
  const normalizedTarget = normalizeUrl(targetUrl);
  let overallRank = 0;
  let foundSectionName: string | null = null;
  let foundSectionRank: number | null = null;
  let foundOverallRank: number | null = null;

  for (const section of allSections) {
    for (let i = 0; i < section.items.length; i++) {
      overallRank++;
      const normalizedItem = normalizeUrl(section.items[i].url);

      if (
        normalizedItem.includes(normalizedTarget) ||
        normalizedTarget.includes(normalizedItem)
      ) {
        if (!foundOverallRank) {
          foundSectionName = section.name;
          foundSectionRank = i + 1;
          foundOverallRank = overallRank;
        }
      }
    }
  }

  return {
    found: !!foundOverallRank,
    sectionName: foundSectionName,
    sectionRank: foundSectionRank,
    overallRank: foundOverallRank,
  };
}

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

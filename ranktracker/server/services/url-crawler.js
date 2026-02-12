import puppeteer from "puppeteer";

const SECTION_MAP = {
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

function getSectionName(area, h2Text) {
  if (SECTION_MAP[area]) return SECTION_MAP[area];
  if (area.match(/^ugB_b\dR$/)) return h2Text || "VIEW";
  if (h2Text?.includes("브랜드 콘텐츠")) return "브랜드콘텐츠";
  if (h2Text) return h2Text;
  return null;
}

function normalizeUrl(url) {
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

/**
 * ader.naver.com 리디렉트 URL에서 실제 URL을 추출
 */
async function resolveAderUrl(aderUrl) {
  try {
    const res = await fetch(aderUrl, { redirect: "manual" });
    const location = res.headers.get("location");
    return location || null;
  } catch {
    return null;
  }
}

/**
 * 네이버 통합 검색에서 특정 URL의 노출 위치를 확인
 */
export async function checkNaverUrlExposure(keyword, targetUrl) {
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
    ],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );

    const searchUrl = `https://search.naver.com/search.naver?where=nexearch&query=${encodeURIComponent(keyword)}`;
    console.log("[URL크롤러] 검색 URL:", searchUrl);

    await page.goto(searchUrl, { waitUntil: "networkidle0", timeout: 30000 });
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // 각 섹션에서 URL 목록 추출 (브랜드콘텐츠의 ader URL은 별도 처리 필요)
    const rawSections = await page.evaluate(() => {
      const mainPack = document.querySelector("#main_pack");
      if (!mainPack) return [];

      const sections = mainPack.querySelectorAll(".sc_new");
      const result = [];

      for (const section of sections) {
        const height = section.getBoundingClientRect().height;
        if (height < 10) continue;

        const area = section.getAttribute("data-meta-area") || "";
        const h2 = section.querySelector("h2")?.textContent?.trim() || "";

        // 광고 섹션 스킵
        if (area === "ad_section" || h2.includes("파워링크")) continue;

        const links = section.querySelectorAll('a[href^="http"]');
        const urls = [];
        const seen = new Set();

        for (const link of links) {
          try {
            const href = link.href;
            const urlObj = new URL(href);

            // 네이버 내부 링크 스킵 (콘텐츠 플랫폼과 ader 리디렉트는 유지)
            const NAVER_CONTENT_HOSTS = [
              "blog.naver.com",
              "post.naver.com",
              "cafe.naver.com",
              "in.naver.com",
              "kin.naver.com",
              "tv.naver.com",
            ];
            if (
              urlObj.hostname.endsWith("naver.com") &&
              !urlObj.hostname.startsWith("ader.") &&
              !NAVER_CONTENT_HOSTS.includes(urlObj.hostname)
            )
              continue;

            // 텍스트 없는 링크 스킵
            const text = link.textContent?.trim() || "";
            if (text.length < 3) continue;

            // 중복 URL 스킵
            if (seen.has(href)) continue;
            seen.add(href);

            urls.push({ url: href, title: text.substring(0, 100) });
          } catch {}
        }

        if (urls.length > 0) {
          result.push({ area, h2, urls });
        }
      }

      return result;
    });

    // 브랜드콘텐츠 더보기 확장 (메인 페이지에는 일부만 표시됨)
    const brandIdx = rawSections.findIndex(
      (s) => s.area === "ugB_adR" || s.h2?.includes("브랜드 콘텐츠")
    );

    if (brandIdx !== -1) {
      try {
        // 더보기 클릭으로 라이트박스 오픈
        const clicked = await page.evaluate(() => {
          const sections = document.querySelectorAll("#main_pack .sc_new");
          for (const section of sections) {
            const area = section.getAttribute("data-meta-area") || "";
            const h2 = section.querySelector("h2")?.textContent?.trim() || "";
            if (area !== "ugB_adR" && !h2.includes("브랜드 콘텐츠")) continue;

            const lbLink = section.querySelector('a[href*="lb_api"]');
            if (lbLink) {
              lbLink.click();
              return true;
            }

            const anchors = section.querySelectorAll("a");
            for (const a of anchors) {
              if (a.textContent.trim().includes("더보기")) {
                a.click();
                return true;
              }
            }
            return false;
          }
          return false;
        });

        if (clicked) {
          console.log("[URL크롤러] 브랜드콘텐츠 더보기 클릭");
          await new Promise((resolve) => setTimeout(resolve, 3000));

          // 라이트박스 오버레이 감지 + 블록 단위 추출
          const result = await page.evaluate(() => {
            const allAder = [
              ...document.querySelectorAll('a[href*="ader.naver.com"]'),
            ];
            if (allAder.length === 0)
              return { items: [], debug: "ader 링크 0개" };

            // z-index 기반 라이트박스 오버레이 탐지
            let overlay = null;
            let maxZ = 0;
            const checked = new Set();

            for (const link of allAder) {
              let el = link.parentElement;
              let depth = 0;
              while (el && depth < 15) {
                if (!checked.has(el)) {
                  checked.add(el);
                  const style = getComputedStyle(el);
                  const z = parseInt(style.zIndex) || 0;
                  if (
                    z > maxZ &&
                    (style.position === "fixed" ||
                      style.position === "absolute")
                  ) {
                    const count = el.querySelectorAll(
                      'a[href*="ader.naver.com"]'
                    ).length;
                    if (count >= 3) {
                      maxZ = z;
                      overlay = el;
                    }
                  }
                }
                el = el.parentElement;
                depth++;
              }
            }

            const container = overlay || document;
            const containerAder = [
              ...container.querySelectorAll('a[href*="ader.naver.com"]'),
            ];

            // 콘텐츠 블록 단위 그룹핑
            const processedBlocks = new Set();
            const items = [];

            for (const link of containerAder) {
              let block = link;
              let depth = 0;
              while (
                block.parentElement &&
                block.parentElement !== container &&
                depth < 10
              ) {
                const parent = block.parentElement;
                const h = block.getBoundingClientRect().height;
                if (parent.children.length >= 3 && h > 50 && h < 500) break;
                block = parent;
                depth++;
              }

              if (processedBlocks.has(block)) continue;
              processedBlocks.add(block);

              // 블록 내 가장 긴 텍스트의 ader 링크 = 제목 링크
              const blockLinks = block.querySelectorAll(
                'a[href*="ader.naver.com"]'
              );
              let bestUrl = null;
              let bestTitle = "";
              for (const bl of blockLinks) {
                const text = bl.textContent?.trim() || "";
                if (text.length > bestTitle.length) {
                  bestTitle = text;
                  bestUrl = bl.href;
                }
              }

              if (bestUrl && bestTitle.length >= 5) {
                items.push({
                  url: bestUrl,
                  title: bestTitle.substring(0, 100),
                });
              }
            }

            return {
              items,
              debug: `ader:${allAder.length} overlay:${overlay ? "Y(z:" + maxZ + ")" : "N"} container_ader:${containerAder.length} blocks:${items.length}`,
            };
          });

          console.log("[URL크롤러] 브랜드콘텐츠 확장:", result.debug);

          if (result.items.length > rawSections[brandIdx].urls.length) {
            console.log(
              `[URL크롤러] 브랜드콘텐츠: ${rawSections[brandIdx].urls.length}개 → ${result.items.length}개`
            );
            rawSections[brandIdx].urls = result.items;
          }
        }
      } catch (e) {
        console.log("[URL크롤러] 브랜드콘텐츠 확장 실패:", e.message);
      }
    }

    // 브랜드콘텐츠의 ader.naver.com URL 해석
    const allSections = [];
    for (const raw of rawSections) {
      const sectionName = getSectionName(raw.area, raw.h2);
      if (!sectionName) continue;

      const items = [];
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

    console.log(
      "[URL크롤러] 섹션:",
      allSections.map((s) => `${s.name}(${s.items.length}개)`).join(", ")
    );

    // 전체 순위 계산 + 타겟 URL 매칭
    const normalizedTarget = normalizeUrl(targetUrl);
    let overallRank = 0;
    let foundSectionName = null;
    let foundSectionRank = null;
    let foundOverallRank = null;

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

    const result = {
      found: !!foundOverallRank,
      sectionName: foundSectionName,
      sectionRank: foundSectionRank,
      overallRank: foundOverallRank,
      allSections,
    };

    console.log(
      "[URL크롤러] 결과:",
      result.found
        ? `발견 - ${result.sectionName} ${result.sectionRank}위 (전체 ${result.overallRank}위)`
        : "미발견"
    );

    return result;
  } catch (error) {
    console.error("[URL크롤러] 에러:", error.message);
    throw error;
  } finally {
    await browser.close();
  }
}

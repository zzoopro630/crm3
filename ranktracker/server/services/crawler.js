import puppeteer from "puppeteer";

/**
 * 네이버 웹사이트 탭에서 특정 키워드 검색 후 사이트 URL이 몇 위에 있는지 확인
 */
export async function checkNaverViewRank(keyword, siteUrl, maxResults = 50) {
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

    const searchUrl = `https://search.naver.com/search.naver?where=web&query=${encodeURIComponent(keyword)}`;
    console.log("크롤링 URL:", searchUrl);

    await page.goto(searchUrl, { waitUntil: "networkidle0", timeout: 30000 });
    await new Promise(resolve => setTimeout(resolve, 3000));

    // 검색 결과 추출 - DOM 구조 기반
    const results = await page.evaluate(() => {
      const isExcluded = (url, hostname) => {
        if (hostname.endsWith("naver.com")) return true;
        if (url.includes("/adcr") || url.includes("ad.search")) return true;
        return false;
      };

      // 결과 블록에서 첫 번째 유효 외부 URL 추출
      const extractFirstUrl = (block) => {
        const links = block.querySelectorAll('a[href^="http"]');
        for (const link of links) {
          try {
            const urlObj = new URL(link.href);
            if (isExcluded(link.href, urlObj.hostname)) continue;
            const text = link.textContent?.trim() || "";
            if (text.length < 5) continue;
            return {
              url: link.href,
              title: text.substring(0, 100),
              domain: urlObj.hostname,
            };
          } catch {}
        }
        return null;
      };

      // === 방법 1: DOM 구조 기반 (결과 목록 컨테이너의 직접 자식 순회) ===
      const mainPack = document.querySelector("#main_pack");
      if (!mainPack) return [];

      // 직접 자식이 가장 많고 높이 > 500px인 요소를 결과 목록 컨테이너로 판별
      let bestContainer = null;
      let maxChildren = 0;
      const candidates = mainPack.querySelectorAll("*");
      for (const el of candidates) {
        const childCount = el.children.length;
        const height = el.getBoundingClientRect().height;
        if (childCount > maxChildren && height > 500) {
          maxChildren = childCount;
          bestContainer = el;
        }
      }

      if (bestContainer && maxChildren >= 10) {
        const results = [];
        for (const child of bestContainer.children) {
          const h = child.getBoundingClientRect().height;
          if (h <= 5) continue; // 구분선 스킵
          const item = extractFirstUrl(child);
          if (item) results.push(item);
        }
        if (results.length > 0) return results;
      }

      // === 방법 2: Fallback - 개선된 Y좌표 기반 ===
      const aside = mainPack.querySelector(".aside_area") ||
                    mainPack.querySelector("[class*='aside']") ||
                    document.querySelector("#sub_pack");

      const allLinks = mainPack.querySelectorAll('a[href^="http"]');
      const results = [];
      let lastY = -Infinity;
      const GROUP_GAP = 120;

      for (const link of allLinks) {
        if (aside && aside.contains(link)) continue;
        try {
          const urlObj = new URL(link.href);
          if (isExcluded(link.href, urlObj.hostname)) continue;
          const text = link.textContent?.trim() || "";
          if (text.length < 8) continue;
          const y = link.getBoundingClientRect().top;
          if (Math.abs(y - lastY) < GROUP_GAP) continue;
          lastY = y;
          results.push({
            url: link.href,
            title: text.substring(0, 100),
            domain: urlObj.hostname,
          });
        } catch {}
      }

      return results;
    });

    console.log("검색 결과 수:", results.length);
    console.log("찾는 사이트:", siteUrl);
    console.log("순위 목록:", results.slice(0, 15).map((r, i) => `${i + 1}. ${r.domain}${new URL(r.url).pathname}`).join(" | "));

    // 사이트 URL 매칭
    const normalizedSiteUrl = siteUrl.replace(/^https?:\/\//, "").replace(/\/$/, "").toLowerCase();

    for (let i = 0; i < Math.min(results.length, maxResults); i++) {
      const result = results[i];
      const normalizedUrl = result.url.replace(/^https?:\/\//, "").replace(/\/$/, "").toLowerCase();

      if (normalizedUrl.includes(normalizedSiteUrl) || result.domain.includes(normalizedSiteUrl)) {
        const rank = i + 1;
        console.log("매칭! 순위:", rank, "URL:", result.url);
        return { rank, url: result.url, title: result.title };
      }
    }

    console.log("매칭 결과 없음");
    return { rank: null, url: null, title: null };
  } catch (error) {
    console.error("크롤링 에러:", error.message);
    throw error;
  } finally {
    await browser.close();
  }
}

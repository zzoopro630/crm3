import { Router } from "express";
import { checkNaverUrlExposure } from "../services/url-crawler.js";
import { checkNaverViewRank } from "../services/crawler.js";

const router = Router();

// POST /api/crawl/url-exposure - 네이버 통합검색 URL 노출 체크
router.post("/url-exposure", async (req, res) => {
  try {
    const { keyword, targetUrl } = req.body;
    if (!keyword || !targetUrl) {
      return res.status(400).json({ error: "keyword와 targetUrl은 필수입니다." });
    }

    const result = await checkNaverUrlExposure(keyword, targetUrl);
    res.json(result);
  } catch (err) {
    console.error("URL 노출 체크 오류:", err);
    res.status(500).json({ error: String(err) });
  }
});

// POST /api/crawl/keyword-rank - 네이버 VIEW 탭 키워드 순위 체크
router.post("/keyword-rank", async (req, res) => {
  try {
    const { keyword, siteUrl } = req.body;
    if (!keyword || !siteUrl) {
      return res.status(400).json({ error: "keyword와 siteUrl은 필수입니다." });
    }

    const result = await checkNaverViewRank(keyword, siteUrl);
    res.json(result);
  } catch (err) {
    console.error("키워드 순위 체크 오류:", err);
    res.status(500).json({ error: String(err) });
  }
});

export default router;

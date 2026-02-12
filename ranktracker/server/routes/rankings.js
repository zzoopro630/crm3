import { Router } from "express";
import db from "../db/init.js";
import { checkNaverViewRank } from "../services/crawler.js";

const router = Router();

// 특정 키워드의 랭킹 히스토리 조회
router.get("/:keywordId", (req, res) => {
  try {
    const { keywordId } = req.params;
    const { limit = 30 } = req.query;

    const rankings = db.prepare(`
      SELECT * FROM rankings
      WHERE keyword_id = ?
      ORDER BY checked_at DESC
      LIMIT ?
    `).all(keywordId, parseInt(limit));

    res.json(rankings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 수동 랭킹 체크
router.post("/check", async (req, res) => {
  try {
    const { keyword_ids } = req.body;

    if (!keyword_ids || !Array.isArray(keyword_ids) || keyword_ids.length === 0) {
      return res.status(400).json({ error: "키워드 ID 배열이 필요합니다." });
    }

    const results = [];

    for (const keywordId of keyword_ids) {
      const keyword = db.prepare(`
        SELECT k.*, s.url as site_url
        FROM keywords k
        JOIN sites s ON k.site_id = s.id
        WHERE k.id = ?
      `).get(keywordId);

      if (!keyword) {
        results.push({ keyword_id: keywordId, error: "키워드를 찾을 수 없습니다." });
        continue;
      }

      try {
        const rankResult = await checkNaverViewRank(keyword.keyword, keyword.site_url);

        // 랭킹 결과 저장
        db.prepare(`
          INSERT INTO rankings (keyword_id, rank_position, search_type, result_url, result_title)
          VALUES (?, ?, 'view', ?, ?)
        `).run(keywordId, rankResult.rank, rankResult.url, rankResult.title);

        results.push({
          keyword_id: keywordId,
          keyword: keyword.keyword,
          rank: rankResult.rank,
          url: rankResult.url,
          title: rankResult.title,
        });
      } catch (crawlError) {
        results.push({ keyword_id: keywordId, error: crawlError.message });
      }
    }

    res.json({ results });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 대시보드 요약 데이터
router.get("/dashboard/summary", (req, res) => {
  try {
    // 총 사이트 수
    const siteCount = db.prepare("SELECT COUNT(*) as count FROM sites").get().count;

    // 총 키워드 수
    const keywordCount = db.prepare("SELECT COUNT(*) as count FROM keywords WHERE is_active = 1").get().count;

    // 오늘 체크한 횟수
    const todayChecks = db.prepare(`
      SELECT COUNT(*) as count FROM rankings
      WHERE date(checked_at) = date('now')
    `).get().count;

    // 최근 랭킹 데이터 (상위 10개)
    const recentRankings = db.prepare(`
      SELECT r.*, k.keyword, s.name as site_name
      FROM rankings r
      JOIN keywords k ON r.keyword_id = k.id
      JOIN sites s ON k.site_id = s.id
      ORDER BY r.checked_at DESC
      LIMIT 10
    `).all();

    // 키워드별 최신 랭킹
    const latestRankings = db.prepare(`
      SELECT k.id as keyword_id, k.keyword, s.name as site_name, s.url as site_url,
             r.rank_position, r.checked_at, r.result_url, r.result_title
      FROM keywords k
      JOIN sites s ON k.site_id = s.id
      LEFT JOIN rankings r ON r.id = (
        SELECT id FROM rankings WHERE keyword_id = k.id ORDER BY checked_at DESC LIMIT 1
      )
      WHERE k.is_active = 1
      ORDER BY k.created_at DESC
    `).all();

    res.json({
      stats: {
        siteCount,
        keywordCount,
        todayChecks,
      },
      recentRankings,
      latestRankings,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

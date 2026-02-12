import { Router } from "express";
import db from "../db/init.js";
import { checkNaverUrlExposure } from "../services/url-crawler.js";

const router = Router();

// 추적 URL 목록 (최신 순위 포함)
router.get("/", (req, res) => {
  try {
    const trackedUrls = db
      .prepare(
        `
      SELECT t.*,
             r.rank_position as latest_rank,
             r.section_name as latest_section,
             r.section_rank as latest_section_rank,
             r.checked_at as last_checked
      FROM tracked_urls t
      LEFT JOIN url_rankings r ON r.id = (
        SELECT id FROM url_rankings WHERE tracked_url_id = t.id ORDER BY checked_at DESC LIMIT 1
      )
      WHERE t.is_active = 1
      ORDER BY t.created_at DESC
    `
      )
      .all();

    res.json(trackedUrls);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 추적 URL 추가
router.post("/", (req, res) => {
  try {
    const { keyword, target_url, section, memo } = req.body;

    if (!keyword || !target_url) {
      return res
        .status(400)
        .json({ error: "키워드와 대상 URL은 필수입니다." });
    }

    const result = db
      .prepare(
        `INSERT INTO tracked_urls (keyword, target_url, section, memo) VALUES (?, ?, ?, ?)`
      )
      .run(keyword, target_url, section || null, memo || null);

    const created = db
      .prepare("SELECT * FROM tracked_urls WHERE id = ?")
      .get(result.lastInsertRowid);

    res.status(201).json(created);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 추적 URL 삭제
router.delete("/:id", (req, res) => {
  try {
    const { id } = req.params;
    db.prepare("DELETE FROM tracked_urls WHERE id = ?").run(id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 순위 체크 실행
router.post("/check", async (req, res) => {
  try {
    const { tracked_url_ids } = req.body;

    if (
      !tracked_url_ids ||
      !Array.isArray(tracked_url_ids) ||
      tracked_url_ids.length === 0
    ) {
      return res
        .status(400)
        .json({ error: "추적 URL ID 배열이 필요합니다." });
    }

    const results = [];

    for (const id of tracked_url_ids) {
      const tracked = db
        .prepare("SELECT * FROM tracked_urls WHERE id = ?")
        .get(id);

      if (!tracked) {
        results.push({ tracked_url_id: id, error: "추적 URL을 찾을 수 없습니다." });
        continue;
      }

      try {
        const exposure = await checkNaverUrlExposure(
          tracked.keyword,
          tracked.target_url
        );

        // 특정 영역 지정된 경우: 해당 영역 결과만 사용
        let rankPosition = exposure.overallRank;
        let sectionName = exposure.sectionName;
        let sectionRank = exposure.sectionRank;

        if (tracked.section && exposure.found) {
          // 지정 영역과 발견 영역이 다르면, 지정 영역에서 직접 탐색
          if (exposure.sectionName !== tracked.section) {
            const targetSection = exposure.allSections.find(
              (s) => s.name === tracked.section
            );
            if (targetSection) {
              const normalizedTarget = tracked.target_url
                .replace(/^https?:\/\//, "")
                .replace(/^www\./, "")
                .replace(/\/$/, "")
                .toLowerCase();

              for (let i = 0; i < targetSection.items.length; i++) {
                const normalizedItem = targetSection.items[i].url
                  .replace(/^https?:\/\//, "")
                  .replace(/^www\./, "")
                  .replace(/\/$/, "")
                  .toLowerCase();

                if (
                  normalizedItem.includes(normalizedTarget) ||
                  normalizedTarget.includes(normalizedItem)
                ) {
                  sectionName = tracked.section;
                  sectionRank = i + 1;
                  break;
                }
              }
            } else {
              // 지정 영역 자체가 없음
              sectionName = null;
              sectionRank = null;
            }
          }
        }

        db.prepare(
          `INSERT INTO url_rankings (tracked_url_id, rank_position, section_name, section_rank)
           VALUES (?, ?, ?, ?)`
        ).run(id, rankPosition, sectionName, sectionRank);

        results.push({
          tracked_url_id: id,
          keyword: tracked.keyword,
          target_url: tracked.target_url,
          rank_position: rankPosition,
          section_name: sectionName,
          section_rank: sectionRank,
          found: exposure.found,
        });
      } catch (crawlError) {
        results.push({ tracked_url_id: id, error: crawlError.message });
      }
    }

    res.json({ results });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 순위 히스토리
router.get("/:id/history", (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 30 } = req.query;

    const history = db
      .prepare(
        `SELECT * FROM url_rankings
         WHERE tracked_url_id = ?
         ORDER BY checked_at DESC
         LIMIT ?`
      )
      .all(id, parseInt(limit));

    res.json(history);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

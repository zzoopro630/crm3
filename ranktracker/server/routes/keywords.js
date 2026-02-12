import { Router } from "express";
import db from "../db/init.js";

const router = Router();

// 모든 키워드 조회 (사이트별 필터링 가능)
router.get("/", (req, res) => {
  try {
    const { site_id } = req.query;
    let query = `
      SELECT k.*, s.name as site_name, s.url as site_url,
             (SELECT r.rank_position FROM rankings r WHERE r.keyword_id = k.id ORDER BY r.checked_at DESC LIMIT 1) as latest_rank,
             (SELECT r.checked_at FROM rankings r WHERE r.keyword_id = k.id ORDER BY r.checked_at DESC LIMIT 1) as last_checked
      FROM keywords k
      JOIN sites s ON k.site_id = s.id
    `;

    if (site_id) {
      query += " WHERE k.site_id = ?";
      const keywords = db.prepare(query + " ORDER BY k.created_at DESC").all(site_id);
      return res.json(keywords);
    }

    const keywords = db.prepare(query + " ORDER BY k.created_at DESC").all();
    res.json(keywords);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 단일 키워드 조회
router.get("/:id", (req, res) => {
  try {
    const keyword = db.prepare(`
      SELECT k.*, s.name as site_name, s.url as site_url
      FROM keywords k
      JOIN sites s ON k.site_id = s.id
      WHERE k.id = ?
    `).get(req.params.id);

    if (!keyword) {
      return res.status(404).json({ error: "키워드를 찾을 수 없습니다." });
    }
    res.json(keyword);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 키워드 생성
router.post("/", (req, res) => {
  try {
    const { keyword, site_id } = req.body;
    if (!keyword || !site_id) {
      return res.status(400).json({ error: "키워드와 사이트 ID가 필요합니다." });
    }

    // 사이트 존재 확인
    const site = db.prepare("SELECT * FROM sites WHERE id = ?").get(site_id);
    if (!site) {
      return res.status(400).json({ error: "존재하지 않는 사이트입니다." });
    }

    const result = db.prepare("INSERT INTO keywords (keyword, site_id) VALUES (?, ?)").run(keyword, site_id);
    const newKeyword = db.prepare(`
      SELECT k.*, s.name as site_name, s.url as site_url
      FROM keywords k
      JOIN sites s ON k.site_id = s.id
      WHERE k.id = ?
    `).get(result.lastInsertRowid);

    res.status(201).json(newKeyword);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 키워드 수정
router.put("/:id", (req, res) => {
  try {
    const { keyword, is_active } = req.body;
    const { id } = req.params;

    const existing = db.prepare("SELECT * FROM keywords WHERE id = ?").get(id);
    if (!existing) {
      return res.status(404).json({ error: "키워드를 찾을 수 없습니다." });
    }

    db.prepare("UPDATE keywords SET keyword = ?, is_active = ? WHERE id = ?").run(
      keyword ?? existing.keyword,
      is_active ?? existing.is_active,
      id
    );

    const updated = db.prepare(`
      SELECT k.*, s.name as site_name, s.url as site_url
      FROM keywords k
      JOIN sites s ON k.site_id = s.id
      WHERE k.id = ?
    `).get(id);

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 키워드 삭제
router.delete("/:id", (req, res) => {
  try {
    const result = db.prepare("DELETE FROM keywords WHERE id = ?").run(req.params.id);
    if (result.changes === 0) {
      return res.status(404).json({ error: "키워드를 찾을 수 없습니다." });
    }
    res.json({ message: "삭제되었습니다." });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

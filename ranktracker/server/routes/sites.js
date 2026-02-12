import { Router } from "express";
import db from "../db/init.js";

const router = Router();

// 모든 사이트 조회
router.get("/", (req, res) => {
  try {
    const sites = db.prepare(`
      SELECT s.*,
             COUNT(DISTINCT k.id) as keyword_count
      FROM sites s
      LEFT JOIN keywords k ON s.id = k.site_id
      GROUP BY s.id
      ORDER BY s.created_at DESC
    `).all();
    res.json(sites);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 단일 사이트 조회
router.get("/:id", (req, res) => {
  try {
    const site = db.prepare("SELECT * FROM sites WHERE id = ?").get(req.params.id);
    if (!site) {
      return res.status(404).json({ error: "사이트를 찾을 수 없습니다." });
    }
    res.json(site);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 사이트 생성
router.post("/", (req, res) => {
  try {
    const { name, url } = req.body;
    if (!name || !url) {
      return res.status(400).json({ error: "이름과 URL이 필요합니다." });
    }

    const result = db.prepare("INSERT INTO sites (name, url) VALUES (?, ?)").run(name, url);
    const site = db.prepare("SELECT * FROM sites WHERE id = ?").get(result.lastInsertRowid);
    res.status(201).json(site);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 사이트 수정
router.put("/:id", (req, res) => {
  try {
    const { name, url } = req.body;
    const { id } = req.params;

    const existing = db.prepare("SELECT * FROM sites WHERE id = ?").get(id);
    if (!existing) {
      return res.status(404).json({ error: "사이트를 찾을 수 없습니다." });
    }

    db.prepare("UPDATE sites SET name = ?, url = ? WHERE id = ?").run(
      name || existing.name,
      url || existing.url,
      id
    );

    const site = db.prepare("SELECT * FROM sites WHERE id = ?").get(id);
    res.json(site);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 사이트 삭제
router.delete("/:id", (req, res) => {
  try {
    const result = db.prepare("DELETE FROM sites WHERE id = ?").run(req.params.id);
    if (result.changes === 0) {
      return res.status(404).json({ error: "사이트를 찾을 수 없습니다." });
    }
    res.json({ message: "삭제되었습니다." });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

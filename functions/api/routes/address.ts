import { Hono } from "hono";
import type { Env } from "../middleware/auth";

const app = new Hono<{ Bindings: Env }>();

app.get("/search", async (c) => {
  const keyword = c.req.query("keyword") || "";
  const currentPage = c.req.query("currentPage") || "1";
  const countPerPage = c.req.query("countPerPage") || "10";

  if (!keyword) {
    return c.json({ error: "keyword is required" }, 400);
  }

  const apiKey = c.env.JUSO_API_KEY;
  if (!apiKey) {
    console.error("[address] JUSO_API_KEY not configured");
    return c.json({ error: "JUSO_API_KEY not configured" }, 500);
  }

  const url = `https://business.juso.go.kr/addrlink/addrLinkApi.do?confmKey=${encodeURIComponent(
    apiKey
  )}&currentPage=${currentPage}&countPerPage=${countPerPage}&keyword=${encodeURIComponent(
    keyword
  )}&resultType=json`;

  try {
    const response = await fetch(url);
    const text = await response.text();

    // Juso API가 HTML 에러 페이지를 반환하는 경우 처리
    if (!response.ok) {
      console.error("[address] Juso API HTTP error:", response.status, text.slice(0, 200));
      return c.json({ error: `Juso API error: ${response.status}` }, 502);
    }

    // JSON 파싱 시도
    try {
      const data = JSON.parse(text);
      return c.json(data);
    } catch {
      console.error("[address] Juso API invalid JSON:", text.slice(0, 200));
      return c.json({ error: "Juso API returned invalid response" }, 502);
    }
  } catch (error) {
    console.error("[address] Failed to fetch address:", error);
    return c.json({ error: "Failed to fetch address" }, 500);
  }
});

export default app;

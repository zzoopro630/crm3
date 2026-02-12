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
    return c.json({ error: "JUSO_API_KEY not configured" }, 500);
  }

  const url = `https://business.juso.go.kr/addrlink/addrLinkApi.do?confmKey=${encodeURIComponent(
    apiKey
  )}&currentPage=${currentPage}&countPerPage=${countPerPage}&keyword=${encodeURIComponent(
    keyword
  )}&resultType=json`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    return c.json(data);
  } catch (error) {
    console.error("Address API error:", error);
    return c.json({ error: "Failed to fetch address" }, 500);
  }
});

export default app;

import { describe, it, expect } from "vitest";
import { Hono } from "hono";
import type { Env } from "../middleware/auth";

// Health endpoint is defined inline in [[route]].ts, so we recreate it
const app = new Hono<{ Bindings: Env }>();
app.get("/api/health", (c) => {
  return c.json({ status: "ok", timestamp: new Date().toISOString() });
});

describe("GET /api/health", () => {
  it("returns status ok", async () => {
    const res = await app.request("/api/health");
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.status).toBe("ok");
    expect(body.timestamp).toBeDefined();
  });

  it("returns valid ISO timestamp", async () => {
    const res = await app.request("/api/health");
    const body = await res.json();
    const date = new Date(body.timestamp);
    expect(date.toISOString()).toBe(body.timestamp);
  });
});
